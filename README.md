<p align="center">
  <a href="https://docs.onflow.org/vscode-extension/">
    <img src="./images/vscode-banner.png" alt="Logo" width="600" height="auto">
  </a>

  <p align="center">
    <i>Bringing Cadence, the resource-oriented smart contract language of Flow, to your VSCode Editor.</i>
    <br />
  </p>
</p>
<br />

[![CI](https://github.com/onflow/vscode-cadence/actions/workflows/ci.yml/badge.svg)](https://github.com/onflow/vscode-cadence/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/Read%20The-Docs-blue)](https://developers.flow.com/tools/vscode-extension)
[![Report Bug](https://img.shields.io/badge/-Report%20Bug-orange)](https://github.com/onflow/vscode-cadence/issues)
[![Contribute](https://img.shields.io/badge/-Contribute-purple)](https://github.com/onflow/vscode-cadence/blob/master/CONTRIBUTING.md)

## Installation
#### Install the Cadence extension from the **[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=onflow.cadence)**
#### The extension is also available on the **[Open VSX Registry](https://open-vsx.org/extension/onflow/cadence)**

Once installed, the extension will help you install other dependencies such as the [Flow CLI](https://docs.onflow.org/flow-cli/install/).

## Features

### Start Emulator
A Flow emulator is hosted for you on the language server once the extension is loaded. You can also switch between accounts and
if your projects contains `flow.json` it gets automatically loaded by the emulator.

#### Self-hosted emulator
You may also choose to run your own Flow emulator locally. The extension will detect your running local emulator and connect to it automatically.

### Deploy Contracts
Deploy contracts to the emulator without leaving the VSCode editor. The address the contract
gets deployed to is returned and available for copying.

![deploy contracts](./docs/deploy_contracts.gif)

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
