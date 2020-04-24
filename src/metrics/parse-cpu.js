/**
 * @param {(string|number)} cpu
 */
module.exports = function parseCpu (cpu) {
  if (typeof cpu === 'number') {
    return cpu
  }

  let match

  // try the formats 128m (millicores)
  match = cpu.match(/^([0-9]+)m$/)
  if (match) {
    return parseInt(match[1])
  }

  // try the format 128 (cores)
  match = cpu.match(/^([0-9]+)$/)
  if (match) {
    return parseInt(match[1]) * 1000
  }

  throw new Error(`CPU ${cpu} has unsupported format!`)
}
