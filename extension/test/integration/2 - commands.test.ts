import { MaxTimeout } from '../globals'
import { before, after } from 'mocha'
import * as assert from 'assert'
import * as commands from '../../src/commands/command-constants'
import { CommandController } from '../../src/commands/command-controller'
import { DependencyInstaller } from '../../src/dependency-installer/dependency-installer'
import * as sinon from 'sinon'

suite('Extension Commands', () => {
  let checkDependenciesStub: sinon.SinonStub
  let mockDependencyInstaller: DependencyInstaller
  let commandController: CommandController

  before(async function () {
    this.timeout(MaxTimeout)

    // Initialize the command controller & mock dependencies
    checkDependenciesStub = sinon.stub()
    mockDependencyInstaller = {
      checkDependencies: checkDependenciesStub
    } as any
    commandController = new CommandController(mockDependencyInstaller)
  })

  after(async function () {
    this.timeout(MaxTimeout)
  })

  test('Command: Check Dependencies', async () => {
    assert.ok(commandController.executeCommand(commands.CHECK_DEPENDENCIES))

    // Check that the dependency installer was called to check dependencies
    assert.ok(checkDependenciesStub.calledOnce)
  }).timeout(MaxTimeout)
})
