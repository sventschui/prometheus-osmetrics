const PromisePool = require('es6-promise-pool')
const fetch = require('node-fetch').default
const listPods = require('./list-pods')
const parseMemory = require('./parse-memory')
const parseCpu = require('./parse-cpu')

/**
 * @param {import('node-fetch').Response} response
 * @returns {Promise<any>}
 */
async function safeJson (response) {
  const text = await response.text()
  let json

  try {
    json = JSON.parse(text)
  } catch (e) {
    e.text = text
    throw e
  }

  return json
}

/**
 * @typedef {Object} Options
 * @property {Array<string>} namespace
 * @property {number} concurrency
 * @property {string} osMetricApi
 * @property {string} osApi
 * @property {string} accessToken
 * @property {?import('https').Agent} agent
 * @property {(import('pino').Logger|import('fastify').Logger)} logger
 */

/**
 * @typedef {Object} FetchMetricOptions
 * @property {import('./list-pods').PodInfo} pod
 * @property {string} osMetricApi
 * @property {string} accessToken
 * @property {?import('https').Agent} agent
 * @property {(import('pino').Logger|import('fastify').Logger)} logger
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
async function fetchPodCpuUsage ({
  pod,
  accessToken,
  osMetricApi,
  agent,
  logger
}) {
  return (
    await Promise.all(
      pod.spec.containers.map(async container => {
        const name = `${container.name}/${pod.metadata.uid}/cpu/usage_rate`
        const response = await fetch(
          `${osMetricApi}/metrics/gauges/${encodeURIComponent(
            name
          )}/raw?limit=1`,
          {
            timeout: 10000,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Hawkular-Tenant': pod.metadata.namespace,
              Accept: 'application/json'
            },
            agent
          }
        )

        if (response.status < 200 || response.status > 299) {
          throw new Error(
            `OS Metrics API returned status code ${response.status} for ${response.url}`
          )
        }

        if (response.status === 204) {
          logger.warn(
            'Found no CPU usage_rate for container %s of pod %s (%s)',
            container.name,
            pod.metadata.uid,
            pod.metadata.name
          )
          return null
        }

        const body = await safeJson(response)

        if (body.length <= 0) {
          logger.warn(
            'Found no CPU usage_rate for container %s of pod %s (%s)',
            container.name,
            pod.metadata.uid,
            pod.metadata.name
          )
          return null
        }

        const cpuUsage = body[0]

        const metrics = [
          {
            name: 'osmetrics_pod_cpu_usage_millicores',
            labels: {
              pod: pod.metadata.name,
              container: container.name,
              namespace: pod.metadata.namespace
            },
            type: 'gauge',
            help: 'Pod CPU Usage Rate', // TODO: should we serialize help and type only once?
            value: cpuUsage.value,
            timestamp: cpuUsage.timestamp
          }
        ]

        if (
          container.resources &&
          container.resources.limits &&
          container.resources.limits.cpu
        ) {
          const spec = parseCpu(container.resources.limits.cpu)
          const rate = cpuUsage.value / spec
          if (rate > 1) {
            logger.warn(
              'osmetrics_pod_cpu_usage_limits_rate is > 1 for pod %s container %s spec %s (%j) usage (%j) = %j',
              pod.metadata.name,
              container.name,
              container.resources.limits.cpu,
              spec,
              cpuUsage.value,
              rate
            )
          }
          metrics.push({
            name: 'osmetrics_pod_cpu_usage_limits_rate',
            labels: {
              pod: pod.metadata.name,
              container: container.name,
              namespace: pod.metadata.namespace
            },
            type: 'gauge',
            help: 'Pod CPU Usage rate',
            value: rate,
            timestamp: cpuUsage.timestamp
          })
        }

        if (
          container.resources &&
          container.resources.requests &&
          container.resources.requests.cpu
        ) {
          const spec = parseCpu(container.resources.requests.cpu)
          const rate = cpuUsage.value / spec
          if (rate > 1) {
            logger.warn(
              'osmetrics_pod_cpu_usage_requests_rate is > 1 for pod %s container %s spec %s (%j) usage (%j) = %j',
              pod.metadata.name,
              container.name,
              container.resources.requests.cpu,
              spec,
              cpuUsage.value,
              rate
            )
          }
          metrics.push({
            name: 'osmetrics_pod_cpu_usage_requests_rate',
            labels: {
              pod: pod.metadata.name,
              container: container.name,
              namespace: pod.metadata.namespace
            },
            type: 'gauge',
            help: 'Pod CPU Usage rate',
            value: rate,
            timestamp: cpuUsage.timestamp
          })
        }

        return metrics
      })
    )
  )
    .filter(Boolean)
    .reduce((accum, item) => accum.concat(item), [])
}

/**
 * @param {FetchMetricOptions} options
 * @returns {Promise<Array<import('./serialize').PrometheusMetric>>}
 */
