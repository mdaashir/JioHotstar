# DRM verification — Castlabs ECS

Date: 2026-11-11
Branch: `chore/drm-spike`
Build: `electron 45.2.1+wvcus`, Chromium 156.0.8078.75, Node 24.22.1, Windows x64

## Purpose

Confirm that the ECS Electron build can reach the official player and expose a usable Widevine CDM before any player-window code is written. If this failed, the whole "native shell around the official player" approach would have to be re-planned.

## Method

A throwaway probe app (kept outside the repository) started the ECS binary, waited for the component API, then:

1. opened a local `file://` page and negotiated `com.widevine.alpha` with `SW_SECURE_DECODE`;
2. opened a local `http://127.0.0.1` page;
3. opened `https://example.com` over both http and https;
4. opened `https://www.jiohotstar.com/` and repeated the Widevine negotiation there.

No credentials were used and no content was played.

## Results

| Check | Result |
| --- | --- |
| `components.whenReady()` | ready — Widevine CDM `4.10.3112.0` |
| `requestMediaKeySystemAccess('com.widevine.alpha')` on local `file://` | granted |
| `createMediaKeys()` | succeeded |
| Robustness granted | `SW_SECURE_DECODE` |
| `https://www.jiohotstar.com/` | loads, redirects to `https://www.hotstar.com/in/home` |
| Widevine negotiation on the live player page | granted |
| Local `http://127.0.0.1` | loads |
| `https://example.com` | loads |
| Third-party tracking sub-resources (`*.fls.doubleclick.net`) | `ERR_SSL_PROTOCOL_ERROR`, non-main-frame |

## Findings that change the implementation

1. **Gate window creation on `components.whenReady()`.** The `components` API exists in the pinned v45 build, not just v46. Before it resolves the CDM is not registered and `com.widevine.alpha` is refused with "Unsupported keySystem or supportedConfigurations". The first call installs the CDM from the network; subsequent launches read the cached copy. The player window must be created after this resolves, and the splash window needs to cover that first-run delay.
2. **The live entry point redirects to `hotstar.com`.** Loading `www.jiohotstar.com` lands on `www.hotstar.com/in/home`. The navigation allow-list must keep `hotstar.com` (it does) and must allow the cross-host redirect rather than treating it as an external hand-off.
3. **`file://` and localhost are secure contexts.** EME works there, so a local page can be used to assert CDM availability without touching the network. Useful for an automated smoke check.
4. **Do not block sub-resources.** The only network failures observed were third-party measurement frames failing TLS, and they are harmless. A navigation-only allow-list is the correct scope — request-level blocking would have made the page noisier, not safer.
5. **Destroying the last window quits the app by default.** Any probe or test harness must hold the app open explicitly; this cost three debugging cycles.

## What this does not prove

- **Actual playback.** Acquiring a Widevine licence for real content requires an authenticated account and cannot be automated here. It has to be checked manually: sign in inside the shell, play a title, confirm video renders.
- **VMP acceptance by JioHotstar's licence server.** The ECS build is VMP-signed for development only. JioHotstar/Disney+ Hotstar serves Widevine L3 to browsers, so a development-signed client is expected to work, but this is an expectation, not a measurement. If a licence is refused, the options are castlabs EVS signing or falling back to an external-browser hand-off.
- **macOS and Linux.** Probed on Windows only. Linux has no VMP support in ECS at all.
