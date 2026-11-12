# Packaging architectures

Which architectures this project publishes, why, and what remains impossible. Written
after asking "can we do 32-bit, and arm64 on Linux too?" — both have real answers, and
only one of them is "yes".

## What is published

| Platform | Architecture | Artifact                         |
| -------- | ------------ | -------------------------------- |
| Windows  | x64          | `JioHotstar-Setup-<version>.exe` |
| macOS    | arm64        | `JioHotstar-<version>-arm64.dmg` |
| macOS    | x64          | `JioHotstar-<version>-x64.dmg`   |
| Linux    | x64          | `JioHotstar-<version>.AppImage`  |

## 32-bit is impossible, not skipped

The app does not ship stock Electron. It ships the **Castlabs ECS** build, because
that is what provides Widevine and makes DRM playback work at all. Its published
assets for the pinned `v45.2.1+wvcus` are:

```
darwin-arm64  darwin-x64
linux-arm64   linux-x64
win32-arm64   win32-x64
```

There is **no `ia32` archive on any platform**, and there has not been since Electron
44 retired 32-bit Windows and Linux (Castlabs' v44.10.1 release notes say so
explicitly for `win32-ia32`). `electronDist: node_modules/electron/dist` packages
whatever is installed, so targeting `ia32` would fail rather than produce a working
32-bit build.

A 32-bit artifact would require dropping back to Electron ≤43 **and** losing Widevine,
which is the entire purpose of the app. Not a trade worth making.

## Windows arm64 is possible but must not be published

Castlabs does ship `win32-arm64`, and electron-builder can target it. The blocker is
the update feed, not the build.

`electron-builder` names the Windows update file `latest.yml` regardless of
architecture — the arch suffix is applied **only** for Linux:

```js
// app-builder-lib/out/publish/updateInfoBuilder.js
function getArchPrefixForUpdateFile(arch, packager) {
  if (arch == null || arch === Arch.x64 || packager.platform !== Platform.LINUX) {
    return '' // ← Windows arm64 therefore also gets "latest.yml"
  }
  return arch === Arch.armv7l ? '-arm' : `-${Arch[arch]}`
}
```

So an arm64 Windows job and an x64 Windows job both write `latest.yml`. The publish
job merges `release/*` into one directory, so whichever ran last wins. An installed
x64 copy of the app would then be offered an arm64 installer, which cannot run on it.

Publishing Windows arm64 safely would need one of:

- a custom `app-update.yml` per arch with separate channels, and a matching change to
  how the feed is assembled; or
- publishing arm64 as a manual download with no feed, so it never self-updates.

Neither is done here. **Windows arm64 users can still run the x64 build under emulation**,
which is what Windows 11 on ARM does by default for x64 apps.

## Linux arm64 is possible and is the safest of the three to add

`electron-builder` gives Linux arm64 its own feed, `latest-linux-arm64.yml`, so there is
no collision — an x64 AppImage and an arm64 AppImage can coexist without confusing
either updater. It is not published today because there has been no arm64 Linux build
to test against, and shipping an untested arm64 binary that self-updates is worse than
not shipping one. Adding it is a two-line matrix change plus a CI job, whenever it is
wanted.

## macOS is the exception, and it is already handled

macOS publishes both architectures because macOS refuses to run a mismatched bundle at
all — there is no emulation fallback in the other direction — so an arm64-only build
would lock out every Intel Mac. Both DMGs are ad-hoc signed and **neither self-updates**
(see [signing.md](signing.md)), so the feed collision that blocks Windows arm64 does not
apply: there is no macOS feed to collide.

## What CI checks

`ci.yml` runs `package (<platform>-x64)` on every push: macOS, Windows and Linux each
run the same `dist:` command the release runs, then assert the expected installer
exists. The macOS job additionally asserts the ad-hoc signature is present and verifies.

This exists because `npm run verify` never invokes electron-builder. A broken packaging
config used to be discovered only by the release workflow, with the tag already pushed.

## Summary of the decision

- **32-bit: impossible.** No ECS build exists; the alternative loses Widevine.
- **Windows arm64: buildable, not published.** Would overwrite the x64 update feed.
  x64 runs under emulation instead.
- **Linux arm64: addable safely**, just untested. Not published yet.
- **macOS arm64 + x64: both published**, because macOS cannot emulate downward.
