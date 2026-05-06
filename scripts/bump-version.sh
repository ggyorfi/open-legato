#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ ! "$1" =~ ^(major|minor|patch)$ ]]; then
  echo "usage: $0 <major|minor|patch>"
  exit 1
fi

CURRENT=$(grep -oP '"version": "\K[0-9]+\.[0-9]+\.[0-9]+' "$ROOT_DIR/package.json")

if [[ -z "$CURRENT" ]]; then
  echo "could not read version from package.json" >&2
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$1" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
DATE=$(date +%Y-%m-%d)

echo "$CURRENT to $NEW_VERSION"

sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT_DIR/package.json"
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT_DIR/src-tauri/tauri.conf.json"
sed -i "s/^version = \"$CURRENT\"/version = \"$NEW_VERSION\"/" "$ROOT_DIR/src-tauri/Cargo.toml"

sed -i "s|  <releases>|  <releases>\n    <release version=\"$NEW_VERSION\" date=\"$DATE\">\n      <description>\n        <p>TODO: release notes</p>\n      </description>\n    </release>|" "$ROOT_DIR/flatpak/dev.sprintster.OpenLegato.metainfo.xml"
