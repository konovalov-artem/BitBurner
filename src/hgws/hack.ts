// 1.6 + 0.1 = 1.7 gb
export const main = async (ns: NS, host = ns.args[0] as string, additionalMsec = ns.args[1] as number) => {
  await ns.hack(host, { additionalMsec })
}
