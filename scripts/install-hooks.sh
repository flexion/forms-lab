#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/scripts/git-hooks"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

for hook in "$HOOKS_DIR"/*; do
  hook_name="$(basename "$hook")"
  target="$GIT_HOOKS_DIR/$hook_name"

  if [ -f "$target" ] && [ ! -L "$target" ]; then
    echo "WARNING: $target already exists and is not a symlink. Skipping."
    echo "  Remove it manually if you want to install the managed hook."
    continue
  fi

  ln -sf "$hook" "$target"
  echo "Installed $hook_name -> $target"
done

echo "Git hooks installed."
