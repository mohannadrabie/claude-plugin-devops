---
description: Set up or verify the devops plugin in this project — config, docs, risk tiers, AWS whitelist, ADR cache. Run first; pass --update to refresh plugin files after a plugin update.
argument-hint: "[--update]   (no args = set up / verify; --update = refresh plugin-managed files)"
---

Verify the devops plugin setup in this project — and scaffold it if missing.

**Note:** A plugin's commands/agents are installed via Claude Code (`/plugin marketplace add https://github.com/mohannadrabie/claude-plugin-devops.git` then `/plugin install <devops|engineer>@governance`). This command scaffolds/verifies the per-project config.

## Update mode — `$ARGUMENTS` contains `update`, `--update`, or `refresh`

The plugin's slash commands/agents/hooks refresh when you update the plugin itself (`/plugin marketplace update <marketplace>` → reinstall or enable auto-update → `/reload-plugins`). But the files this command COPIED into the project (the ADR reporter + the doc templates) do **not** auto-refresh. Run `/…:init --update` to pull those forward after a plugin update — preserving everything you own.

1. Locate the installed plugin's `$TPL` templates dir (the same bash as Step 1 below).
2. **Refresh these plugin-managed files** from `$TPL` (and `$TPL/../scripts`): `docs/adr-cache.mjs`, `docs/decisions-archive.mjs`, `docs/PRINCIPLES.md`, `docs/adr-template.md`, `docs/manager-summary-format.md`, `docs/adr-cache-check.md`. For each that already exists **and differs** from the new version, first copy it to `<file>.bak` so a local edit is never lost silently, then overwrite.
3. **Create-if-missing** (new files a project scaffolded earlier may lack, never overwrite an existing one): `docs/STATE.md`, `docs/backlog.md`, `docs/decisions-archive.md`.
4. **Never touch what you own:** `.governance.json`, `CLAUDE.md`, `docs/decisions.md`, `docs/decisions-archive.md`, `docs/REVIEW_LOG.md`, `docs/.governance-state.json`, `docs/reviews/`, and any existing `docs/STATE.md` / `docs/backlog.md`.
5. Rebuild the catalog with the refreshed reporter: `node docs/adr-cache.mjs --build`.
6. Report a short table — **refreshed · created · backed-up (.bak) · preserved** — then the single next action. Do NOT run the interactive setup below; update mode is refresh-only.

## Verification Checks

Run the following checks and report status:

### 1. Plugin Loaded
- If you can see this command, the plugin is loaded. No filesystem path check needed.
- The plugin's own files live under `${CLAUDE_PLUGIN_ROOT}` (managed by Claude Code) — never assume `~/.claude/plugins/...`.

### 2. Project Configuration Files
Check for required files and report status:
- ✅ / ❌ `docs/PRINCIPLES.md`
- ✅ / ❌ `docs/decisions.md`
- ✅ / ❌ `docs/decisions-archive.md`
- ✅ / ❌ `docs/REVIEW_LOG.md`
- ✅ / ❌ `docs/STATE.md`
- ✅ / ❌ `docs/backlog.md`
- ✅ / ❌ `docs/adr-template.md`
- ✅ / ❌ `.governance.json`
- ✅ / ❌ `CLAUDE.md`

### 3. ADR Configuration
- Check if `./adr/` submodule exists OR a `docs/adr/` folder exists
- Report ADR location and format recommendation (ADRs live in the ADR repo/folder — never in docs/decisions.md, which is the manager Decision Log)

### 4. AWS Configuration
Read `.governance.json` and report:
- Allowed accounts count
- Allowed profiles count  
- Allowed roles count
- Current AWS profile matches allowed list (✓ or ⚠️)

### 5. GitLab CLI
- Check if `glab` is installed
- Check if `GITLAB_TOKEN` or `TF_TOKEN_gitlab_com` is set
- Report status

### 6. Protected Paths
Read `.governance.json` protectedPaths and list them with their reviewers

## Summary