async function fetchPodMemoryUsage ({
  pod,
  accessToken,
  osMetricApi,
  agent,
  logger
}) {
  return (
    await Promise.all(
      pod.spec.containers.map(async container => {
        const name = `${container.name}/${pod.metadata.uid}/memory/usage`
        const response = await fetch(
          `${osMetricApi}/metrics/gauges/${encodeURIComponent(
            name
          )}/raw?limit=1`,
          {
            timeout: 10000,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Hawkular-Tenant': pod.metadata.namespace,
              Accept: 'application/json'
            },
            agent
          }
        )

        if (response.status < 200 || response.status > 299) {
          throw new Error(
            `OS Metrcs API returned status code ${response.status} for ${response.url}`
          )
        }

        if (response.status === 204) {
          logger.warn(
            'Found no Memory usage for container %s of pod %s (%s)',
            container.name,
            pod.metadata.uid,
            pod.metadata.name
          )
          return null
        }

        const body = await safeJson(response)

        if (body.length <= 0) {
          logger.warn(
            'Found no Memory usage for container %s of pod %s (%s)',
            container.name,
            pod.metadata.uid,
            pod.metadata.name
          )
          return null
        }

        const memoryUsage = body[0]

        /**
         * @type {Array<import('./serialize').PrometheusMetric>}
         */
        const metrics = [
          {
            name: 'osmetrics_pod_memory_usage_bytes',
            labels: {
              pod: pod.metadata.name,
              container: container.name,
              namespace: pod.metadata.namespace
            },
            type: 'gauge',
            help: 'Pod Memory Usage',
            value: memoryUsage.value,
            timestamp: memoryUsage.timestamp
          }
        ]

        if (
          container.resources &&
          container.resources.limits &&
          container.resources.limits.memory
        ) {
          const spec = parseMemory(container.resources.limits.memory)
          const rate = memoryUsage.value / spec
          if (rate > 1) {
            logger.warn(
              'osmetrics_pod_memory_usage_limits_rate is > 1 for pod %s container %s spec %s (%j) usage (%j) = %j',
              pod.metadata.name,
              container.name,
              container.resources.limits.memory,
              spec,
              memoryUsage.value,
              rate
            )
          }
          metrics.push({
            name: 'osmetrics_pod_memory_usage_limits_rate',
            labels: {
              pod: pod.metadata.name,
              container: container.name,
              namespace: pod.metadata.namespace
            },
            type: 'gauge',
            help: 'Pod Memory Usage',
            value: rate,
            timestamp: memoryUsage.timestamp
          })
        }

        if (
          container.resources &&
          container.resources.requests &&
          container.resources.requests.memory
        ) {
          const spec = parseMemory(container.resources.requests.memory)
          const rate = memoryUsage.value / spec
          if (rate > 1) {
            logger.warn(
              'osmetrics_pod_memory_usage_requests_rate is > 1 for pod %s container %s spec %s (%j) usage (%j) = %j',
              pod.metadata.name,
              container.name,
              container.resources.limits.memory,
              spec,
              memoryUsage.value,
              rate
            )
          }
          metrics.push({
            name: 'osmetrics_pod_memory_usage_requests_rate',
            labels: {
              pod: pod.metadata.name,
              container: container.name,
              namespace: pod.metadata.namespace
            },
            type: 'gauge',
            help: 'Pod Memory Usage',
            value: rate,
            timestamp: memoryUsage.timestamp
          })
        }

        return metrics
      })
    )
  )
    .filter(Boolean)
    .reduce((accum, item) => accum.concat(item), [])
}

/**
 * @param {Options} options
 * @returns {Promise<Array<import('./serialize').PrometheusMetric>>}
 */
module.exports = async function collectMetrics (options) {
  const podsPerNamespace = await Promise.all(
    options.namespace.map(async namespace =>
      listPods({
        osApi: options.osApi,
        namespace,
        accessToken: options.accessToken,
        agent: options.agent
      })
    )
  )

  const allPods = podsPerNamespace
    .reduce((accum, pods) => accum.concat(pods), [])
    .filter(pod => {
      return pod.status.phase !== 'Failed' && pod.status.phase !== 'Succeeded'
    })

  /**
   * @type {Array<import('./serialize').PrometheusMetric>}
   */
  let metrics = []

  /**
   * @param {import('./list-pods').PodInfo} pod
   * @returns {Promise<void>}
   */
  async function processPod (pod) {
    const [cpuUsageRates, memoryUsages] = await Promise.all([
      fetchPodCpuUsage({
        pod,
        osMetricApi: options.osMetricApi,
        accessToken: options.accessToken,
        agent: options.agent,
        logger: options.logger
      }),
      fetchPodMemoryUsage({
        pod,
        osMetricApi: options.osMetricApi,
        accessToken: options.accessToken,
        agent: options.agent,
        logger: options.logger
      })
    ])

    metrics = metrics.concat(cpuUsageRates, memoryUsages)
  }

  /**
   * @returns {?Promise<void>}
   */
  function promiseProducer () {
    const pod = allPods.pop()

    if (pod != null) {
      return processPod(pod)
    }

    return null
  }

  // @ts-ignore
  const pool = new PromisePool(promiseProducer, options.concurrency)

  await pool.start()

  return metrics
}
