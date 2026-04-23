#!/usr/bin/env bash
set -euo pipefail

PATH_ARG="${CLAUDE_TOOL_INPUT_file_path:-${CLAUDE_TOOL_INPUT_path:-}}"
case "$PATH_ARG" in
  */apps/*|apps/*)
    cat <<'MSG' >&2
[WAO alignment] You are editing an Evervolve surface.
Reminder: every surface MUST expose or consume a WAO capability via Hermes.
See @docs/evervolve-alignment.md. Side apps are blocked in review.
MSG
    ;;
esac
exit 0
