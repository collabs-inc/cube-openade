import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { lock, paths, requirePlatform } from './paths.mjs';
import { matches } from './download.mjs';
import { desktopProfile } from './profile.mjs';
import { runDesktop } from './desktop/start.mjs';

requirePlatform();
const locations = paths();
await mkdir(locations.data, { recursive: true, mode: 0o700 });
await access(locations.executable, constants.X_OK);
for (const [name, artifact] of Object.entries(lock.managedBinaries)) {
  if (!await matches(join(locations.managed, name), artifact)) {
    throw new Error(`Pinned ${name} is missing or changed. Run sh cube/install.sh again.`);
  }
}
await runDesktop(desktopProfile());
