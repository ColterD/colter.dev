#!/usr/bin/env bash
# Deploy colter.dev with the current commit SHA injected as COMMIT_SHA
# (the Worker stamps it into the footer as the deploy link).
# Auth: scoped CLOUDFLARE_API_TOKEN preferred; legacy Global Key (CLOUDFLARE_API_KEY
# + CLOUDFLARE_EMAIL) also works. Or run `npx wrangler login` once and unset both.
set -euo pipefail
cd "$(dirname "$0")"

# Refuse dirty trees: the footer SHA must match the deployed content exactly.
# --porcelain catches BOTH uncommitted changes and untracked files.
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree has uncommitted/untracked changes — commit or stash first." >&2
  git status --short >&2
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"
echo "deploying commit ${SHA}"
exec npx wrangler deploy --var "COMMIT_SHA:${SHA}"
