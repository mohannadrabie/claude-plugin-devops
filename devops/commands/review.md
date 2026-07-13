---
description: Run the risk tier's reviewers on the current diff and close with the Manager Summary.
argument-hint: "[sec|net|arch|code|consumer] [scope]  (default: current diff vs main)"
---

Run the review chain for: $ARGUMENTS (default: current diff vs main).

**Cache first.** Run `node docs/adr-cache.mjs --ensure` once now (it builds the ADR catalog if stale or absent) so the reviewers you fan out all reuse it instead of each rebuilding. Surface the `📊 ADR cache …` line.

**Tier first.** Read docs/.governance-state.json if present and reuse its `tier` and `requiredReviewers` — /story already decided them; don't re-derive and risk disagreeing. If absent (review run standalone, no prior /story), derive the tier from the diff per PRINCIPLES.md and write it to docs/.governance-state.json so downstream steps agree.

**Reviewer selection** (from the tier + the paths actually touched — the paths tell you the domain):
- TRIVIAL: no agent — verify checks pass, note it in the PR, done. (Running reviewers on trivial changes is a PRINCIPLES.md violation.)
- STANDARD: the ONE right reviewer, chosen by what changed — `network-reviewer` if `modules/network/**` or reachability changed; `security-reviewer` if IAM/KMS/secrets/exposure or `modules/(iam|security)/**`; `architecture-reviewer` if new modules/topology; `consumer-reviewer` if `templates/adr/**` or the self-service authoring/onboarding flow; else `code-reviewer`.
- CRITICAL: `redteam` + the one most-relevant domain reviewer from the list above, in parallel.
Explicit override always wins: `/review sec|net|arch|code|consumer <scope>` forces that reviewer.

**Consumer-facing self-service ADR changes** use `consumer-reviewer` (one agent, two lenses — usability + decision quality). Its dated `<scope>-consumer-<date>.md` report unlocks consumer-protected paths. On a CRITICAL consumer flow, pair it with `redteam`.

**Team mode (opt-in): `/review --team <scope>`.** CRITICAL-tier only. Routes to the `manager` agent to run reviewers as parallel agent-team teammates instead of subagents. Requires agent teams enabled (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1); if unset, say so and run the standard subagent chain. `--team` below CRITICAL is refused. Purely additive — without it, /review is unchanged.

When reports return: persist EACH verbatim to docs/reviews/<scope>-<agent>-<YYYY-MM-DD>.md with raw command/test output appended; add rows to docs/REVIEW_LOG.md. Each reviewer ends its turn with a `RECEIPT:` block (verdict, a **complete terse list of every finding** — `[ISSUE]`/`[SUSPICION]`/`[CLEAN]` with a `[HIGH|MED|LOW]` severity on each issue/suspicion — a `counts` checksum, checks, ADR cache state, report path). On STANDARD tier, synthesize the Manager Summary from those receipts — every per-reviewer line cites that reviewer's report path (`docs/manager-summary-format.md`) so the human can open it regardless; open the full report yourself only when — this trigger list is identical in `manager.md`/`ship.md`/`PRINCIPLES.md` rule 10 — the receipt is missing/malformed, `counts` ≠ the listed lines, the verdict isn't that agent's clean value, the verdict contradicts the findings (clean verdict + any `[ISSUE]`, or any `[HIGH]` under a clean verdict), any `[HIGH]` or any `[SUSPICION]` appears, a terse line reads worse than its severity tag, zero findings land on a non-trivial diff, or a check fails/skips under a claimed-clean verdict. On CRITICAL tier, open every full report regardless. The cheap path only greenlights — a blocker/rework is declared only after a full read. This check is discipline (did the reviewer really do the work), not paperwork for its own sake.

**Cross-domain ADR check (every path, before the summary).** Reviewers read only their own lane's ADRs, so before closing, the synthesizer (the inline session, or the `manager` when spawned) reads the compressed `adrCatalog.adrs` **once** and checks the **diff's changed files against every applicable ADR OUTSIDE the lanes the reviewers covered** — the code, not the findings (a violation in a non-owning lane produced no finding). Any collision is an ADR-violation BLOCKER. This is cheap (one compressed read) and is what makes reviewer-slicing safe on the single-reviewer path; `/ship-check` re-runs it as the pre-merge backstop.

**Always close with the Manager Summary** (every mode, every tier above TRIVIAL — the one thing the engineer reads first):

**Use the EXACT format defined in `docs/manager-summary-format.md`** (copied into the project at setup).

**When to synthesize inline vs. spawn manager:**
- **Synthesize inline (this session):** ONE reviewer + clean verdict (SHIP/SHIP-WITH-CONDITIONS) + no BLOCKERS + no ADR violations
- **Spawn manager agent:** Multiple reviewers OR any BLOCKER OR any ADR violation OR verdict conflict

TRIVIAL: no reviewer, no manager — confirm checks passed in one line. BLOCKERS go to the human before further work.
