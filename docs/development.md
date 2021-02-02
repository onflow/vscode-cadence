# Developing the Extension

Note that most editing features (type checking, code completion, etc.) are implemented in the [Cadence Language Server](https://github.com/onflow/cadence/tree/master/languageserver).

## Pre-requisites

- Must have Typescript installed globally: `npm i -g typescript`

## Getting Started
- Run the Typescript watcher: `tsc -watch -p ./`
- Launch the extension by pressing `F5` in VSCode
- Manually reload the extension host when you make changes to TypeScript code

## Configuration for Extension Host if Missing (`launch.json`): 

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "extensionHost",
      "request": "launch",
      "name": "Launch Extension",
      "runtimeExecutable": "${execPath}",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"]
    }
  ]
}
```

## Building

If you haven't already, install the dependencies:

```shell script
npm install
```

Next, build and package the extension:

```shell script
npm run package
```

This will result in a `.vsix` file containing the packaged extension.

Install the packaged extension.

```shell script
code --install-extension cadence-*.vsix
```

Restart VS Code and the extension should be installed!

## FAQ

### How can I debug the Language Server?

It is possible to trace of the communication between the Visual Studio code extension and the Cadence language server.

- Set the setting `Cadence > Trace: Server` to `Verbose`
- In the bottom output view:
  - Select the "Output" tab
  - Select "Cadence" from the drop-down on the right

  If you don't see the output view, run the command `View: Toggle Output`.


Make sure to re-select the lowest "Cadence" entry in the drop-down when the language server is restarted.
