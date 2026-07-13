# Governance plugins for Claude Code

A `governance` marketplace hosting **three plugins** that share one Manager-orchestrated governance core (risk-scaled review, ADR enforcement, deterministic hooks, token-cache):

| Plugin | For | Domain reviewers |
|--------|-----|------------------|
| **devops** | IaC / infrastructure | network, security (infra), architecture, consumer |
| **engineer** | application software | api-contract, data-model, appsec, performance |
| **fullstack** | repos with **both** | the **union** — Manager routes each change across both rosters by what it touches |

All give you: a Manager (Alakazam) that conducts the whole loop and is the single voice to you, a story-implementer, a debugger, a shared code-reviewer + red team + architecture-reviewer + ADR-amender, risk tiers decided once, and an ADR token-cache with a live savings line. This README documents **devops** in detail; **engineer** and **fullstack** mirror it with the reviewer roster and protected paths swapped/combined (see [Engineer plugin](#engineer-plugin)).

---

## Install

Two independent steps: install the plugin (loads its `/<plugin>:*` commands), then scaffold your project.

### 1. Install a plugin — no clone required

Run these inside Claude Code (add the marketplace once, then install either or both plugins):

```
/plugin marketplace add https://github.com/mohannadrabie/claude-plugin-devops.git
/plugin install devops@governance      # IaC repos
/plugin install engineer@governance    # application repos
/plugin install fullstack@governance   # repos with both (union of the two rosters)
```

> Install **one** plugin per repo — they share the same `.governance.json`, state file, and agent names, so pick devops, engineer, or fullstack (not several at once).

Claude Code fetches the repo and enables the plugin. Commands appear namespaced under `/devops:` or `/engineer:` (e.g. `/devops:ship`, `/engineer:ship`). Verify with `/plugin list`.

> The plugin is enabled via Claude Code's `enabledPlugins` settings — written by `/plugin install`. Copying files into `~/.claude/plugins/` by hand does **not** register a plugin and no commands will appear.

### 2. Scaffold your project

Run the plugin's init inside Claude — it adds `.governance.json`, `CLAUDE.md`, and `docs/` templates to the current repo through interactive setup, and never overwrites existing files:

```
/devops:init      # or /engineer:init  or  /fullstack:init
```

Re-run it any time to verify setup.

---

## Quick Start

```
/devops:ship 'add S3 bucket with encryption'
```

The **Manager (Alakazam) conducts the whole loop** — it invokes each specialist agent, carries results forward, and is the single voice to you at every gate:

```
  ┌─────────────── 🧠 Manager (Alakazam) orchestrates ───────────────┐
  intake → plan → build → review → ship-check → audit → merge-handoff
    📝       ✅      🔨       👀        ✔️         🔍        🚀
```

**Each stage (the Manager invokes the agent, then reports to you):**
1. **Intake** (Xatu) — is the story clear? Asks questions if vague.
2. **Plan** (Machamp) — criteria, ADRs, risk tier (set once). Stops for your approval.
3. **Build** (Machamp; Ditto if it breaks) — implements to plan, runs real checks.
4. **Review** (the tier's reviewers, in parallel) — the Manager collects verdicts and synthesizes.
5. **Ship-check** — real fmt/validate/lint/policy/plan, fresh reports, clean tree.
6. **Audit the run** — the Manager verifies every agent actually did its job (dated reports with evidence, checks really ran, ADR checks happened) before handing off.
7. **Manager Summary + merge handoff** — the headline you read first; merge/apply stays human-only.

---

## Two ways to run it

Same agents, same gates, same hooks — the only difference is who drives.

| | **Orchestrated** (recommended) | **Guided** (manual) |
|---|---|---|
| Start with | `/devops:ship <story>` | `/devops:story <story>` |
| Who drives | The **Manager (Alakazam)** conducts every stage and is the single voice to you | **You** drive — run each command yourself, one stage at a time |
| Best for | Day-to-day: one command, auto hand-offs between stages, stops at gates | Pausing between stages, running only part of the loop, or re-running one stage |

**Orchestrated — one command:**
```
/devops:ship 'add S3 bucket with encryption'
```
The Manager runs intake → plan → build → review → ship-check → audit → merge-handoff, invoking each agent, stopping for your approval at the plan and at any gate.

**Guided — you run each stage:**
```
/devops:story 'add S3 bucket with encryption'   # intake + plan + set tier, stops for approval, then builds
/devops:review                                   # the tier's reviewers on your diff → Manager Summary
/devops:ship-check                               # pre-merge verification
```
Reach for `/devops:debug`, `/devops:redteam`, `/devops:adr-amend`, or `/devops:manager` at any point in either mode.

> The deterministic hooks (protected paths, AWS whitelist, human-only apply/merge) enforce identically in **both** modes — they never depend on which one you pick.

---

## Commands

All commands are namespaced under `/devops:`. Type `/devops:` in Claude Code to see them with descriptions and argument hints inline. New to a repo? Run `/devops:init` first, or `/devops:help` for a tour.

**Main workflow:**
- `/devops:ship <story>` — Full loop (intake → merge)
- `/devops:story <story>` — Plan only (stops for approval)
- `/devops:review` — Run reviewers on current diff
- `/devops:ship-check` — Pre-merge verification

**When things break:**
- `/devops:debug <issue>` — Diagnose and fix failures

**ADR management:**
- `/devops:adr-amend <ADR-ID> <reason>` — Propose ADR change when ADR is wrong

**Management:**
- `/devops:manager` — Break reviewer deadlocks
- `/devops:redteam <design>` — Attack design with failure scenarios
- `/devops:audit-reviewers` — Grade reviewers monthly

---

## Risk Tiers

The plugin scales ceremony to risk:

| Tier | Examples | Review |
|------|----------|--------|
| **TRIVIAL** | Docs, comments | Tests pass → ship |
| **STANDARD** | Most code | One domain reviewer |
| **CRITICAL** | IAM, network, prod | Red team + domain reviewer |

Tier decided once by `/devops:story`, reused everywhere.

---

## How review stays cheap without losing rigor

The reviewer **always does a complete review** of the diff and writes a full report to `docs/reviews/`. What's optimized is how the **Manager** consumes that report during the loop — so tokens are saved on iteration, never on the review itself.

- **Receipts, not re-reads.** Every reviewer ends its turn with a compact `RECEIPT:` block — a verdict, a **complete terse list of every finding** (`[ISSUE]`/`[SUSPICION]`/`[CLEAN]`, each issue tagged `[HIGH|MED|LOW]`), and a `counts` checksum. The Manager audits from the receipt instead of reopening the full report at every narration and every stage.
- **The cheap path only greenlights.** On STANDARD tier the Manager trusts a clean receipt — but any red flag (checksum mismatch, non-clean verdict, a `[HIGH]` or `[SUSPICION]`, an out-of-lane ADR hit) forces an immediate full read. A blocker or rework is **never** declared from a receipt; only after reading the evidence.
- **Audit depth scales with risk.** CRITICAL-tier runs full-read every report immediately — the blast radius warrants it.
- **Nothing merges unread.** Before SHIPPABLE, a **pre-merge full-read gate** (`/ship-check` + ship stage 5.5) reads in full every report that was only receipt-trusted, plus every decision touched or archived that run. So the merge — the least reversible moment — always rests on a complete read, catching anything a receipt couldn't.
- **Honest by construction.** Each per-reviewer line in the Manager Summary is marked `[receipt-trusted]` or `[full report read]`, so you can see exactly where independent verification was cheap versus thorough.

Net: the receipt saves tokens across fix-rerun cycles and multi-story runs (where reports would otherwise be reopened many times); on a trivial single-pass change it's roughly neutral — the deliberate cost of guaranteeing nothing merges unverified.

---

## The Team (Agents)

**Builders:**
- 💪 **Machamp** (story-implementer) — Plans and builds
- 🔄 **Ditto** (debugger) — Fixes failures

**Reviewers:**
- 🔷 **Porygon** (code) — Correctness, tests
- 🌙 **Umbreon** (security) — IAM, secrets, exposure
- ⚡ **Magnezone** (network) — Topology, reachability
- 🧬 **Metagross** (architecture) — Design coherence
- 💗 **Audino** (consumer) — Usability

**Adversarial:**
- 👻 **Gengar** (redteam) — Attacks the built change at review time
- 🗡️ **Absol** (challenger) — Attacks a design/ADR **before** it's built; BREAKS/UNPROVEN become failing proof-tests (`/…:challenge`)

**Orchestration:**
- 🧠 **Alakazam** (manager) — Conducts the whole loop, the single voice to you; breaks deadlocks
- 🔮 **Xatu** (intake-refiner) — Detects vague input

**ADR Management:**
- 🔮 **Espeon** (adr-amender) — Creates amendment PRs

All agents announce themselves with emoji + name when working.

---

## Configuration Files

### `.governance.json` — AWS whitelist + protected paths
```json
{
  "allowedWriteAccounts": ["123456789012"],
  "allowedWriteProfiles": ["sandbox", "dev"],
  "allowedWriteRoles": [],
  "protected": [
    { "paths": "modules/(iam|network|security)/", "requires": "security", "gateDays": 7 },
    { "paths": "modules/data|.*database.*",        "requires": "redteam",  "gateDays": 7 }
  ],
  "blockedCommands": [
    { "pattern": "kubectl\\s+delete\\s+namespace", "message": "Namespace deletion is human-only." }
  ]
}
```

Read by the `guard.mjs` pre-write hook. Exact schema (the hook silently ignores unknown keys, so a typo = no protection):

| Key | Type | Effect |
|-----|------|--------|
| `allowedWriteProfiles` / `allowedWriteAccounts` / `allowedWriteRoles` | array | A mutating `aws` command is **blocked** unless its profile/account/role is listed. Empty ⇒ all writes blocked. |
| `protected[]` | array of objects | Each: `paths` (a **regex**, case-insensitive — not a glob), `requires` (reviewer type whose dated report unlocks it), `gateDays` (freshness window). Editing/writing a matching path is blocked until `docs/reviews/<scope>-<requires>-<date>.md` exists dated within `gateDays`. |
| `blockedCommands[]` | array of objects | Each `{pattern, message}` — a regex that is always human-only. |

### `CLAUDE.md` — Project Context
Auto-generated by installer. Tells Claude about:
- Risk tier definitions
- AWS constraints
- Protected paths
- ADR location

### `docs/.governance-state.json` — Shared Cache
Auto-generated by `/devops:story`. Contains:
- Risk tier (decided once)
- ADR catalog (token-efficient)

---

## ADR Compliance

**Problem:** Reviewers re-reading all ADRs wastes 25k tokens per review.

**Solution:** Catalog ADRs once, share across agents.

1. Story-implementer reads all ADRs, extracts frontmatter
2. Builds catalog in `.governance-state.json`
3. Each reviewer reads only **its own domain's slice** of the catalog (200 tokens each)
4. The **Manager reads the whole catalog once** and owns **cross-domain** collision detection — it checks the diff against ADRs *outside* each reviewer's lane (a violation no single-lane reviewer would see), so the per-review cost is `1 × whole + N × slice`, not `N × whole`. `/ship-check` re-runs a whole-catalog-vs-diff pass as the pre-merge backstop.

**Result:** 6k tokens per review (**76% reduction**)

**You see it live.** Each agent runs `node docs/adr-cache.mjs` first and prints whether the cache paid off:

```
📊 ADR cache HIT: reused 6 ADR(s) from catalog — ≈2800 tokens saved this pass [CACHE=HIT]
```

`HIT` = catalog reused, `MISS` = ADRs re-read (rebuild pending), `NONE` = no ADRs. The token figure is an estimate.

### ADR Template

Use `docs/adr-template.md` for token efficiency:

```yaml
---
id: ADR-003
title: S3 buckets must encrypt at rest
status: accepted
applicableTo: [security, storage]
constraints:
  security: ["All S3 buckets must enable SSE-KMS"]
---

# Context
(full ADR body)
```

Frontmatter is 300 tokens vs. 2000 tokens for full text.

---

## When ADR Blocks You

**Scenario:** Reviewer says "BLOCKER: Violates ADR-003"

**Option 1: Fix your code** (default)
Change code to comply with ADR.

**Option 2: Amend the ADR** (when ADR is wrong)
```
/devops:adr-amend ADR-003 "encryption too strict for public static assets"
```

**What happens:**
1. Creates PR in ADR repo with your justification
2. Documents temporary override (14-day review-back)
3. Your code can proceed while amendment pending
4. If rejected within 14 days, you must revert code

**Requires:** ADR as git submodule with remote origin.

---

## File Structure

Created by the installer / `/devops:init` (existing files are never overwritten):

```
your-project/
├── .governance.json                    # AWS whitelist + protected paths
├── CLAUDE.md                       # Project context
├── docs/
│   ├── PRINCIPLES.md               # Team charter (14 rules)
│   ├── STATE.md                    # Living project state — read first, updated at every close
│   ├── decisions.md                # Decision Log — active only (cite-evidence, supersede-in-place); resolved rows sweep to decisions-archive.md
│   ├── decisions-archive.md        # Resolved decisions, past their review-back date — read on demand, not hydrated every session
│   ├── backlog.md                  # Deferred items land here, not in code
│   ├── REVIEW_LOG.md               # Review audit trail
│   ├── adr-template.md             # ADR format (frontmatter + Rules for agents)
│   ├── manager-summary-format.md   # Canonical Manager Summary spec
│   ├── conformance-triage.md       # Produced on demand when ADRs change
│   ├── adr-cache.mjs               # ADR cache reporter (prints the 📊 line)
│   ├── decisions-archive.mjs       # Atomic sweep of resolved rows → decisions-archive.md (Manager runs at handoff)
│   ├── .governance-state.json      # Tier + ADR catalog (auto-generated by /devops:story)
│   └── reviews/                    # Reviewer reports (dated, verbatim, with raw evidence)
└── adr/  (or docs/adr/)            # ADRs — the architecture source of truth
```

---

## Examples

**Single story:**
```
/devops:ship 'add KMS key for S3 encryption'
```

**Requirements doc:**
```
/devops:ship docs/requirements/multi-region.md
```

**Manual steps:**
```
/devops:story 'add VPC endpoint'  # Plan only
/devops:review                    # Review current diff
/devops:ship-check                # Final check
```

**Attack a design:**
```
/devops:redteam docs/designs/new-vpc.md
```

---

## Troubleshooting

**AWS writes blocked?**
```bash
grep allowedWrite .governance.json
```
Add your profile/account to `allowedWriteProfiles`.

**ADRs not checked?**
```bash
jq '.adrCatalog' docs/.governance-state.json
```
If empty, run `/devops:story` to rebuild catalog.

**`/devops:*` commands don't appear?**
- The plugin must be installed through Claude Code, not by copying files. Run `/plugin list` — if `devops` is absent, run the two install commands above.
- If `/plugin marketplace add` reports a name clash, an older `devops` marketplace is registered. Remove it first: `/plugin marketplace remove devops`, then re-add.
- Restart Claude Code after install if the command menu hasn't refreshed.

**Setup verification:**
```
/devops:init
```

---

## Agent Teams (experimental, opt-in)

Off by default. Everything works without it — this only adds `/devops:review --team <scope>` on **CRITICAL**-tier changes, running reviewers as parallel agent-team teammates instead of subagents.

**Enable it (you must set this yourself).** The plugin cannot turn on an experimental flag for you — Claude Code does not auto-apply a plugin's `settings.json`. Add the env var to **your own** settings (`~/.claude/settings.json` for all projects, or `.claude/settings.json` for one), then restart Claude Code:

```json
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
}
```

`devops/settings.json` in this repo is a ready-to-copy example of that block — it is reference only, not loaded from the plugin.

**Use it:**

```
/devops:review --team <scope>
```

- CRITICAL tier only; `--team` below CRITICAL is refused.
- If the env var is unset, `/devops:review` silently runs the normal subagent chain — no error, no team.

**Caveats:** experimental; teammates run in-process (no split panes, no session resume) unless you're in tmux/iTerm2; behavior may change across Claude Code versions.

---

## Team Principles

From `docs/PRINCIPLES.md`:

1. **Ceremony scales with risk** — No over-reviewing
2. **Every block names its unlock** — No mystery gates
3. **Approvals expire** — Reports dated, deadlocks escalate same-day
4. **SURVIVES is celebrated** — Clean pass is the goal
5. **Findings are fixes** — Minimal changes, not blame
6. **Auditors get audited** — Monthly quality checks
7. **Manager decides, log remembers, human overrides** — Nothing quietly final

---

## Engineer plugin

`engineer` is the software-engineering sibling of `devops` — **identical governance core** (Manager-orchestrated loop, risk tiers, audit stage, ADR token-cache, hooks), different domain layer. Use it exactly like devops, under the `/engineer:` namespace:

```
/plugin install engineer@governance
/engineer:init
/engineer:ship 'add rate limiting to the login endpoint'
```

**Domain reviewers:** ⚙️ Klinklang (api-contract — versioning/back-compat) · 🗄️ Registeel (data-model — schema/migrations) · 🛡️ Aegislash (appsec — authz/injection/secrets/deps) · 💨 Accelgor (performance) — plus the shared 🔷 Porygon (code), 👻 Gengar (red team), and 🧬 Metagross (architecture).

**Protected paths** (`.governance.json`) default to `auth/`, `payments/`, `migrations/`, and public API/contract folders; **blocked commands** default to package publish and destructive SQL. The AWS write-whitelist is inert unless you actually run `aws`.

### ADRs (folder-scoped across both plugins)

Both plugins pull **one** ADR repo whole (as a submodule, e.g. `./adr/`) and each reads only **its own folder** inside it via `.governance.json → adr.dir`:

```
adr/                 # the whole ADR repo, pulled once
├── devops/          # devops plugin → adr.dir: "adr/devops"
└── engineer/        # engineer plugin → adr.dir: "adr/engineer"
```

The cache reporter (`docs/adr-cache.mjs`) scans that folder **recursively**, so any sub-folders you create under it are discovered automatically. Each plugin's fingerprint is scoped to its folder — editing a devops ADR never invalidates the engineer cache, and vice-versa. Set `adr.dir` at `/…:init` time or edit `.governance.json` directly.

**Staying current with upstream ADRs.** `adr.autoSync` is **off by default** (`.governance.json`). With it off, the cache build is purely local — no git, no network. Turn it on and `docs/adr-cache.mjs --ensure` (run by a `SessionStart` hook and by each agent's pre-flight) fast-forwards the ADR submodule to `upstreamBranch` before fingerprinting — a **non-destructive `git merge --ff-only`** (never orphans unpushed local commits; a diverged branch falls back to the on-disk ADRs), **skipped when `$CI` is set** so CI reviews the pinned SHA. Advancing the submodule dirties the superproject tree, so committing that pointer stays a deliberate human step — which is why manual bumps are the default.

---

## Documentation

- **This README** — installation, quick start, and ADR/token-cache details
- **`docs/PRINCIPLES.md`** — Workflow rules (created by installer)
- **`devops/templates/adr-cache-check.md`** — ADR cache freshness model (contributor reference)
- **`devops/agents/*.md`** — Agent details
- **`devops/commands/*.md`** — Command reference

---

## Requirements

- Claude Code
- **Node.js — required.** Runs the policy hooks (`guard.mjs`, `team-gate.mjs`) and the ADR cache reporter (`adr-cache.mjs`). Without it, hooks don't enforce and the cache line doesn't show.
- `jq` — used by `/devops:adr-amend` (not by the hooks or cache, which are node-only)
- AWS CLI (for AWS operations)
- `gh` or `glab` CLI (for PR/MR creation)

---

**License:** MIT
