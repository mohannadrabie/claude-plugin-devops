# Manager Summary Format

**This is the canonical format for the Manager Summary.**

Both the manager agent AND the main session (when synthesizing inline) MUST use this EXACT structure.

---

## Manager Summary

**Verdict:** [SHIP | SHIP-WITH-CONDITIONS | REWORK | BLOCKED]

**Per-reviewer:**
- [reviewer-name] ([pokemon-call-sign]) → [verdict] → [single most important finding or "clean"] → `docs/reviews/<file>.md` [read-depth]
- [reviewer-name] ([pokemon-call-sign]) → [verdict] → [single most important finding or "clean"] → `docs/reviews/<file>.md` [read-depth]

> Where **[read-depth]** is `[receipt-trusted — not full-read]` (STANDARD tier, receipt passed every integrity check, I did not open the full report) or `[full report read]` (CRITICAL tier, or a receipt tripped a reopen trigger). Every path is cited regardless — the human can open any report themselves. This makes it explicit where independent verification was skipped, so a `[receipt-trusted]` line is the reader's cue for where to spot-check if they want the evidence behind a clean pass.

**ADR Compliance:**
- [ADR-ID/name] → [COMPLIANT | VIOLATED | UNCLEAR]
  - If VIOLATED: Quote constraint + reviewer who flagged + severity (BLOCKER/finding)
  - If UNCLEAR: Note ambiguity that needs architect clarification
- If none applicable: "No ADR compliance issues"

**Blockers:**
- [Must-fix items with named unlocks]
- OR "none" if no blockers
- Include ADR violation blockers here

**Conditions:**
- [Fix-now vs. defer-with-dated-backlog]
- OR "none" if no conditions

**Next action:**
[Single most important thing engineer does next]

---

## Format Rules

1. **Keep it short** — This is the first (often only) thing the engineer reads
2. **One line per reviewer** — Include Pokémon call sign for transparency
3. **ADR Compliance aggregates ALL reviewers** — Single source of truth for ADR findings
4. **Blockers are explicit** — Each blocker includes its named unlock
5. **Next action is singular** — One thing, not a list
6. **Full reports always available, and always cited** — the summary is built from each reviewer's `RECEIPT:` block (verdict, top findings, counts), but the per-reviewer line always ends with that reviewer's report path — the human can open and read it themselves regardless of whether the Manager itself reopened it
7. **A dated `docs/decisions.md` → `docs/decisions-archive.md` sweep happens at session handoff** (see Session Handoff Format below), via the orchestrating session's own tools — not a claim the Manager subagent's read-only frontmatter can act on itself

## Reviewer verdict vocabularies — what counts as "clean"

