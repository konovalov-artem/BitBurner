export namespace NHacking {
  type AnalyzeData = {
    isHome: boolean
    hostsPath: string[]
    serverType: EServerTypes
  }
  export type AnalyzedServer = Server & AnalyzeData

  export enum EServerTypes {
    HOME = 'home',
    PURCHASED = 'purchased',
    HACKED = 'hacked',
  }

  export interface BatchThreads {
    weakenThreads: number
    growThreads: number
    hackThreads: number
  }

  export interface ScriptLibOptions {
    inputPort: number
    outputPort: number
  }
}
export namespace NManager {
  export interface ScriptTask {
    script: string
    port: number
    priority: number
    condition(data: NManager.ManagerData): boolean
  }
  export interface ManagerData {
    scriptsLimit: number
    player?: Player
    servers: ManagerDataServers
    serverToPrepare?: NHacking.AnalyzedServer
    targetServer?: NHacking.AnalyzedServer
    shareServers: NHacking.EServerTypes[]
    hackServers: NHacking.EServerTypes[]
    previousBatchTime: number

    // hacknet
    hacknet: {
      bestOption: NHacknet.UpgradeOption | null
      waitTill: number
      totalProduction: number
    }
  }

  export interface ManagerDataServers {
    home: NHacking.AnalyzedServer
    purchased: NHacking.AnalyzedServer[]
    hacked: NHacking.AnalyzedServer[]
  }

  export enum ManagerCmdType {
    ADD = 'ADD',
    TOGGLE = 'TOGGLE',
  }
  export interface ManagerCmd {
    cmd: ManagerCmdType
    script?: string
  }
}
export namespace NHacknet {
  export interface UpgradeOption {
    type: UpgradeType
    id?: number
    cost: number
    gain?: number
    roi: number
  }
  type UpgradeType = 'level' | 'cpu' | 'ram' | 'node'
}
