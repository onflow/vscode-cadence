<br />
<p align="center">
  <a href="https://docs.onflow.org/flow-cli/install/">
    <img src="./vscode-banner.svg" alt="Logo" width="290" height="auto">
  </a>

  <p align="center">
    <i>This extension integrates Cadence, the resource-oriented smart contract programming language of Flow, into Visual Studio Code.</i>
    <br />
    <a href="https://docs.onflow.org/vscode-extension/"><strong>Read the docs»</strong></a>
    <br />
    <br />
    <a href="https://github.com/onflow/vscode-cadence/issues">Report Bug</a>
    ·
    <a href="https://github.com/onflow/vscode-cadence/blob/master/CONTRIBUTING.md">Contribute</a>
  </p>
</p>
<br />
<br />

## Installation

### Prerequisites
To install the extension, ensure you have:
- **installed the [Flow CLI](https://docs.onflow.org/flow-cli/install/)**
- **installed the [VS Code](https://code.visualstudio.com/docs/setup/setup-overview)**
- **configured the [code command line interface](https://code.visualstudio.com/docs/setup/mac#_launching-from-the-command-line)**

### Install from marketplace

Install the extension via Visual Studio Code marketplace.
The extension can be found here:

**[Cadence Extension](https://marketplace.visualstudio.com/items?itemName=onflow.cadence)**

https://marketplace.visualstudio.com/items?itemName=onflow.cadence

## Features

### Start Emulator
Starting the Flow emulator is as simple as one click. You can also switch between accounts and
if your projects contains `flow.json` it gets automatically loaded by the emulator.

![start emulator](https://storage.googleapis.com/flow-resources/documentation-assets/vscode-extension/start-emulator-min.gif)

### Deploy Contracts
Deploy contracts to the emulator without leaving the VSCode editor. The address the contract
gets deployed to is returned and available for copying.

![deploy contracts](https://storage.googleapis.com/flow-resources/documentation-assets/vscode-extension/deploy-contract-min.gif)

### Code Generation
Write cadence code with the speed of light and get your product live before
that afternoon coffee. How? Use the snippets provided by VSCode extension.

![code generation](https://storage.googleapis.com/flow-resources/documentation-assets/vscode-extension/code-generation-min.gif)

But wait, there's much more than meets the eye. VSCode Cadence extension also offers:

- Syntax highlighting (including in Markdown code fences)
- Diagnostics (errors and warnings)
- Code completion, including documentation
- Type information on hover
- Go to declaration
- Go to symbol
- Document outline
- Renaming
- Signature help
- Symbol highlighting
- Code actions
- Declare constants, variables, functions, fields, and methods
- Add missing members when implementing an interface
- Apply removal suggestion
- Apply replacement suggestion
- Run the emulator, submit transactions, scripts from the editor
