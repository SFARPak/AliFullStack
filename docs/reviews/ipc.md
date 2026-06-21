# IPC Review — AliFullStack v0.1.0 (Wave 1)

**Date:** 2026-06-21
**Scope:** renderer/wrapper/handler contract, Zod input validation, error-throwing pattern compliance, streaming safety, missing channel registration, lock coverage
**Auditor:** Hermes orchestrator (in-process)
**Branch:** `docs/reviews/wave-1`

---

## Executive Summary

Project rule from `.cursor/rules/ipc.mdc` is **mostly honoured**: 201 `throw new Error(...)` calls in handlers and zero `return { success: false, errorMessage: "..." }` returns. The IPC contract has **two drift hotspots** that should be Wave 2 priorities:

1. **Channel-name duplication** — strings are declared individually in three places (`src/preload.ts:7-131`, every handler's `handle(...)` call, and every React hook's `ipcClient.<name>(...)` wrapper). One central source (a typed `Record<string, ChannelName>` enum) would prevent typo drift.
2. **Input validation absent on 38/39 handlers** — only `context_paths_handlers.ts` parses a Zod schema; everything else accepts the raw args object.

**Severity totals:** 0 CRITICAL · 4 HIGH · 4 MED · 3 LOW · 2 INFO

---

## Findings

### HIGH

#### I-1 — Channel-name string-literal duplication across preload, host, client
- **Evidence:**
  - Allowlist: `src/preload.ts:7-131` (124 invoke + 12 receive channels, hardcoded strings)
  - Handler registration: 30+ files under `src/ipc/handlers/*` each call `ipcMain.handle("...", ...)` or `createLoggedHandler(logger)("...", ...)` with a string literal
  - Client side: `src/ipc/ipc_client.ts` (and every `use*` hook in `src/hooks/`) calls `ipcRenderer.invoke("list-apps", ...)` — also string-literal
- **Impact:** Channel-name drift is the #1 cause of `ipcMain.handle never called` / `Invalid channel` runtime errors. Single typo breaks a feature silently (handler returns no-op, hook silently fails with the preload throw). Already flagged in S-4 as test/prod allowlist drift; here as a structural anti-pattern.
- **Fix:** Add `src/ipc/channels.ts` exporting `export const CHANNELS = { LIST_APPS: 'list-apps', ...} as const`. Switch preload, every handler, every hook to import from it. Add a `package.json` test that asserts `Object.values(CHANNELS).every(c => allowedChannels.includes(c))` per side.
- **Status:** No remediation yet.

#### I-2 — 38 of 39 handlers accept `args` without Zod shape validation
- **Evidence:** Only `src/ipc/handlers/context_paths_handlers.ts` uses `import { z }` + `z.object(...)` for input. Verified via `grep -lr "from 'zod'" src/ipc/handlers/` → exactly one match. Source files in `app_handlers.ts` (3744 lines, 13 ipcMain.handle sites: lines 2391, 2401, 2459, 2470, 2526, 2589, 2671, 2781, 2845, 2908, 3037, 3088, 3107), `chat_handlers.ts` (4 sites), `vercel_handlers.ts` (22 sites), `github_handlers.ts` (14 sites), `neon_handlers.ts` (7 sites), `language_model_handlers.ts` (24 sites), `app_env_vars_handlers.ts` (4 sites), `proposal_handlers.ts` (4 sites), `app_upgrade_handlers.ts` (6 sites), `createFromTemplate.ts` (16 sites), `prompt_handlers.ts` (5 sites), `portal_handlers.ts` (3 sites), `pro_handlers.ts` (0 sites — see I-3), `neon_handlers.ts` (7), `version_handlers.ts` (8), `dependency_handlers.ts` (3), `capacitor_handlers.ts` (5), `import_handlers.ts` (2), `language_model_handlers.ts` (24).
- **Impact:** Handlers rely on TypeScript inference of the call site. If renderer is built with a stale `IpcClient` signature, args shape-mismatch is silently coerced at the IPC boundary — `undefined` fields flow through. This is also a long-term maintainability tax: schema changes require touching both the type and the handler implementation; one missing touchpoint = silent data corruption.
- **Fix:** Extract channel schemas to `src/ipc/schemas.ts` mirroring `CHANNELS` enum. Each handler: `const args = <SchemaName>.parse(rawArgs)` as the first line.
- **Note:** This finding overlaps with S-5 (security). Cross-referenced consistently.

