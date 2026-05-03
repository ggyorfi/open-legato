#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

flatpak-builder --force-clean --user --disable-rofiles-fuse \
  --repo=repo build-dir flatpak/dev.sprintster.OpenLegato.yaml

flatpak build-bundle repo open-legato.flatpak dev.sprintster.OpenLegato
