---
description: Start here — how to run the plugin (orchestrated vs guided), this project's setup status, and the full command list.
argument-hint: (no arguments)
---

Orient the user to the devops plugin. Do **no** work — this is a menu, not a task. Keep it brief.

## 1. Setup status (one line each)
- **Initialized?** `.governance.json` and `docs/PRINCIPLES.md` present → "✅ set up"; else "⚠️ not set up — run `/engineer:init`".
- **ADR location:** `./adr/` submodule, `docs/adr/`, or none.
- **AWS write whitelist:** number of `allowedWriteProfiles` in `.governance.json` (0 ⇒ all AWS writes blocked until configured).

## 2. Two ways to run the flow
- **Orchestrated (recommended):** `/engineer:ship <story>` — the **Manager (Alakazam)** conducts intake → plan → build → review → ship-check → audit → merge-handoff, invoking each agent and stopping at your approval and at every gate.
- **Guided (manual):** you drive — `/engineer:story <story>` → `/engineer:review` → `/engineer:ship-check`.

Same agents, gates, and hooks in both modes.

## 3. Commands
- `/engineer:ship <story>` — full orchestrated loop
- `/engineer:story <story>` — plan only (intake + risk tier)
- `/engineer:review` — run the tier's reviewers → Manager Summary
- `/engineer:ship-check` — pre-merge verification
- `/engineer:debug <failure>` — diagnose and minimally fix
- `/engineer:redteam <design>` — adversarial attack on the built change (review time)
- `/engineer:challenge <design>` — attack a design/ADR **before** it's built (proof-tests first)
- `/engineer:adr-amend <ADR-ID> <reason>` — propose an ADR change
- `/engineer:manager` — break a reviewer deadlock
- `/engineer:audit-reviewers` — periodic reviewer/manager quality audit
- `/engineer:init` — set up / verify this project
- `/engineer:help` — this

## 4. Next action
End with the single next step: not set up → "Run `/engineer:init`"; set up → "Run `/engineer:ship '<your story>'` (or `/engineer:story` to go step by step)".
