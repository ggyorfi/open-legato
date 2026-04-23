# Flatpak packaging

Files for building and distributing Open Legato as a Flatpak.

## Current approach (MVP)

We **repackage the `.deb`** produced by `pnpm tauri build --bundles deb`.
Official Tauri-recommended path, much simpler than a full source build.

Two small quirks are handled in the manifest:

1. **`libbz2.so.1.0` SONAME mismatch** — Arch builds against `libbz2.so.1.0`,
   the freedesktop runtime ships `libbz2.so.1` (same ABI). We patch the binary's
   `DT_NEEDED` with `patchelf` (built as a pre-module).
2. **glibc** — the runtime must be at least GNOME 50 for the binary built on
   current Arch to run.

## One-time setup

```bash
# Arch Linux (adjust for your distro)
sudo pacman -S flatpak-builder

# Runtime + SDK (match the manifest's runtime-version)
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.gnome.Platform//50 org.gnome.Sdk//50
```

## Build & run

```bash
# 1. Build the .deb first (current manifest expects version 0.1.18)
pnpm tauri build --bundles deb

# 2. Build and install the flatpak into the user install
flatpak-builder --force-clean --user --install --disable-rofiles-fuse build-dir \
  flatpak/dev.sprintster.OpenLegato.yaml

# 3. Run
flatpak run dev.sprintster.OpenLegato
```

## Produce a shareable `.flatpak` bundle

```bash
flatpak-builder --force-clean --repo=repo --disable-rofiles-fuse build-dir \
  flatpak/dev.sprintster.OpenLegato.yaml
flatpak build-bundle repo open-legato.flatpak dev.sprintster.OpenLegato
```

Users install via: `flatpak install --user ./open-legato.flatpak`

## Version bumps

The manifest pins the `.deb` filename (e.g. `open-legato_0.1.18_amd64.deb`).
Update `dev.sprintster.OpenLegato.yaml` when the app version changes.

## Future work for Flathub submission

- [ ] Switch from local `path:` to `url:` source pointing at a GitHub Release
      `.deb` with sha256 — OR switch to full source build (vendored)
- [ ] Add real screenshots under `flatpak/screenshots/` (referenced from metainfo)
- [ ] Prove reverse-DNS ownership of `sprintster.dev` (DNS TXT or verified URL)
- [ ] Tighten `--filesystem=home:ro` → XDG document portal for file picking
- [ ] Submit PR to `flathub/flathub` on the `new-pr` branch

The files in this directory (`cargo-sources.json`, `pnpm-sources.json`,
`update-sources.sh`) are kept because they'll be needed for the eventual
full-source build required by Flathub.
