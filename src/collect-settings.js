const fs = require('fs');

/**
 * @typedef {Object} Settings
 * @property {string} osApi
 * @property {string} osMetricApi
 * @property {string} accessToken
 */

/**
 * @param {Object.<string, string>} env
 * @returns {Promise<Settings>}
 */
module.exports = async function collectSettings(env) {
    const osApi = env.OS_API;
    if (!osApi) {
        throw new Error('Please set the OS_API env variable!');
    }

    const osMetricApi = env.OS_METRIC_API;
    if (!osMetricApi) {
        throw new Error('Please set the OS_METRIC_API env variable!');
    }

    const accessToken = env.OS_ACCESS_TOKEN_FILE
        ? await fs.promises.readFile(env.OS_ACCESS_TOKEN_FILE, 'utf8')
        : env.OS_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('Please set the OS_ACCESS_TOKEN or OS_ACCESS_TOKEN_FILE env variable!');
    }

    return { osApi, osMetricApi, accessToken };
}