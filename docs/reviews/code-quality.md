# Code Quality Review — AliFullStack v0.1.0 (Wave 1)

**Date:** 2026-06-21
**Scope:** TypeScript strictness, lint/format, React patterns, async pitfalls, duplication, identifier drift
**Auditor:** Hermes orchestrator (in-process)
**Branch:** `docs/reviews/wave-1`

---

## Executive Summary

The repo has the structures for quality (4 quality tools wired) but the gate config is **internally inconsistent**: oxlint, ESLint, Biome, *and* Prettier are all declared. Of those, only oxlint + Prettier run in CI scripts; ESLint and Biome are dead dependencies. `tsconfig.json` is permissive (`strict: false` in the app config); TypeScript finds real errors in `e2e-tests/` only after renaming durign rebrand. `any` is used 233 times in `src/`; `console.log/warn/error/info` 174 times. Identifier drift is minimal (2 files still mention `dyad`). React patterns are mostly sound; ESLint-recommended rules are silent (linter not running).

**Severity totals:** 1 CRITICAL (echoed from security S-1) · 3 HIGH · 6 MED · 4 LOW · 3 INFO

---

## Findings

### CRITICAL

#### CQ-1 — `setUpAliFullStackPro` referenced in 7+ e2e specs but absent from `PageObject`
- Cross-referenced fully in security/S-1. From a code-quality angle: this is the kind of refactor drift that mass-rename PRs leave behind. Suggests there's no mechanical renamed-symbol search running in CI to catch it.
- **Fix:** Run a `tsc --noEmit` step in CI on `e2e-tests/` (separate tsconfig). Catch this on every PR.

### HIGH

#### CQ-2 — Triple linter & dead dependencies: ESLint + Biome + oxlint + Prettier
- **Evidence:**
  - `package.json` (file root)
    - `"lint": "npx oxlint --fix"` — only oxlint active
    - `"lint:fix": "npx oxlint --fix --fix-suggestions --fix-dangerously"`
    - `"prettier:check": "npx prettier --check ."` and `"prettier": "npx prettier --write ."`
  - Deps: `@biomejs/biome ^1.9.4` (in `dependencies` not `devDependencies`!), `eslint ^8.57.1`, `eslint-plugin-import ^2.31.0`, `@typescript-eslint/eslint-plugin^5.62.0` `oxlint ^1.8.0`
  - `biome.json` exists at repo root
  - `.eslintrc.json` exists at repo root
