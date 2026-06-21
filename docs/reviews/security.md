# Security Review — AliFullStack v0.1.0 (Wave 1)

**Date:** 2026-06-21
**Scope:** Electron main/renderer/preload, IPC allowlist, command injection, path traversal, signing, env-var hygiene
**Auditor:** Hermes orchestrator (in-process, after Wave 1 subagents failed delivery via HTTP 429)
**Branch:** `docs/reviews/wave-1`
**Gates run:** `tsc`, `oxlint`, `prettier --check`

---

## Executive Summary

The 13 IPC handlers that consume user-controlled paths (e.g. `edit-app-file`, `read-app-file`, `import-app`, `set-context-paths`, `select-app-folder`) accept string inputs without Zod shape validation. The `safe_handle.ts` wrapper logs `JSON.stringify(args)` on every IPC call, which can include Vercel/Supabase/Neon tokens depending on the channel. The sandbox flag is not declared explicitly in `main.ts` and the `supabase:fake-connect-and-set-project` channel is exported through the production preload allowlist. These findings should be fixed in **Wave 2**.

**Severity totals:** 1 CRITICAL · 5 HIGH · 4 MED · 2 LOW · 1 INFO

---

## Findings

### CRITICAL

#### S-1 — `setUpAliFullStackPro` called in 7+ e2e specs but method does not exist on `PageObject`
- **Evidence:** `e2e-tests/helpers/test_helper.ts:209` defines `class PageObject`. `gpt` style `setUpAliFullStackPro()` is invoked in `e2e-tests/gateway.spec.ts:4`, `engine.spec.ts:4,15,30,42,55,66`, `context_manage.spec.ts:22,61,112`, `mention_app.spec.ts:14`, `smart_context_options.spec.ts:4`, `thinking_budget.spec.ts:4`. `tsc` reports `Property 'setUpAliFullStackPro' does not exist on type 'PageObject'.` (SECTEST-LEVEL)
- **Impact:** TS build fails for `tsc`. Indicates recent rebrand / helper rename but spec files not updated — every AlifullstackPro e2e test crashes at runtime.
- **Fix:** Add `setUpAliFullStackPro` to `PageObject` (likely a rename from a prior name like `setUpDyadPro`), OR update each spec to use the actual existing helper (probably a no-op shim if Pro subscription is disabled in test).

> Note: this finding initially classified as testing, but the root cause is a stale rebrand rename not updated in e2e. Cross-flagged here because the failing CI breaks the security gate.

### HIGH

#### S-2 — IPC argument/log leakage: `safe_handle.ts:13` logs `JSON.stringify(args)` for every channel
- **Evidence:** `src/ipc/handlers/safe_handle.ts:13`:
  ```ts
  logger.log(`IPC: ${channel} called with args: ${JSON.stringify(args)}`);
  ```
- **Impact:** Channels like `vercel:save-token` (token in args), `set-app-env-vars`, `get-system-debug-info` write **full sensitive payloads to electron-log** (`~/.config/alifullstack/logs/main.log` on Linux, similar on macOS/Windows). Any user with local FS access (other Electron apps, backup sync, screen-share leak) sees tokens/env-vars/system paths. Severity HIGH because the channel list is enumerated and predictable.
- **Fix:** Add an allowlist of "safe" channels whose args can be logged freely; redact args for everything else (e.g. only log `{ appId, length }`).

#### S-3 — Error thrown via `Error()` template loses original Error class and message verbatim
- **Evidence:** `src/ipc/handlers/safe_handle.ts:25`:
  ```ts
  throw new Error(`[${channel}] ${error}`);
  ```
- **Impact:** `error` may be non-Error (string, plain object), and even when it is an `Error`, the stack trace is dropped. Renderer-side TanStack Query `mutation.onError` only sees the wrapped string; original cause (`ZodError.issues`, `SQLITE_CONSTRAINT`, `ENOENT` reason) is unreachable. Per `.cursor/rules/ipc.mdc`, handlers should `throw new Error(...)`, but the wrapper **must propagate the actual error message**, not concatenate.
- **Fix:** Use `error instanceof Error ? error.message : String(error)` and rethrow a `new Error(msg, { cause: error })` so downstream has the original `error.cause`.

