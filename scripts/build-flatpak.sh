#!/usr/bin/env bash
# Builds the flatpak bundle from source, via flatpak-builder (does NOT install —
# use pnpm install:flatpak for that).
#
# The manifest runs the Tauri + Vite build inside the flatpak sandbox using
# vendored Rust/Node sources, so no separate `pnpm tauri build` step is needed.
#
# Usage: pnpm build:flatpak
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

MANIFEST="flatpak/dev.sprintster.OpenLegato.yaml"
APP_ID="dev.sprintster.OpenLegato"
BUNDLE="open-legato.flatpak"

echo "==> Checking prerequisites"
for cmd in flatpak-builder flatpak; do
  command -v "$cmd" >/dev/null || { echo "Missing: $cmd" >&2; exit 1; }
done
for f in flatpak/cargo-sources.json flatpak/pnpm-sources.json; do
  [ -f "$f" ] || { echo "Missing: $f — run flatpak/update-sources.sh" >&2; exit 1; }
done

echo "==> 1/2 Building flatpak from source into local repo"
flatpak-builder --force-clean --user --disable-rofiles-fuse \
  --repo=repo build-dir "$MANIFEST"

echo "==> 2/2 Exporting single-file bundle"
flatpak build-bundle repo "$BUNDLE" "$APP_ID"

echo
echo "Built: $REPO_ROOT/$BUNDLE ($(du -h "$BUNDLE" | cut -f1))"
echo "Install locally:  pnpm install:flatpak"
echo "Share with users: flatpak install --user $BUNDLE"
