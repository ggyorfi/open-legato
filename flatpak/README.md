# Flatpak

Runtime: `org.gnome.Platform//50` + `org.gnome.Sdk//50`.

## Build and install locally

```bash
flatpak-builder --force-clean --user --install --disable-rofiles-fuse build-dir \
  flatpak/dev.sprintster.OpenLegato.yaml
flatpak run dev.sprintster.OpenLegato
```

## Update vendored deps

Run after `Cargo.lock` or `pnpm-lock.yaml` changes:

```bash
./flatpak/update-sources.sh
```

## Bundle a .flatpak file

```bash
flatpak-builder --force-clean --repo=repo --disable-rofiles-fuse build-dir \
  flatpak/dev.sprintster.OpenLegato.yaml
flatpak build-bundle repo open-legato.flatpak dev.sprintster.OpenLegato
```
