#!/usr/bin/env bash

set -euo pipefail

echo "Checking for non-Bun runtime commands..."

SCRIPT_ISSUES=$(bun -e '
const pkg = JSON.parse(await Bun.file("package.json").text());
const scripts = pkg.scripts ?? {};
const issues = [];
for (const [name, cmd] of Object.entries(scripts)) {
  if (typeof cmd !== "string") continue;
  if (/\bbunx\b/.test(cmd)) issues.push(`scripts.${name}: uses bunx -> ${cmd}`);
  if (/\bnode\b/.test(cmd)) issues.push(`scripts.${name}: uses node -> ${cmd}`);
}
if (issues.length > 0) {
  console.log(issues.join("\n"));
  process.exit(1);
}
')

if [[ -n "${SCRIPT_ISSUES}" ]]; then
  echo "${SCRIPT_ISSUES}"
  echo ""
  echo "Guard failed: package scripts must run with bun, not bunx/node."
  exit 1
fi

WORKFLOW_ISSUES="$(rg -n '^\s*run:\s*.*\b(node|bunx|pnpm|npm)\b' .github/workflows 2>/dev/null || true)"
if [[ -n "${WORKFLOW_ISSUES}" ]]; then
  echo "${WORKFLOW_ISSUES}"
  echo ""
  echo "Guard failed: workflow run commands must use bun runtime."
  exit 1
fi

echo "Bun runtime guard passed."