Present a summary table:
```
DevOps Plugin Status
━━━━━━━━━━━━━━━━━━━━
✅ Plugin loaded (/devops:* commands available)
✅ Project configured
✅ AWS: 1 account, 1 profile (current: dev-sandbox ✓)
✅ GitLab CLI ready
✅ ADRs: ./adr/ submodule
⚠️ Protected paths: 5 configured

Status: Ready to use
```

If anything is missing or misconfigured, show specific fix commands:
```
To fix:
  • Missing config files: re-run /devops:init
  • AWS profile not allowed: Add 'dev-sandbox' to .governance.json
```

End with: "Run `/devops:ship 'your story'` to test the full workflow"

## Step 1: Create directory structure and copy base templates

Create docs/reviews/ if missing, then copy the base templates (never overwrite existing files).

**Locate the plugin's templates directory first** — `${CLAUDE_PLUGIN_ROOT}` is not reliably substituted inside command markdown, so resolve it in bash with fallbacks:

```bash
TPL="$CLAUDE_PLUGIN_ROOT/templates"
[ -d "$TPL" ] || TPL=$(find "$HOME/.claude/plugins" "$HOME/.config/claude/plugins" -type d -path '*devops/templates' 2>/dev/null | head -1)
if [ -z "$TPL" ] || [ ! -d "$TPL" ]; then
  echo "Could not auto-locate this plugin's templates/ dir. Ask the human for the path to the installed plugin (or the cloned repo's devops/engineer/fullstack templates/ dir) and use that as \$TPL; do not proceed without it."; exit 1
fi
```

Then copy from `$TPL` into the project, skipping any that already exist: `docs/PRINCIPLES.md`, `docs/decisions.md`, `docs/decisions-archive.md`, `docs/REVIEW_LOG.md`, `docs/STATE.md`, `docs/backlog.md`, `docs/adr-template.md`, `docs/manager-summary-format.md`, and `.governance.json`. Also copy the scripts from `$TPL/../scripts`: `adr-cache.mjs` → `docs/adr-cache.mjs` (agents run it to show the `📊 ADR cache …` savings line) and `decisions-archive.mjs` → `docs/decisions-archive.mjs` (the manager runs it at session handoff to sweep resolved decisions to the archive atomically). Note `docs/.governance-state.json` is created automatically by /devops:story or /devops:ship — no need to copy it now. (`docs/conformance-triage.md` is produced on demand by the manager when ADRs change — not scaffolded.)

## Step 2: Interactive configuration

**These are REQUIRED prompts, not suggestions.** For EACH question below you MUST call the `AskUserQuestion` tool and WAIT for the human's answer before continuing. Do **not** infer, assume, guess, default, or skip any of them, and do **not** treat the listed options as choices already made — the human decides every one. Only after you have a real answer for a question do you apply it. If the human explicitly declines/skips one, record that choice; never silently proceed past an unanswered question.

Gather configuration:

### Question 1: ADR Repository
"Does your organization use a central ADR (Architecture Decision Records) repository?"
- Options:
  - "Yes" → Ask for the git URL, then suggest: `git submodule add <url> adr`
  - "No" → ADRs will be tracked in a `docs/adr/` folder in this repo (one file per ADR, using the adr-template format)
  - "Skip for now" → Can be added later with `git submodule add <url> adr` (or a `docs/adr/` folder)
- **Multiple ADR folders (esp. fullstack):** `adr.dir` may be an **array** — the cache scans every root and merges them into one catalog. Before writing a single value, check whether the ADR location holds **per-domain subfolders** (e.g. `docs/adr/software-engineering/` and `docs/adr/devops/`, or `adr/infra/` and `adr/app/`). If it does — or if this is a fullstack project spanning both worlds — set `adr.dir` to the array of those subfolders, not the parent, so each domain's ADRs are captured explicitly and visibly. Example:
  ```json
  "adr": { "dir": ["docs/adr/software-engineering", "docs/adr/devops"] }
  ```
  After building, confirm the `--build` output shows a **non-zero count for every root** (e.g. `[…/software-engineering:12, …/devops:12]`); a `…:0` means that folder is empty or misnamed — fix it before proceeding rather than shipping with a domain silently uncovered.
