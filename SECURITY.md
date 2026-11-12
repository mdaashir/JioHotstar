# Security policy

This app loads a third-party website (`hotstar.com`) inside an Electron shell and
exposes a small IPC bridge to its own local windows. That combination is the whole
attack surface, and the defences around it are deliberate.

## Reporting a vulnerability

Use **GitHub's private reporting**:
<https://github.com/mdaashir/JioHotstar/security/advisories/new>

Please do not open a public issue for a security problem. If private reporting is
unavailable, open an issue that says only that you have a security report and how to
reach you — without details.

This is a volunteer project, so there is no formal response SLA and no bug bounty.
Expect an acknowledgement when the report is seen, and a fix in the next release
rather than a patch branch, since releases are tagged rather than patched in place.

What helps: the version (`Settings` shows it, or the release tag), your OS, and the
steps to reproduce. A proof of concept is welcome if it does not involve real
credentials.

## What is in scope

- **IPC sender validation bypass.** Only local windows may call the bridge; the
  player window has no preload and no bridge at all. Getting a third-party page to
  reach an IPC handler is a real finding.
- **Navigation or allow-list bypass.** Unexpected hosts loading inside the app, or a
  popup escaping the hardened window options.
- **Preload bridge exposure.** Anything on `window.jiohotstar` that reaches more than
  the documented settings and update calls, or that leaks account state.
- **Permission policy bypass.** The app denies every web permission except
  `fullscreen` and `mediaKeySystem`. A page obtaining camera, microphone,
  notifications, clipboard or geolocation would be a finding.
- **Update pipeline.** Anything that lets a malicious payload be installed through
  `electron-updater`, or that defeats the `sha512` verification of the release feed.
- **Credential or session leakage.** The app is not supposed to read, store, or log
  credentials, tokens, or cookies; account state lives in the Chromium session
  partition. Any code path that does otherwise is a finding.

## What is out of scope

- **DRM circumvention.** The project does not bypass, strip, or circumvent Widevine,
  and will not accept changes that do. Requests to help with this are declined.
- **The website's own vulnerabilities.** Issues in the JioHotstar/Hotstar web player
  or their APIs belong to them, not here.
- **"Unsigned build" warnings.** SmartScreen and Gatekeeper warnings are expected and
  documented in [docs/signing.md](docs/signing.md); the builds are not signed by a
  paid certificate. This is a known trade-off, not a vulnerability.
- **The site working differently for you.** Playback or sign-in problems are usually
  server-side or region-specific. Open a normal issue.
- **Reports from a rooted or modified device that require modifying the app binary.**
  Tampering with the asar or the bundled Electron defeats the model by definition.

## What the app does to protect you

| Control                                                                                                                    | Where                                                                        |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` on every window, including popups | `src/main/window/window.manager.ts`, `src/main/security/navigation.guard.ts` |
| No preload and no bridge in the player window — third-party content gets zero surface                                      | `src/main/window/window.manager.ts`                                          |
| Every IPC handler validates the sender is the app's own bundled renderer before doing anything                             | `src/main/security/sender.guard.ts`                                          |
| Navigation allow-listed by hostname; anything else opens in the system browser                                             | `src/shared/navigation.ts`                                                   |
| Webviews blocked; only _non-main-frame_ navigations are blocked, so in-player link clicks still work                       | `src/main/security/navigation.guard.ts`                                      |
| Permissions denied by default, `fullscreen` and `mediaKeySystem` only                                                      | `src/main/security/permission.policy.ts`                                     |
| Settings writes sanitised before they reach the store                                                                      | `src/shared/settings.ts`                                                     |
| Update manifest cryptographically verified by `electron-updater`; no silent installs                                       | `src/main/updater/updater.service.ts`                                        |

## Known limitations, stated honestly

- **Builds are not signed by a paid certificate**, so the OS warns on first launch
  and there is no publisher identity to verify. Check downloads against the release's
  `SHA256SUMS.txt`.
- **macOS builds are ad-hoc signed.** They launch, but cannot self-update, and
  `spctl` will report them as unnotarized. Details in [docs/signing.md](docs/signing.md).
- **The app renders remote content.** It cannot vouch for what `hotstar.com` serves.
  The shell contains it; it does not audit it.
- **Optional AdGuard DNS filtering is off by default** and routes DNS through a third
  party when enabled. It blocks third-party trackers and explicitly does not affect
  JioHotstar's own advertising, which is served from their domains.
