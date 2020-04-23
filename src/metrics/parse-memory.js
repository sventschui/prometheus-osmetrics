/**
 * @param {(string|number)} memory
 */
module.exports = function parseMemory (memory) {
  if (typeof memory === 'number') {
    return memory
  }

  let match

  // try the formats 128 and 128e2
  match = memory.match(/^([0-9]+)(e([0-9]+))?$/)
  if (match) {
    if (match[3] === undefined) {
      // format 128
      return parseInt(match[1], 10)
    } else {
      return parseInt(match[1]) * Math.pow(10, parseInt(match[3], 10))
    }
  }

  // try the suffixes E, P, T, G, M, K, Ei, Pi, Ti, Gi, Mi, Ki
  const res = [
    /^([0-9]+)K(i?)$/,
    /^([0-9]+)M(i?)$/,
    /^([0-9]+)G(i?)$/,
    /^([0-9]+)T(i?)$/,
    /^([0-9]+)P(i?)$/,
    /^([0-9]+)E(i?)$/
  ]

  for (let i = 0; i < res.length; i++) {
    match = memory.match(res[i])
    if (match) {
      return parseInt(match[1]) * Math.pow(match[2] === 'i' ? 1024 : 1000, i)
    }
  }

  throw new Error(`Memory ${memory} has unsupported format!`)
}
