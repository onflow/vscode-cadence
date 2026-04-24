# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, and others) working in
this repository. Loaded automatically into agent context — keep edits concise.

## Overview

This repo is the official VS Code extension for Cadence, the resource-oriented smart contract
language of the Flow network. It is a TypeScript extension (`publisher: onflow`, extension id
`cadence`, version per `package.json`) bundled with esbuild, ships a TextMate grammar, a
language-client that talks to the Cadence language server embedded in the Flow CLI, a debug
adapter registration (`type: cadence`), a test provider for `.cdc` test files, and a JSON
schema provider that serves a `flow.json` schema via a virtual `cadence-schema://` filesystem.

Targets `vscode ^1.99.3` (`package.json` `engines.vscode`). CI builds on Node 22.x
(`.github/workflows/ci.yml`).

## Build and Test Commands

Install: `npm install` (CI uses `npm ci`).

Build (esbuild bundles `extension/src/main.ts` to `out/extension/src/main.js` and copies
`cadence-parser.wasm` from `@onflow/cadence-parser` into `out/extension/`):

- `npm run esbuild` — one-shot dev build with sourcemaps
- `npm run esbuild-watch` — rebuild on change
- `npm run check` — `tsc -p ./` type-check only (no emit beyond `tsconfig.json` outDir)
- `npm run package` — produces a `.vsix` via `vsce package`
- `npm run install-extension` — `code --install-extension cadence-*.vsix` (depends on prior `package`)
- `npm run package-test` — packages to `./extension/test/fixtures/workspace/cadence.vsix`

Lint (`ts-standard`, `tm-tests/**` is ignored per `package.json` `ts-standard.ignore`):

- `npm run lint`
- `npm run lint-fix`

Tests:

- `npm test` — full integration suite: `clean-test` → `esbuild` → `tsc -p ./` →
  `copy-test-fixtures` → `node ./out/extension/test/run-tests.js`. Runner uses
  `@vscode/test-electron` to download VS Code and launch against
  `./extension/test/fixtures/workspace` (`extension/test/run-tests.ts`). On Linux CI, Xvfb
  is started before this step.
- `npm run test-grammar` — mocha against `tm-tests/grammar.test.mjs`
- `npm run test-grammar-regression` — mocha against `tm-tests/regression.test.mjs`
- `npm run test-grammar-all` — both grammar suites

Dev inner loop (per `CONTRIBUTING.md`): run `tsc -watch -p ./`, then press F5 in VS Code to
launch an Extension Host. Reload the host after TS changes.

## Architecture

Entry point is `extension/src/main.ts` (declared in `package.json` `main` as
`./out/extension/src/main.js`). `extension/src/extension.ts` is the top-level class wired from
`main.ts`. Activation events: `onLanguage:cadence` and `onFileSystem:cadence-schema`
(`package.json` `activationEvents`).

`extension/src/` layout:

- `server/language-server.ts` — spawns and manages the Cadence language server embedded in
  the Flow CLI; uses `vscode-languageclient`.
- `flow-cli/` — `cli-provider.ts`, `cli-selection-provider.ts`, `cli-versions-provider.ts`;
  handles detection, version selection, and the `cadence.changeFlowCliBinary` command.
- `dependency-installer/` — `dependency-installer.ts` + `installers/flow-cli-installer.ts`,
  `installers/homebrew-installer.ts`; drives the `cadence.checkDepencencies` command
  (note: typo is intentional — it matches `command-constants.ts` and `package.json`
  `contributes.commands`).
- `commands/` — `command-controller.ts` registers the three contributed commands
  (`cadence.restartServer`, `cadence.checkDepencencies`, `cadence.changeFlowCliBinary`).
- `test-provider/` — VS Code TestController for `.cdc` test files; `test-runner.ts`,
  `test-resolver.ts`, `test-trie.ts`. Concurrency is bounded by `cadence.test.maxConcurrency`.
- `json-schema-provider.ts` — implements the `cadence-schema://` FileSystemProvider that
  backs `contributes.jsonValidation` for `flow.json` (see `flow-schema.json` at repo root).
