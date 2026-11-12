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

EVS needs an account and credentials in CI. Account creation is a one-off, and it is
scripted in this repository rather than done by hand:

1. **Create the account.** Actions → **evs-account** → Run workflow, `mode=help` to
   print the CLI flags, then `mode=signup`.
2. **Confirm it.** Castlabs email a code. Re-run with `mode=confirm` and that code.
3. **Add the secrets** `EVS_ACCOUNT_NAME`, `EVS_PASSWD` and (for signup only)
   `EVS_EMAIL` as repository secrets.

After that, releases VMP-sign automatically and no further action is needed.

### Where signing happens, and why it is a hook

`scripts/vmp-after-pack.cjs` is wired as electron-builder's `afterPack` hook, not as a
separate release step. The ordering is the whole reason:

| Platform | Order                                                  |
| -------- | ------------------------------------------------------ |
| Windows  | code sign → **VMP sign** → NSIS packages the installer |
| macOS    | **VMP sign** → code sign (ad-hoc)                      |
| Linux    | neither; the CDM does not use VMP                      |

`afterPack` fires before code signing and before the installer is built, which
satisfies both. Signing the _output_ afterwards would be wrong on both platforms:
on macOS it would replace the ad-hoc signature, producing the "damaged and can't be
opened" bundle, and on Windows the `.exe` would already contain the unsigned
directory.

Without `EVS_ACCOUNT_NAME` and `EVS_PASSWD` the hook logs and returns, so local
builds and forks still work. With them set, a signing failure throws and fails the
release — shipping a build that silently lost its Widevine signature is worse than
not shipping.

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

#### What we ship instead: ad-hoc signing

macOS builds are **ad-hoc signed** (`mac.identity: "-"`). This is the free
option, and it is not the same as leaving the build unsigned:

| Approach                 | Result on Apple Silicon                               |
| ------------------------ | ----------------------------------------------------- |
| `identity: null` (skip)  | "damaged and can't be opened" — **no bypass exists**  |
| `identity: "-"` (ad-hoc) | "unidentified developer" — user allows it in Settings |

An unsigned bundle has only linker-provided signatures with no sealed resources,
which macOS treats as corrupt. Ad-hoc signing runs the real signing pipeline, so
the bundle is structurally valid. It is the difference between a scary dialog and
an unusable app.

Ad-hoc signing requires `com.apple.security.cs.disable-library-validation` when
hardened runtime is on, because Electron's pre-built frameworks carry Apple's
Team ID. That entitlement is already in `build/entitlements.mac.plist`.

#### macOS cannot self-update, and that is a signing consequence

Squirrel.Mac validates a downloaded update against the **running** app's
code-signing designated requirement. An ad-hoc signature is a cdhash of that
exact build, so the requirement never matches the next version and every update
fails with `code signature did not pass validation` — after the download has
already completed.

`canCheckForUpdates` therefore returns false on `darwin`, and the UI says to
update from the releases page. This is deliberate: the alternative is a Restart
button that always fails. A paid Developer ID certificate would make self-update
work, because then the designated requirement is the Team ID rather than one
build's hash.

### macOS now builds in CI

Two jobs, because `electronDist` packages the Electron distribution installed on
the runner and that is a single architecture:

| Runner           | Arch  | Asset                            |
| ---------------- | ----- | -------------------------------- |
| `macos-latest`   | arm64 | `JioHotstar-<version>-arm64.dmg` |
| `macos-15-intel` | x64   | `JioHotstar-<version>-x64.dmg`   |

Note that `macos-13` is retired and `macos-14` was retired on 2026-11-02; the
Intel label is `macos-15-intel`. GitHub has announced that Intel macOS runners
end in Fall 2027, so the x64 job has a finite life.

A universal binary is possible in principle but needs both Electron
distributions merged, which electron-builder cannot do from one `electronDist`.

## What is set up in this repository today

| Item                            | State                                                |
| ------------------------------- | ---------------------------------------------------- |
| VMP dev signatures              | Present — ECS builds ship pre-signed for development |
| EVS production VMP signing      | **Not set up** — needs an EVS account                |
| Windows Authenticode            | **Not set up** — needs a paid certificate            |
| macOS ad-hoc signing            | **Configured** — `mac.identity: "-"`, free           |
| macOS Developer ID signing      | **Not set up** — needs a paid membership             |
| macOS notarization              | **Not set up** — requires Developer ID               |
| macOS entitlement for the CDM   | Configured in `build/entitlements.mac.plist`         |
| macOS build runner              | **Two jobs** — arm64 and x64 in the release workflow |
| macOS self-update               | **Disabled** — ad-hoc signature cannot satisfy it    |
| Windows/Linux self-update       | Yes — validated end to end from 0.1.3 to 0.1.4       |
| Checksums published per release | Yes — `SHA256SUMS.txt`                               |

## Verification checklist for a signed build

1. `electron-updater` sees the release (validated end to end: an installed 0.1.3
   found, downloaded and installed 0.1.4).
2. SmartScreen shows the publisher name, not "unknown publisher".
3. `spctl --assess --type execute JioHotstar.app` passes on macOS — this needs
   Developer ID; an ad-hoc build still reports "unnotarized" here.
4. `codesign --verify --deep --strict JioHotstar.app` passes on an ad-hoc build
   (it verifies structure, not trust).
5. The VMP Lab reports `PLATFORM_SOFTWARE_VERIFIED` or better.
6. Sign in to a real JioHotstar account and confirm a title plays — **done**,
   confirmed working on the Windows build.
