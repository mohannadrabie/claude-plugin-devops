---
description: Start here — how to run the plugin (orchestrated vs guided), this project's setup status, and the full command list.
argument-hint: (no arguments)
---

Orient the user to the devops plugin. Do **no** work — this is a menu, not a task. Keep it brief.

## 1. Setup status (one line each)
- **Initialized?** `.governance.json` and `docs/PRINCIPLES.md` present → "✅ set up"; else "⚠️ not set up — run `/devops:init`".
- **ADR location:** `./adr/` submodule, `docs/adr/`, or none.
- **AWS write whitelist:** number of `allowedWriteProfiles` in `.governance.json` (0 ⇒ all AWS writes blocked until configured).

## 2. Two ways to run the flow
- **Orchestrated (recommended):** `/devops:ship <story>` — the **Manager (Alakazam)** conducts intake → plan → build → review → ship-check → audit → merge-handoff, invoking each agent and stopping at your approval and at every gate.
- **Guided (manual):** you drive — `/devops:story <story>` → `/devops:review` → `/devops:ship-check`.

Same agents, gates, and hooks in both modes.

## 3. Commands
- `/devops:ship <story>` — full orchestrated loop
- `/devops:story <story>` — plan only (intake + risk tier)
- `/devops:review` — run the tier's reviewers → Manager Summary
- `/devops:ship-check` — pre-merge verification
- `/devops:debug <failure>` — diagnose and minimally fix
- `/devops:redteam <design>` — adversarial attack on the built change (review time)
- `/devops:challenge <design>` — attack a design/ADR **before** it's built (proof-tests first)
- `/devops:adr-amend <ADR-ID> <reason>` — propose an ADR change
- `/devops:manager` — break a reviewer deadlock
- `/devops:audit-reviewers` — periodic reviewer/manager quality audit
- `/devops:init` — set up / verify this project
- `/devops:help` — this

## 4. Next action
End with the single next step: not set up → "Run `/devops:init`"; set up → "Run `/devops:ship '<your story>'` (or `/devops:story` to go step by step)".
