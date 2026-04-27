# Changelog

All notable changes to the **GitHub Copilot Chat RTL Support** extension will be documented in this file.

## [0.1.3] - 2026-04-27

### Fixed

- RTL toggle button not appearing when VS Code is installed in a non-English locale (Hebrew, Arabic, and others) — selector now falls back to DOM structure when `aria-label` doesn't match

## [0.1.2] - 2026-04-20

### Fixed

- Clear error message with actionable fix when permission denied on macOS (copy `chown` command to clipboard)
- Silent injection failures now show visible error notifications instead of failing quietly
- Auto-reactivation correctly reports errors after IDE restart
- Error logs now written to Output panel instead of invisible console

## [0.1.1] - 2025-03-27

### Fixed

- Fixed mouse text selection in the chat input field — previously, selecting text with the mouse was broken when RTL mode was active
- Inner spans in the input editor now fill the full line width, allowing reliable click-and-drag selection

## [0.1.0] - Initial Release

### Added

- ⇄ Toggle button in Copilot Chat header for RTL/LTR switching
- RTL support for chat messages, markdown content, lists, and paragraphs
- LTR preservation for code blocks, tables, toolbars, and attached context
- Status bar indicator with click-to-toggle
- Auto-reactivation after IDE updates
- Automatic checksum removal to prevent `[Unsupported]` badge
- Support for VS Code, Cursor, and Antigravity IDEs