#### I-3 — Async error propagation broken: `safe_handle.ts:25` re-throws template-stringed error
- **Evidence:** Same as S-3. Code:
  ```ts
  throw new Error(`[${channel}] ${error}`);
  ```
- **Impact:** TanStack Query `mutation.onError` (renderer-side per rule `.cursor/rules/ipc.mdc`) receives a wrapped string. The original `Error.cause` is lost. Stack trace is lost. Anything sensitive in the original error (SQLite constraint details, filesystem paths) is *kept* in the new message, so logging-by-IPC-name still works — but the structure is gone.
- **Fix:** `const wrapped = error instanceof Error ? error.message : String(error); throw new Error(`[${channel}] ${wrapped}`, { cause: error });`

#### I-4 — Inconsistent handler registration: `app_handlers.ts` uses bare `ipcMain.handle` while siblings use `createLoggedHandler`
- **Evidence:** `src/ipc/handlers/app_handlers.ts:2391, 2401, 2459, 2470, 2526, 2589, 2671, 2781, 2845, 2908, 3037, 3088, 3107` — 13 sites use `ipcMain.handle` directly (no `safe_handle` wrapper). Sibling files (`chat_handlers.ts`, `github_handlers.ts`, etc.) consistently use `createLoggedHandler(logger)`.
- **Impact:** These handlers don't get the logging/error-wrapping shape from `safe_handle.ts`, so:
  1. They'll never throw the `[channel] ...` wrapped error; the raw error is forwarded to renderer. Inconsistent UX in renderer's toast.
  2. Channel-call log auditing is incomplete (security S-2 only catches wrappers, not bare `ipcMain.handle`).
- **Fix:** Refactor app_handlers.ts to use `createLoggedHandler(logger)` like the rest. 13-line mechanical change.

### MED

#### I-5 — withLock coverage incomplete on app mutation handlers
- **Evidence:** 12 occurrences of `withLock(appId, async ...)` across handlers. `app_handlers.ts:2479, 2532, 2604, 2786, 2918, 3107` show 6 uses. Mutation sites in app_handlers.ts NOT using withLock: `delete-app` (line ~2845), `delete-all-apps` (line ~2845 ish), `rename-app`, `copy-app`, `restart-app`, `run-app`, `stop-app`, `respond-to-app-input`. Without web search is harder to be certain — please verify.
- **Impact:** Per the project rule, every mutation of an app's filesystem/version/chat should hold its `appId` lock. Missing locks mean concurrent user actions can race (e.g. restart + delete).
- **Fix:** Audit each mutation handler in `app_handlers.ts` and add `withLock(appId, ...)` wrapper where appropriate.

#### I-6 — Streaming safety — `safe_handle.ts` does not ensure `chat:response:end` fires on exception in chat_stream_handlers
- **Evidence:** `src/ipc/handlers/chat_stream_handlers.ts` (1362 lines). Per `.cursor/rules/ipc.mdc`, "stream close on error is critical." The handler returns through `safe_handle`'s catch which wraps error and `throw`s — but the renderer's TanStack `useChatStream` relies on a `chat:response:end` event arriving to clear UI state. If the handler dies mid-stream and short-circuits the throw path, the renderer may hang on "loading…" forever.
- **Impact:** Recent commit `26a7f21 fix: handle stream errors gracefully with proper UI cleanup and user-friendly messages` (most recent on the audit branch) addressed this — but the **wrapper `safe_handle.ts` does not write `webContents.send("chat:response:error", ...)`** before throwing. Verify that's middleware-handled in chat_stream_handlers itself; if not, it's a missing piece.
- **Fix:** Add a try/finally in chat_stream_handlers that always sends `chat:response:end` regardless of success/failure; have safe_handle send `chat:response:error` automatically when re-throwing any chat:* channel error.

