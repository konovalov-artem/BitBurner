import { NHacking, NManager } from './types'
import { ToastVariant } from '../lib/constants'

export class ScriptLib {
  constructor(
    readonly ns: NS,
    readonly options: NHacking.ScriptLibOptions,
  ) {}

  log(msg: string) {
    this.ns.print(msg)
  }

  toast(msg: string, variant: ToastVariant, duration: number = 1000) {
    this.ns.toast(msg, variant, duration)
  }

  sendDataToManager(data: any) {
    this.ns.writePort(this.options.outputPort, JSON.stringify(data))
  }

  readDataFromManager(): NManager.ManagerData {
    return JSON.parse(this.ns.readPort(this.options.inputPort) || '{}')
  }
}
