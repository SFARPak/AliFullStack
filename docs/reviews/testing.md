# Testing Review — AliFullStack v0.1.0 (Wave 1)

**Date:** 2026-06-21
**Scope:** vitest coverage, playwright e2e coverage, fragile selectors, selenium suite, flaky test history, missing data-testid
**Auditor:** Hermes orchestrator (in-process)
**Branch:** `docs/reviews/wave-1`

---

## Executive Summary

Testing is in **transition**. The unit-test layer (vitest) has 12 files but coverage tooling (`@vitest/coverage-v8`) is not installed — there is no live coverage report. The e2e layer (playwright) is rich (61 spec files) but **broken at the test-helper level**: `PageObject.setUpAliFullStackPro() is called in 7+ specs but does not exist on `PageObject` (test_helper.ts:209). The selenium suite at `selenium-tests/` is **dead code** — has its own `node_modules` and has not been used since the electron-forge vitest migration. `data-testid` is used in 32 components, which is better than 60+ components in src/components — fragile by-text selector risk exists for the untestid'd components.

**Severity totals:** 1 CRITICAL (S-1 echo) · 1 HIGH · 4 MED · 3 LOW · 2 INFO

---

## Findings

### CRITICAL

#### T-1 — `PageObject.setUpAliFullStackPro` missing
- **Evidence:** `e2e-tests/helpers/test_helper.ts:209`: `export class PageObject { ... }` — definition site. Calls in: `gateway.spec.ts:4`, `engine.spec.ts:4,15,30,42,55,66`, `context_manage.spec.ts:22,61,112`, `mention_app.spec.ts:14`, `smart_context_options.spec.ts:4`, `thinking_budget.spec.ts:4`. `tsc` reports `Property 'setUpAliFullStackPro' does not exist on type 'PageObject'`.
- **Impact:** 14 specs (across 7 files) will fail at the FIRST line of `beforeEach`. **None of the AliFullStackPro flow is e2e-tested today.** All other helper methods may also be stale from the rebrand; tsc only flagged this one because specs instantiate `PageObject` and use it.
- **Fix:** Locate the previous name (likely `setUpDyadPro` per the rebrand trace). Either:
  1. Restore the method on `PageObject` with the AliFullStack product mocked, OR
  2. Make it a no-op shim returning immediately if Pro is disabled in test, OR
  3. Update all spec call-sites to use an alternative setup helper.
- **Status:** Requires verifying what the prior behavior was. Wave 2 should fetch the test_helper git log.

### HIGH

#### T-2 — `selenium-tests/` is dead code; migrate or delete
- **Evidence:** `selenium-tests/` directory contains its own `node_modules/` for `pako` (a zlib port) — confirming it's a separately-installed older suite. Root repo has zero references to `selenium` in scripts (`package.json` has no `selenium` script). `selenium-tests/.gitignore` (if present) and `functional_selenium_test_plan.md`, `integrated_selenium_test_plan.md`, `selenium_test_plan.md` exist as docs.
- **Impact:** ~hundreds of MB of git storage of dead tooling (selenium + pako + custom infra) that isn't run anywhere. Likely contributes to the 8.4M `test-results/` directory if those were last from a long-defunct suite. Onboarding confusion: new contributors won't know whether to run selenium.
- **Fix:** If the playwright suite covers the same scenarios (it does, 61 specs), delete `selenium-tests/`, the three `*selenium_test_plan.md` files, and the `test_*.js` root-level smoke scripts (`test_alifullstack_parser.js`, `test_alifullstack_write_tags.js`, `test_terminal_commands.js`, `test_parse.mjs`, `test_parse.ts`). Keep the integration summary docs (or merge into `docs/`).

### MED

#### T-3 — No vitest coverage tooling installed
- **Evidence:** `package.json` contains no `@vitest/coverage-v8` or `@vitest/coverage-istanbul` in `devDependencies`. `vitest.config.ts` does not configure `coverage` provider.
- **Impact:** Reviewers can't tell what % of `src/ipc/handlers/*` is exercised. Coverage regression can silently worsen. The security audit relied on grep counts as a proxy.
- **Fix:** Add `@vitest/coverage-v8`, add `"coverage": "vitest run --coverage"` to scripts, add `coverage/` to `.gitignore`, set a minimum-threshold gate in CI.

#### T-4 — Unit-test file count is low for a 341-file src/ codebase
- **Evidence:** 12 vitest files for 341 src/*.ts/tsx files. Coverage gap is concentrated in `src/components/` (90+ components, none of which have unit tests), `src/hooks/` (probably zero), `src/ipc/handlers/` (only `chat_stream_handlers.test.ts`).
- **Impact:** Refactor confidence is low — touching `app_handlers.ts` (3744 lines) has zero unit-test safety net.
- **Fix:** Prioritize adding unit tests for top-3 target files by `wc -l`: `app_handlers.ts`, `chat_stream_handlers.ts`, `github_handlers.ts`. Aim for: any pure-func helper in those files has a test.

#### T-5 — `data-testid` on only 32 components
- **Evidence:** `grep -lr 'data-testid' src/components/ | wc -l` → 32. `src/components/` has ~90+ `.tsx` files (top-level + sub-dirs).
- **Impact:** Specs that haven't been updated for the rebrand probably fall back to text/CSS selectors — fragile.
- **Fix:** Add `data-testid` to interactive components (anything with role=button, role=dialog, role=textbox, role=tab).
- **Sample offenders (to add testid to):** top-level components like `ChatPanel.tsx`, `AppList.tsx`, `ChatList.tsx`, `ConfirmationDialog.tsx`, `AppSearchDialog.tsx`, `CreateAppDialog.tsx`, `ImportAppDialog.tsx`, `DeleteConfirmationDialog.tsx`, `GitHubConnector.tsx`, `GitHubIntegration.tsx`, `HelpDialog.tsx`, `HelpBotDialog.tsx`, `NeonIntegration.tsx`.

#### T-6 — `e2e-tests/context_manage.spec.ts`, `engine.spec.ts` have triple concerns (chat + setup + flow) inside single specs
- **Evidence:** specs are 50-200+ lines each; multiple setup teardown blocks. (Inference from limited visibility; not a deep read.)
- **Fix:** Split into focused specs using playwright's test grouping.

### LOW

#### T-7 — `playwright.config.ts` and `vitest.config.ts` configurations not reviewed in detail
- Listed for Wave 2 follow-up: confirm workers count, retries, timeout, base URL env handling, browser matrix, app packaging gate (`E2E_TEST_BUILD`).

#### T-8 — `test-results/` is 8.4M but not cleaned after runs
- **Evidence:** `du -sh test-results/` = 8.4M. Likely artifacts from prior failed runs.
- **Fix:** Add `rm -rf test-results/ playwright-report/` to CI cleanup; OR add to `.gitignore` (likely already is, but worth confirming).

#### T-9 — Stale plan/test docs at repo root
- `functional_selenium_test_plan.md`, `integrated_selenium_test_plan.md`, `selenium_test_plan.md`, `terminal_integration_summary.md` — mostly out-of-date; should be moved to `docs/` or pruned.

### INFO

#### T-10 — Vitest snapshot folder `src/__tests__/__snapshots__/` exists
- Format is standard vitest. Good. Wave 2 review should verify that snapshot files are not over-used (they can mask real assertions).

#### T-11 — `TestScaffoldCopy/`, `test_fullstack/` exist but unclear purpose
- **Evidence:** Both present in repo root. Not in package.json scripts. Likely dev artifacts.
- **Fix:** Investigate in Wave 2; remove if not used in CI.

---

## Verification commands run

```bash
cd /Volumes/Farhan/Desktop/AliFullstack
ls src/__tests__/                                  # 12 files
find e2e-tests -name '*.spec.ts' | wc -l           # 61
find selenium-tests -type f | head                 # selenium + own node_modules
grep -lr 'data-testid' src/components/ | wc -l      # 32
grep -E '@vitest/coverage' package.json            # not present
du -sh test-results/                                # 8.4M
```

## Severity totals
- CRITICAL: 1 (T-1)
- HIGH: 1 (T-2)
- MED: 4 (T-3 through T-6)
- LOW: 3 (T-7 through T-9)
- INFO: 2 (T-10, T-11)

## Cross-scope handoff
- **To code-quality:** T-1 e2e failure is a symptom of CQ-1's missing rename verification.
- **To build-ci:** `E2E_TEST_BUILD=true` is the gate that drives `pre:e2e`. Whether CI properly hits it should be confirmed in build-ci review.