- `settings/settings.ts` — reads contributed configuration (`cadence.flowCommand`,
  `cadence.accessCheckMode`, `cadence.customConfigPath`, `cadence.test.maxConcurrency`).
- `telemetry/` — Sentry (`sentry-wrapper.ts`) + Mixpanel (`mixpanel-wrapper.ts`).
- `storage/`, `ui/`, `utils/` — state caching, prompts/notifications, shell exec helpers.
- `crypto-polyfill.ts` — Node crypto shim required by bundled deps.

`extension/language/` — `language-configuration.json`, `syntaxes/cadence.tmGrammar.json`
(TextMate grammar registered under `contributes.grammars`), and
`syntaxes/codeblock.json` (injected into `text.html.markdown` for fenced Cadence blocks).

`extension/test/` — `run-tests.ts` (VS Code test launcher), `index.ts`, `globals.ts`,
`integration/` (numbered `0–6` test files: dependencies, language-server, commands, schema,
test-trie, test-provider), `unit/` (`state-cache.test.ts`, `test-trie.test.ts`),
`fixtures/workspace/` (Cadence files + nested `flow.json`s used by integration tests),
`mock/`.

`tm-tests/` — TextMate grammar tests (`grammar.test.mjs`, `regression.test.mjs`) run with
mocha. CI only runs these when `tm-tests/**` or the `cadence.tmGrammar.json` changes
(paths-filter in `.github/workflows/ci.yml`).

`scripts/` — `extract-contract.mjs`, `print-scopes.mjs` (grammar tooling).

`docker-compose.yml` runs `codercom/code-server` against the test fixtures workspace on
port 8888 for manual browser-based testing.

## Conventions and Gotchas

- Command id `cadence.checkDepencencies` has a typo (`Depencencies`). It appears identically
  in `package.json`, `command-constants.ts` (`CHECK_DEPENDENCIES`), and wherever the command
  is dispatched. Do not "fix" it in isolation — all three must change together or VS Code
  will fail to resolve the contributed command.
- Contributed surface lives in `package.json` `contributes.*`: three commands, four
  `configuration.properties` (`cadence.flowCommand`, `cadence.accessCheckMode`,
  `cadence.customConfigPath`, `cadence.test.maxConcurrency`), one language (`cadence` / `.cdc`),
  two grammars, one debugger (`type: cadence`), one breakpoint binding, and one
  `jsonValidation` entry mapping `flow.json` to `cadence-schema:///flow.json`. Any new
  command/setting must be added here and wired in source.
- The bundle copies `cadence-parser.wasm` from `node_modules/@onflow/cadence-parser/dist/`
  to `out/extension/` during `esbuild-base`. If you change the bundler config, preserve the
  `mkdirp ./out/extension && cp ...wasm` step.
- Tests are numeric-prefix ordered (`0 - dependencies.test.ts` → `6 - test-provider.test.ts`).
  Keep that ordering when adding new integration tests.
- `npm test` always does `clean-test` first (`rimraf ./out`). Do not rely on any artifact
  surviving between test runs.
- `ts-standard` ignores `tm-tests/**`; grammar tests are plain `.mjs` mocha and should not be
  TS-linted.
- CI lints, builds (Linux + Windows), and runs the integration suite on macOS, Ubuntu, and
  Windows. Grammar tests are gated on relevant path changes. Target Node 22.x.
- `engines.vscode` is `^1.99.3` and `@types/vscode` is pinned to `1.99.1`; do not use APIs
  introduced after that baseline.
- The language server is NOT bundled in this repo — it ships with the Flow CLI. The
  extension prompts to install / select a Flow CLI binary on first activation via
  `dependency-installer/`.

## Files Not to Modify

- `out/**` — build output (`.gitignore`).
- `package-lock.json` — regenerated via `npm install` / `npm ci`; don't hand-edit.
- `extension/language/syntaxes/cadence.tmGrammar.json` — changing it triggers the full
  `test-grammar-all` suite; update only alongside new grammar regression fixtures in
  `tm-tests/fixtures/`.
- `flow-schema.json` — consumed by `json-schema-provider.ts`; treat as the contract with
  `flow.json` authors.
