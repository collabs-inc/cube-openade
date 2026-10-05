import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export async function matches(file, artifact) {
  try {
    if ((await stat(file)).size !== artifact.size) return false;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest('hex') === artifact.sha256;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function download(artifact, destination) {
  if (await matches(destination, artifact)) {
    await chmod(destination, 0o755);
    return;
  }
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  const temporary = `${destination}.download-${process.pid}`;
  try {
    const response = await fetch(artifact.url, { signal: AbortSignal.timeout(10 * 60_000) });
    if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);
    let bytes = 0;
    const limiter = new Transform({
      transform(chunk, encoding, callback) {
        bytes += chunk.length;
        callback(bytes > artifact.size ? new Error('Download exceeds pinned size') : null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(temporary, { mode: 0o700 }));
    if (!await matches(temporary, artifact)) throw new Error('Downloaded artifact checksum mismatch');
    await chmod(temporary, 0o755);
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}
