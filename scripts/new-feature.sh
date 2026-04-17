#!/bin/bash

# Script to create a new feature worktree
if [ $# -ne 1 ]; then
    echo "Usage: $0 <feature-name>"
    echo "Example: $0 user-auth"
    exit 1
fi

FEATURE_NAME="$1"
WORKTREE_DIR="../revisor-arq-$FEATURE_NAME"

# Check if worktree directory already exists
if [ -d "$WORKTREE_DIR" ]; then
    echo "Error: Worktree directory '$WORKTREE_DIR' already exists"
    exit 1
fi

# Create the worktree
echo "Creating worktree for feature: $FEATURE_NAME"
git worktree add "$WORKTREE_DIR" -b "feature/$FEATURE_NAME"

echo "Worktree created successfully:"
echo "  Location: $WORKTREE_DIR"
echo "  Branch: feature/$FEATURE_NAME"
echo ""
echo "To work on this feature:"
echo "  cd $WORKTREE_DIR"
echo ""
echo "To return to main worktree:"
echo "  cd .."
echo ""
echo "To delete the worktree when finished:"
echo "  cd .."
echo "  git worktree remove $WORKTREE_DIR"