# vscode-cadence — Cadence Language Extension for VS Code

<p align="center">
  <a href="https://developers.flow.com/tools/vscode-extension">
    <img src="./images/vscode-banner.png" alt="vscode-cadence banner" width="600" height="auto">
  </a>

  <p align="center">
    <i>Bringing Cadence, the resource-oriented smart contract language of the Flow network, to your VS Code editor.</i>
    <br />
  </p>
</p>
<br />

[![License](https://img.shields.io/github/license/onflow/vscode-cadence)](https://github.com/onflow/vscode-cadence/blob/master/LICENSE)
[![Release](https://img.shields.io/github/v/release/onflow/vscode-cadence)](https://github.com/onflow/vscode-cadence/releases)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/onflow.cadence?label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=onflow.cadence)
[![Discord](https://img.shields.io/badge/Discord-Flow-5865F2)](https://discord.gg/flow)
[![Built on Flow](https://img.shields.io/badge/Built%20on-Flow-00EF8B)](https://flow.com)

## TL;DR

- **What:** The official Visual Studio Code extension for Cadence, with syntax highlighting, diagnostics, code completion, a language server managed via Flow CLI, a debugger, and flow.json schema validation.
- **Who it's for:** Developers writing Cadence smart contracts on the [Flow network](https://flow.com) using VS Code or compatible editors.
- **Why use it:** Rich editing support for Cadence files (`.cdc`), inline diagnostics, go-to-definition, hover types, code actions, and integrated debugging against a Flow emulator.
- **Status:** See [Releases](https://github.com/onflow/vscode-cadence/releases) for the latest version.
- **License:** Apache-2.0.
- **Related repos:** [onflow/cadence](https://github.com/onflow/cadence) · [onflow/flow-cli](https://github.com/onflow/flow-cli) · [onflow/flips](https://github.com/onflow/flips)
- The reference VS Code extension for Cadence for the Flow network, open-sourced since 2019.

## Installation
#### Install the Cadence extension from the **[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=onflow.cadence)**
#### The extension is also available on the **[Open VSX Registry](https://open-vsx.org/extension/onflow/cadence)**

Once installed, the extension will help you install other dependencies such as the [Flow CLI](https://developers.flow.com/tools/flow-cli).

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

## FAQ

### What is Cadence?

Cadence is the resource-oriented smart contract programming language used on the Flow network. The Cadence language reference is hosted at [cadence-lang.org](https://cadence-lang.org).

### Which editors are supported?

This extension targets [Visual Studio Code](https://code.visualstudio.com/). It is also published to the [Open VSX Registry](https://open-vsx.org/extension/onflow/cadence) for VS Code-compatible editors.

### Does the extension bundle the Cadence language server?

Yes. The Cadence language server is packaged with the Flow CLI, and the extension manages the dependency for you after install.

### How do I debug a Cadence program?

Create a `launch.json` in your workspace with a `cadence` launch configuration (see the example above) and make sure a Flow emulator is running.

### How do I install the extension?

Install it from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=onflow.cadence) or the [Open VSX Registry](https://open-vsx.org/extension/onflow/cadence).

### Where do I report a bug or request a feature?

Open an issue on the [vscode-cadence issue tracker](https://github.com/onflow/vscode-cadence/issues).

## About Flow

This repo is part of the [Flow network](https://flow.com), a Layer 1 blockchain built for consumer applications, AI Agents, and DeFi at scale.

- Developer docs: https://developers.flow.com
- Cadence language: https://cadence-lang.org
- Community: [Flow Discord](https://discord.gg/flow) · [Flow Forum](https://forum.flow.com)
- Governance: [Flow Improvement Proposals](https://github.com/onflow/flips)