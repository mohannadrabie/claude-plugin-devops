#!/usr/bin/env node
// governance core — deterministic policy guards (PreToolUse).
// Per-project config: .governance.json at project root. Exit 2 = BLOCK (stderr shown to Claude).
// Anti-kafka rule: every block message names its exact unlock.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const payload = JSON.parse(readFileSync(0, "utf8"));
const tool = payload.tool_name ?? "";
const input = payload.tool_input ?? {};
const block = (m) => { process.stderr.write(m + "\n"); process.exit(2); };

let cfg = {};
try { cfg = JSON.parse(readFileSync(join(process.cwd(), ".governance.json"), "utf8")); } catch {}
const ACCOUNTS = new Set(cfg.allowedWriteAccounts ?? []);
const PROFILES = new Set(cfg.allowedWriteProfiles ?? []);
const ROLES = new Set(cfg.allowedWriteRoles ?? []);
const PROTECTED = (cfg.protected ?? []).map(p => ({ re: new RegExp(p.paths, "i"), requires: p.requires ?? "security", days: p.gateDays ?? 7 }));

// Dated report of a given type exists within the window? (filename date, never mtime — clones reset mtimes)
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
const unlockMsg = (what, requires, days) =>
  `BLOCKED (governance policy): ${what} is a protected path requiring a fresh ${requires} review. ` +
  `UNLOCK: run /fullstack:review ${requires} (or /fullstack:redteam) and persist its report to docs/reviews/<scope>-${requires}-<today's date>.md — ` +
  `a report dated within ${days} days opens this path. Deliberate human waiver: GOVERNANCE_GATE_WAIVER=1 for one command.`;

// Governance ledger sinks — the reports/logs the process PRODUCES. Writing these is how gates get
// unlocked and how state is recorded; they are never the protected artifact, so they are never gated.
// (Prevents the deadlock of a redteam report being blocked for want of a redteam report.)
const GOV_SINK = /(^|\/)docs\/(reviews\/|decisions(-archive)?\.md|REVIEW_LOG\.md|STATE\.md|backlog\.md|manager-summary[^/]*$|conformance-triage[^/]*$|\.governance-state\.json)/i;

