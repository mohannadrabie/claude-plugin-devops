---
description: Run the risk tier's reviewers on the current diff — across BOTH infra and app domains, by what the change touches — and close with the Manager Summary.
argument-hint: "[net|sec|arch|consumer|appsec|api|data|perf|code] [scope]  (default: current diff vs main)"
---

Run the review chain for: $ARGUMENTS (default: current diff vs main).

**Cache first.** Run `node docs/adr-cache.mjs --ensure` once now (it builds the ADR catalog if stale or absent) so the reviewers you fan out all reuse it instead of each rebuilding. Surface the `📊 ADR cache …` line.

**Tier first.** Read docs/.governance-state.json if present and reuse its `tier` and `requiredReviewers` — /story already decided them; don't re-derive and risk disagreeing. If absent, derive the tier from the diff per PRINCIPLES.md and write it so downstream steps agree.

**Reviewer selection** (from the tier + the paths actually touched — the paths tell you the domain; this plugin spans both infrastructure and application code, so a single change may need one reviewer from each side):
- TRIVIAL: no agent — verify checks pass, note it in the PR, done.
- STANDARD: the ONE right reviewer, chosen by what changed —
  - **Infra:** `network-reviewer` (VPC/subnets/SGs/routing/DNS) · `security-reviewer` (IAM/KMS/secrets/exposure, `modules/(iam|security)/**`) · `consumer-reviewer` (self-service ADR / onboarding flows).
  - **App:** `appsec-reviewer` (authn/authz, injection, secrets-in-code, deps) · `api-reviewer` (public interface / contract / versioning) · `data-reviewer` (schema / migrations / persistence) · `performance-reviewer` (hot paths / queries / concurrency).
  - **Either:** `architecture-reviewer` if new modules/services or cross-cutting design; else `code-reviewer`.
  - If the diff spans **both** infra and app (e.g. a Terraform module *and* the service that consumes it), pick the one most-relevant reviewer **per side** and run them in parallel — but never more than the risk tier warrants.
- CRITICAL: `redteam` + the one or two most-relevant domain reviewers from the lists above, in parallel.
Explicit override always wins: `/fullstack:review net|sec|arch|consumer|appsec|api|data|perf|code <scope>` forces that reviewer.

**Team mode (opt-in): `/fullstack:review --team <scope>`.** CRITICAL-tier only. Routes to the `manager` agent to run reviewers as parallel agent-team teammates. Requires agent teams enabled (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1); if unset, say so and run the standard subagent chain.

When reports return: persist EACH verbatim to docs/reviews/<scope>-<agent>-<YYYY-MM-DD>.md with raw command/test output appended; add rows to docs/REVIEW_LOG.md. Each reviewer ends its turn with a `RECEIPT:` block (verdict, a **complete terse list of every finding** — `[ISSUE]`/`[SUSPICION]`/`[CLEAN]` with a `[HIGH|MED|LOW]` severity on each issue/suspicion — a `counts` checksum, checks, ADR cache state, report path). On STANDARD tier, synthesize the Manager Summary from those receipts — every per-reviewer line cites that reviewer's report path (`docs/manager-summary-format.md`) so the human can open it regardless; open the full report yourself only when — this trigger list is identical in `manager.md`/`ship.md`/`PRINCIPLES.md` rule 10 — the receipt is missing/malformed, `counts` ≠ the listed lines, the verdict isn't that agent's clean value, the verdict contradicts the findings (clean verdict + any `[ISSUE]`, or any `[HIGH]` under a clean verdict), any `[HIGH]` or any `[SUSPICION]` appears, a terse line reads worse than its severity tag, zero findings land on a non-trivial diff, or a check fails/skips under a claimed-clean verdict. On CRITICAL tier, open every full report regardless. The cheap path only greenlights — a blocker/rework is declared only after a full read. This check is discipline (did the reviewer really do the work), not paperwork for its own sake.

**Cross-domain ADR check (every path, before the summary).** Reviewers read only their own lane's ADRs, so before closing, the synthesizer (the inline session, or the `manager` when spawned) reads the compressed `adrCatalog.adrs` **once** and checks the **diff's changed files against every applicable ADR OUTSIDE the lanes the reviewers covered** — the code, not the findings (a violation in a non-owning lane produced no finding). Any collision is an ADR-violation BLOCKER. This is cheap (one compressed read) and is what makes reviewer-slicing safe on the single-reviewer path; `/ship-check` re-runs it as the pre-merge backstop.

**Always close with the Manager Summary** (every mode, every tier above TRIVIAL) using the EXACT format in `docs/manager-summary-format.md`. Synthesize inline only for ONE reviewer + clean verdict + no BLOCKERS + no ADR violations (incl. the cross-domain check above); otherwise spawn the `manager`.
