#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Uso: ./scripts/worktrees/new.sh <nombre>" >&2
  exit 1
fi
NAME="$1"
BRANCH="feature/$NAME"
DIR="../revisor-arq-$NAME"
git worktree add "$DIR" -b "$BRANCH"
echo "Worktree creado en $DIR en rama $BRANCH."
