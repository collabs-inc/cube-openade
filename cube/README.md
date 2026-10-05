# OpenADE in Cube

This adapter runs the official Linux x64 OpenADE **0.81.2** desktop release on a
private virtual display. Cube opens its noVNC client at the loopback `$PORT` and
authenticates access through the existing app gate. The app itself keeps the
native Electron interface; this is not a port of its renderer to a web server.

The source checkout is pinned to upstream
`3ce7a832589f7b545f6ccccdb02bc8874ded605b` (`v0.81.2`).
`runtime-lock.json` pins the official AppImage and the exact Bun/ripgrep binaries
that release would otherwise download on first launch. Every download is checked
against its release size and SHA-256 before use. The installer extracts the
AppImage without FUSE and starts no GUI process. No source build, global package
installation, or dependency installation from this monorepo is required.

## Install and start

Use this fork's default `cube-app` branch as a Cube app source. The target is
Linux x64 with Node 22 or later. `sh cube/install.sh` installs the pinned app and
the shared desktop client; `node cube/start.mjs` stays in the foreground.

The desktop bridge requires host Xvfb, Openbox, x11vnc, D-Bus, a secret service,
and Electron's usual Linux libraries. See `desktop/README.md` for its exact host
package list and behavior. The cloud coordinator provisions those shared host
dependencies. The launcher requests X11 and does not disable Electron's sandbox.

Native provider CLIs must already be installed and signed in on this machine.
OpenADE resolves `claude` and `codex`, then checks `claude auth status` and
`codex login status`. The adapter preserves HOME, PATH, CODEX_HOME, and
CLAUDE_CONFIG_DIR; it never reads or copies login credentials. An existing
machine login may work, but paid inference and provider sign-in flows must be
tested separately. An OAuth callback targeting the cloud machine's localhost
may require a device-code or terminal login. URLs opened by the desktop are
offered as links in the Cube pane by the bridge.

## Persistent state

The checkout is disposable. These locations survive Cube source updates:

| Data | Default path |
| --- | --- |
| Extracted versioned app | `${XDG_CACHE_HOME:-$HOME/.cache}/cube-openade/` |
| Native Electron profile and managed binaries | `${XDG_DATA_HOME:-$HOME/.local/share}/cube-openade/profile/` |
| Desktop display/session/keyring state | `${XDG_DATA_HOME:-$HOME/.local/share}/cube-openade/bridge/` |
| Upstream projects, tasks, snapshots, worktrees and device settings | `$HOME/.openade/` |
| Provider CLI login/session state | Existing Claude/Codex home/config locations |

`CUBE_OPENADE_CACHE_DIR` and `CUBE_OPENADE_DATA_DIR` can override the first two
roots; use the same values for install and start. The profile is passed using
Electron's native `--user-data-dir`. The upstream app also deliberately writes
to `$HOME/.openade`, so the adapter does not replace HOME to simulate isolation.
Keep actual project checkouts outside Cube's replaceable app source checkout.

The extracted executable runs directly, with no APPIMAGE environment variable,
so electron-updater does not activate its AppImage self-updater. Cube source
updates control the pinned app version. The optional upstream companion HTTP
service is explicitly disabled; desktop access goes through Cube's gate.

## Footprint and verification

Pinned downloads total **251,737,691 bytes**: a 144 MB AppImage, 102 MB Bun binary,
and 5.4 MB ripgrep binary. The temporary AppImage is removed after extraction.
The extracted app uses 416 MiB and its persistent profile with managed binaries
uses 105 MiB. Linux cloud smoke rendered the native app through Cube's sandboxed
iframe, opened Settings with pointer input, and measured 439 MiB total RSS across
16 owned processes. A Cube restart took 8.8 seconds, retained the managed profile,
and stopped all previous owned processes. Provider inference was not exercised.

Local adapter checks (no large downloads or native app launch):

```sh
node --test cube/adapter.test.mjs
node --check cube/install.mjs
node --check cube/start.mjs
```

The tests exercise actual loopback downloads, checksum rejection, existing-file
preservation, cache reuse, temporary-file cleanup, and persistent launch paths.
Cloud acceptance must verify the rendered app, keyboard/mouse input, retained
state across restart, process cleanup, Cube gate access, and provider detection.

## Upstream notices

The upstream README declares `MIT © Bearly AI`, but this pinned source tree does
not contain a root LICENSE file and GitHub reports no detected license. This
fork preserves that README and all supplied notices; it does not invent an
upstream license file. The release is downloaded unchanged and its bundled
Electron/third-party notices remain in the extracted directory. The Cube icon
is the existing 30 KB upstream `projects/landing/public/favicon-192.png`.

The desktop bridge is vendored from `collabs-inc/cube-superset` commit
`b700011a`. Its source and noVNC notices remain under `desktop/`; consult
its README before updating it. Update source revision, URLs, checksums and
managed-binary versions together, and repeat the Linux smoke test.
