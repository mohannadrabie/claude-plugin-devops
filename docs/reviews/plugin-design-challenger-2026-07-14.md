# Challenger Report — Governance Plugin Design (meta review)

- Call sign: Absol (Challenger)
- Date: 2026-07-14
- Scope: The plugin's own token-saving review mechanisms — receipt-trust, ADR domain-slicing, fullspectrum-reviewer, inline-synthesis skip, one-shot tiering, the 5.5/ship-check pre-merge gate.
- Verdict: NO-GO (one HIGH break in the enforcement layer; two more HIGH-adjacent unproven assumptions)

The design under attack is documented, not running. Proof-tests are dry-run scenarios to hand-author against the plugin, not code unit tests.

---

## Attack 1 — "Nothing merges unread" is a convention, not a gate. The only mechanical merge-gate checks a filename, not a verdict or a full read.

Attack: README line 145 states as a guarantee: "Nothing merges unread... the merge always rests on a complete read." That guarantee is enforced by agent discipline only (/ship stage 5.5 and /ship-check step 5). The single mechanical enforcement in the repo — guard.mjs freshReport() — gates protected-path writes on the EXISTENCE of a dated report file of the right type, and reads neither its verdict nor its body.

Scenario (day-1 trigger):
1. A human runs standalone /fullstack:review on a diff. It closes with a clean Manager Summary — every per-reviewer line marked [receipt-trusted — not full-read] (STANDARD tier, clean receipts).
2. The reviewer's dated report already exists in docs/reviews/ (that is what satisfies freshReport for any protected path touched).
3. The human merges directly with the human-only merge command. /ship never ran, so stage 5.5 never fired. /ship-check was never invoked either.
4. Every report shipped genuinely unread in full — exactly the state README line 145 promises cannot happen.

ship-check.md step 5 itself proves the authors know this path exists: "a standalone /review -> /ship-check -> merge never runs the /ship loop." But nothing FORCES /ship-check to run between /review and a human merge. freshReport() (guard.mjs:21-35) returns true on the first filename matching type + a date within gateDays. A report whose verdict is REWORK/DO-NOT-SHIP unlocks the protected path exactly as well as an APPROVE — the gate proves a review happened, not that it passed or was read.

Current defense (honestly assessed): Two backstops, both voluntary. /ship 5.5 only runs inside /ship. /ship-check step 5 does the independent full read — but only if a human chooses to run it. No PreToolUse/PostToolUse hook conditions merge on ship-check having run. hooks.json has no merge matcher at all; "human-only merge" means the guard blocks agents from merging, not that it imposes any precondition on the human.

Verdict: BREAKS. The stated invariant is false on the standalone-review-then-merge path, and the receipt-trust design's admitted residual rides straight to production on that path.

Proof-test: In a scaffolded project, hand-author a reviewer report whose BODY describes a HIGH cross-domain defect but whose RECEIPT records that seam as [CLEAN] (verdict APPROVE, counts consistent). Run /fullstack:review, confirm the Manager Summary greenlights on the receipt, then merge as a human WITHOUT /ship-check. Confirm nothing in the toolchain forced a full read.

---

## Attack 2 — A competent receipt undersell passes every listed reopen-trigger. The trigger list cannot catch a well-written lie; only the (voluntary) 5.5 gate can.

Attack: The Manager's reopen-trigger list is the whole audit surface on the cheap path. Here is the exact receipt shape that hides a real HIGH finding while tripping ZERO triggers.

Scenario — the receipt that sails through:
  RECEIPT: verdict=APPROVE
  findings:
  1. [CLEAN] auth/session seam checked, sound
  2. [CLEAN] modules/data <-> modules/api boundary — contract holds
  3. [CLEAN] no cross-domain ADR collisions
  counts: issues=0 suspicions=0 clean=3
  checks=n/a
  adr=HIT(24, whole catalog)
  report=docs/reviews/x-fullspectrum-2026-07-14.md

Walk the trigger list (PRINCIPLES rule 10 / manager.md:22): receipt present, well-formed; counts == 3 listed lines; verdict == clean value APPROVE; no [ISSUE] so no clean-verdict-contradicts-findings; no [HIGH]; no [SUSPICION]; findings non-zero so "zero findings on non-trivial diff" passes; checks=n/a so no failed/skipped-under-clean; no ADR violation claimed. EVERY TRIGGER PASSES. Line 2's [CLEAN] is a lie — in the report prose Wobbuffet actually worked out that the data<->api boundary drops an error case, a HIGH seam gap — but the receipt records it [CLEAN].

The one trigger meant to catch this — "a terse line reads worse than its severity tag (sniff-test)" — only fires when the reviewer writes a scary one-liner but under-tags it. A reviewer who writes a bland, confident [CLEAN] line defeats the sniff-test by construction. The design explicitly concedes this (manager.md:27): "the one thing a receipt cannot catch... a defect the reviewer worked out in its report prose but never surfaced in the receipt."

