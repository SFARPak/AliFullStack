# AliFullStack v0.1.0 — Codebase Review Summary (Wave 1)

**Date:** 2026-06-21
**Branch:** `docs/reviews/wave-1`
**Auditor:** Hermes orchestrator (in-process, after Wave 1 subagents failed delivery via HTTP 429)
**Base:** `v0.1.0` @ `f2a5d4c`
**Audited:** 341 src/ ts/tsx files, 39 IPC handlers, 12 vitest unit tests, 61 playwright e2e specs, 4 GH workflows, forge.config.ts, tsconfig*.json, .husky, .github/workflows, package.json

---

## Scope & Method

Five read-only audits were attempted as parallel subagents (security, IPC, code-quality, testing, build-CI). All five subagent invocations **failed delivery**:

| Batch | Subagents | Outcome |
|---|---|---|
| 1 | security, ipc, code-quality | HTTP 429 × 3 — final API calls throttled, no reports produced |
| 2 | testing, build-ci | HTTP 429 + 600s timeout |

A recovery path was executed in-process: this orchestrator re-ran the audits serially using native `terminal` + `read_file` + `search_files`, producing the five reports below. No source files were modified. Only `docs/reviews/*.md` were added.

---

## Reports

| File | Severity tallies |
|---|---|
| `security.md` | 1 CRITICAL · 5 HIGH · 4 MED · 2 LOW · 1 INFO (S-1 to S-13) |
| `ipc.md` | 0 CRITICAL · 4 HIGH · 4 MED · 3 LOW · 2 INFO (I-1 to I-13) |
| `code-quality.md` | 1 CRITICAL · 3 HIGH · 6 MED · 4 LOW · 3 INFO (CQ-1 to CQ-17) |
| `testing.md` | 1 CRITICAL · 1 HIGH · 4 MED · 3 LOW · 2 INFO (T-1 to T-11) |
| `build-ci.md` | 0 CRITICAL · 4 HIGH · 6 MED · 5 LOW · 3 INFO (BCI-1 to BCI-18) |

---

## Top 10 Findings (priority for Wave 2)

| # | ID | Area | Severity | Title |
|---|----|------|----------|-------|
| 1 | **S-1 / T-1 / CQ-1** | testing | CRITICAL | `PageObject.setUpAliFullStackPro` called in 7+ e2e specs but absent from `test_helper.ts:209` |
| 2 | **I-2 / S-5** | IPC + security | HIGH | 38 of 39 handlers accept IPC args without Zod validation |
| 3 | **S-4 / I-9** | security + IPC | HIGH | Production preload.ts exposes `supabase:fake-connect-and-set-project` |
| 4 | **I-3 / S-3** | IPC + security | HIGH | `safe_handle.ts:25` re-throws `[${channel}] ${error}` losing cause/stack |
| 5 | **BCI-4** | tsconfig | HIGH | `tsconfig.app.json` includes e2e-tests causing coupled tsc failure (root of S-1) |
| 6 | **S-2** | logs / privacy | HIGH | `safe_handle.ts:13` logs `JSON.stringify(args)` for every IPC (tokens leak into electron-log) |
| 7 | **I-1** | drift | HIGH | Channel-name strings hardcoded across 124 invoke + 12 receive sites |
| 8 | **I-4** | consistency | HIGH | `app_handlers.ts` 13 ipcMain.handle sites use bare call instead of `createLoggedHandler` |
| 9 | **CQ-2 / BCI-3** | dependencies | HIGH | Triple linter + `@biomejs/biome` ships in prod deps |
| 10 | **S-6** | security | HIGH | No domain allowlist on `open-external-url` |

---

## Findings by area

