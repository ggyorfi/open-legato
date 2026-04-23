#!/usr/bin/env bash
# Regenerates flatpak source manifests from Cargo.lock and pnpm-lock.yaml.
# Run whenever dependencies change.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"

# Install once:
#   curl -fsSL https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/cargo/flatpak-cargo-generator.py \
#     -o ~/.local/bin/flatpak-cargo-generator && chmod +x ~/.local/bin/flatpak-cargo-generator
#   pipx install git+https://github.com/flatpak/flatpak-builder-tools.git#subdirectory=node
for cmd in flatpak-cargo-generator flatpak-node-generator; do
  command -v "$cmd" >/dev/null || { echo "Missing: $cmd (see comments for install)" >&2; exit 1; }
done

echo "==> Generating cargo-sources.json from src-tauri/Cargo.lock"
flatpak-cargo-generator \
  "$REPO_ROOT/src-tauri/Cargo.lock" \
  -o "$HERE/cargo-sources.json"

echo "==> Generating pnpm-sources.json from pnpm-lock.yaml"
# flatpak-node-generator errors out if node_modules is present in cwd
TMP_DIR="$(mktemp -d)"
cp "$REPO_ROOT/pnpm-lock.yaml" "$TMP_DIR/"
( cd "$TMP_DIR" && flatpak-node-generator pnpm pnpm-lock.yaml -o "$HERE/pnpm-sources.json" )
rm -rf "$TMP_DIR"

echo "Done. Remember to commit cargo-sources.json and pnpm-sources.json."
