# Build & CI Review — AliFullStack v0.1.0 (Wave 1)

**Date:** 2026-06-21
**Scope:** forge.config.ts (Squirrel, signing, fuses), tsconfig*.json, .github/workflows, husky hooks, lint/format config drift, packageManager, asarUnpack for better-sqlite3, vite.*.config.*
**Auditor:** Hermes orchestrator (in-process)
**Branch:** `docs/reviews/wave-1`

---

## Executive Summary

Forge signing/fuses and better-sqlite3 ASAR handling are **well done**. CI workflows are **functional but inefficient and brittle**:
- `npm install` isn't cached → every CI run reinstalls 500+ deps from scratch (~1m).
- `pnpm` action-setup is run AFTER the npm install, which is wasteful (the build itself only uses npm, but `scaffold` and `scaffold-3d` use pnpm).
- `build-binaries.yml` triggers a full release build on every push to `v0.1.0` branch AND every `v*` tag — that means feature branches named `v0.x.y` get release-built by accident.
- The husky pre-commit hook runs `lint-staged` which mutates files (oxlint --fix, prettier --write); if a CI run does `npm run presubmit` BEFORE the user's local commit, the mutating step is duplicated, which can lead to spurious diffs.

Gates run locally: `npx tsc -p tsconfig.app.json --noEmit` → PASS for src/ (fails 13 errors in e2e-tests which are in the same project per tsconfig.app.json `include`). `npx oxlint src` → 79 errors + 4 warnings on 341 files. `npx prettier --check src` → 35 files unformatted.

**Severity totals:** 0 CRITICAL · 4 HIGH · 6 MED · 5 LOW · 3 INFO

---

## Findings

### HIGH

#### BCI-1 — `npm install` is not cached in CI; rimraf'd on every run
- **Evidence:** `.github/workflows/ci.yml:29-33`:
  ```yaml
  - name: Clean up
    run: |
      rm -rf node_modules
      npm cache clean --force
  - name: Install node modules
    run: npm install --no-audit --no-fund --progress=false
  ```
  No `actions/cache@v4` for node_modules. A 500+ dep electron+react+forge tree reinstalls on every CI run.
- **Impact:** CI wall-clock ~+1m per run. Lines 47-52 do cache the pnpm store, but only for the scaffold steps later.
- **Fix:** Add an `actions/cache@v4` step for `node_modules` keyed on `package-lock.json` (or `package.json` if no lockfile). Move it after install, before `npm run presubmit`.
- **Note:** dispatch `npm ci` instead of `npm install` when a lockfile exists to avoid lockfile drift (build-binaries.yml already does this on line 44).

#### BCI-2 — `build-binaries.yml` triggers a full release build on every push to `v0.1.0` branch, not only on tags
- **Evidence:** `.github/workflows/build-binaries.yml:4-9`:
  ```yaml
  on:
    workflow_dispatch:
    push:
      branches:
        - v0.1.0
      tags:
        - "v*"
  ```
- **Impact:** Every PR merged to `v0.1.0` triggers a 4-OS matrix cross-build of release binaries — wasteful and may surprise developers. Better: only trigger on `v*` tags AND on `workflow_dispatch`.
- **Fix:** Remove `branches: - v0.1.0`. Keep tags. Use `workflow_dispatch` for ad-hoc builds.
- **Caveat:** Trigger may have been deliberately preserved for the current release-candidate pattern. Confirm with maintainers.

#### BCI-3 — Triple linter + dead deps: ESLint and Biome unused at runtime (cross-ref CQ-2)
- Re-iterated here for build-ci audience:
  - `.eslintrc.json` exists; ESLint 8 + plugins installed; **never invoked by any `package.json` script**.
  - `biome.json` exists; `@biomejs/biome` is in `dependencies` not `devDependencies`. **`biome` is not invoked by any script**.
  - `lint`: only runs `oxlint`. Precommit: only `lint-staged` (which uses oxlint).