- **Security:** 13 reports (1 CRIT, 5 HIGH, 4 MED, 2 LOW, 1 INFO)
- **IPC:** 13 reports (4 HIGH, 4 MED, 3 LOW, 2 INFO)
- **Code quality:** 17 reports (1 CRIT, 3 HIGH, 6 MED, 4 LOW, 3 INFO)
- **Testing:** 11 reports (1 CRIT, 1 HIGH, 4 MED, 3 LOW, 2 INFO)
- **Build & CI:** 18 reports (4 HIGH, 6 MED, 5 LOW, 3 INFO)

Total: **72 distinct findings across 5 scopes, 4 CRITICAL/HIGH-class root-impact items.**

---

## Recommended Wave 2 Scope

Per the project's `multi-agent-contractor-wave` style, Wave 2 should be **focused, scoped, and run by 3-5 implementation agents in parallel** with clear ownership. Suggested split:

### Agent A — "Critical Fixes" (small, immediate)
- **S-1 / T-1**: add `setUpAliFullStackPro` to PageObject (or update specs)
- **BCI-4**: split `tsconfig.app.json` → `tsconfig.app.json` + `tsconfig.e2e.json`
- **S-4 / I-9**: remove `supabase:fake-connect-and-set-project` from preload prod allowlist
- **S-3 / I-3**: rewrite `safe_handle.ts:25` to preserve error cause/stack
- **Estimate:** 1-2 hours

### Agent B — "IPC Channel Hardening"
- **I-2 / S-5**: introduce `src/ipc/schemas.ts` + Zod parse in 38 handlers
- **I-1**: introduce `src/ipc/channels.ts` central enum; migrate preload + handlers + ipc_client
- **I-4**: convert `app_handlers.ts` 13 bare `ipcMain.handle` to `createLoggedHandler`
- **S-2**: sanitize args log in safe_handle (allowlist + redaction)
- **Estimate:** 3-4 hours, multi-commit

### Agent C — "Lint & Build Hygiene"
- **CQ-2 / BCI-3**: remove `@biomejs/biome`, `.eslintrc.json`, dead ESLint deps
- **BCI-7**: align `packageManager` with actual usage (npm)
- **BCI-5**: align `lint-staged` oxlint to use `--fix`
- **CQ-9**: `npx prettier --write src` (mechanical)
- **BCI-1**: add `actions/cache@v4` for node_modules
- **Estimate:** 30 minutes (mostly mechanical)

### Optional Agent D — "Test Coverage Boost"
- **T-3**: install `@vitest/coverage-v8`, configure vitest.config
- **T-5**: add `data-testid` to top-50 interactive components
- **T-2**: delete `selenium-tests/` + dead .js scripts
- **T-4**: add unit tests for top-3 largest files
- **Estimate:** 2-4 hours

---

## Wave 2 branch structure

```
agent/wave2-critical             →  Agent A fixes (merged first)
agent/wave2-ipc-hardening        →  Agent B (independent)
agent/wave2-lint-hygiene         →  Agent C (independent)
agent/wave2-test-coverage        →  Agent D (depends on A's PageObject fix)
```

All four branched from `docs/reviews/wave-1` (after merging Wave 1 reports to `v0.1.0`).

---

## Verification commands

```bash
cd /Volumes/Farhan/Desktop/AliFullstack
git branch --show-current         # docs/reviews/wave-1
ls docs/reviews/                  # 6 files: 5 reports + this summary
git status --short                # only docs/reviews/* new; dyad/ still modified from prior session
npx tsc -p tsconfig.app.json --noEmit | wc -l   # 13 errors in e2e-tests
npx oxlint src 2>&1 | tail -3                   # 79 errors, 4 warnings
npx prettier --check src 2>&1 | tail -3         # 35 files unformatted
```

## Gates result

| Gate | Status |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | FAIL (13 errors in e2e-tests) |
| `npx oxlint src` | FAIL (79 errors + 4 warnings) |
| `npm test` | not run in this audit |
| `npx prettier --check src` | FAIL (35 files) |

**`gates_passed: false`** — by design; Wave 2 implements S-1 / BCI-4 to green the build.
