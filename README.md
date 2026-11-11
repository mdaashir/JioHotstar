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
| `npm run package`   | Build an unpacked app into `release/win-unpacked`      |
| `npm run dist:win`  | Build the Windows NSIS installer                       |
| `npm run dist:mac`  | Build the macOS dmg (must run on macOS)                |
| `npm run dist:linux`| Build the Linux AppImage (must run on Linux)           |

## Architecture

```
src/main/       main process — window, IPC handlers, playback, startup, guards
src/preload/    contextBridge surface only, no business logic
src/renderer/   React UI for local windows (splash, error screen, eventually settings)
src/shared/     IPC contracts, constants, and pure policies
```

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` on every window.
- The player window gets **no preload**. Third-party content has no bridge surface at all; only local windows see `window.jiohotstar`.
- `ipcRenderer` is never exposed, and every handler verifies the sender is a local window before acting.
- Permissions are denied by default; only `fullscreen` and `mediaKeySystem` are granted.
- Channel names and payload types live in `src/shared/ipc.ts` so main and preload cannot drift.
- Every main-process concern gets its own module; `src/main/index.ts` only wires lifecycle.

## Packaging

`electron-builder` packages the ECS build, not stock Electron: `electronDist` points at `node_modules/electron/dist`, so whatever `npm` installed is what ships. The side effect is that a build only works on the platform matching that installed distribution — cross-platform builds would need the `electronDownload` mirror mode instead. CI would have to install the matching ECS distribution per runner.

Artifacts land in `release/`, which is git-ignored.

- **Unsigned.** No certificate is configured, so Windows SmartScreen warns and macOS Gatekeeper blocks. Signing and notarization are not set up.
- **Default icon.** No application icon is supplied, so the Electron icon is used. Brand assets are a deliberate open decision, not an oversight.
- **macOS entitlements.** `build/entitlements.mac.plist` disables library validation; without it the Widevine CDM cannot load under hardened runtime.
- **No auto-update.** There is no publish target or signing identity yet, so `electron-updater` is not wired in.
- Only `out/` and `package.json` are packed. React lives in devDependencies because Vite bundles it into the renderer, which keeps the asar at roughly 660 kB instead of 9 MB.

## Electron build

The project depends on the [Castlabs ECS](https://github.com/castlabs/electron-releases) Electron build pinned to `v45.2.1+wvcus`, which supplies the Widevine CDM needed for playback. This build is VMP-signed for development only; production distribution would require castlabs EVS signing.

## Status

The app opens a splash window, prepares the Widevine component, then hands off to the JioHotstar player. Navigation is allow-listed, popups share the same guarded policy, and failed loads fall back to a local screen with a retry action. Windows installers build and the packaged app opens the player. Window state, tray, media keys, and picture-in-picture land in their own branches.

## Startup sequence

1. Splash window renders immediately.
2. `components.whenReady()` installs or verifies the Widevine CDM (up to 60 seconds).
3. The player window loads `https://www.jiohotstar.com/`, which redirects to `hotstar.com`.
4. The splash closes once the player has painted, or an error screen replaces it if either step fails.
