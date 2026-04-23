#!/usr/bin/env bash
# Installs the prebuilt flatpak bundle into the user's flatpak.
# Expects pnpm build:flatpak to have been run first (or any open-legato.flatpak
# to exist in the repo root).
#
# Usage: pnpm install:flatpak
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$REPO_ROOT/open-legato.flatpak"
APP_ID="dev.sprintster.OpenLegato"

if [ ! -f "$BUNDLE" ]; then
  echo "Error: $BUNDLE not found. Run 'pnpm build:flatpak' first." >&2
  exit 1
fi

echo "==> Installing $BUNDLE"
flatpak install --user --assumeyes --reinstall "$BUNDLE"

echo
echo "Installed. Run with:  flatpak run $APP_ID"
