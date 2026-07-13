# Project Context

This is a software-engineering project using the **engineer** governance plugin (risk-scaled review, ADR enforcement, deterministic hooks).

**Read first, in order** (PRINCIPLES.md rule 14): `docs/STATE.md` → this file → `docs/PRINCIPLES.md` → `docs/decisions.md` (active decisions only — `docs/decisions-archive.md` is read on demand) → the applicable ADRs.

## Risk Tier Definitions

Review ceremony scales with risk per `docs/PRINCIPLES.md`:

### TRIVIAL
- **Scope**: Docs, comments, formatting, cosmetic changes, typo fixes
- **Process**: Tests + self-review, ship. No formal review.

### STANDARD
- **Scope**: Most feature work, refactors, config changes
- **Process**: ONE domain reviewer + implementer
- **Reviewers**: `code-reviewer` (correctness/tests) · `api-reviewer` (contracts) · `data-reviewer` (schema/migrations) · `security-reviewer` (appsec) · `performance-reviewer` · `architecture-reviewer` (design)

### CRITICAL
- **Scope**: Protected paths (auth, payments, migrations, public API), security-relevant, prod-facing
- **Process**: `redteam` (adversarial) + the relevant domain reviewer

## Workflow Loop

**Primary command: `/engineer:ship <story>`** — the **Manager (Alakazam) conducts** the full loop, invoking each agent and speaking to you at every gate:
```
intake → plan → build → review → ship-check → audit → merge-handoff
```
The audit stage verifies every agent actually did its job (dated reports, real checks, ADR checks) before handoff. Stops for approval and at any gate.

Individual commands: `/engineer:story`, `/engineer:review`, `/engineer:debug`, `/engineer:ship-check`, `/engineer:manager`, `/engineer:redteam`, `/engineer:audit-reviewers`, `/engineer:adr-amend`, `/engineer:help`, `/engineer:init`.

## Write Gates

Deterministic hooks in `.governance.json` (read by `guard.mjs`):
- **Protected paths** require a fresh dated reviewer report in `docs/reviews/` before they can be edited:
{{PROTECTED_PATHS}}
- **Blocked commands** are human-only (e.g. package publish, destructive SQL).
- `git push --force`, and (if used) non-whitelisted `aws` writes, are blocked.

## Architecture Decisions

{{ADR_LOCATION}}

ADRs for this plugin live under the `adr.dir` configured in `.governance.json` (default `adr/engineer`) — one folder inside a shared, pulled ADR repo. The cache reporter (`docs/adr-cache.mjs`) scans that folder recursively; each agent prints a `📊 ADR cache …` line showing reuse/savings. Author ADRs with `docs/adr-template.md`. Accepted ADRs' **Rules for agents** rank ABOVE the conventions in this file — where they conflict, the ADR wins (PRINCIPLES.md rule 9).

## Hard rules — never violate
_Project invariants. The reviewer checks these every time (its standing checklist); a violation is a Blocker. Edit this list for your project._
- Domain logic (business rules, money/inventory math, parsers) gets unit tests WRITTEN WITH the feature — not after, not optional.
- No secrets in source, tests, or committed config — read from a vault / env.
- Money & inventory operations are idempotent (users double-click) — a run-twice test per mutating op.
- No changes to protected paths (auth, payments, migrations, public API) without a fresh dated review report in `docs/reviews/`.
- No gold-plating: not in the approved change → `docs/backlog.md`, never the diff.
- _<add your project's own invariants>_

## Definition of Done (every change)
_`/engineer:ship-check` enforces this. Edit for your project._
- build / typecheck / lint pass; tests green in CI with real counts (skipped ≠ passed)
- coverage gate real (thresholds actually fail the build), not cosmetic
- migrations reversible + applied; API/contract changes are backward-compatible or versioned
- required review report(s) fresh in `docs/reviews/` with raw evidence
- CHANGELOG entry + `docs/STATE.md` updated; working tree clean
