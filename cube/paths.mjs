import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

export const lock = JSON.parse(readFileSync(new URL('./runtime-lock.json', import.meta.url), 'utf8'));

export function paths(env = process.env) {
  const home = env.HOME || homedir();
  const cache = resolve(env.CUBE_OPENADE_CACHE_DIR || join(env.XDG_CACHE_HOME || join(home, '.cache'), 'cube-openade'));
  const data = resolve(env.CUBE_OPENADE_DATA_DIR || join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'cube-openade'));
  const runtime = join(cache, `${lock.version}-${lock.platform}-${lock.appImage.sha256.slice(0, 12)}`);
  return {
    cache, data, runtime,
    executable: join(runtime, 'openade'),
    profile: join(data, 'profile'),
    managed: join(data, 'profile', 'managed-binaries', 'bin'),
  };
}

export function requirePlatform(platform = process.platform, arch = process.arch) {
  if (`${platform}-${arch}` !== lock.platform) {
    throw new Error('This Cube package requires Linux x64.');
  }
}