#### S-4 — Production preload allowlist includes `supabase:fake-connect-and-set-project`
- **Evidence:** `src/preload.ts:130` — comment says "These should ALWAYS be guarded with IS_TEST_BUILD in the main process" but the channel is exposed to **all renderer builds** including production. (`safe_handle.ts:32` defines `createTestOnlyLoggedHandler`, but `preload.ts` does not branch on `IS_TEST_BUILD`. Note: preload runs in a separate process so cannot detect — but that means the channel **must NOT be on the allowlist** in production.)
- **Impact:** A path-traversal attack via `set-app-project` against the real Supabase admin API could be staged through the handler. Severity HIGH because the channel name implies fake/test connection semantics that should not be reachable in production.
- **Fix:** Either delete the channel entry from `preload.ts`, or move it behind a build-time token (`if (process.env.E2E_TEST_BUILD)` in a separate `preload.test.ts` loaded by `forge.config.ts` only in `E2E_TEST_BUILD` mode).

#### S-5 — Input validation gap: 38 IPC handlers accept `any` first arg without Zod parsing
- **Evidence:** The only handler using `import { z }` + `z.object(...)` is `src/ipc/handlers/context_paths_handlers.ts`. All 38 other handlers accept their args (object passed as the IPC invoke payload) and dereference fields directly — no schema validation. Risk handlers: `app_handlers.ts` (3744 lines, 39+ ipcMain.handle blocks at lines 2391, 2401, 2459, 2470, 2526, 2589, 2671, 2781, 2845, 2908, 3037, 3088, 3107...), `chat_handlers.ts`, `chat_stream_handlers.ts`, `github_handlers.ts`, `vercel_handlers.ts`, `neon_handlers.ts`, `language_model_handlers.ts`, `app_env_vars_handlers.ts`, `proposal_handlers.ts`.
- **Impact:** Renderer bugs (or malicious code injected via a future XSS in the dev-mode vite renderer) can pass untyped payloads. Specifically: `app_handlers.ts:2470` `set-app-env-vars({appId, envVars})` accepts a list of `EnvVar` objects; a payload missing `key` will silently persist `undefined` keys. Channel-level impact varies, but **defense-in-depth is absent**.
- **Fix:** Adopt a Zod schema-per-channel pattern. Sample of 5 schemas exists already in `src/lib/schemas.ts` (DB types) — extract a `src/ipc/schemas.ts` and each handler `args.parse(argsRaw)` first.

#### S-6 — `open-external-url` opens arbitrary http/https without domain allowlist
- **Evidence:** `src/ipc/handlers/shell_handler.ts:13-16`:
  ```ts
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Attempted to open invalid or non-http URL: " + url);
  }
  await shell.openExternal(url);
  ```
- **Impact:** Renderer can ask main to open ANY external URL including `http://...` (cleartext). Combined with S-5 (no Zod), a compromised renderer could open attacker-controlled phishing pages from the user's customary browser default. Severity HIGH because the URL string flows from renderer into user's default browser.
- **Fix:** Add a domain allowlist for known providers (github.com, vercel.com, supabase.com) OR require the user to confirm via dialog (`shell.openExternal` then `dialog.showMessageBox`). At minimum block `http://` and only allow `https://`.

### MED

#### S-7 — `sandbox: true` not explicitly declared in `BrowserWindow` webPreferences
- **Evidence:** `src/main.ts:148-153`:
  ```ts
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, "preload.js"),
  },
  ```
- **Impact:** In Electron 35, sandbox defaults to true ONLY when `nodeIntegration: false` is set without a preload requiring the renderer Node APIs. The preload script here uses `contextBridge` (works in sandbox), so default should be sandboxed; still safer to be explicit. A future preload edit that uses `require('fs')` would flip sandbox off without anyone noticing.
- **Fix:** Add `sandbox: true` explicitly.

#### S-8 — Stage-3 `dotenv.config()` loads `.env` from CWD regardless of packaged-app working dir
- **Evidence:** `src/main.ts:30` `dotenv.config()` (no `path:` option, no override guard).
- **Impact:** If a developer runs the packaged app from a directory containing a malicious `.env`, e.g. with `ALIFULLSTACK_ENGINE_URL` pointing at an attacker LLM proxy that returns crafted messages, all generated code goes through the attacker. Combined with the lack of TLS pinning, this is a meaningful supply-chain consideration.
- **Fix:** Use `dotenv.config({ path: path.join(app.getPath('userData'), '.env') })` and explicitly skip in production unless `IS_TEST_BUILD`.

