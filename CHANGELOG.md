# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-11-12

The first release that can actually be packaged. `v0.1.0` was tagged but its
build failed, so no artifacts were ever published; that tag is left in place and
this supersedes it.

### Fixed

- **Release builds failed with `The specified electronDist does not exist`.** The
  ECS Electron binary downloads lazily on first launch rather than during
  `postinstall`, so after a clean `npm ci` there was no
  `node_modules/electron/dist` for `electron-builder` to package. The release
  build now resolves the Electron module first and verifies `dist` exists before
  running the packager.
- **e2e raced the app's window lifecycle.** The branding test used
  `firstWindow()`, which can return the player or a splash about to be destroyed,
  and the window scan read URLs from webContents whose render frame had been torn
  down (`Render frame was disposed before WebFrameMain could be accessed`). Both
  now skip windows that disappear and match on an unambiguous marker.

### Changed

- The release gate runs the **full e2e suite** in addition to `verify`. `verify`
  never launches the app, so on its own it would pass a commit whose window opens
  but cannot play.
- Release notes are extracted from this changelog by
  `scripts/changelog-section.mjs`, so the Release page and the changelog cannot
  drift apart. A missing entry fails the release rather than publishing blank
  notes.

### Known limitations

Unchanged from 0.1.0: builds are unsigned, playback against real DRM content is
still unverified with a signed-in account, only Windows and Linux artifacts are
produced, and there is no auto-update.

## [0.1.0] - 2026-11-12

First release. A native desktop shell around the official JioHotstar web player,
built on a Castlabs ECS Electron build so Widevine-protected playback works.

### Added

- **Player window** that loads the official site and hands off from a splash
  screen once the Widevine component is ready. The window is only created after
  `components.whenReady()` resolves, because the CDM is unregistered before that.
- **System tray** with Open, Picture-in-picture, Toggle fullscreen, Keep on top,
  Hide scrollbars, Settings, and Exit. Closing hides to the tray so playback and
  the session survive.
- **Window state memory**: size, position, and maximized state are restored, with
  saved bounds validated against the connected displays so a window cannot be
  restored off-screen after a monitor is removed.
- **Keyboard shortcuts**: `F11` fullscreen, `Ctrl+Shift+T` always-on-top,
  `Ctrl+Shift+P` picture-in-picture (`Ctrl+Cmd+F`, `Cmd+Shift+T`,
  `Cmd+Shift+P` on macOS). Matched in the main process and consumed only on an
  exact match, so the site keeps every other keystroke.
- **Native picture-in-picture** using Chromium's own PiP window. Toggles on the
  largest playing video and reports when there is nothing to pin.
- **System media keys** for play/pause and stop, registered globally so they work
  while the app is in the tray.
- **Settings window** listing every preference with its current value. Changes
  apply immediately and are written to `settings.json`.
- **Scrollbar hiding** that keeps scrolling fully functional — wheel, trackpad,
  keyboard, and touch — by hiding the bar rather than disabling overflow.
- **Branded icons** for window, taskbar, tray, installer, favicon, and splash,
  all generated from the official JioHotstar mark.

### Security

- `contextIsolation`, `sandbox`, and `webSecurity` enabled on every window, with
  `nodeIntegration` disabled throughout.
- The player window has **no preload**, so third-party content has no bridge
  surface at all. Only local windows see `window.jiohotstar`.
- Every IPC handler verifies the sender is a local renderer before acting.
- Settings writes are validated in the main process: only known keys carrying
  boolean values are accepted.
- Navigation is allow-listed by hostname. Anything outside the allow-list opens
  in the system browser, and popups inherit the same policy.
- Permissions are denied by default; only `fullscreen` and `mediaKeySystem` are
  granted.
- Global media-key registrations are released on quit, so they cannot keep
  capturing keys in other applications.

### Fixed

- The NSIS installer failed with `invalid icon file` because `installerIcon`
  pointed at a PNG. A real multi-size `.ico` is now generated and used.
- Window bounds were persisted while fullscreen, which overwrote the restore
  size. Persistence now skips while the window is fullscreen.
- Entering fullscreen could previously leave the app unquittable through the tray
  if close-to-tray was enabled; a quit flag now releases the close handler.

### Known limitations

- **Unsigned builds.** Windows SmartScreen warns on first run and macOS
  Gatekeeper refuses to open the app. Production distribution of the ECS build
  would also need castlabs EVS signing for VMP.
- **Playback is unverified against a real account.** The app reaches the player
  and the CDM negotiates `SW_SECURE_DECODE`, but licensing real content requires
  a signed-in subscription and cannot be automated.
- **macOS and Linux artifacts are configured but not released.** Each must be
  built on its own platform; only Windows and Linux installers are produced.
- **No auto-update.** There is no publish target or signing identity configured
  for the updater.
- **Next/previous media keys are not registered.** Skipping episodes would need
  to drive the site's own controls, which is not reliable from outside its tree.
- **Document picture-in-picture is unavailable** in Electron; video PiP is used
  instead.

[Unreleased]: https://github.com/mdaashir/JioHotstar/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/mdaashir/JioHotstar/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mdaashir/JioHotstar/releases/tag/v0.1.0
