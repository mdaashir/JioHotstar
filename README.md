# JioHotstar Desktop

A native desktop shell around the official JioHotstar web player. The app owns the window, not the content: the player and account flow are the official site, loaded as remote web content with a Widevine-capable Electron build.

## Scope and guardrails

- Sign in with your own JioHotstar account. Account state lives in the Chromium session partition — the app never reads, stores, or logs credentials, tokens, or cookies.
- DRM is never bypassed, stripped, or circumvented. Content is never scraped, recorded, downloaded, or re-streamed.
- Navigation is allow-listed. Anything outside the approved host set opens in the system browser.

## Requirements

- Node.js 22 or newer
- npm (the ECS Electron build installs from a GitHub tag, not the npm registry)
- LF line endings. `.gitattributes` enforces them and Prettier is pinned to `lf`, so a Windows checkout with `core.autocrlf=true` will report formatting failures that are line endings, not code. Run `git config core.autocrlf false` in this repo.

## Getting started

```bash
npm install
npm run dev
```

## Continuous integration and releases

| Workflow         | Trigger                                                         | What it does                                                                                   |
| ---------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `ci.yml`         | Every pull request, and every push to `main` (including direct) | `verify` on Ubuntu **and** Windows, plus `e2e` on Ubuntu                                       |
| `release.yml`    | Pushing a `v*` tag                                              | Gates on `verify`, builds the Windows installer and Linux AppImage, publishes a GitHub Release |
| `dependabot.yml` | Weekly, Monday                                                  | Grouped npm updates and workflow-action updates                                                |

Windows is in the `verify` matrix on purpose: the line-ending failure that once made the whole repo look unformatted only appears there.

`e2e` runs on every change rather than nightly. It launches the real app, downloads the Widevine CDM, and loads the live site, so it is slower and network-dependent — but it is the only check that proves playback still works, and a regression must not reach `main` unnoticed.

### Releases

Merging is routine; tagging is deliberate. `release.yml` runs only on `v*` tags, so publishing an installer is always an explicit act.

The gate runs **format, lint, type-check, unit tests, build, and the full e2e suite** before anything is packaged. `npm run verify` alone never launches the app, so on its own it would happily pass a commit whose window opens but cannot play.

```bash
# 1. Move entries from [Unreleased] into a new version heading in CHANGELOG.md.
# 2. Commit and merge that, and confirm CI is green on main.
git tag -a v0.2.0 -m "JioHotstar Desktop v0.2.0"
git push origin v0.2.0
```

Use an **annotated** tag (`-a`): it records the tagger, date, and message, appears in `git describe`, and is what a real release should be built from rather than a bare ref.

The installer version comes from the tag rather than `package.json`, so the two cannot disagree. The release body is extracted from `CHANGELOG.md` by `scripts/changelog-section.mjs`, so the Release page and the committed changelog cannot drift apart — a missing or empty entry fails the release instead of publishing blank notes.

Release builds are **unsigned**: Windows SmartScreen warns on first run and macOS Gatekeeper refuses to open the app. The release notes say so rather than implying the builds are signed.

### Dependabot exclusions

- **`electron`** is excluded. It is pinned to a Castlabs ECS build with Widevine, and a registry bump would silently break DRM playback. That decision is made by hand.
- **`vite` / `electron-vite` / `@vitejs/plugin-react`** majors are excluded; they move together and conflict when bumped alone.
- **`electron-store`** majors are excluded. Version 9 and later are ESM-only while the main process is CommonJS, so the app fails at startup with `Store is not a constructor`.

The Electron binary is fetched lazily on first launch rather than by `postinstall`, so it is cached under `~/.cache/electron` (Linux) or `%LOCALAPPDATA%\electron\Cache` (Windows) between runs.

## Auto-update

The packaged app checks GitHub Releases shortly after launch and downloads a newer
version in the background. It never installs silently: a **Restart and update**
item appears in the tray once a download completes, and quitting normally installs
it too.

- Checks are delayed by ~8 seconds so they never compete with the Widevine install
  or the first page load.
- Only packaged builds check. In development there is no installed version to
  replace, so the feature reports as unsupported rather than erroring.
- Failures surface as a brief tray tooltip. A failed feed fetch usually means the
  release is missing `latest.yml`, not that the user is offline.

### Why artifact names have no spaces

The Windows installer ships as `JioHotstar-Setup-<version>.exe`. This is required,
not cosmetic: `electron-updater` rewrites spaces to **hyphens** when building the
download URL, while GitHub rewrites them to **dots** on upload. A name containing
spaces resolves to a URL that does not exist and the download 404s. A hyphenated
name survives both rewrites unchanged.

