#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
flatpak install --user --assumeyes --reinstall "$REPO_ROOT/open-legato.flatpak"
