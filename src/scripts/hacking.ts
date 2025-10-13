import { WEAKEN, GROW, HACK, SHARE, HACKING_SCRIPT_GAP, ToastVariant } from '../lib/constants'
import { NHacking } from '../lib/types'
import { countRunningScripts } from '../ns-utils/count-running-scripts'
import { getHGWtime } from '../ns-utils/get-hgw-time'
import { getFreeRam } from '../ns-utils/get-free-ram'
import { getBatchRam } from '../ns-utils/get-batch-ram'
import { getBatchThreads } from '../ns-utils/get-batch-threads'
import { ScriptLib } from '../lib/script-lib'

class Hacking extends ScriptLib {
  private previousBatchTime: number = 0

  constructor(
    readonly ns: NS,
    inputPort: number,
    outputPort: number,
  ) {
    const options: NHacking.ScriptLibOptions = {
      inputPort,
      outputPort,
    }
    super(ns, options)
  }

  start() {
    const data = this.readDataFromManager()
    const servers = [...data.servers.purchased, ...data.servers.hacked, data.servers.home]

    // check settings
    if (this.checkSettings(data.targetServer, servers)) return
    // check is count of running scripts is less than limit
    let scriptsRunning = countRunningScripts(this.ns, servers)
    if (scriptsRunning > data.scriptsLimit) return

    for (const server of servers) {
      let freeRam = getFreeRam(this.ns, server)

      if (data.hackServers.includes(server.serverType)) {
        this.handleBathAttack(data.targetServer, server, freeRam, scriptsRunning, data.scriptsLimit)
      } else if (data.shareServers.includes(server.serverType)) {
        this.handleShare(server, freeRam, scriptsRunning)
      }
      if (scriptsRunning > data.scriptsLimit) break
    }

    this.sendDataToManager({ previousBatchTime: this.previousBatchTime })
  }

  checkSettings(targetServer: NHacking.AnalyzedServer, execServers: NHacking.AnalyzedServer[]): boolean {
    let isShouldStop: boolean = false
    let settingsErrorMessage: string | undefined
    if (!targetServer || !targetServer.hostname) {
      settingsErrorMessage = `⚠️ [HACKING] No target server found. Please check Manager data.`
    }
    if (!execServers.length) {
      settingsErrorMessage = `⚠️ [HACKING] No servers found. Please check Manager data.`
    }
    if (settingsErrorMessage) {
      isShouldStop = true
      this.toast(settingsErrorMessage, ToastVariant.WARNING)
    }
    return isShouldStop
  }

  getTimeGap(batchDuration: number, scriptGap: number): number {
    const now = Date.now()
    const secondWeakenDelay = 2 * scriptGap

    if (!this.previousBatchTime) {
      this.previousBatchTime = now + batchDuration
      return 0
    }

    const earliestHackStartTime = this.previousBatchTime + secondWeakenDelay - batchDuration
    const timeGap = Math.max(0, earliestHackStartTime - now)

    this.previousBatchTime = now + timeGap + batchDuration

    return timeGap
  }

  handleShare(execServer: NHacking.AnalyzedServer, freeRam: number, scriptsRunning: number) {
    const threads = Math.floor(freeRam / this.ns.getScriptRam(SHARE))
    if (threads > 0) {
      this.ns.exec(SHARE, execServer.hostname, { threads })
      scriptsRunning += 1
    }
  }

  handleBathAttack(
    targetServer: NHacking.AnalyzedServer,
    execServer: NHacking.AnalyzedServer,
    freeRam: number,
    scriptsRunning: number,
    scriptsLimit: number,
  ) {
    const { hackTime, weakenTime, growTime } = getHGWtime(this.ns, targetServer.hostname)
    const { hackThreads, hwThreads, growThreads, gwThreads } = getBatchThreads(
      this.ns,
      targetServer,
      freeRam,
      scriptsLimit,
      execServer.cpuCores,
    )

    if (hackThreads < 0) return

    const threads: NHacking.BatchThreads = {
      hackThreads,
      growThreads,
      weakenThreads: hwThreads + gwThreads,
    }
    const totalRam = getBatchRam(this.ns, threads)

    const isFileExists =
      this.ns.fileExists(WEAKEN) && this.ns.fileExists(GROW) && this.ns.fileExists(HACK) && this.ns.fileExists(SHARE)
    if (!isFileExists) return

    let timeGap = this.getTimeGap(weakenTime, HACKING_SCRIPT_GAP)

    while (freeRam >= totalRam && scriptsRunning < scriptsLimit) {
      // timeGap => (hack => scriptGap ms => weaken1 => scriptGap ms => grow => scriptGap ms => weaken2)
      const hackGapTime = timeGap + weakenTime - hackTime - HACKING_SCRIPT_GAP
      const firstWeakenGapTime = timeGap
      const growGapTime = timeGap + weakenTime - growTime + HACKING_SCRIPT_GAP
      const secondWeakenGapTime = timeGap + 2 * HACKING_SCRIPT_GAP

      this.ns.exec(WEAKEN, execServer.hostname, { threads: hwThreads }, targetServer.hostname, firstWeakenGapTime)
      this.ns.exec(WEAKEN, execServer.hostname, { threads: gwThreads }, targetServer.hostname, secondWeakenGapTime)
      this.ns.exec(GROW, execServer.hostname, { threads: growThreads }, targetServer.hostname, growGapTime)
      this.ns.exec(HACK, execServer.hostname, { threads: hackThreads }, targetServer.hostname, hackGapTime)

      freeRam = getFreeRam(this.ns, execServer)
      // 4 scripts running: hack, weaken1, grow, weaken2
      scriptsRunning += 4
    }
  }
}

export const main = (ns: NS) => {
  const [inputPort, outputPort] = ns.args as number[]

  const hacking = new Hacking(ns, inputPort, outputPort)
  hacking.start()
}