#### S-9 — `permissionRequestHandler` only enforces hostname match, not scheme
- **Evidence:** `src/main.ts:331-358` — `webContents.getURL()` parsed via `new URL`, then `trustedDomains.includes(hostname)` accept-only. No scheme/port check.
- **Impact:** A page loaded at `http://localhost:9999` (MITM-able on shared networks) where hostname is "localhost" gets every permission auto-granted (camera, microphone, geolocation, notifications). If the dev server loadURL ever hits a non-loopback loopback-via-DNS-rebinding target, auto-grant fires.
- **Fix:** Also gate on scheme (`https:`) and port (3000, 5173 only). For "alifullstack.alitech.io" require scheme `https:` and exact host match.

#### S-10 — `console.log` invoked in `main` process via terminal_handlers.ts:19
- **Evidence:** `src/ipc/handlers/terminal_handlers.ts:14-22` writes to BOTH `electron-log` and `console.log`.
- **Impact:** Production main process logs to stdio. On Linux (no console), log lines die silently. On macOS launched from Finder, lines written to `~/.config/alifullstack/logs/main.log` only via electron-log; the `console.log` calls are lost. Worse, on Windows the console lines show up in the GUI's developer-tools console attached to user-perceived UI = visible to dev only. The bigger issue is **duplication of the logging path** = harder to reason about log volume in distributed debug.
- **Fix:** Remove console.log duplication; rely on electron-log scopes alone.

### LOW

#### S-11 — PhoenixObject test helper URL hardcodes `https://api.alifullstack.alitech.io/v1/...`
- **Evidence:** `main.ts:73` — referenced by `updateElectronApp`. Not a security flaw per se (it's the official update URL) but if any user is on a network where DNS for `alifullstack.alitech.io` is hijacked, the binary-auto-update path is compromised. Documented for completeness.
- **Fix (optional):** Add a build-time checksum on `latest.yml` or migrate to GitHub Releases for updates.

#### S-12 — `error: any` caught and re-thrown in deep-link handler (`main.ts:303-308`)
- **Evidence:**
  ```ts
  } catch (error: any) {
    dialog.showErrorBox(...)
  ```
- **Impact:** Loosens typing in one place; the `error.message` access works but `any` defeats strict mode for this region.
- **Fix:** `catch (error)` with `error instanceof Error ? error.message : String(error)`.

### INFO

#### S-13 — `e2e-tests/helpers/test_helper.ts:209` defines a single PageObject used by all 61 playwright specs
- **Observation:** Good architecture for e2e; the PageObject wraps IPC like a renderer would. The `setUpAliFullStackPro` finding (S-1) suggests the helper was renamed mid-rebrand without search-replace.
- **Action:** When fixing S-1, search all e2e-tests for any other stale method names that didn't make it through the rebrand.

---

## Cross-scope handoff notes
- **To build-ci:** `forge.config.ts` was not inspected for signing certs / fuses in this audit. Confirm `fuses.runAsNode` and `fuses.enableCookieEncryption` are set correctly.
- **To ipc:** Channel-allowlist drift (S-4) ties into the broader IPC channel-name drift finding (I-1).
- **To code-quality:** `console.*` count = 174 src/ occurrences; S-10 is one example. Spirit-level finding is duplicated `Logger`-aliases at scale.

## Verification commands run
```bash
git rev-parse HEAD   # f2a5d4c (start of branch docs/reviews/wave-1)
# tsc:
npx tsc -p tsconfig.app.json --noEmit   # 13 errors — see S-1
# oxlint:
npx oxlint src                         # 79 errors, 4 warnings
# prettier:
npx prettier --check src               # 35 files unformatted
```

## Severity totals
- CRITICAL: 1 (S-1)
- HIGH: 5 (S-2, S-3, S-4, S-5, S-6)
- MED: 4 (S-7, S-8, S-9, S-10)
- LOW: 2 (S-11, S-12)
- INFO: 1 (S-13)
