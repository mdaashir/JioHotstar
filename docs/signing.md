# Signing and distribution

What each signature does, what it costs, and what is actually set up in this
repository. Written after the first release (`v0.1.2`) shipped unsigned.

## Two different signatures

They solve different problems and are easy to confuse.

|                  | What it fixes                                | Needed for                          |
| ---------------- | -------------------------------------------- | ----------------------------------- |
| **Code signing** | OS warnings: SmartScreen, Gatekeeper         | User trust, installability on macOS |
| **VMP signing**  | Widevine licence server rejecting the client | DRM playback in production          |

A build can play content fine while still showing "unknown publisher", and a
build can be signed by a trusted CA while Widevine still refuses it. They are
independent.

## VMP signing — free, and the one that matters most here

Electron for Content Security releases are **pre-signed for development**. That
is why playback works against Widevine UAT and against servers that accept
development clients. Production streaming services generally require a
production VMP signature.

### EVS: castlabs' free signing service

Free, requires only an email address, and it is the supported path — no Google
Widevine licence agreement is needed any more.

```bash
python3 -m pip install --upgrade castlabs-evs

# One-time account creation (interactive, needs email confirmation)
python3 -m castlabs_evs.account signup

# Sign a packaged application
python3 -m castlabs_evs.vmp sign-pkg release/win-unpacked
```

### Order matters, and it differs per platform

- **macOS:** VMP-sign **before** code signing.
- **Windows:** VMP-sign **after** code signing.

Getting this backwards breaks playback even though both signatures "succeeded".

### Verifying it worked

Open the [Widevine VMP Lab](https://castlabs.github.io/wv-vmp-lab/) in the built
app, leave the backend on UAT, and load content. The log reports the status:

| Status                                      | Meaning                                                           |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `PLATFORM_UNVERIFIED`                       | VMP not active. **Expected on Linux**, a problem on Windows/macOS |
| `PLATFORM_TAMPERED`                         | VMP on but signatures broken — playback will fail                 |
| `PLATFORM_SOFTWARE_VERIFIED`                | Valid for temporary licences; enough for streaming                |
| `PLATFORM_SECURE_STORAGE_SOFTWARE_VERIFIED` | Also valid for persistent licences                                |

Linux needs no VMP signature at all: its CDM does not support VMP and does not
require one.

### What it costs

Nothing. It is free for ECS users. Castlabs ask only that you do not create
throwaway accounts and do not re-sign when an existing signature is still valid.

### What is missing to automate it

EVS needs account credentials in CI. Those are secrets only the account owner can
create, so the release workflow does not call it yet. Once an account exists:

```yaml
- name: VMP sign
  env:
    EVS_ACCOUNT_NAME: ${{ secrets.EVS_ACCOUNT_NAME }}
    EVS_PASSWD: ${{ secrets.EVS_PASSWD }}
  run: |
    pip install castlabs-evs
    python3 -m castlabs_evs.vmp sign-pkg --no-ask release/win-unpacked
```

## Code signing — there is no free option

This matters because it is the part people expect to be free and it is not.

### Windows

An Authenticode certificate from a public CA. Since June 2023 the CA/Browser
Forum requires private key material on a **hardware token or cloud HSM**, so
there is no "just a file" option any more.

- OV certificate: roughly $200–400 per year, still builds SmartScreen reputation
  over time.
- EV certificate: roughly $300–600 per year, immediate SmartScreen trust, but
  requires the token to be physically present or an HSM service in CI.

**A self-signed certificate does not help.** It changes the warning text, not the
warning. There is no free path to a clean SmartScreen experience.

When a certificate is available, electron-builder reads it from environment:

```yaml
- name: Build signed
  env:
    CSC_LINK: ${{ secrets.WINDOWS_CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CSC_KEY_PASSWORD }}
  run: npm run dist:win
```

### macOS

Apple Developer Program, **$99/year**. Beyond the fee, a distributable build
needs all of:

1. A `Developer ID Application` certificate.
2. Hardened runtime — already configured here.
3. The `com.apple.security.cs.disable-library-validation` entitlement, which the
   Widevine CDM requires. Already in `build/entitlements.mac.plist`.
4. Notarization with `notarytool` and an app-specific password or API key.
5. Stapling the notarization ticket so it works offline.

Without notarization, Gatekeeper refuses to open the app on any machine that did
not build it.

### macOS also cannot be built here

```
$ npm run dist:mac
⨯ Build for macOS is supported only on macOS
```

`electron-builder` refuses outright on Windows. This is not a configuration
problem to solve. The only routes to a macOS artifact are:

- a `macos-latest` runner in CI, or
- building locally on a Mac.

Both still need the Apple credentials above to produce something a user can open.

Note that the `electronDist` setting makes packaging same-platform only, so a
macOS runner also needs the macOS ECS distribution installed there. Switching to
`electronDownload` with the castlabs mirror would allow cross-platform packaging
but changes how the Electron build is sourced.

## What is set up in this repository today

| Item                            | State                                                |
| ------------------------------- | ---------------------------------------------------- |
| VMP dev signatures              | Present — ECS builds ship pre-signed for development |
| EVS production VMP signing      | **Not set up** — needs an EVS account                |
| Windows Authenticode            | **Not set up** — needs a paid certificate            |
| macOS Apple Developer signing   | **Not set up** — needs a paid membership             |
| macOS notarization              | **Not set up**                                       |
| macOS entitlement for the CDM   | Configured in `build/entitlements.mac.plist`         |
| macOS build runner              | **Absent** — cannot build on Windows                 |
| Checksums published per release | Yes — `SHA256SUMS.txt`                               |

## Verification checklist for a signed build

1. `electron-updater` sees the release (already validated against `v0.1.2`).
2. SmartScreen shows the publisher name, not "unknown publisher".
3. `spctl --assess --type execute JioHotstar.app` passes on macOS.
4. The VMP Lab reports `PLATFORM_SOFTWARE_VERIFIED` or better.
5. Sign in to a real JioHotstar account and confirm a title plays. This has still
   never been done — it is the one open question that signing research cannot
   answer.
