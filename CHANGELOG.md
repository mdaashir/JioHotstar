# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.7] - 2026-11-12

**The first genuinely VMP-signed release.** Windows builds now carry a production
Widevine signature that verifies, so a real licence server should accept them instead
of relying on the development signature the ECS build ships with.

### Fixed

- **The VMP signature did not attach to the shipped Windows binary.** Signing in
  `afterPack` produced a `.sig` that failed `evs-vmp verify-pkg` with
  `InvalidSignature`, because electron-builder rewrites the exe's icon and version
  strings after that hook fires — measured as the exe being three seconds newer than
  its own signature. Moved to `afterSign`, which runs once the exe is final.

  A `.sig` file existing is not evidence of signing. The ECS build ships
  `electron.exe.sig` and electron-builder copies it in, so an unsigned build is
  indistinguishable by filename; only `verify-pkg` tells them apart.

### Added

- **Windows and Linux packaging are checked on every pull request**, completing the
  coverage macOS got in 0.1.6. Each runs the same `dist:` command the release uses
  and asserts the installer exists, so a broken packaging config fails on the PR
  rather than on a tag.
- **Widevine VMP signing is wired into the release** through castlabs EVS hooks, and
  is verified rather than assumed. Two hooks, because the order is opposite per
  platform: macOS signs in `afterPack` (VMP must precede the code signature), Windows
  signs in `afterSign` (see above). Without `EVS_ACCOUNT_NAME`/`EVS_PASSWD` both are
  no-ops, so forks and local builds still work.

### Notes

- **macOS VMP signing is verified but does not gate the release.** Its
  VMP-then-ad-hoc-sign ordering cannot be exercised off a macOS runner, and a failing
  macOS job would block the already-verified Windows and Linux artifacts. A failure is
  reported as a warning rather than swallowed.
- **VMP signing needs no system Python.** The hooks try `uv run --with castlabs-evs`,
  then `python`, then `python3`, so the same code works in CI (which has `python` from
  setup-python) and on a machine with only uv.
- **32-bit builds are impossible, not skipped.** Castlabs publishes no `ia32`
  Electron for any platform, and the 32-bit line would mean Electron ≤43 without
  Widevine. See [docs/packaging-architectures.md](docs/packaging-architectures.md).
- **Windows arm64 is buildable but deliberately unpublished.** electron-builder
  writes `latest.yml` for every Windows arch (the arch suffix is Linux-only), so an
  arm64 job would overwrite the x64 update feed and break auto-update for everyone
  installed. x64 runs under emulation on Windows on ARM. Linux arm64 would be safe
  to add — it gets its own feed — but is untested, so it is not shipped yet.

## [0.1.6] - 2026-11-12

A security fix in the IPC sender guard, and the CI that caught a macOS packaging
trap along the way. No user-facing changes.

### Security

- **The IPC sender guard now trusts exactly one local file, not every `file://`
  URL.** `isAppUrl` compared with `startsWith('file://')`, so any local document
  counted as an app window. It now parses the URL, ignores the hash route, and
  compares the decoded path against the bundled `out/renderer/index.html` — with
  case-insensitive matching only on Windows, where the filesystem is. A copy of
  `index.html` planted elsewhere on disk no longer qualifies, and neither does a
  sibling file such as `index.html.bak`.

  Nothing reachable depended on the old behaviour: remote pages cannot set a
  `file://` location, and navigation is host-allow-listed regardless. This is
  hardening, and it removes a rule that was broader than it needed to be.

### Added

- **macOS packaging is checked on every pull request.** A new `package (macos)`
  job runs the same `dist:mac:arm64` command the release uses, then asserts the
  app bundle carries an ad-hoc signature that verifies, and that a DMG was produced.
  Previously a broken packaging config was only discovered by the release workflow,
  with a tag already pushed.

  Building this job turned up a real trap: `electron-builder` skips **all** macOS
  signing on `pull_request` events, leaving only the linker's own signature — which
  is precisely the unsigned state that macOS reports as "damaged and can't be
  opened". The job sets `CSC_FOR_PULL_REQUEST=true` (safe: there is no certificate
  to leak, signing is ad-hoc), and the release workflow now asserts the signature
  too rather than trusting that signing happened.

## [0.1.5] - 2026-11-12

**The first release with macOS builds.** Windows and Linux are unchanged.

### Added

- **macOS builds.** Two DMGs per release: `arm64` for Apple Silicon and `x64` for
  Intel, each built on a matching GitHub runner.
- **Free ad-hoc signing on macOS**, which is what makes the app launchable. An
  unsigned bundle is reported as "damaged and can't be opened" on Apple Silicon
  with no way around it; an ad-hoc signature produces the ordinary "unidentified
  developer" prompt, which the user can allow.

### Notes

