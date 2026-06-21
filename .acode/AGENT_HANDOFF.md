# AGENT_HANDOFF.md — AliFullStack Review Wave 1 (Read-Only Audits)

You are contractors on **Wave 1** of a 5-scope code-base review of `/Volumes/Farhan/Desktop/AliFullstack`. Your output is a **report only**, returned to the orchestrator as JSON. No production code changes.

## Project facts
- **App**: AliFullStack v0.1.0 — Electron 35 + Vite 5 + React 19 + TanStack Router/Query.
- **Base branch**: `v0.1.0` (already synced with `origin/v0.1.0`). Branch from this.
- **Remotes**: `origin` = `git@github.com:SFARPak/AliFullStack.git` (SSH); `backup` = local file path. **Only push to `origin`.**
- **Gates available locally** (already installed in main checkout):
  - `npm run lint` → `oxlint --fix`
  - `npm run ts` → `tsc -p tsconfig.app.json --noEmit`
  - `npm test` → `vitest run`
  - `npm run prettier:check`
- **Submodule `dyad/` is modified** but uncommitted — DO NOT touch its contents.

## Worktree isolation (mandatory)
```sh
cd /Volumes/Farhan/Desktop/AliFullstack
git worktree add ../AliFullstack-review-<scope> -b agent/review-<scope> v0.1.0
cd ../AliFullstack-review-<scope>
npm install  # if needed for gates; mostly pre-installed in main checkout
```
All your work happens in `/Volumes/Farhan/Desktop/AliFullstack-review-<scope>`. **Never edit files in the main checkout.**

## Do NOT touch (read-only)
- `dyad/` (git submodule; modified content is the user's own working state)
- `scaffold-3d/` (ignored 3D scaffold dup)
- `node_modules/`, `dist/`, `out/`, `*.log`, `userData/`, `playwright-report/`, `test-results/`
- `submodules/*` commits

## What "audit" means for Wave 1
- Read code, lint with `oxlint`, type-check, format-check.
- Produce a structured report — file paths + line ranges + 1-3 line evidence + severity (CRITICAL/HIGH/MED/LOW/INFO).
- **You MAY commit the report file only** to your branch (e.g., `REVIEW_<scope>.md` or under `docs/reviews/`). No source edits.
- Push branch (using `--no-verify` is fine for Wave 1 — these are docs-only). **Do not open a PR.** The orchestrator merges Wave 1 reports and decides Wave 2.

## Commit conventions
- One commit per agent: `review(<scope>): <wave-1-audit-report>`
- Conventional `feat:`/`fix:`/etc. is reserved for Wave 2 implementers.

## Output deliverable
Return this JSON block as the last thing in your final message:
```json
{
  "scope": "<one of: security, ipc, code-quality, testing, build-ci>",
  "branch": "agent/review-<scope>",
  "commit_sha": "<full SHA>",
  "files_changed": ["docs/reviews/<scope>.md", "REVIEW_<scope>.md", ...],
  "lines_added": <int>,
  "lines_removed": <int>,
  "gates_run": ["lint", "tsc", ...],
  "gates_passed": true | false,
  "findings_count": {"CRITICAL": N, "HIGH": N, "MED": N, "LOW": N, "INFO": N},
  "blockers": [] | ["..."]
}
```

If you find the gates fail on the **base branch** before you start, do not fix it — report it as a finding and mark `gates_passed: false` with `"blockers"` describing it.

## Quality bar
- Read at least 60% of files in your scope's file list before reporting.
- Every finding must cite `path:line`.
- No fabricated evidence — if you can't back it up, it's not a finding.

## Coordination rule
- If you discover something that belongs to another agent's scope, record it in your report under `cross_scope_notes: [...]` rather than fixing it. The orchestrator routes cross-scope items in Wave 2.
</content>
</invoke>