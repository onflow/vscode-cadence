# Cadence Visual Studio Code Extension

This extension integrates [Cadence](https://github.com/onflow/cadence), the resource-oriented smart contract programming language of [Flow](https://www.onflow.org/), into [Visual Studio Code](https://code.visualstudio.com/).
It provides features like syntax highlighting, type checking, code completion, etc. 

## Features

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

## Installation

To install the extension, ensure you [have VS Code installed](https://code.visualstudio.com/docs/setup/mac)
and have configured the [`code` command line interface](https://code.visualstudio.com/docs/setup/mac#_launching-from-the-command-line).

### Using the Flow CLI

The recommended way to install the latest released version is to use the Flow CLI.

First, [install the Flow CLI](https://github.com/onflow/flow-cli#installation).

Check that it's been installed correctly.

```shell script
flow version
```

Next, use the CLI to install the VS Code extension.

```shell script
flow cadence install-vscode-extension
```

Restart VS Code and the extension should be installed!