// The file(s) a shell command WRITES to — redirections, tee, dd, sed -i. Heredoc bodies and quoted
// strings are stripped FIRST so a report's prose (which may mention "database", "payments", "auth"…)
// is never mistaken for a protected path: we gate on the target, not the payload.
function writeTargets(cmd) {
  let c = cmd.replace(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1[\s\S]*?\n[ \t]*\2\b/g, " ");  // drop heredoc bodies
  c = c.replace(/'[^']*'/g, " '' ").replace(/"[^"]*"/g, ' "" ');                     // drop quoted content
  c = c.replace(/\\/g, "/");
  const t = new Set();
  for (const m of c.matchAll(/>>?\s*(?![&\d])([^\s;|&()<>]+)/g)) t.add(m[1]);         // > file / >> file
  const tee = /\btee\b((?:\s+-\S+)*)((?:\s+[^\s;|&()<>]+)+)/.exec(c);                 // tee [opts] file…
  if (tee) for (const f of tee[2].trim().split(/\s+/)) t.add(f);
  for (const m of c.matchAll(/\bof=([^\s;|&()<>]+)/g)) t.add(m[1]);                   // dd of=file
  const sedm = /\bsed\b(?=[^|;&]*\s-\w*i)[^|;&]*\s([^\s;|&()<>]+)\s*(?:$|[;|&])/.exec(c);  // sed -i … <last operand = file>
  if (sedm) t.add(sedm[1]);
  return [...t].map(x => x.replace(/^['"]|['"]$/g, "")).filter(x => x && x !== "''" && x !== '""');
}

if (tool === "Bash") {
  const cmd = String(input.command ?? "");

  // --- Universal human-only commands ---
  const rules = [
    [/execute-change-set/, "Executing changesets is human-only after reviewing describe-change-set output. UNLOCK: create with --no-execute-changeset, present the changeset to the human."],
    [/terraform\s+apply|tofu\s+apply/, "apply never runs from a session. UNLOCK: run plan, present it; applies happen via CI/human."],
    [/git\s+push\s+.*--force/, "Force-push destroys evidence. UNLOCK: a normal push, or ask the human to force-push themselves."],
    [/aws\s+.*\b(delete-stack|delete-db|deregister-)/, "Stack/data deletion is human-only. UNLOCK: present the exact command for the human to run."],
    ...(Array.isArray(cfg.blockedCommands) ? cfg.blockedCommands.map(r => [new RegExp(r.pattern, "i"), (r.message ?? "blocked by project policy") + " UNLOCK: ask the human."]) : []),
  ];
  for (const [re, msg] of rules) if (re.test(cmd)) block("BLOCKED (governance policy): " + msg);

  // --- AWS write-whitelist: mutating aws calls only against whitelisted accounts/profiles/roles ---
  const awsCall = /(^|[|;&]\s*|\s)aws\s+([a-z0-9-]+)\s+([a-z0-9-]+)/.exec(cmd);
  if (awsCall) {
    const action = awsCall[3];
    const readOnly = /^(describe|get|list|ls|lookup|search|scan|query|select|filter|head|tail|cat|view|read|show|count|sample|wait|help|validate|estimate|detect|preview|test)/.test(action) || /--dry-?run/.test(cmd);
    if (!readOnly) {
      // profile: --profile X or inline AWS_PROFILE=X; else "default"
      const prof = (/--profile[= ]([\w-]+)/.exec(cmd) ?? /AWS_PROFILE=([\w-]+)/.exec(cmd))?.[1] ?? "default";
      const profileOk = PROFILES.has(prof);
      // any 12-digit account id appearing (ARNs, --account-id...) must be whitelisted
      const ids = [...cmd.matchAll(/\b(\d{12})\b/g)].map(m => m[1]);
      const badId = ids.find(id => !ACCOUNTS.has(id));
      // role ARNs: --role-arn X or inline AWS_ROLE_ARN=X
      const roleArn = (/--role-arn[= ](['"]?)(arn:aws:iam::[^'"\s]+)\1/.exec(cmd) ?? /AWS_ROLE_ARN=(['"]?)(arn:aws:iam::[^'"\s]+)\1/.exec(cmd))?.[2];
      const roleOk = !roleArn || ROLES.has(roleArn);

      if (!profileOk) block(
        `BLOCKED (governance policy): '${action}' is a WRITE and profile '${prof}' is not write-whitelisted. ` +
        `UNLOCK: add '${prof}' to allowedWriteProfiles in .governance.json (human decision, one line) — or rerun read-only. ` +
        `Currently whitelisted: [${[...PROFILES].join(", ") || "none"}].`);
      if (badId) block(
        `BLOCKED (governance policy): command references account ${badId}, which is not in allowedWriteAccounts. ` +
        `UNLOCK: the human adds it to .governance.json — or check you're targeting the right account. ` +
        `Whitelisted: [${[...ACCOUNTS].join(", ") || "none"}].`);
      if (!roleOk) block(
        `BLOCKED (governance policy): command uses role '${roleArn}', which is not in allowedWriteRoles. ` +
        `UNLOCK: add '${roleArn}' to allowedWriteRoles in .governance.json (human decision, one line) — or check you're assuming the right role. ` +
        `Whitelisted: [${[...ROLES].join(", ") || "none"}].`);
    }
  }

  // --- shell writes into protected paths (sed -i / redirection bypass of the Edit/Write hook) ---
  // Gate on the WRITE TARGET, not the whole command: a report body that merely mentions a protected
  // keyword must not trip a gate meant for the files the command actually writes.
  const writesToDisk = /(^|\s|\|)(sed\s+-i|tee\b|dd\b)/.test(cmd) || />>?\s*\S/.test(cmd);
  if (writesToDisk) {
    for (const target of writeTargets(cmd)) {
      if (GOV_SINK.test(target)) continue;                 // ledger/report sinks are always writable
      for (const p of PROTECTED) if (p.re.test(target) && !freshReport(p.requires, p.days))
        block(unlockMsg(`this shell command writes to '${target}', which`, p.requires, p.days));
    }
  }
  process.exit(0);
}

if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
  const file = String(input.file_path ?? input.notebook_path ?? "").replace(/\\/g, "/");
  if (!GOV_SINK.test(file)) for (const p of PROTECTED) if (p.re.test(file) && !freshReport(p.requires, p.days))
    block(unlockMsg("'" + file + "'", p.requires, p.days));
}
process.exit(0);
