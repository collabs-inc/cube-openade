import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { download } from './download.mjs';
import { desktopProfile } from './profile.mjs';
import { paths, requirePlatform } from './paths.mjs';

test('installer verifies downloads, preserves old files on corruption, and reuses verified cache', async () => {
  const temporary = await mkdtemp('/tmp/cube-openade-download-');
  const content = Buffer.from('pinned-release\n');
  let response = content;
  let requests = 0;
  const server = createServer((_req, res) => { requests++; res.end(response); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const artifact = {
      url: `http://127.0.0.1:${server.address().port}/release`,
      size: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
    };
    const file = join(temporary, 'runtime');
    await download(artifact, file);
    assert.deepEqual(await readFile(file), content);
    assert.equal((await stat(file)).mode & 0o777, 0o755);
    await download(artifact, file);
    assert.equal(requests, 1);
    await writeFile(file, 'previous-release');
    response = Buffer.from('incorrect-hash');
    await assert.rejects(download(artifact, file), /checksum/);
    assert.equal(await readFile(file, 'utf8'), 'previous-release');
    response = Buffer.alloc(content.length + 1);
    await assert.rejects(download(artifact, file), /exceeds pinned size/);
    assert.deepEqual(await readdir(temporary), ['runtime']);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('profile persists outside checkout and preserves native CLI authentication environment', () => {
  const env = { HOME: '/home/person', PATH: '/cli/bin', CODEX_HOME: '/auth/codex', CLAUDE_CONFIG_DIR: '/auth/claude', ELECTRON_RUN_AS_NODE: '1', APPIMAGE: '/other-app', OPENADE_SMOKE_TEST: '1' };
  const before = { ...env };
  const profile = desktopProfile(env);
  assert.deepEqual(env, before);
  assert.deepEqual({ ...env, ...profile.env }.HOME, env.HOME);
  assert.equal({ ...env, ...profile.env }.CODEX_HOME, env.CODEX_HOME);
  assert.equal({ ...env, ...profile.env }.CLAUDE_CONFIG_DIR, env.CLAUDE_CONFIG_DIR);
  assert.equal(profile.dataDir, '/home/person/.local/share/cube-openade');
  assert.ok(profile.args.includes('--user-data-dir=/home/person/.local/share/cube-openade/profile'));
  assert.equal(profile.env.OPENADE_ENABLE_COMPANION, '0');
  assert.equal(profile.env.OPENADE_SMOKE_TEST, undefined);
  assert.equal(profile.env.APPIMAGE, undefined);
  assert.equal({ ...env, ...profile.env }.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(paths({ ...env, CUBE_OPENADE_DATA_DIR: '/persistent/custom' }).profile, '/persistent/custom/profile');
  assert.throws(() => requirePlatform('linux', 'arm64'), /Linux x64/);
});
