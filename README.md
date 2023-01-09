[![CI](https://github.com/onflow/vscode-cadence/actions/workflows/ci.yml/badge.svg)](https://github.com/onflow/vscode-cadence/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/Read%20The-Docs-blue)](https://developers.flow.com/tools/vscode-extension)
<br />
<p align="center">
  <a href="https://docs.onflow.org/vscode-extension/">
    <img src="./images/vscode-banner.png" alt="Logo" width="600" height="auto">
  </a>

  <p align="center">
    <i>Bringing Cadence, the resource-oriented smart contract language of Flow, to your VSCode Editor.</i>
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
#### Install the Cadence extension from the **[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=onflow.cadence)**
#### The extension is also available on the **[Open VSX Registry](https://open-vsx.org/extension/onflow/cadence)**

Once installed, the extension will help you install other dependencies such as the [Flow CLI](https://docs.onflow.org/flow-cli/install/).

## Features

### Start Emulator
Starting the Flow emulator is as simple as one click. You can also switch between accounts and
if your projects contains `flow.json` it gets automatically loaded by the emulator.

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