Current defense (honestly assessed): The residual is acknowledged and consciously pushed to the 5.5 pre-merge full read — an honest design, PROVIDED 5.5 actually runs. Per Attack 1, 5.5 is not enforced on the standalone path. Attacks 1 and 2 compound: the receipt layer cannot catch the undersell (by admission), and the backstop that should catch it is skippable.

Verdict: BREAKS (conditional on Attack 1 — the two are one failure mode). If 5.5/ship-check were mechanically forced before every merge, this would downgrade to SURVIVES.

Proof-test: Same hand-authored receipt as Attack 1. Additionally, run it THROUGH /ship and confirm stage 5.5's body-vs-receipt reconciliation actually catches the [CLEAN]-that-should-be-[HIGH] mismatch — validating the backstop works when invoked, isolating the defect to enforcement (Attack 1), not detection.

---

## Attack 3 — fullspectrum-reviewer depth does not scale with diff size or domain count, yet its clean pass unlocks skipping the Manager.

Attack: Wobbuffet carries the LARGEST context of any reviewer (whole unfiltered ADR catalog + whole diff + every pairwise seam) on the CHEAPEST model (Sonnet) in ONE pass with checks=n/a. Method step 2 says "trace the boundary" for a multi-domain diff but bounds nothing — not seam count, not diff size, not domain count.

Scenario — scale cliff: A 2,000-line diff spans modules/data/, modules/api/, an IAM change, and a network change (4 domains, 6 pairwise seams). Tier picks the two most-relevant domain reviewers (cap); the other two lanes are covered by Wobbuffet ALONE. It must hold the full catalog + full diff and reason about all 6 seams plus every out-of-lane ADR against every changed file in a single Sonnet pass. Two specialists each reading hard at half the picture out-resolve one generalist skimming all of it. The 1xwhole + Nxslice cost argument is sound for TOKENS but assumes one shallow whole-read equals N deep slice-reads for DETECTION QUALITY. That is asserted, never demonstrated.

Trust wound: Wobbuffet is load-bearing, not advisory. Its clean APPROVE is a PRECONDITION for the inline-synthesis path (manager-summary-format.md:65-70; review.md:29): ONE domain reviewer + fullspectrum + both clean means synthesize inline, never spawn the Manager. The shallower its pass, the MORE orchestration it removes. A rubber-stamp cross-domain APPROVE actively greenlights skipping the Manager subagent.

Current defense: /ship-check step 1 re-runs a whole-catalog-vs-diff ADR pass at merge — a real backstop FOR ADR COLLISIONS only. Wobbuffet's other job (non-ADR functional/architectural seam gaps) has NO mechanical backstop. An error case that is someone else problem in every lane is caught only by its prose, then only if 5.5 reads it (Attack 1).

Verdict: UNPROVEN (leaning BREAK). No evidence the single-pass depth holds at scale, and its clean verdict is load-bearing for reducing ceremony. ADR half backstopped; functional-seam half not.

Proof-test: Dry-run a seam-heavy 4-domain diff with a KNOWN PLANTED functional seam gap (an error case each lane assumes the other handles, violating no ADR). Check (a) does Wobbuffet name that seam or does volume bury it; (b) if it misses, does anything downstream catch it (it should not — no ADR, so ship-check step 1 is blind). Repeat at 200 vs 2,000 lines to measure degradation.

---

## Attack 4 — The inline-vs-spawn decision keys on how many reviewers RAN, not how many SHOULD have. Under-selection auto-qualifies for the cheapest synthesis path.

Attack: Inline synthesis (skip the Manager subagent) fires when ONE domain reviewer + fullspectrum, both clean. Nothing in that gate re-checks whether one domain reviewer was the RIGHT COUNT for the diff. Under-selecting reviewers SATISFIES the inline precondition rather than failing it.

Scenario: A diff spans both infra and app (review.md:18 says pick one reviewer PER SIDE, so two). But reviewer-selection mis-reads the touched paths (or requiredReviewers in governance-state was written for an earlier narrower scope) and seats only ONE domain reviewer. Now one domain reviewer + Wobbuffet, both clean, means the MAIN SESSION synthesizes inline, the Manager subagent never spawns, and the second lane was reviewed by nobody except Wobbuffet single shallow pass (Attack 3). The gap: ONE domain reviewer as a trigger for cheapness is indistinguishable from one domain reviewer because we under-scoped.

Current defense: The Manager is told to pick the minimum reviewer set by the paths actually touched. But the inline-synthesis DECISION is made by the MAIN SESSION (manager-summary-format.md:65, review.md:29), the same actor that would have under-selected. Check and checked are the same actor. /ship-check step 5 gates protected-path reports by type, so if the unreviewed lane touches a PROTECTED path, guard.mjs catches it. If the unreviewed lane is critical-but-unprotected (app-layer money math, no protected regex), nothing catches the under-selection.

