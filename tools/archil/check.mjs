#!/usr/bin/env node
// Persistence check: write a line to the disk in one exec, read it back in a second, separate exec.
// A fresh container runs each exec, so a matching read-back proves the file really lives on the disk.
//
//   node tools/archil/check.mjs      (or: cd tools/archil && npm run check)
//
// Needs ARCHIL_API_KEY (key-…, from https://console.archil.com/api-keys) in the environment or in
// tools/archil/.env. Uses the disk in ARCHIL_DISK_ID, or creates one and saves its id there. The disk's
// one-time mount token is never printed: exec does not need it.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import store from './store.js';

function fail(message) {
  console.error('FAIL ' + message);
  process.exit(1);
}

// Remember the disk this check used, so later runs (and the game's tools) reuse it. Key stays untouched.
function saveDiskId(id) {
  let text = '';
  try { text = fs.readFileSync(store.ENV_FILE, 'utf8'); } catch (e) { text = '# Local Archil settings for tools/archil. Gitignored; ARCHIL_API_KEY is never written from the check.\n'; }
  const line = 'ARCHIL_DISK_ID=' + id;
  text = /^\s*ARCHIL_DISK_ID\s*=/m.test(text)
    ? text.replace(/^\s*ARCHIL_DISK_ID\s*=.*$/m, line)
    : text.replace(/\s*$/, '\n') + line + '\n';
  fs.writeFileSync(store.ENV_FILE, text, { mode: 0o600 });
  process.env.ARCHIL_DISK_ID = id;
}

async function resolveDisk() {
  const id = process.env.ARCHIL_DISK_ID;
  if (id) {
    const disk = await store.getDisk(id);
    console.log('disk   ' + disk.name + ' (' + disk.id + ', ' + disk.region + ')');
    return disk;
  }
  const name = 'shattered-octave-' + new Date().toISOString().slice(0, 10);
  const disk = await store.createDisk(name);
  saveDiskId(disk.id);
  console.log('disk   created ' + disk.name + ' (' + disk.id + ', ' + disk.region + ')');
  console.log('       saved to ' + store.ENV_FILE);
  return disk;
}

// Write into a fresh per-job subdirectory: exec mounts are shared, and a directory created by this job
// gets its ownership claimed by it. If the mount still refuses the write, checkout the path explicitly.
async function writeStamp(disk, dir, line) {
  const write = `mkdir -p ${dir} && printf '%s\\n' '${line}' > ${dir}/stamp.txt`;
  let res = await store.run(write, disk.id);
  if (res.exitCode !== 0 && /read-only|permission denied|EROFS/i.test(res.stderr + res.stdout)) {
    res = await store.run(`mkdir -p ${dir} && archil checkout ${dir} && printf '%s\\n' '${line}' > ${dir}/stamp.txt`, disk.id);
  }
  if (res.exitCode !== 0) fail(`write exec exited ${res.exitCode}: ${(res.stderr || res.stdout).trim()}`);
  return res;
}

async function main() {
  if (!process.env.ARCHIL_API_KEY) {
    fail('ARCHIL_API_KEY is not set. Add it to tools/archil/.env (see the repository .env.example) or export it. Keys start with "key-" and come from https://console.archil.com/api-keys');
  }
  const disk = await resolveDisk();

  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex');
  const dir = 'checks/' + runId;
  const line = 'octave-archil-check ' + runId;

  console.log('region ' + (disk.region || store.region()));
  console.log('write  exec 1: ' + dir + '/stamp.txt');
  await writeStamp(disk, dir, line);

  console.log('read   exec 2: cat ' + dir + '/stamp.txt');
  const read = await store.run(`cat ${dir}/stamp.txt`, disk.id);
  if (read.exitCode !== 0) fail(`read exec exited ${read.exitCode}: ${(read.stderr || read.stdout).trim()}`);

  const back = read.stdout.trim();
  console.log('       ' + back);
  if (!back.includes(line)) fail('read-back output does not contain what exec 1 wrote (wrote: ' + line + ')');
  if (!back.includes(runId)) fail('read-back line is stale: it does not carry this run\'s id ' + runId);

  console.log('PASS   the line written in exec 1 survived into a separate exec 2');
}

main().catch((err) => {
  const status = err && err.status;
  if (status === 401) {
    fail('HTTP 401 from Archil: this is probably a disk/mount token (adt_…) rather than an API key, or a key made in a different region. Use a key- key from https://console.archil.com/api-keys in an AWS region, and set ARCHIL_REGION to that region.');
  }
  if (err && err.code === 'ENOTFOUND') fail('cannot reach the Archil API: ' + err.message);
  fail((err && (err.stack || err.message)) || String(err));
});
