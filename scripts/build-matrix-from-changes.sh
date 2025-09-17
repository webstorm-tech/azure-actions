#!/bin/bash
#
# Build matrix from changes script
# Usage: ./build-matrix-from-changes.sh [force_publish]
# 
# Arguments:
#   force_publish: "true" to force publish all actions, "false" or empty to detect changes
#
# Outputs:
#   Sets GITHUB_OUTPUT with matrix of actions to process
#

set -e

FORCE_PUBLISH="${1:-false}"

if [ "$FORCE_PUBLISH" == "true" ]; then
  # Force publish all - dynamically discover all actions
  ACTIONS_DIRS=$(find actions -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | jq -R -s -c 'split("\n")[:-1]')
  echo "matrix=$ACTIONS_DIRS" >> $GITHUB_OUTPUT
  echo "📦 Force publish enabled - discovered actions: $ACTIONS_DIRS"
else
  # Detect what changed - only include actions that have changes
  CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)
  MATRIX="[]"
  
  # Dynamically discover all action directories
  for action_dir in actions/*/; do
    if [ -d "$action_dir" ]; then
      action=$(basename "$action_dir")
      if echo "$CHANGED_FILES" | grep -q "actions/$action/\|shared/"; then
        MATRIX=$(echo $MATRIX | jq --arg action "$action" '. += [$action]')
      fi
    fi
  done
  
  echo "matrix=$MATRIX" >> $GITHUB_OUTPUT
  echo "🔍 Changed actions detected: $MATRIX"
fi