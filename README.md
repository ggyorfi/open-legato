# Open Legato

An open-source, cross-platform sheet-music reader for musicians. The primary goal is to give musicians who want to use linux a reliable sheet music reader for practicing, rehearsals and concerts. It has large configurable buttons for fast page turning. It supports user defined repeat buttons and bookmarks.

## Install

### Flatpak

Add the repository (one-time):

```bash
flatpak remote-add --user open-legato https://open-legato.sprintster.dev/open-legato.flatpakrepo
```

Install:

```bash
flatpak install --user open-legato dev.sprintster.OpenLegato
```

Updates come from the same repo via `flatpak update` or your distro's software center.

### Debian, Ubuntu, Mint

Get the `.deb` from [Releases](https://github.com/ggyorfi/open-legato/releases/latest):

```bash
sudo apt install ./open-legato_*_amd64.deb
```

### AppImage (any distro)

Get the `.AppImage` from [Releases](https://github.com/ggyorfi/open-legato/releases/latest):

```bash
chmod +x open-legato_*.AppImage
./open-legato_*.AppImage
```

## Releasing

Releases are built by GitHub Actions. Pushing a `v*.*.*` tag triggers everything, there is no local build step.

Commit the work first, then bump:

```bash
pnpm bump-version minor    # major|minor|patch
```

That rewrites `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `Cargo.lock`, and adds a `<release>` entry to `flatpak/dev.sprintster.OpenLegato.metainfo.xml` with a `TODO: release notes` placeholder. Replace the placeholder, that text shows up in GNOME Software and other AppStream clients.

If any dependency changed since the last release, regenerate the offline Flatpak sources:

```bash
./flatpak/update-sources.sh
```

Commit the bump on its own, then tag and push:

```bash
git commit -am "v1.1.0"
git tag v1.1.0
git push origin main && git push origin v1.1.0
```

The workflow builds the Flatpak repo and bundle, the `.deb` and the `.AppImage`, attaches all three to a GitHub release, and publishes the repo to the `gh-pages` branch that serves open-legato.sprintster.dev.

To try a Flatpak build locally without releasing:

```bash
pnpm build:flatpak
pnpm install:flatpak
```

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
