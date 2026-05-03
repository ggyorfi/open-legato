#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"

flatpak-cargo-generator \
  "$REPO_ROOT/src-tauri/Cargo.lock" \
  -o "$HERE/cargo-sources.json"

TMP_DIR="$(mktemp -d)"
cp "$REPO_ROOT/pnpm-lock.yaml" "$TMP_DIR/"
( cd "$TMP_DIR" && flatpak-node-generator pnpm pnpm-lock.yaml -o "$HERE/pnpm-sources.json" )
rm -rf "$TMP_DIR"

echo "Done"
