const fetch = require('node-fetch').default
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
 * @property {ContainerResourcesSpec} resources
 */

/**
 * @typedef {Object} ContainerResourcesSpec
 * @property {?ContainerResourceSpec} limits
 * @property {?ContainerResourceSpec} requests
 */

/**
 * @typedef {Object} ContainerResourceSpec
 * @property {?(string|number)} cpu
 * @property {?(string|number)} memory
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
 * @property {?import('https').Agent} agent
 */

/**
 * @param {Options} options
 * @returns {Promise<Array<PodInfo>>}
 */
module.exports = async function listPods ({
  osApi,
  accessToken,
  namespace,
  agent
}) {
  const response = await fetch(
    `${osApi}/api/v1/namespaces/${encodeURIComponent(namespace)}/pods`,
    {
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      },
      agent
    }
  )

  if (
    response.status < 200 ||
    response.status > 299 ||
    response.status === 204
  ) {
    throw new Error(
      `OS API returned status code ${response.status} for ${response.url}`
    )
  }

  /**
   * @type {{ kind: string, items: Array<PodInfo>}}
   */
  const body = await response.json()

  if (typeof body !== 'object') {
    throw new Error(
      `Expected OS API to return an object but got ${typeof body}`
    )
  }

  if (Array.isArray(body)) {
    throw new Error('Expected OS API to return an object but got an array')
  }

  if (body == null) {
    throw new Error(`Expected OS API to return an object but got ${body}`)
  }

  if (body.kind !== 'PodList') {
    throw new Error(`Expected OS API to return a PodList but got ${body.kind}`)
  }

  return body.items
}