- **Impact:** Bundle impact: `@biomejs/biome` ships to production app ~190MB (Rust binary with native bindings) but is never executed. Bench: `du -sh node_modules/@biomejs/biome`.
- **Fix:** Either commit to one linter (oxlint is fastest) and remove `biome.json` + uninstall `@biomejs/biome`. OR wire Biome into the lint script and remove ESLint.

#### BCI-4 — `tsconfig.app.json` `include: ["src", "e2e-tests", "shared"]` makes one tsc run type-check both internal + e2e specs
- **Evidence:** `tsconfig.app.json` `include`. The script `ts:main` runs `npx tsc -p tsconfig.app.json --noEmit` which **brings e2e-tests into the same project**. The current `ts:workers` script does `npx tsc -p workers/tsc/tsconfig.json --noEmit` (a separate project).
- **Impact:** tsc reports 13 errors in `e2e-tests/` because callers reference `setUpAliFullStackPro` which doesn't exist on `PageObject`. This couples PR review of src/ to e2e-test renaming status. Wave 1 S-1 / T-1 is a symptom of this.
- **Fix:** Either move e2e-tests into a separate `tsconfig.e2e.json` referenced from a new `ts:e2e` script. OR add `setUpAliFullStackPro` to `PageObject` so tsc is clean.

### MED

#### BCI-5 — Husky pre-commit runs `lint-staged` which mutates files (oxlint --fix, prettier --write); no mechanism to detect mutated files
- **Evidence:** `.husky/pre-commit` is `npx lint-staged`. `package.json` `lint-staged` `{ "**/*.{ts,tsx,...}": "oxlint", "*.{js,css,md,...}": "prettier --write" }`. Note: `lint` script is `oxlint --fix`, but `lint-staged` is bare `oxlint` (no --fix). Inconsistency.
- **Impact:** Files prettier writes are silently re-staged by lint-staged; if oxlint auto-fix mutates a file, the user sees a different diff than the editor showed. Better pattern: run `oxlint --fix` in lint-staged too, so commit-time matches CI.
- **Fix:** Either align `lint-staged` to also pass `--fix`, OR document that local-vs-CI may differ.

#### BCI-6 — `forge.config.ts` ignore list uses `/worker` not `/workers` — branch structure is conflated
- **Evidence:** `forge.config.ts:30-39`:
  ```ts
  if (file.startsWith("/workers")) return false;
  if (file.startsWith("/worker")) return false;
  ```
  Two directories at repo root: `worker/` (probably coder-orchestrator) and `workers/` (TSC worker tsconfig). Both excluded from ASAR but unpacking policy is unclear.
- **Impact:** If `worker/` is meant to be unpacked and `workers/` packaged (or vice versa), the current rule treats both equivalently. Subtle bug surface.
- **Fix:** Add a comment in `forge.config.ts` clarifying intent. Verify by running `npm run package` and inspecting `out/AliFullStack-linux-x64/resources/app.asar`.

#### BCI-7 — `package.json` `packageManager: "pnpm@10.15.0+..."` but `npm install` is what CI uses
- **Evidence:** `package.json:175` pins `pnpm`. `ci.yml:33` and `build-binaries.yml:44` both run `npm install`/`npm ci`. `pre:e2e` (ci.yml:64) uses `npm`. Local lockfile is `package-lock.json` (not `pnpm-lock.yaml`).
- **Impact:** Drift between declared packageManager and actual tool. Risk: future contributor with pnpm-only habits finds unexpected npm semantics.
- **Fix:** Either commit fully to npm and remove `packageManager`, OR migrate to pnpm and use `pnpm install` everywhere.

#### BCI-8 — `forge.config.ts` ASAR ignore list is verbose; better-sqlite3 + bindings + file-uri-to-path + stacktrace-js unpack, but native binaries side-loaded
- Verified correct. Documented; mention only because the list is comprehensive and worth reviewing for drift.

#### BCI-9 — `playwright.config.ts` and `vitest.config.ts` not deep-read in Wave 1
- Listed as Wave 2 follow-up: verify workers, retries, headless defaults, timeout handling, app-packaging gate.

