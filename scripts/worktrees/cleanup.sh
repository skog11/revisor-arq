#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Uso: ./scripts/worktrees/cleanup.sh <nombre>" >&2
  exit 1
fi
NAME="$1"
DIR="../revisor-arq-$NAME"
BRANCH="feature/$NAME"
git worktree remove "$DIR" || true
git branch -D "$BRANCH" || true
echo "Worktree y rama eliminados."
