---
description: Start here — how to run the plugin (orchestrated vs guided), this project's setup status, and the full command list.
argument-hint: (no arguments)
---

Orient the user to the devops plugin. Do **no** work — this is a menu, not a task. Keep it brief.

## 1. Setup status (one line each)
- **Initialized?** `.governance.json` and `docs/PRINCIPLES.md` present → "✅ set up"; else "⚠️ not set up — run `/fullstack:init`".
- **ADR location:** `./adr/` submodule, `docs/adr/`, or none.
- **AWS write whitelist:** number of `allowedWriteProfiles` in `.governance.json` (0 ⇒ all AWS writes blocked until configured).

## 2. Two ways to run the flow
- **Orchestrated (recommended):** `/fullstack:ship <story>` — the **Manager (Alakazam)** conducts intake → plan → build → review → ship-check → audit → merge-handoff, invoking each agent and stopping at your approval and at every gate.
- **Guided (manual):** you drive — `/fullstack:story <story>` → `/fullstack:review` → `/fullstack:ship-check`.

Same agents, gates, and hooks in both modes.

## 3. Commands
- `/fullstack:ship <story>` — full orchestrated loop
- `/fullstack:story <story>` — plan only (intake + risk tier)
- `/fullstack:review` — run the tier's reviewers → Manager Summary
- `/fullstack:ship-check` — pre-merge verification
- `/fullstack:debug <failure>` — diagnose and minimally fix
- `/fullstack:redteam <design>` — adversarial attack on the built change (review time)
- `/fullstack:challenge <design>` — attack a design/ADR **before** it's built (proof-tests first)
- `/fullstack:adr-amend <ADR-ID> <reason>` — propose an ADR change
- `/fullstack:manager` — break a reviewer deadlock
- `/fullstack:audit-reviewers` — periodic reviewer/manager quality audit
- `/fullstack:init` — set up / verify this project
- `/fullstack:help` — this

## 4. Next action
End with the single next step: not set up → "Run `/fullstack:init`"; set up → "Run `/fullstack:ship '<your story>'` (or `/fullstack:story` to go step by step)".
