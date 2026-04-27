# Copilot Chat RTL Extension

VS Code extension that injects RTL (right-to-left) support into GitHub Copilot Chat for Hebrew, Arabic, and Persian users. Works on VS Code, Cursor, and Antigravity IDEs.

## How it works

The extension patches IDE workbench files on disk:
1. Injects custom CSS + toggle JS into `workbench.html`
2. Removes file checksum from `product.json` to prevent `[Unsupported]` badge
3. Creates backups of modified files for safe restoration
4. Auto-reactivates after IDE updates

## Project structure

```
src/
  extension.ts    — Entry point: commands, activation, auto-reactivate logic
  finder.ts       — Discovers IDE installation paths (VS Code, Cursor, Antigravity)
  injector.ts     — Core logic: addRtl, removeRtl, getStatus, reinjectAssets
  content.ts      — CSS and JS content injected into the workbench
  statusBar.ts    — Status bar item (On/Off/N/A toggle)
  types.ts        — Shared TypeScript types (RtlMode, IdeInstallation, etc.)
  utils.ts        — File I/O helpers
```

## Build & dev

- `npm run build` — Production build (esbuild, minified)
- `npm run watch` — Dev watch mode
- `npm run compile` — Dev build (no minify)
- `npm run package` — Package as .vsix (`npx @vscode/vsce package`)

Build tool: esbuild (configured in `esbuild.mjs`). Output: `dist/extension.js` (CJS bundle, vscode externalized).

## Tech stack

- TypeScript (strict mode, ES2022 target, Node16 modules)
- VS Code Extension API (`@types/vscode ^1.94.0`)
- esbuild for bundling
- No test framework currently configured

## Key conventions

- Extension activates on `onStartupFinished`
- Commands: `copilot-rtl.add`, `copilot-rtl.remove`, `copilot-rtl.status`, `copilot-rtl.toggle`
- State stored via `vscode.Memento` (globalState): mode (`active`/`inactive`) and version tracking
- After activate/deactivate, full IDE restart is required (not just reload window)
- Permission errors show platform-specific guidance (macOS: chown command, Windows: run as admin)

## Publishing

- Publisher: `yechielby`
- Marketplace: VS Code Marketplace
- Versioning: semver in package.json
- Package command: `npm run package` generates `.vsix`