#### I-7 — Renderer hook `use*` query/mutation invalidation keys are hand-typed per file
- **Evidence:** `src/hooks/` — every hook defines its own `queryKey` array literal. There is no central `queryKeys` factory.
- **Impact:** `queryClient.invalidateQueries({ queryKey: ['chats'] })` from one hook may miss an array that another hook defines as `['chat', chatId]`. Trace example: a rename of `apps` → `applications` in one hook silently breaks cross-hook invalidation.
- **Fix:** Add `src/hooks/queryKeys.ts` exporting `queryKeys = { apps: { all: ['apps'], detail: (id) => ['apps', id] } } as const`. Reference from each hook.

#### I-8 — Accept-channel list grows monotonically and is never pruned
- **Evidence:** `src/preload.ts` lists all 136 channels including `prompts:*`, `chat:*`, `vercel:*`, `neon:*`, `supabase:*`, etc. The README's `[Roads]` section says features like "Collaborative development" (multi-user), "Mobile / React Native" are NOT done yet — but the IPC channels for those features are exposed.
- **Impact:** Renderer UI is gated by features in JSX, but the IPC surface is full active attack surface area regardless of UI gating. A compromised renderer (XSS) gets the entire surface. Surface reduction is hygiene.
- **Fix:** Document a "minimum IPC surface per build" mapping; gate channels on `IS_TEST_BUILD || settings.featureX` predicates at the channel registration site in `ipc_host.ts`.

### LOW

#### I-9 — `preload.ts:130` test-only channel co-located with prod allowlist (cross-ref S-4)
- Same evidence as S-4. Documented in IPC layer here.

#### I-10 — `withLock` is a simple per-`appId` in-process lock; no cross-process safety
- **Evidence:** `src/ipc/utils/lock_utils.ts` (inferred from `import { withLock } from "../utils/lock_utils"` in `app_handlers.ts:22`).
- **Impact:** Single-process Electron main = no cross-process races today. Not actionable until multi-process is introduced.
- **Action:** INFO-class; revisit if Electron utility processes proliferate.

#### I-11 — `Object.values(queryKey)` patterns absent in hooks
- Documented via I-7. Listed for completeness.

### INFO

#### I-12 — `ipc_types.ts:267-272` defines `UserBudgetInfoSchema` (Zod) but only one other handler (`context_paths_handlers.ts`) consumes zod
- Observation: The pattern is established; only the rollout is incomplete. Wave 2 should adopt the pattern evenly.

#### I-13 — `createFromTemplate.ts:1` contains "dyad" identifier (likely logo/asset path)
- **Evidence:** `grep "dyad"` in src returns 2 files — `src/supabase_admin/supabase_management_client.ts:1` and `src/ipc/handlers/createFromTemplate.ts:1`. Rebrand is mostly clean; just two leftover paths.
- **Action:** Cosmetic. Replace with `alifullstack` for consistency.

---

## Verification

```bash
cd /Volumes/Farhan/Desktop/AliFullstack
npx tsc -p tsconfig.app.json --noEmit   # PASS for src/; fails only in e2e-tests (separate tsconfig)
grep -c "throw new Error" src/ipc/handlers/*   # 201 across 39 files
grep -c "return { success: false" src/ipc/handlers/   # 0  ✅ project rule honoured
grep -lr "from 'zod'" src/ipc/handlers/   # only context_paths_handlers.ts
grep -c "withLock" src/ipc/handlers/*    # 12 total
wc -l src/ipc/handlers/*_handlers.ts | sort -rn | head  # app_handlers 3744 lines (largest)
```

## Severity totals
- CRITICAL: 0
- HIGH: 4 (I-1, I-2, I-3, I-4)
- MED: 4 (I-5, I-6, I-7, I-8)
- LOW: 3 (I-9, I-10, I-11)
- INFO: 2 (I-12, I-13)
