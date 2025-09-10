// 1.6 + 0.15 = 1.75 gb
export const main = async (ns: NS, host = ns.args[0] as string, additionalMsec = ns.args[1] as number) => {
  await ns.grow(host, { additionalMsec })
}
