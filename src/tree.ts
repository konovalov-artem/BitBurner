import { ANSIcolors, HOME_SERVER } from './lib/constants'

const { red, green, yellow, purple, cyan, white, reset } = ANSIcolors
const colors = [red, green, yellow, purple, cyan, white]

const dfs = (ns: NS, start: string, visited: Set<string>, depth = 0, prefix = '', clearPrefix = '') => {
  if (visited.has(start)) return
  visited.add(start)

  const hosts = ns.scan(start)

  const hostColor = colors[Math.max(depth - 1, 0) % colors.length]
  const lineColor = colors[Math.max(depth, 0) % colors.length]
  ns.tprint(prefix + `${hostColor}${depth ? '--' : ''}${start}${reset}`)

  for (let i = 0; i < hosts.length; i++) {
    const isLast = i == hosts.length - 1
    const newPrefix = clearPrefix + (isLast ? `${lineColor}  └${reset}` : `${lineColor}  |${reset}`)
    dfs(ns, hosts[i], visited, depth + 1, newPrefix, clearPrefix + (isLast ? '   ' : `${lineColor}  |${reset}`))
  }
}

export const main = (ns: NS) => {
  const visitedHosts = new Set<string>()
  dfs(ns, HOME_SERVER, visitedHosts)
}