Each agent's own verdict enum differs; the Manager Summary's own `[SHIP | SHIP-WITH-CONDITIONS | REWORK | BLOCKED]` is the aggregate. Per-reviewer, "clean" always means the FIRST value below — anything else is "not clean" and is a reopen trigger (see each agent's own file for its RECEIPT spec):

| Agent(s) | Enum (first value = clean) |
|---|---|
| code-reviewer, performance-reviewer | `SHIP` \| SHIP-AFTER-FIXES \| DO-NOT-SHIP |
| security/network/appsec/api/data/architecture-reviewer, fullspectrum-reviewer | `APPROVE` \| APPROVE-WITH-CONDITIONS \| REWORK |
| redteam, challenger, consumer-reviewer | `go` \| no-go |
| debugger | `FIXED` \| UNREPRODUCIBLE \| BLOCKED |
| story-implementer | `BUILD-COMPLETE` \| BLOCKED |

`fullspectrum-reviewer` is a standing line in **every** Manager Summary above TRIVIAL (rule 9) — it isn't optional the way a domain pick is; its absence from the Per-reviewer list is itself a shirked-gate finding.

## When to Use

**Main session synthesizes inline:**
- ONE domain reviewer ran, alongside `fullspectrum-reviewer` (its standing partner — not counted as a second reviewer)
- Both verdicts clean (SHIP/SHIP-WITH-CONDITIONS or APPROVE/APPROVE-WITH-CONDITIONS)
- No findings marked as BLOCKER
- No ADR violations

**Spawn manager agent:**
- More than one domain reviewer ran (even if they agree)
- ANY reviewer — including `fullspectrum-reviewer` — marked ANY finding as BLOCKER
- ANY reviewer marked ADR violation
- Verdicts conflict (SHIP vs. REWORK, or domain reviewer vs. `fullspectrum-reviewer`)
- Tier disagreement detected

## Example

```markdown
## Manager Summary

**Verdict:** SHIP-WITH-CONDITIONS

**Per-reviewer:**
- security-reviewer (Umbreon) → APPROVE-WITH-CONDITIONS → Fix IAM wildcard in terraform/modules/api/iam.tf:42 → `docs/reviews/api-security-2026-07-11.md` [full report read]
- network-reviewer (Magnezone) → APPROVE → Clean, no reachability issues → `docs/reviews/api-network-2026-07-11.md` [receipt-trusted — not full-read]
- fullspectrum-reviewer (Wobbuffet) → APPROVE → No cross-domain ADR collisions, no seam gaps found → `docs/reviews/api-fullspectrum-2026-07-11.md` [receipt-trusted — not full-read]

**ADR Compliance:**
- ADR-003 (S3 encryption) → COMPLIANT
- ADR-007 (IAM least privilege) → VIOLATED (BLOCKER)
  - Constraint: "No wildcard actions in IAM policies"
  - Flagged by: security-reviewer (Umbreon)
  - Location: terraform/modules/api/iam.tf:42

**Blockers:**
- Fix IAM wildcard: Replace `s3:*` with specific actions (s3:GetObject, s3:PutObject)

**Conditions:**
- Add CloudWatch alarm for failed API calls (defer to backlog, due 2026-07-20)

**Next action:**
Fix IAM policy wildcard, then run /ship-check
```

---

## Session Handoff Format

The manager posts this at a natural close **and whenever the human says "wrap up" / "I need to go" / "stop here"** (any time, even mid-stage). Update `docs/STATE.md` with the same facts first — this block is the visible echo of the state you just saved.

```markdown
## Session Handoff — <YYYY-MM-DD>

**State saved:** `docs/STATE.md` updated ✓ — done (+ evidence) · in-progress (+ where it stands) · blocked-on-human · open questions.

**ADR-cache savings this session:**
- Tokens saved: **~<N>** — sum of the `📊 ADR cache HIT` lines (<k> agent(s) reused the catalog).
- Est. cost saved: **~$<x>** = <N> × <model> input rate (Haiku ≈ $1/M · Sonnet ≈ $3/M · Opus ≈ $15/M). Rough estimate.
- (or) **No ADR-cache reuse this session.**

**Next action:** <the one thing to do first when you resume — matches STATE.md>
```

### Rules
1. **Numbers, not prose.** If nothing was reused, say "No ADR-cache reuse this session" — never invent a figure.
2. **The $ is an estimate** (~500 tokens/ADR avoided; provider prompt-caching may already discount repeats) — a ballpark, not a bill.
3. **`Next action` == STATE.md's next action** — one resume point, stated once.
4. Fires on demand: "wrap up" / "I need to go" / "stop here" runs this immediately, even mid-stage — nothing is lost.

### Example
```markdown
## Session Handoff — 2026-07-11

**State saved:** `docs/STATE.md` updated ✓ — done: billing guard (26/26 green, S01-code-2026-07-11.md) · in-progress: receiving flow (schema landed, cost-sync unbuilt) · blocked-on-human: 2nd dev store · open: pg-boss worker placement.

**ADR-cache savings this session:**
- Tokens saved: **~59,000** — 5 agents reused the catalog (24 ADRs each).
- Est. cost saved: **~$0.18** = 59,000 × Sonnet $3/M. Rough estimate.

**Next action:** build the cost-sync job behind `/challenge` before it touches money.
```
