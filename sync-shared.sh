#!/usr/bin/env bash
# Assemble each plugin from the shared governance core (shared/) plus its domain reviewer set(s)
# (domains/<name>/agents/). Claude Code loads agents/commands/scripts/hooks from the plugin root,
# so every plugin must be self-contained — this script generates those copies.
#
# Single sources of truth:
#   shared/          -> domain-neutral core (manager, intake, story-implementer, debugger,
#                       adr-amender, code/redteam/architecture reviewers, all commands except
#                       review, guard/team-gate/adr-cache scripts, templates, hooks)
#   domains/infra/   -> network, security (infra), consumer reviewers
#   domains/app/     -> appsec, api, data, performance reviewers
#
# Per-plugin AUTHORED files (NOT generated, live in the plugin dir): commands/review.md,
# templates/governance.json, templates/CLAUDE.md, .claude-plugin/plugin.json.
#
# Run after editing shared/ or domains/, then commit the sources + the generated copies together.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Which domain reviewer sets each plugin includes.
domains_for() {
  case "$1" in
    devops)    echo "infra" ;;
    engineer)  echo "app" ;;
    fullstack) echo "infra app" ;;
    *)         echo "" ;;
  esac
}
PLUGINS="devops engineer fullstack"
SUBDIRS="agents commands scripts templates hooks"

for plugin in $PLUGINS; do
  # 1) shared core
  for sub in $SUBDIRS; do
    if [ -d "$DIR/shared/$sub" ]; then
      mkdir -p "$DIR/$plugin/$sub"
      cp -R "$DIR/shared/$sub/." "$DIR/$plugin/$sub/"
    fi
  done
  # 2) domain reviewers
  for d in $(domains_for "$plugin"); do
    if [ -d "$DIR/domains/$d/agents" ]; then
      mkdir -p "$DIR/$plugin/agents"
      cp -R "$DIR/domains/$d/agents/." "$DIR/$plugin/agents/"
    fi
  done
  # 3) namespace substitution — shared/domain sources use /devops: as the canonical namespace;
  #    rewrite it to the target plugin's namespace so cross-references resolve.
  if [ "$plugin" != "devops" ]; then
    find "$DIR/$plugin/agents" "$DIR/$plugin/commands" -name '*.md'  -type f 2>/dev/null | xargs -r sed -i "s#/devops:#/$plugin:#g"
    find "$DIR/$plugin/scripts"                         -name '*.mjs' -type f 2>/dev/null | xargs -r sed -i "s#/devops:#/$plugin:#g"
    # init.md's template-location fallback searches for THIS plugin's templates dir.
    [ -f "$DIR/$plugin/commands/init.md" ] && sed -i "s#devops/templates#$plugin/templates#g" "$DIR/$plugin/commands/init.md"
  fi
  echo "✓ assembled $plugin/  (core + domains: $(domains_for "$plugin"))"
done
echo "Done. Review 'git status' and commit sources + generated copies together."
