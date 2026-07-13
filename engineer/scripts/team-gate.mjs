#!/usr/bin/env node
// governance core — agent-teams quality gates (TaskCreated / TaskCompleted / TeammateIdle).
// Sibling to guard.mjs (which handles PreToolUse). Same anti-kafka contract: every block names its unlock.
// Exit 2 = BLOCK (stderr shown to the lead/teammate). Exit 0 = allow.
//
// Payload shape (agent teams, promptless spawn model): a JSON object on stdin. Field names vary by
// Claude Code version, so we read defensively and fall back to allow rather than hard-fail a task.
// Per-project config: .governance.json at project root (shared with guard.mjs).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const event = process.argv[2] ?? "";
let payload = {};
try { payload = JSON.parse(readFileSync(0, "utf8")); } catch { /* no/invalid stdin → allow */ }

const block = (m) => { process.stderr.write(m + "\n"); process.exit(2); };
const allow = () => process.exit(0);

let cfg = {};
try { cfg = JSON.parse(readFileSync(join(process.cwd(), ".governance.json"), "utf8")); } catch {}
const PROTECTED = (cfg.protected ?? []).map(p => ({
  re: new RegExp(p.paths, "i"),
  requires: p.requires ?? "security",
  days: p.gateDays ?? 7,
}));

// Read a field that may live under several names / nesting (version drift tolerance).
function pick(obj, names) {
  for (const n of names) {
    const v = n.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
    if (v != null && v !== "") return v;
  }
  return undefined;
}

// Fresh dated report of a given type in docs/reviews/? (filename date, never mtime — clones reset mtimes.)
function freshReport(requires, days) {
  if (process.env.GOVERNANCE_GATE_WAIVER === "1") return true;
  let files = [];
  try { files = readdirSync(join(process.cwd(), "docs", "reviews")); } catch { return false; }
  const typeRe = new RegExp(requires, "i");
  const now = Date.now();
  for (const f of files) {
    if (!typeRe.test(f)) continue;
    const m = /(\d{4})-(\d{2})-(\d{2})/.exec(f);
    if (!m) continue;
    const age = (now - new Date(+m[1], +m[2] - 1, +m[3]).getTime()) / 86400000;
    if (age >= -1 && age <= days) return true;
  }
  return false;
}

// Which protected paths does a set of touched files trip, lacking a fresh report?
function unmetProtected(files) {
  const norm = files.map(f => String(f).replace(/\\/g, "/"));
  const misses = [];
  for (const p of PROTECTED) {
    if (norm.some(f => p.re.test(f)) && !freshReport(p.requires, p.days)) misses.push(p);
  }
  return misses;
}

const gateMsg = (requires, days) =>
  `BLOCKED (governance team gate): this task touches a ${requires}-protected path with no fresh ${requires} review. ` +
  `UNLOCK: have the ${requires} reviewer (or /engineer:redteam) persist its report to docs/reviews/<scope>-${requires}-<today's date>.md — ` +
  `a report dated within ${days} days clears the gate. Deliberate human waiver: GOVERNANCE_GATE_WAIVER=1 for one command.`;

// ---- TaskCreated: keep scope honest (PRINCIPLES.md rule 1 — ceremony scales with risk) ----
if (event === "TaskCreated") {
  const files = pick(payload, ["task.files", "files", "task.paths", "paths"]) ?? [];
  const list = Array.isArray(files) ? files : [];
  // Advisory only at creation: if a task fans across >1 protected domain, ask for a split rather than blocking.
  const domains = new Set(PROTECTED.filter(p => list.some(f => p.re.test(String(f).replace(/\\/g, "/")))).map(p => p.requires));
  if (domains.size > 1) {
    block(
      `BLOCKED (governance team gate): this task spans ${domains.size} protected domains (${[...domains].join(", ")}). ` +
      `UNLOCK: split into one task per domain so each gets its own reviewer and dated report — ` +
      `bundled cross-domain tasks defeat per-domain audit (PRINCIPLES.md rule 1). Single-domain tasks pass.`);
  }
  allow();
}

// ---- TaskCompleted: the load-bearing gate — no "done" on a protected change without its report ----
if (event === "TaskCompleted") {
  const files = pick(payload, ["task.files", "files", "task.paths", "paths", "task.changedFiles", "changedFiles"]) ?? [];
  const list = Array.isArray(files) ? files : [];
  const misses = unmetProtected(list);
  if (misses.length) block(gateMsg(misses[0].requires, misses[0].days));
  allow();
}

// ---- TeammateIdle: a reviewer must not go idle before persisting its report ----
if (event === "TeammateIdle") {
  const name = String(pick(payload, ["teammate.name", "name", "agent", "teammate"]) ?? "");
  // Map teammate name → the report type its dated report must carry.
  const NAME_TO_TYPE = [
    [/security/i, "security"],
    [/network/i, "network"],
    [/architecture/i, "architecture"],
    [/redteam/i, "redteam"],
    [/consumer-reviewer|consumer|usability|\badr\b/i, "consumer"],
    [/appsec/i, "appsec"],
    [/\bapi\b/i, "api"],
    [/data/i, "data"],
    [/performance|\bperf\b/i, "performance"],
    [/code/i, "code"],
  ];
  const requires = NAME_TO_TYPE.find(([re]) => re.test(name))?.[1];
  if (requires) {
    if (!freshReport(requires, 1)) {
      block(
        `BLOCKED (governance team gate): '${name}' is going idle without a fresh report today. ` +
        `UNLOCK: persist your verdict to docs/reviews/<scope>-${requires}-<today's date>.md (raw evidence appended), ` +
        `add a docs/REVIEW_LOG.md row, then idle. A reviewer that leaves no dated evidence protects nobody (PRINCIPLES.md rule 4).`);
    }
  }
  allow();
}

// Unknown event → never block.
allow();