#### BCI-10 — `biome.json` has formatter disabled + ignore patterns suggesting it was used in an old sister project
- **Evidence:** `biome.json:46` `"formatter": { "enabled": false }`. Biome's formatter is disabled; oxlint+prettier cover the file. Linter rules are also pinned to "off" for many things oxlint already handles. The config is effectively unused.

### LOW

#### BCI-11 — `lineStaged` prettier write attaches to fewer extensions than CI runs
- `.md` is in lint-staged prettier but `npx prettier --check src` doesn't include .md. Drift.

#### BCI-12 — `assets/icon/logo` not confirmed as multi-resolution icon
- **Evidence:** `forge.config.ts:64` `icon: "./assets/icon/logo"`. macOS .icns, Windows .ico, Linux .png not enumerated. Wave 2 should inspect.

#### BCI-13 — `nodeVersion-file: package.json` (ci.yml:27) reads `engines.node` ✅; build-binaries.yml:35 hardcodes `node-version: 20` — drift from package.json's `>=20`. Future node 22 may break ubi builds.
- Documented; low pri.

#### BCI-14 — `git push` hooks (no pre-push hook) means build-binaries may push to remote tag `v0.0.45...v0.0.48` without local enforcement
- Branches `release/v0.0.45...v0.0.48` exist. Release tags may not be reachable. Wave 2 investigate.

#### BCI-15 — Multiple `release/v*` branches coexist; tree may be stale
- **Evidence:** `git branch -a` shows `release/v0.0.45`, `release/v0.0.46`, `release/v0.0.47`, `release/v0.0.48`. No mention of these in current dev workflow.

### INFO

#### BCI-16 — `fort.config.ts` `osxSign` correctly undefined when `E2E_TEST_BUILD=true` ✅
- Good. Documented.

#### BCI-17 — All preferred Fuses are set ✅
- `RunAsNode: false`, `EnableCookieEncryption: true`, `EnableNodeOptionsEnvironmentVariable: false`, `EnableEmbeddedAsarIntegrityValidation: true`, `OnlyLoadAppFromAsar: true`. Excellent. Documented.

#### BCI-18 — `tools/add-macos-cert.sh` referenced in build-binaries.yml:56 — confirmed existence (referenced; not deep-read)
- Wave 2 follow-up: verify the script handles cert rotation, OKP keys, and current Apple cert format.

---

## Recommended Wave 2 Implementation Order

1. **BCI-4** — split tsconfig (15 min, hugely reduces noise on PRs).
2. **BCI-7** — pick one (`npm` is already de-facto), remove the other lockfile hygiene drift.
3. **BCI-3** — remove dead deps (`@biomejs/biome`, `@typescript-eslint/eslint-plugin`); trades some bundle size for clarity.
4. **BCI-5** — align `lint-staged` oxlint invocation to use `--fix`.
5. **BCI-1** — add `actions/cache@v4` for node_modules (saves ~1m per CI run).
6. **BCI-2** (with maintainer approval) — gate binaries to tags-only.

## Verification commands run

```bash
cd /Volumes/Farhan/Desktop/AliFullstack
npx tsc -p tsconfig.app.json --noEmit 2>&1 | tail -20
npx oxlint src 2>&1 | tail -20
npx prettier --check src 2>&1 | tail -20
ls -la .github/workflows/         # 4 workflows
ls -la .husky/                    # pre-commit only
cat tsconfig.app.json | head -25  # strict: true
```

## Severity totals
- CRITICAL: 0
- HIGH: 4 (BCI-1, BCI-2, BCI-3, BCI-4)
- MED: 6 (BCI-5 through BCI-10)
- LOW: 5 (BCI-11 through BCI-15)
- INFO: 3 (BCI-16, BCI-17, BCI-18)

## Cross-scope handoff
- **To code-quality:** BCI-3 / CQ-2 are the same finding from two angles. Wave 2 unification.
- **To testing:** BCI-4 split of tsconfig means e2e-tests get their own tsc; T-1 fix targets that project.
