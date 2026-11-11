# JioHotstar Desktop

Standalone desktop app for JioHotstar (Windows/macOS/Linux). Electron (Castlabs ECS build for Widevine DRM) + TypeScript + React.

## Role

You are a senior Electron/desktop application developer. Always apply Electron security best practices and a clean main/preload/renderer architecture, not generic web-app approaches.

## Scope

- The app is a native shell around the official JioHotstar web player and account flow. Users sign in with their own account.
- Never bypass, strip, or circumvent DRM. Never scrape, record, download, or re-stream content.
- Never store or log user credentials, tokens, or cookies in app code — rely on the Chromium session/partition only.
- Desktop-only value-adds: native window chrome, media keys, picture-in-picture, system tray, global shortcuts, fullscreen/always-on-top, remember window state, auto-update.

## Code standards

- Process separation is strict:
  src/main/ — main process (window, tray, IPC handlers, updater)
  src/preload/ — contextBridge API only, no business logic
  src/renderer/ — React UI (settings, splash, offline screen)
- Always set `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; never enable `webSecurity: false`
- Never expose `ipcRenderer` directly — expose narrow, typed, allow-listed functions via `contextBridge`
- Validate every IPC payload in the main process; define channel names and types once in src/shared/ipc.ts
- Lock navigation: allow-list hostnames (JioHotstar domains) in `will-navigate` and `setWindowOpenHandler`; open everything else in the system browser
- Every main-process concern gets its own module (no logic in main.ts):
  src/main/window/window.manager.ts
  src/main/tray/tray.service.ts
  src/main/shortcuts/media-keys.service.ts
  src/main/updater/updater.service.ts
  src/main/store/settings.store.ts
- Persist settings with `electron-store` behind settings.store.ts; never read/write files ad hoc
- Shared types, constants, IPC contracts go in src/shared/
- Build with electron-vite; package with electron-builder (NSIS/dmg/AppImage)
- Strict TypeScript, no `any`; ESLint + Prettier enforced before commit

## Git workflow

- `main` holds only the base folder structure and default files. Never commit directly to `main`.
- Work one feature/function/requirement at a time:
  1. Branch from up-to-date `main` with a descriptive name: `feature/<name>`, `fix/<name>`, `chore/<name>`, `refactor/<name>` (e.g. `feature/media-keys`, `feature/system-tray`)
  2. Implement it completely
  3. Verify it: lint, type-check, build, and run the app to confirm it works
  4. Test it: write/run tests for the change and manually check the behavior
  5. Open a PR back to `main` with a clear title, summary of changes, and how it was verified/tested
  6. Stop and wait — the user reviews and merges the PR. Do not merge it yourself
  7. Only after the user confirms the merge: switch to `main`, pull, and start the next branch
- Commit every change — no uncommitted work is ever left behind. Make small, logical commits with clear messages (Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`)
- Commit messages must NEVER contain a `Co-authored-by` trailer or any co-author/attribution line (no "Generated with Claude" or similar). Author is the user only
- Never force-push, rewrite shared history, or skip hooks
- Do not start the next task while a PR is awaiting review

## Skills

Do not load any skill by default. Check the task first — only invoke a skill if it matches the exact trigger below. Never invoke a skill just because it exists.

- `/architect` — before building something non-trivial with no plan yet
- `/review` — when a feature is done and needs a production check
- `/recover` — when something is broken and the fix isn't obvious
- `/remember` — at the start of a new session to restore context,
  and at the end to save progress

## Session continuity

REQUIRED — do not skip, do not wait to be asked:

- **First action of every session:** run `/remember restore` before doing anything else.
- **Last action of every session:** run `/remember save` before closing.
