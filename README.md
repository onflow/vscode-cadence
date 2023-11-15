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

#### Cadence Language Server

The Cadence extension provides a language server for Cadence. The language server is responsible for providing language features like code completion, diagnostics, and more.  It is packaged within the Flow CLI and is managed by the extension.

### Debugging
Use the debugger build into VSCode on Cadence files by creating a launch.json file. Make sure to have an emulator connected to enable debugging. 

##### Example launch.json
```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "cadence",
      "request": "launch",
      "name": "Curent file",
      "program": "${file}",
      "stopOnEntry": true
    }
  ]
}
```

#### But wait, there's much more than meets the eye. VSCode Cadence extension also offers:

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
- Flow.json schema validation