- Note: Recommend using the standardized ADR format from `${CLAUDE_PLUGIN_ROOT}/templates/adr-template.md` — it includes frontmatter with `applicableTo` domains and `constraints` that the implementer can parse directly into the catalog (massive token savings vs. reading full ADR bodies)

### Question 2: AWS Account IDs  
"What are your AWS account IDs where writes are permitted (dev/sandbox/staging)?"
- Provide a text input option
- Explain these are 12-digit account IDs, comma-separated
- Example: "123456789012,987654321098"
- Use these to populate `allowedWriteAccounts` in .governance.json

### Question 3: AWS CLI Profiles
"What AWS CLI profiles from ~/.aws/config should be allowed for mutations?"
- Provide a text input option
- Explain these are profile names, comma-separated
- Example: "dev,sandbox,staging"
- Use these to populate `allowedWriteProfiles` in .governance.json

### Question 4: IAM Roles (Optional)
"Do you want to specify IAM roles that can be assumed for write operations?"
- Options:
  - "Yes" → Ask for comma-separated role ARNs (format: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME)
  - "No" → Use empty array or example placeholders
- Use these to populate `allowedWriteRoles` in .governance.json

### Question 5: Protected Paths
"Do you want to customize protected paths requiring specific reviewers?"
- Options:
  - "Use defaults" → Keep the template defaults (security for iam/network/security, redteam for data/database)
  - "Customize now" → Ask for path patterns and required reviewers
  - "Configure later" → Keep defaults, note they can edit .governance.json

### Question 6: Agent Teams Mode
"Enable experimental agent-teams mode for parallel team review on CRITICAL changes?"
- Explain: OFF by default, everything works without it
- If enabled: `/devops:review --team <scope>` on CRITICAL work
- Trade-offs: experimental, no session resume for in-process teammates, split panes only in tmux/iTerm2
- Options: "Yes" or "No (recommended for now)"

## Step 3: Apply configuration

1. Update .governance.json with collected values (incl. `adr.dir` for your ADR location)
2. **Warm the ADR cache:** run `node docs/adr-cache.mjs --build` — it builds the catalog now (parsing both YAML-frontmatter and MADR ADRs) so the very first review is a HIT, not a cold MISS. No-op if no ADRs are present yet (they'll be built on first use).
3. Create CLAUDE.md from template, substituting:
   - {{ALLOWED_ACCOUNTS}} → the account IDs
   - {{ALLOWED_PROFILES}} → the profile names
   - {{ALLOWED_ROLES}} → the role ARNs
   - {{PROTECTED_PATHS}} → formatted list of protected path rules
   - {{ADR_LOCATION}} → "Architecture decisions tracked in `adr/` submodule" or "Architecture decisions tracked in `docs/adr/`"

## Step 4: Summarize setup

Show the user:
- Created files: docs/PRINCIPLES.md, docs/decisions.md, docs/decisions-archive.md, docs/REVIEW_LOG.md, .governance.json, CLAUDE.md
- Configured accounts/profiles/roles
- Protected path summary
- ADR location
- Next steps: "Try `/devops:ship 'add EKS cluster logging'` to test the full loop"

## Workflow summary (for user)

**The easy path is one command: `/devops:ship <story>`** — the **Manager (Alakazam) conducts** the whole loop (intake → plan → build → review → ship-check → **audit** → merge-handoff), invoking each agent, carrying results forward, and speaking to you at every gate — including at intake when a story is too vague to plan, and at the audit stage that verifies every agent actually did its job before handoff. Prefer it day to day. The individual commands remain for manual control:
- `/devops:story` — intake-gates the story (intake-refiner catches vague ones), then plans + sets the risk tier (persisted for the rest of the loop)
- `/devops:review` — tier's reviewers; closes with the Manager Summary
- `/devops:debug` — diagnose a failure, minimal fix, gate-bound
- `/devops:ship-check` — pre-merge verification
- `/devops:manager` — deadlock ruling (same day)
- `/devops:redteam` — adversarial review outside the tier machinery
- `/devops:audit-reviewers` — monthly; grades the reviewers and the manager
