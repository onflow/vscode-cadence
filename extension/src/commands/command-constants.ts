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

// Command identifires for dependencies
export const CHECK_DEPENDENCIES = 'cadence.checkDepencencies'

// Copy active account to clipboard
export const COPY_ACTIVE_ACCOUNT = 'cadence.copyActiveAccount'

// Cadence Lint
export const CADENCE_LINT = 'cadence.cadenceLint'