The release workflow therefore attaches `latest.yml`, `latest-linux.yml`, and the
`.blockmap` files alongside the installers. Those are consumed by the updater
rather than by people, but they must be present for updates to work.

## Signing

See [docs/signing.md](docs/signing.md). In short: VMP signing (needed for Widevine
playback in production) is **free** through castlabs EVS; code signing for Windows
and macOS is **not free** and is not configured, so builds are unsigned.

## Commands

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Run the app with the Vite dev server and HMR      |
| `npm run build`      | Build main, preload, and renderer into `out/`     |
| `npm start`          | Preview the built app                             |
| `npm run verify`     | Format, lint, type-check, unit test, and build    |
| `npm run test:e2e`   | Build, then launch the app with Playwright        |
| `npm run package`    | Build an unpacked app into `release/win-unpacked` |
| `npm run dist:win`   | Build the Windows NSIS installer                  |
| `npm run dist:mac`   | Build the macOS dmg (must run on macOS)           |
| `npm run dist:linux` | Build the Linux AppImage (must run on Linux)      |

## Keyboard shortcuts

Handled in the main process, so no page injection is involved. A shortcut is consumed only when it matches exactly; everything else reaches the site untouched.

| Action             | Windows / Linux    | macOS             |
| ------------------ | ------------------ | ----------------- |
| Fullscreen         | `F11`              | `Ctrl` `Cmd` `F`  |
| Always on top      | `Ctrl` `Shift` `T` | `Cmd` `Shift` `T` |
| Picture-in-picture | `Ctrl` `Shift` `P` | `Cmd` `Shift` `P` |

These combinations avoid collisions with the site's own bindings: plain `F11`, `Ctrl+Shift+T`, and `Ctrl+Shift+P` are not used by JioHotstar, whereas `Ctrl+T`, `Ctrl+F`, and `Ctrl+P` are browser or in-page actions we leave alone.

Always-on-top is remembered across launches. Because it would otherwise be invisible state, the window title gains a `— Always on top` suffix while it is off. Only the native title bar text changes; the page and its `document.title` are never modified.

## Tray

A tray icon is created at startup with a menu offering Open, Picture-in-picture, Toggle fullscreen, Keep on top (a checkbox reflecting the real state), Hide scrollbars, and Exit. Clicking the icon restores and focuses the window.

Closing the player hides it to the tray instead of quitting; the app stays alive so playback and the session are preserved. Quitting is always possible from the tray's Exit item, which sets a `before-quit` flag so the close handler stops intercepting. Setting `closeToTray` to `false` in `settings.json` restores plain close-quits behaviour.

