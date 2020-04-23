/**
 * @param {Object.<string, string>} [labels]
 */
module.exports = function serializeLabels(labels) {
    return Object.entries(labels).reduce((accum, [key, value], index) => {
        const separator = index === 0 ? '' : ', '
        return `${accum}${separator}${key}="${value}"`; // TODO: escape key and label
    }, '');
}
