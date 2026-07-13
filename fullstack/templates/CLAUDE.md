# Project Context

This is a **full-stack** project (infrastructure **and** application code) using the `fullstack` governance plugin — the union of the devops (IaC) and engineer (software) rosters under one Manager-orchestrated loop.

**Read first, in order** (PRINCIPLES.md rule 14): `docs/STATE.md` → this file → `docs/PRINCIPLES.md` → `docs/decisions.md` (active decisions only — `docs/decisions-archive.md` is read on demand) → the applicable ADRs.

## Risk Tier Definitions

Review ceremony scales with risk per `docs/PRINCIPLES.md`:

### TRIVIAL
- Docs, comments, formatting, cosmetic changes. Tests + self-review, ship. No formal review.

### STANDARD
- Most feature work, refactors, config. ONE domain reviewer (chosen by what changed) + implementer.
- **Infra reviewers**: `network-reviewer`, `security-reviewer` (IAM/secrets/exposure), `consumer-reviewer` (self-service ADR)
- **App reviewers**: `appsec-reviewer` (authz/injection/deps), `api-reviewer` (contracts), `data-reviewer` (schema/migrations), `performance-reviewer`
- **Either**: `architecture-reviewer` (design), `code-reviewer` (correctness/tests)

### CRITICAL
- Protected paths (IAM, network, auth, payments, migrations, public API), prod-facing, security-relevant.
- `redteam` (adversarial) + the relevant domain reviewer(s). A change spanning infra **and** app gets one reviewer per side, in parallel.

## Workflow Loop

**Primary command: `/fullstack:ship <story>`** — the **Manager (Alakazam) conducts** the full loop, invoking each agent (across both domains, by what the change touches) and speaking to you at every gate:
```
intake → plan → build → review → ship-check → audit → merge-handoff
```
Individual commands: `/fullstack:story`, `/fullstack:review`, `/fullstack:debug`, `/fullstack:ship-check`, `/fullstack:manager`, `/fullstack:redteam`, `/fullstack:audit-reviewers`, `/fullstack:adr-amend`, `/fullstack:help`, `/fullstack:init`.

## Write Gates

Deterministic hooks in `.governance.json` (read by `guard.mjs`):
- **Protected paths** require a fresh dated reviewer report in `docs/reviews/` before editing:
{{PROTECTED_PATHS}}
- **Blocked commands** are human-only (namespace deletion, package publish, destructive SQL).
- `git push --force`, `terraform apply`, and non-whitelisted `aws` writes are blocked.

## Architecture Decisions

{{ADR_LOCATION}}

ADRs are read from **both** domain folders in the pulled ADR repo — `.governance.json → adr.dir` is an array (default `["adr/devops", "adr/engineer"]`). The cache reporter (`docs/adr-cache.mjs`) scans each recursively; every agent prints a `📊 ADR cache …` line. Author ADRs with `docs/adr-template.md`. Accepted ADRs' **Rules for agents** rank ABOVE the conventions in this file — where they conflict, the ADR wins (PRINCIPLES.md rule 9).

## Hard rules — never violate
_Project invariants. The reviewer checks these every time (its standing checklist); a violation is a Blocker. Edit for your project._
- `terraform apply` / `execute-change-set` and prod deploys never run from a session — human-only (hooks enforce it).
- No IAM `Action: "*"`/`Resource: "*"`; no secrets in code/state/config — read from a vault / env.
- Domain logic gets unit tests WITH the feature; money & inventory ops are idempotent (run-twice test).
- No changes to protected paths (IAM/network + auth/payments/migrations/API) without a fresh dated review report in `docs/reviews/`.
- No gold-plating: not in the approved change → `docs/backlog.md`, never the diff.
- _<add your project's own invariants>_

## Definition of Done (every change)
_`/fullstack:ship-check` enforces this. Edit for your project._
- build / typecheck / lint / policy pass; tests green in CI with real counts (skipped ≠ passed); coverage gate real
- infra: plan/changeset reviewed, destructive changes listed; app: migrations reversible, API changes back-compat or versioned
- required review report(s) fresh in `docs/reviews/` with raw evidence
- CHANGELOG entry + `docs/STATE.md` updated; working tree clean