The tray icon is the official JioHotstar mark, generated from `resources/jiohotstar.ico` alongside every other icon — see [Branding](#branding).

## Branding

Every icon in the app comes from one source: `resources/jiohotstar.ico`, the official mark published by JioHotstar as the site's favicon. `scripts/generate-icons.mjs` extracts the largest frame (64px, PNG-compressed) and derives the rest, so the window, taskbar, tray, installer, favicon, and splash screen cannot drift apart.

| Output                                 | Size     | Used by                            |
| -------------------------------------- | -------- | ---------------------------------- |
| `build/icon.ico`                       | 16–256px | NSIS installer and uninstaller     |
| `build/icon.png`                       | 512px    | `.exe`, `.dmg`, AppImage           |
| `resources/icon.png`                   | 256px    | Window and taskbar icon            |
| `resources/tray-icon.png`              | 32px     | System tray                        |
| `src/renderer/src/assets/app-icon.png` | 128px    | Splash screen and renderer favicon |

Regenerate after changing the source icon with:

```bash
node scripts/generate-icons.mjs
```

The script decodes the ICO and its PNG frames with no image dependencies, and resamples with alpha-weighted averaging so transparent edges do not darken the mark. Upscaling beyond 64px is unavoidable here — the site publishes no larger raster or SVG — so the 512px installer icon is a smooth interpolation of the official artwork rather than a true high-resolution original.

`build/icon.ico` is a real multi-size ICO containing PNG-compressed frames from 16 to 256px. NSIS requires a genuine `.ico`: pointing `installerIcon` at the PNG fails the build with `invalid icon file`.

## Scrollbars

Scrollbars are hidden by default while scrolling stays fully functional — wheel, trackpad, keyboard, and touch all work, and the reclaimed ~15px goes back to the content.

This uses `webContents.insertCSS()` with a small stylesheet, so nothing executes inside the page and no preload is attached to it. `overflow: hidden` is deliberately **not** used, since that would disable scrolling outright. The stylesheet is re-applied after each navigation, because a new document starts clean.

Toggle it from the tray under **Hide scrollbars**. Setting `hideScrollbars` to `false` in `settings.json` restores the native bar.

The site already hides scrollbars on its own inner carousels; only the root scroller is affected by this change.

## Settings

Open from the tray under **Settings…**. A local window lists every preference with its current value; changes apply immediately and are written to `settings.json`.

| Preference           | Default | Effect                                   |
| -------------------- | ------- | ---------------------------------------- |
| Keep window on top   | off     | Pins the player above other windows      |
| Close to tray        | on      | Closing keeps playback alive in the tray |
| Hide scrollbars      | on      | Hides the bar; scrolling still works     |
| Remember window size | on      | Reopens at the last size and position    |

The settings window uses the same preload bridge as the splash and error screens. The player still has **no** preload, so the third-party page cannot reach settings at all.

Every write is validated in the main process: only known keys with boolean values survive, so a renderer cannot use the settings channel to write arbitrary data. The main process then applies the change to its live effect — pinning the window, toggling the stylesheet — rather than only persisting it.

## Media keys

`MediaPlayPause` and `MediaStop` are registered with `globalShortcut` and forwarded to the player page, which acts on the largest playing `<video>`. They work while the app is in the background.

**Next and previous track are deliberately not registered.** Skipping episodes would require driving the site's own controls, and there is no reliable way to do that from outside its React tree. Registering the keys and doing nothing would be worse than leaving them to the OS, so they stay unclaimed.

The action script is injected with `userGesture: true`, because `play()` is otherwise refused by the autoplay policy after a pause. It picks the largest video with a decoded frame, prefers one that is playing, and reports `no-video` rather than throwing when nothing is loaded — that surfaces as a brief tray tooltip.

Registrations are released on `before-quit`. A leaked global shortcut keeps swallowing the user's media keys in every other application, which is a bug the user cannot work around.

`navigator.mediaSession` exists on the site, but its `setActionHandler` callbacks cannot be invoked from outside the page, so this feature drives the media element directly instead.

## Picture-in-picture

Uses Chromium's native video PiP, so the floating window is the operating system's own — draggable, resizable, and kept above other windows by the platform. Available from the tray menu and from `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS); one action toggles in and out.

The toggle runs a small read-only script in the player page, injected with Electron's `userGesture` flag because `requestPictureInPicture` requires user activation. It picks the largest playing video, exits first if already in PiP, and never modifies the page or fetches anything.

If there is nothing to play, or the video refuses PiP, the tray tooltip reports it briefly rather than failing silently. There is no on-page toast, because injecting UI into DRM content is exactly what this app avoids.

**Document PiP is not usable here.** `documentPictureInPicture` exists on `window` in Electron but rejects with `InvalidStateError: no window`, since there is no Chromium compositor overlay to host it. Video PiP is unaffected and is what this feature relies on.

## Architecture

```
src/main/       main process — window, IPC handlers, playback, startup, settings, guards
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

## Preferences

Window geometry, always-on-top, close-to-tray, and scrollbar visibility are persisted with `electron-store` in `<userData>/settings.json`, behind `src/main/store/settings.store.ts`. Nothing about the account, the session, or playback is ever written to settings.

Saved bounds are validated on read: values that are malformed are discarded, sizes are clamped to the minimum window size and the primary display, and a window that would land off-screen (for example after a monitor is unplugged) is re-centred instead. Bounds are not recorded while the window is fullscreen, so entering fullscreen never overwrites the restore size.

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

The app opens a splash window, prepares the Widevine component, then hands off to the JioHotstar player. Navigation is allow-listed, popups share the same guarded policy, and failed loads fall back to a local screen with a retry action. The player window remembers its size, position, and maximized state, supports native fullscreen, always-on-top, and native picture-in-picture from the keyboard, hides scrollbars without breaking scrolling, responds to the system media keys, and lives in the tray with close-to-tray behaviour. Preferences are edited in a local settings window. Windows installers build and the packaged app opens the player.

## Startup sequence

1. Splash window renders immediately.
2. `components.whenReady()` installs or verifies the Widevine CDM (up to 60 seconds).
3. The player window loads `https://www.jiohotstar.com/`, which redirects to `hotstar.com`.
4. The splash closes once the player has painted, or an error screen replaces it if either step fails.
