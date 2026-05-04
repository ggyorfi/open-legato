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

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