- **macOS does not self-update.** Squirrel.Mac checks a downloaded update against
  the running build's signature, and an ad-hoc signature is specific to one build,
  so the check would always fail after the download. The updater is disabled on
  macOS and the UI points at the releases page. A paid Apple Developer ID would fix
  it. Windows and Linux are unaffected.
- **This is the first release built on macOS runners**, so the macOS jobs are
  exercised for the first time here.

## [0.1.4] - 2026-11-12

**Fixes the DNS filter toggle, which was unusable in 0.1.3.** Nothing else
changed; this is the same build with that one defect repaired.

### Fixed

- **The AdGuard DNS toggle snapped back off when clicked.** Every preference is
  written in one place, `applySettingsPatch`, and `dnsFilter` had no branch there.
  The write was accepted by the IPC sanitiser, silently dropped, and the handler
  returned a snapshot still claiming `false`, so the checkbox reverted. Before this
  release the setting could not be enabled from the UI at all — `setDnsFilter` had
  no caller, so only editing `settings.json` by hand turned the filter on.

### Note

Enabling the filter still takes effect only on the **next launch**.
`configureHostResolver` is process-wide and must run before any window exists, so
it cannot be applied live without recreating the session and breaking DRM.

## [0.1.3] - 2026-11-12

**The first release that can update itself.** `v0.1.2` shipped before the updater
existed, so an installed 0.1.2 cannot find or install 0.1.3 — it has to be
downloaded once by hand. Every release after this one updates normally.

### Added

- **Auto-update over GitHub Releases.** The app checks shortly after launch,
  downloads in the background, and never installs silently: a **Restart and
  update** item appears in the tray, and quitting normally installs it too.
- **Optional AdGuard DNS-over-HTTPS filtering**, off by default. Routes app DNS
  through AdGuard, blocking third-party ad and tracking domains. It does **not**
  block JioHotstar's own advertising, which is served from their domains and
  stitched into the DRM stream — the setting says so rather than implying
  otherwise.

### Fixed

- **Release download URLs would have 404'd.** `electron-updater` rewrites spaces to
  hyphens when building URLs, while GitHub rewrites them to dots on upload, so the
  default `JioHotstar Setup <version>.exe` resolved to a name that does not exist.
  Artifacts are now named `JioHotstar-Setup-<version>.exe`, which survives both
  rewrites unchanged.
- **Release feed was never published.** `latest.yml`, `latest-linux.yml` and the
  `.blockmap` files were stripped from releases as "not for humans" — correct
  before auto-update existed, fatal afterwards. They are now attached, and both
  matrix jobs' feeds are assembled deliberately instead of overwriting each other.
- **Packaged app could exit on launch.** `insertCSS` threw
  `Render frame was disposed before WebFrameMain could be accessed` when the player
  page redirected, and the rejection was unhandled. Now caught.
- **Release checksums named files that did not exist**, because the manifest was
  generated before GitHub rewrote the filenames.

### Known limitations

Unchanged: builds are unsigned, playback against real DRM content is still
unverified with a signed-in account, no macOS artifact, and VMP/code signing are
not configured. See `docs/signing.md`.

## [0.1.2] - 2026-11-12

The first release to build and publish successfully. `v0.1.0` and `v0.1.1` were
both tagged but their release runs failed before producing an artifact; both tags
are left in place and this supersedes them.

### Fixed

- **Release builds tried to publish themselves.** With no `publish` key in
  `electron-builder.yml`, the packager detected the GitHub remote and attempted
  its own release upload, failing with `GitHub Personal Access Token is not set`
  and producing no artifacts at all. `--publish never` is now passed, and
  publishing is left to the dedicated job that builds release notes from this
  changelog and attaches checksums.

### Verified end to end

- The gate runs format, lint, type-check, unit tests, build, and the full
  end-to-end suite before anything is packaged.
- Windows installer produced and validated locally with `GH_TOKEN` unset: a real
  PE executable, correct version in the filename, with `.blockmap` and
  `latest.yml` alongside it.

### Known limitations

Unchanged: builds are unsigned, playback against real DRM content is still
unverified with a signed-in account, only Windows and Linux artifacts are
produced, and there is no auto-update.

## [0.1.1] - 2026-11-12

The first release that could be packaged. `v0.1.0` was tagged but its build
failed, so no artifacts were ever published; that tag is left in place and this
supersedes it.

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

[Unreleased]: https://github.com/mdaashir/JioHotstar/compare/v0.1.7...HEAD
[0.1.7]: https://github.com/mdaashir/JioHotstar/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/mdaashir/JioHotstar/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/mdaashir/JioHotstar/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/mdaashir/JioHotstar/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/mdaashir/JioHotstar/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/mdaashir/JioHotstar/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/mdaashir/JioHotstar/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mdaashir/JioHotstar/releases/tag/v0.1.0
