import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { download } from './download.mjs';
import { lock, paths, requirePlatform } from './paths.mjs';

requirePlatform();
const locations = paths();
const run = promisify(execFile);
await mkdir(locations.cache, { recursive: true, mode: 0o700 });
await mkdir(locations.managed, { recursive: true, mode: 0o700 });

let installed = false;
try {
  installed = await readFile(join(locations.runtime, '.cube-sha256'), 'utf8') === lock.appImage.sha256;
  if (installed) await access(locations.executable, constants.X_OK);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  installed = false;
}

if (!installed) {
  const temporary = await mkdtemp(join(locations.cache, '.extract-'));
  try {
    const image = join(temporary, 'OpenADE.AppImage');
    console.log(`Downloading pinned OpenADE ${lock.version} (${Math.ceil(lock.appImage.size / 1024 / 1024)} MiB).`);
    await download(lock.appImage, image);
    // Official AppImage's extraction mode needs no FUSE and starts no GUI process.
    await run(image, ['--appimage-extract'], { cwd: temporary, maxBuffer: 32 * 1024 * 1024 });
    const extracted = join(temporary, 'squashfs-root');
    await access(join(extracted, 'openade'), constants.X_OK);
    await writeFile(join(extracted, '.cube-sha256'), lock.appImage.sha256);
    await rm(locations.runtime, { recursive: true, force: true });
    await rename(extracted, locations.runtime);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

// Seed exactly the versions upstream would otherwise download on first launch.
// These live in the persistent native profile, not in the replaceable checkout.
for (const [name, artifact] of Object.entries(lock.managedBinaries)) {
  console.log(`Checking managed ${name} ${artifact.version}.`);
  await download(artifact, join(locations.managed, name));
}
let versions = {};
try {
  versions = JSON.parse(await readFile(join(locations.managed, '.versions.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
}
for (const [name, artifact] of Object.entries(lock.managedBinaries)) versions[name] = artifact.version;
await writeFile(join(locations.managed, '.versions.json'), `${JSON.stringify(versions, null, 2)}\n`, { mode: 0o600 });
console.log(`OpenADE ${lock.version} installed; source ${lock.revision}.`);
