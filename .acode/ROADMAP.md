# ROADMAP — AliFullStack Review Wave 1

Active dev branch: `v0.1.0`. Wave runs **read-only audits** in 5 parallel scopes. Outputs are merged by the orchestrator, then Wave 2 implements fixes.

## Scope ownership map

| Agent | Scope | Primary dirs | Branch | Report file |
|---|---|---|---|---|
| 1 | **security** | `src/preload.ts`, `src/ipc/ipc_host.ts`, `src/ipc/handlers/*`, `src/main.ts`, `forge.config.ts`, `.env.example` | `agent/review-security` | `docs/reviews/security.md` |
| 2 | **ipc** | `src/ipc/**`, `src/ipc/handlers/*.ts`, `src/preload.ts`, `src/ipc/ipc_client.ts`, `src/ipc/ipc_types.ts`, context-management paths | `agent/review-ipc` | `docs/reviews/ipc.md` |
| 3 | **code-quality** | `src/**`, `*.ts/tsx` outside dyad/scaffold-3d, `.eslintrc.json`, `.oxlintrc.json`, `biome.json`, `tsconfig*.json` | `agent/review-code-quality` | `docs/reviews/code-quality.md` |
| 4 | **testing** | `src/__tests__/`, `e2e-tests/`, `selenium-tests/`, `playwright-report/`, `vitest.config.ts`, `playwright.config.ts` | `agent/review-testing` | `docs/reviews/testing.md` |
| 5 | **build-ci** | `package.json` (engines/scripts), `forge.config.ts`, `vite.*.config.*`, `tsconfig*.json`, `.github/workflows/**`, `scripts/**`, `biome.json`, `components.json`, husky hooks | `agent/review-build-ci` | `docs/reviews/build-ci.md` |

## File ownership rules (no overlaps)
- **`docs/reviews/<scope>.md`** is unique per agent — write only your own.
- **`AGENT_HANDOFF.md`** is shared read-only — don't edit it.
- **`package.json` keys**: build-ci owns `scripts/*`, security owns `engines` assertions + `.env` hygiene, code-quality owns lint/formatter config.
- **`src/ipc/handlers/*`**: ipc owns design/contracts; security owns allowlist validation of inputs.
- **`e2e-tests/`**: testing owns; build-ci cross-references for CI gating only.

## Severity legend
- **CRITICAL** — exploitable today, will break in prod, or blocks all users.
- **HIGH** — likely real bug or vulnerability requiring fix soon.
- **MED** — quality/efficiency issue that meaningfully harms maintainability.
- **LOW** — style/nit/cosmetic.
- **INFO** — observation, not an issue (architecture notes, "FYI").

## Wave 2 follow-on (do not start yet)
The orchestrator writes Wave 2 scope from Wave 1 findings. Each finding must be actionable enough that Wave 2 can pick it up directly.
