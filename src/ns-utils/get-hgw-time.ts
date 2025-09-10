// 0.15 gb
export const getHGWtime = (ns: NS, hostname: string, format: 's' | 'ms' = 'ms') => {
  const devider = format == 's' ? 1000 : 1

  return {
    hackTime: Math.ceil(ns.getHackTime(hostname) / devider),
    weakenTime: Math.ceil(ns.getWeakenTime(hostname) / devider),
    growTime: Math.ceil(ns.getGrowTime(hostname) / devider),
  }
}
