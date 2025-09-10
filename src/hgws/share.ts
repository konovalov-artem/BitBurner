// 1.6 + 2.4 = 4 gb
export const main = async (ns: NS) => {
  while (true) {
    await ns.share()
  }
}
