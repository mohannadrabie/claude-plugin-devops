# Project Context

This is an AWS infrastructure/platform engineering project using the devops plugin for governance.

**Read first, in order** (PRINCIPLES.md rule 14): `docs/STATE.md` → this file → `docs/PRINCIPLES.md` → `docs/decisions.md` (active decisions only — `docs/decisions-archive.md` is read on demand) → the applicable ADRs.

## Risk Tier Definitions

Review ceremony scales with risk per `docs/PRINCIPLES.md`:

### TRIVIAL
- **Scope**: Documentation, comments, tags, cosmetic changes, typo fixes
- **Process**: Tests + self-review, ship
- **No formal review required**

### STANDARD
- **Scope**: Feature work, refactors, config changes, most infrastructure changes
- **Process**: ONE domain reviewer + implementer
- **Reviewers**: 
  - `code-reviewer` for general IaC/code quality
  - `architecture-reviewer` for module/stack design changes
  - `network-reviewer` for VPC/networking changes
  - `security-reviewer` for IAM/secrets changes

### CRITICAL
- **Scope**: Protected paths (IAM, network, security, data), prod-facing, security-relevant
- **Process**: Red team + relevant domain reviewer(s)
- **Reviewers**:
  - `redteam` (adversarial verification) + domain reviewer
  - `security-reviewer` for IAM/network/security modules
  - `consumer-reviewer` for self-service ADR features

### Every tier above TRIVIAL
- `fullspectrum-reviewer` always joins the domain reviewer(s) — the standing cross-domain pass that reads the WHOLE ADR catalog (not a domain slice) and catches what falls in the seams between lanes. It doesn't count against the "never more than two reviewers" cap (PRINCIPLES.md rule 9).

## Review Ceremony

All reviews follow `docs/PRINCIPLES.md`:
- Ceremony scales with risk (never more than needed)
- Every block names its unlock
- Approvals expire per gateDays in `.governance.json`
- SURVIVES is a celebrated verdict
- Findings are fixes, not blame

## Workflow Loop

**Primary command: `/devops:ship <story>`** — the **Manager (Alakazam) conducts** the full loop, invoking each agent and speaking to you at every gate:
```
intake → plan → build → review → ship-check → audit → merge-handoff
```
The audit stage verifies every agent actually did its job (dated reports, real checks, ADR checks) before handoff. Stops for approval and at any gate.

Individual commands for manual control:
- `/devops:story` — intake-gate + plan + set risk tier
- `/devops:review` — run the tier's reviewers
- `/devops:debug` — diagnose failure, minimal fix
- `/devops:ship-check` — pre-merge verification
- `/devops:manager` — deadlock ruling (same day)
- `/devops:redteam` — adversarial review
- `/devops:audit-reviewers` — periodic reviewer-quality grading

## AWS Environment

Write operations are gated by `.governance.json`:
- Allowed accounts: {{ALLOWED_ACCOUNTS}}
- Allowed profiles: {{ALLOWED_PROFILES}}
- Allowed roles: {{ALLOWED_ROLES}}

Mutations in non-whitelisted accounts/profiles will be blocked by pre-write hooks.

## Protected Paths

Paths requiring dated review reports (configured in `.governance.json`):
{{PROTECTED_PATHS}}

## Architecture Decisions

{{ADR_LOCATION}}

Accepted ADRs' **Rules for agents** rank ABOVE the conventions in this file — where they conflict, the ADR wins (PRINCIPLES.md rule 9). Read the applicable ADRs before writing/reviewing infra.

## Hard rules — never violate
_Project invariants. The reviewer checks these every time (its standing checklist); a violation is a Blocker. Edit this list for your project._
- `terraform apply` / `execute-change-set` never runs from a session — human-only (the hooks enforce it).
- No IAM `Action: "*"` or `Resource: "*"` on instance/access roles.
- No secrets in code, state, tfvars, or plan output — read from Secrets Manager / env.
- No changes to protected paths without a fresh dated review report in `docs/reviews/`.
- No gold-plating: not in the approved change → `docs/backlog.md`, never the diff.
- _<add your project's own invariants>_

## Definition of Done (every change)
_`/devops:ship-check` enforces this. Edit for your project._
- fmt / validate / lint / policy tests pass in CI (real counts, skipped ≠ passed)
- plan / changeset generated and reviewed; destructive changes listed
- required review report(s) fresh in `docs/reviews/` with raw evidence
- CHANGELOG entry + `docs/STATE.md` updated; working tree clean
