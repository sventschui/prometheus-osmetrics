const PromisePool = require('es6-promise-pool');
const fetch = require('node-fetch').default;
const listPods = require('./list-pods');

/**
 * @param {import('node-fetch').Response} response
 * @returns {Promise<any>}
 */
async function safeJson(response) {
    const text = await response.text();
    let json;

    try {
        json = JSON.parse(text);
    } catch (e) {
        e.text = text;
        throw e;
    }

    return json;
}

/**
 * @typedef {Object} Options
 * @property {Array<string>} namespace
 * @property {number} concurrency
 * @property {string} osMetricApi
 * @property {string} osApi
 * @property {string} accessToken
 */

/**
 * @typedef {Object} FetchMetricOptions
 * @property {import('./list-pods').PodInfo} pod
 * @property {string} osMetricApi
 * @property {string} accessToken
 */

/**
 * @typedef {Object} Metric
 * @property {number} value
 * @property {number} timestamp
 */

/**
 * @param {FetchMetricOptions} options
 * @returns {Promise<Array<import('./serialize').PrometheusMetric>>}
 */
async function fetchPodCpuUsageRate({ pod, accessToken, osMetricApi }) {
    return (await Promise.all(pod.spec.containers.map(async (container) => {
        const name = `${container.name}/${pod.metadata.uid}/cpu/usage_rate`;
        const response = await fetch(`${osMetricApi}/metrics/gauges/${encodeURIComponent(name)}/raw?limit=1`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Hawkular-Tenant': pod.metadata.namespace,
                Accept: 'application/json',
            }
        });
    
        if (response.status < 200 || response.status > 299) {
            throw new Error(`OS Metrics API returned status code ${response.status} for ${response.url}`)
        }

        if (response.status == 204) {
            console.log({ pod })
            console.error(`Could not fetch CPU usage_rate for container ${container.name} of pod ${pod.metadata.uid} (${pod.metadata.name})`);
            return null;
        }
    
        const body = await safeJson(response);
    
        if (body.length <= 0) {
            console.error(`Could not fetch CPU usage_rate for container ${container.name} of pod ${pod.metadata.uid} (${pod.metadata.name})`);
            return null;
        }
    
        const cpuUsageRate = body[0];

        return {
            name: 'osmetrics_pod_cpu_usage_rate',
            labels: {
                pod: pod.metadata.name,
                container: container.name,
                namespace: pod.metadata.namespace,
            },
            type: 'gauge',
            help: 'Pod CPU Usage Rate', // TODO: should we serialize help and type only once?
            value: cpuUsageRate.value,
            timestamp: cpuUsageRate.timestamp,
        }
    }))).filter(Boolean);
}

/**
 * @param {FetchMetricOptions} options
 * @returns {Promise<Array<import('./serialize').PrometheusMetric>>}
 */
async function fetchPodMemoryUsage({ pod, accessToken, osMetricApi }) {
    return (await Promise.all(pod.spec.containers.map(async (container) => {
        const name = `${container.name}/${pod.metadata.uid}/memory/usage`;
        const response = await fetch(`${osMetricApi}/metrics/gauges/${encodeURIComponent(name)}/raw?limit=1`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Hawkular-Tenant': pod.metadata.namespace,
                Accept: 'application/json',
            }
        });

        if (response.status < 200 || response.status > 299) {
            throw new Error(`OS Metrcs API returned status code ${response.status} for ${response.url}`)
        }

        if (response.status == 204) {
            console.error(`Could not fetch CPU usage_rate for container ${container.name} of pod ${pod.metadata.uid} (${pod.metadata.name})`);
            return null;
        }

        const body = await safeJson(response);

        if (body.length <= 0) {
            console.error(`Could not fetch Memory usage for container ${container.name} of pod ${pod.metadata.uid} (${pod.metadata.name})`);
            return null;
        }

        const memoryUsage = body[0];

        return {
            name: 'osmetrics_pod_memory_usage_bytes',
            labels: {
                pod: pod.metadata.name,
                container: container.name,
                namespace: pod.metadata.namespace,
            },
            type: 'gauge',
            help: 'Pod Memory Usage',
            value: memoryUsage.value,
            timestamp: memoryUsage.timestamp,
        };
    }))).filter(Boolean);
} 

/**
 * @param {Options} options
 * @returns {Promise<Array<import('./serialize').PrometheusMetric>>}
 */
module.exports = async function collectMetrics(options) {
    const podsPerNamespace = await Promise.all(options.namespace.map(async (namespace) => listPods({
        osApi: options.osApi,
        namespace,
        accessToken: options.accessToken,
    })));

    const allPods = podsPerNamespace.reduce((accum, pods) => accum.concat(pods), [])
        .filter((pod) => {
            return pod.status.phase !== 'Failed'
             && pod.status.phase !== 'Succeeded';
        });

    /**
     * @type {Array<import('./serialize').PrometheusMetric>}
     */
    let metrics = [];

    /**
     * @param {import('./list-pods').PodInfo} pod 
     * @returns {Promise<void>}
     */
    async function processPod(pod) {
        const [cpuUsageRates, memoryUsages] = await Promise.all([
            fetchPodCpuUsageRate({ pod, osMetricApi: options.osMetricApi, accessToken: options.accessToken }),
            fetchPodMemoryUsage({ pod, osMetricApi: options.osMetricApi, accessToken: options.accessToken }),
        ]);

        metrics = metrics.concat(cpuUsageRates, memoryUsages);
    }

    /**
     * @returns {?Promise<void>}
     */
    function promiseProducer() {
        const pod = allPods.pop();

        if (pod != null) {
            return processPod(pod);
        }

        return null;
    }

    // @ts-ignore
    const pool = new PromisePool(promiseProducer, options.concurrency);

    await pool.start();

    return metrics;
}
