const fetch = require('node-fetch').default;
/**
 * @typedef {Object} PodMetadata
 * @property {string} name
 * @property {string} namespace
 * @property {string} selfLink
 * @property {string} uid
 * @property {string} comment
 * @property {Object.<string, string>} labels
 */

/**
 * @typedef {Object} ContainerSpec
 * @property {string} name
 */

/**
 * @typedef {Object} PodStatus
 * @property {string} phase
 */

/**
 * @typedef {Object} PodInfo
 * @property {PodMetadata} metadata 
 * @property {{ containers: Array<ContainerSpec> }} spec
 * @property {PodStatus} status
 */

/**
 * @typedef {Object} Options
 * @property {string} osApi
 * @property {string} accessToken
 * @property {string} namespace
 */

/**
 * @param {Options} options
 * @returns {Promise<Array<PodInfo>>}
 */
module.exports = async function listPods({ osApi, accessToken, namespace }) {
    const response = await fetch(`${osApi}/api/v1/namespaces/${encodeURIComponent(namespace)}/pods`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    if (response.status < 200 || response.status > 299) {
        throw new Error(`OS API returned status code ${response.status} for ${response.url}`);
    }

    /**
     * @type {{ kind: string, items: Array<PodInfo>}}
     */
    const body = await response.json();

    if (body.kind !== 'PodList') {
        throw new Error(`Expected OS API to return a PodList but got ${body.kind}`);
    }

    return body.items;
}