Verdict: UNPROVEN (leaning BREAK for unprotected critical lanes). Protected paths covered by guard.mjs; unprotected consequential lanes are not, and the inline precondition rewards under-selection.

Proof-test: Dry-run an infra+app diff where the app side is a pricing calc (no protected-path match). Seat only the infra reviewer + Wobbuffet, both clean. Confirm the main session takes the inline path, never spawns the Manager, and no gate flags the missing app-side reviewer before merge.

---

## Attack 5 — Tier is a one-shot guess ratified before the build reveals what it touches; ceremony never re-derives from what the build ACTUALLY changed.

Attack: The risk tier is ratified once at stage 1 (plan), persisted to governance-state, and every downstream command is told reuse, do not re-derive (review.md:10; ship-check.md:7). No stage re-derives the tier from the BUILT diff.

Scenario: A story is planned and honestly tiered STANDARD; the plan does not foresee touching state/money code. During build the implementation legitimately grows to touch a critical-but-unprotected path (a currency-rounding helper, a balance-mutation function) that no protected regex matches. The tier stays STANDARD because it was persisted once and everyone reuses it. Result: one domain reviewer, NO redteam, no re-tiering, for a change that was really CRITICAL.

Current defense: The Manager ratifies and challenges over/under-tiering, but only at stage 1 against the PLAN, before the build exists. Stage 3 review-selection reads paths actually touched (a partial re-derivation of REVIEWER CHOICE) but not of the TIER (redteam pairing is a tier property, not a path property). For protected paths, guard.mjs is a hard backstop: the write is blocked without a fresh redteam/security report. For UNPROTECTED critical paths there is no re-derivation and no backstop.

Verdict: BREAKS for unprotected critical paths; SURVIVES for protected ones. The mechanical net only catches changes touching a protected regex. The tier never escalates mid-flight on build evidence.

Proof-test: Dry-run a story tiered STANDARD whose build adds a balance-mutation function under a path matching no protected entry. Confirm no stage re-derives to CRITICAL, redteam is never seated, and it reaches ship-check at STANDARD. Contrast with the same function under modules/data/ (guard.mjs blocks the write, forcing the redteam report) to show the net only works via protected paths.

---

## Attack 6 — ADR domain-slicing seam: both lanes plausibly defer to each other, and the whole-catalog backstop only sees ADR collisions.

Attack: Each domain reviewer reads only its own ADR slice. A boundary change can have each reviewer assume the OTHER lane owns the risk. The answer is Wobbuffet + /ship-check step 1 whole-catalog backstop.

Scenario: A migration adds a nullable column that modules/api/ starts serving. The data-reviewer reads data ADRs, sees a valid schema change, assumes API null-handling is the api lane. The api-reviewer reads api ADRs, sees a valid endpoint, assumes null-safety of the column is the data lane. The gap (an unhandled null crossing the seam) belongs to neither slice. This is exactly Wobbuffet designed job.

Current defense: This is the seam the design most directly addresses, and for ADR COLLISIONS it is covered twice (Wobbuffet whole-catalog + ship-check step 1). The residual is the non-ADR FUNCTIONAL seam (the null-handling violates no ADR): caught only by Wobbuffet prose (Attack 3 unbacked half) and read only if 5.5 runs (Attack 1). The ADR half SURVIVES; the functional half collapses into Attacks 1+3.

Verdict: SURVIVES for ADR collisions; the non-ADR functional-seam residual is scored under Attack 3 (not double-counted).

Proof-test: Dry-run the nullable-column-served-by-api diff with (a) an ADR-violation version (confirm Wobbuffet and ship-check step 1 both catch it) and (b) a pure functional-null version violating no ADR (confirm it survives to merge unless 5.5 reads Wobbuffet prose).

---

## Scariest unproven assumption

That /ship-check (or /ship stage 5.5) is actually run before every merge. The entire nothing-merges-unread thesis, and the conscious decision to let receipts under-record findings on the cheap loop, both rest on this single voluntary step. No hook conditions a merge on it. The one mechanical gate, guard.mjs freshReport(), checks that a dated report of the right TYPE exists, never its verdict, never its body, never that anything read it. A standalone /review followed by a direct human merge satisfies every mechanical gate while reading nothing in full. The design most-repeated safety claim is the one thing it does not enforce.

## Recommendation: NO-GO until one of:
1. A hook (a PreToolUse merge/git matcher, or a git pre-merge check) that FAILS CLOSED unless a /ship-check full-read artifact exists for the current HEAD, turning nothing-merges-unread from convention into gate; OR
2. The README/PRINCIPLES claim is downgraded from a guarantee to a conditional (nothing merges unread WHEN you run /ship-check), and /ship-check is made the documented, non-optional terminal step of /review, closing the standalone bypass.

Fixing (1) collapses Attacks 1, 2, and the unbacked halves of 3, 4, 6 at once — the single highest-leverage change.
