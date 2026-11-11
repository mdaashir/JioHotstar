# JioHotstar Desktop

A native desktop shell around the official JioHotstar web player. The app owns the window, not the content: the player and account flow are the official site, loaded as remote web content with a Widevine-capable Electron build.

## Scope and guardrails

- Sign in with your own JioHotstar account. Account state lives in the Chromium session partition — the app never reads, stores, or logs credentials, tokens, or cookies.
- DRM is never bypassed, stripped, or circumvented. Content is never scraped, recorded, downloaded, or re-streamed.
- Navigation is allow-listed. Anything outside the approved host set opens in the system browser.

## Requirements

- Node.js 22 or newer
- npm (the ECS Electron build installs from a GitHub tag, not the npm registry)

## Getting started

```bash
npm install
npm run dev
```

## Commands

| Command             | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Run the app with the Vite dev server and HMR           |
| `npm run build`     | Build main, preload, and renderer into `out/`          |
| `npm start`         | Preview the built app                                  |
| `npm run verify`    | Lint, type-check, unit test, and build                 |
| `npm run test:e2e`  | Build, then launch the app with Playwright             |

## Architecture

```
src/main/       main process — window, IPC handlers, navigation guards
src/preload/    contextBridge surface only, no business logic
src/renderer/   React UI for local utility windows (splash, settings, offline)
src/shared/     IPC contracts, constants, and pure navigation policy
```

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` on every window.
- `ipcRenderer` is never exposed. The renderer sees only the narrow, typed `window.jiohotstar` bridge.
- Channel names and payload types live in `src/shared/ipc.ts` so main and preload cannot drift.
- Every main-process concern gets its own module; `src/main/index.ts` only wires lifecycle.

## Electron build

The project depends on the [Castlabs ECS](https://github.com/castlabs/electron-releases) Electron build pinned to `v45.2.1+wvcus`, which supplies the Widevine CDM needed for playback. This build is VMP-signed for development only; production distribution would require castlabs EVS signing.

## Status

Foundation only. The app boots to a splash window and proves out the security baseline, IPC bridge, build pipeline, and navigation policy. The player window, packaging, window state, tray, media keys, and PiP land in their own branches.