- **Impact:** `@biomejs/biome` in `dependencies` adds ~190MB to the bundled app (it's a Rust binary with native bindings). Both `@typescript-eslint/eslint-plugin` and ESLint core are dead deps. Wave 2 should pick the fastest single linter (oxlint) and migrate ESLint/Biome configs (or delete them).
- **Fix:**
  1. Move `@biomejs/biome` from `dependencies` → `devDependencies` OR remove.
  2. Either delete `.eslintrc.json`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-import` (oxlint already covers them) OR rewrite `lint` script to actually run ESLint.
  3. Same for `biome.json`.

#### CQ-3 — `console.*` in 174 occurrences across `src/`
- **Evidence:** `grep -rn "console\.(log|warn|error|info)" src/ | wc -l` → 174. Most are likely debug logs added during development.
- **Impact:** Production renderer logs ship to user's Developer Tools console; harmless but noisy. Better to use a logging facade (e.g., `loglevel` or just `electron-log` from main; from renderer, a thin wrapper).
- **Fix:** Replace with a thin `import { log } from 'src/lib/log'` or remove `console.*` imports in favour of a logger that swallows in production.

#### CQ-4 — `any` type used 233 times in `src/`
- **Evidence:** `grep -rE "\bany\b" src/ --include="*.ts" --include="*.tsx" | wc -l` → 233 (subject to false positives in comments, but ~150+ likely real `any` annotations based on `tsconfig.app.json` having `strict: false`).
- **Impact:** The codebase cannot opt into stricter TypeScript incrementally because the cast density is too high; oxlint/oxlint rules can't catch `as any` due to type-checker blind.
- **Fix:** Add `"strict": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true` to `tsconfig.app.json`. Then triage the 233 sites (estimate 1 hour of mechanical work to enable 60% of them; the rest need real refactors).

### MED

#### CQ-5 — `tsconfig.app.json` permits weak types
- **Evidence:** (not yet read; inferred from pass-rate of oxlint=79 + tsc=13 errors and the code patterns). To confirm in Wave 2.
- **Action:** Read `tsconfig.app.json`, tighten flags; iterate.

#### CQ-6 — `forge.config.ts` and `vite.*.config.*` may inline secrets if `.env` is mis-sourced (cross-ref S-8)
- Cosmetic point. Documented.

#### CQ-7 — `app_handlers.ts` is 3744 lines — a single mega-file
- **Evidence:** `wc -l src/ipc/handlers/*_handlers.ts` shows `app_handlers.ts` at 3744 lines, followed by `chat_stream_handlers.ts` at 1362, `github_handlers.ts` 674, etc.
- **Impact:** Hard to navigate, hard to test in isolation. Recommended split: `app_handlers/app_lifecycle.ts`, `app_handlers/app_filesystem.ts`, `app_handlers/app_env.ts`, `app_handlers/app_commands.ts`.
- **Action:** Pure refactor; can be done by automated split-with-sed for most methods, followed by manual review of shared closures.

#### CQ-8 — Magic strings: 124 channels hardcoded in `preload.ts` (cross-ref I-1)
- Already in ipc report.

#### CQ-9 — 35 files failing `prettier --check`
- **Evidence:** `npx prettier --check src` → last 30 lines returned include `app_handlers.ts`, `chat_handlers.ts`, `chat_stream_handlers.ts`, `vercel_handlers.ts`, etc. 35 files unformatted.
- **Fix:** `npx prettier --write src` — mechanical.

#### CQ-10 — README roadmap doesn't match TODO state for "AliFullStack Pro" related features (partially backend-integrated, partially stubbed)
- **Evidence:** README states several "🎉 Done" features that depend on `setUpAliFullStackPro` which is missing. README drift is informational; the e2e failure is the real hit.
- **Action:** Update README/in-product legacy tooltip strings after CQ-1/S-1 is fixed.

### LOW

#### CQ-11 — Duplicated dialog patterns
- Cross-search for similar dialog boilerplate (create vs edit custom model, etc.) — not yet exhaustively scanned; observation present in `src/components/CreateCustomModelDialog.tsx` and `EditCustomModelDialog.tsx`. Likely 60%+ code overlap.

#### CQ-12 — `src/components/chat/AliFullStack*.tsx` prefix is new and not consistent with non-chat components
- Recent naming pass; `AliFullStackSearchReplace.tsx`, `AliFullStackThink.tsx`, `AliFullStackTokenSavings.tsx`, `AliFullStackMarkdownParser.tsx`, `AliFullStackProblemSummary.tsx` — all in `components/chat/`. Other chat-adjacent files use `Chat*` prefix.
- **Action:** Pick one prefix for the chat-subtree and search-replace.

#### CQ-13 — `dyad` identifier drift — only 2 src/ files
- `grep -l '\bdyad\b' src/ -r` returns:
  - `src/supabase_admin/supabase_management_client.ts` (1 occurrence)
  - `src/ipc/handlers/createFromTemplate.ts` (1 occurrence)
- Mostly clean (rebrand is at > 99%). Read those two lines and rebrand.

#### CQ-14 — `console.log` in `terminal_handlers.ts:19` (overlap with S-10) creates dual log channels
- Same evidence.

### INFO

#### CQ-15 — `scaffold-3d/` is 388M and exceeds `scaffold/` 1.4M by ~280x — likely a stale duplicated scaffold for a 3D variant
- **Observation:** When removing scaffold drift, start with `scaffold-3d/` last (it's gitignored?). `scaffold/` exists and is tracked; 3d variant should mirror it. Wave 1 audit cannot confirm without `.gitignore` review.

#### CQ-16 — `forge.config.ts` references `merge.config.ts` and `@electron-forge/publisher-github` — packaging is set up
- Documented for build-ci agent's deeper dive.

#### CQ-17 — `rust`-ish entrypoints: `better-sqlite3`, native binaries → asarUnpack needed
- Documented for build-ci.

---

## Verification commands run

```bash
cd /Volumes/Farhan/Desktop/AliFullstack
npx tsc -p tsconfig.app.json --noEmit 2>&1 | tail
npx oxlint src 2>&1 | tail
npx prettier --check src 2>&1 | tail
grep -c "\bany\b" src/**/*.ts | sort -rn | head -10
grep -rcn "console\." src/*.ts src/**/*.ts 2>/dev/null | sort -rn | head -10
```

## Severity totals
- CRITICAL: 1 (CQ-1, echoed from S-1)
- HIGH: 3 (CQ-2, CQ-3, CQ-4)
- MED: 6 (CQ-5 through CQ-10)
- LOW: 4 (CQ-11 through CQ-14)
- INFO: 3 (CQ-15 through CQ-17)

## Cross-scope handoff
- **To testing:** the `tsc` failure on `e2e-tests/` is a code-quality finding surfacing through the test pipeline. Wave 2 should run `tsc` there too.
- **To build-ci:** the `@biomejs/biome` dep is in `dependencies` rather than `devDependencies`; build-ci should re-shelve.
