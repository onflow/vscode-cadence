export namespace commandID {
    // Command identifiers for locally handled commands
    export const START_EMULATOR = 'cadence.runEmulator'
    export const STOP_EMULATOR = 'cadence.stopEmulator'
    export const RESTART_SERVER = 'cadence.restartServer'
    export const CREATE_ACCOUNT = 'cadence.createAccount'
    export const SWITCH_ACCOUNT = 'cadence.switchActiveAccount'

    // Command identifiers for commands running in CLI
    export const DEPLOY_CONTRACT = 'cadence.deployContract'
    export const EXECUTE_SCRIPT = 'cadence.executeScript'
    export const SEND_TRANSACTION = 'cadence.sendTransaction'
}
