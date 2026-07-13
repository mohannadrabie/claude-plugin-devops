---
description: Adversarial pre-build attack on a proposed design or ADR — ranks attacks by blast radius, verdicts BREAKS/SURVIVES/UNPROVEN, and turns each into a failing proof-test before any code is written.
argument-hint: "<design | ADR | code path | proposal>  (default: the most recent proposal)"
---

Launch the `challenger` agent against: $ARGUMENTS

If $ARGUMENTS is empty, challenge the most recently proposed design or ADR in the current conversation, or ask the human what to attack.

When the report returns:
1. Present the attacks ranked by blast-radius / trust / production impact, with **verbatim** verdicts (BREAKS / SURVIVES / UNPROVEN). Persist the report to `docs/reviews/<scope>-challenger-<YYYY-MM-DD>.md` with raw evidence (PRINCIPLES.md rule 10).
2. For every **BREAKS** or **UNPROVEN**: have the `story-implementer` create the named proof-test as a **failing** test BEFORE any feature code is written or merged. The failing test is the record that the attack was real; it goes green only once the design defends against it.
3. Log the outcome in `docs/decisions.md` if the challenge changes a design decision (the human ratifies) — cite the challenger report.
4. **Do NOT soften the findings.** Do NOT proceed with the design until the human has seen the **"scariest unproven assumption"** line.
