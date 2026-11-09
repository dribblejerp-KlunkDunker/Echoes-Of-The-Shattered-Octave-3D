#!/usr/bin/env node
'use strict';
// Archil disk storage: files that outlive a single run (a save export, a screenshot batch, a build artifact).
// The game is static, so there is no server to hold a disk open; this module is the one place that talks to
// Archil, configured from the environment:
//
//   ARCHIL_API_KEY   the account's API key (starts "key-"; a mount/disk token will get HTTP 401)
//   ARCHIL_REGION    the key's region (default aws-us-east-1; a key made in another region will get 401)
//   ARCHIL_DISK_ID   the disk to use, e.g. dsk-abc123 (tools/archil/check.mjs prints one when it creates it)
//
// Keep the key on this side of the wire: never a NEXT_PUBLIC_/VITE_ name, never in a browser script.
// Usage:
//   const store = require('./tools/archil/store');
//   await store.writeFile('saves/slot1.json', json);       // object-style write
//   const text = await store.readFile('saves/slot1.json'); // object-style read
//   const { stdout, exitCode } = await store.run('ls -la'); // a command in a container with the disk mounted
const fs = require('fs');
const path = require('path');
const archil = require('disk');

const DEFAULT_REGION = 'aws-us-east-1';

// Local env file for this tool. It is gitignored; the repository .env.example is the tracked template.
const ENV_FILE = path.join(__dirname, '.env');

// Read tools/archil/.env for any name that is not already exported (a real export always wins).
// ~10 lines instead of another dependency, and the check works the same from npm, node or CI.
function loadEnvFile(file = ENV_FILE) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  for (const line of text.split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadEnvFile();

function apiKey() {
  const key = process.env.ARCHIL_API_KEY;
  if (!key) throw new Error('ARCHIL_API_KEY is not set: put it in tools/archil/.env (see the repository .env.example) or export it. Keys start with "key-" and come from https://console.archil.com/api-keys');
  return key;
}

function region() {
  return process.env.ARCHIL_REGION || DEFAULT_REGION;
}

function diskId() {
  const id = process.env.ARCHIL_DISK_ID;
  if (!id) throw new Error('ARCHIL_DISK_ID is not set: create a disk with `node check.mjs` (it writes the id to tools/archil/.env) or set it to a dsk- id');
  return id;
}

// One client per process: the SDK pools its control-plane transport anyway.
let client = null;
function sdk() {
  if (!client) client = new archil.Archil({ apiKey: apiKey(), region: region() });
  return client;
}

// The disk named by ARCHIL_DISK_ID (or an explicit dsk- id).
async function getDisk(id = diskId()) {
  return sdk().disks.get(id);
}

// A new disk. The result's one-time mount token is deliberately dropped: exec does not need it, and a
// token printed into a log is a credential printed into a log.
async function createDisk(name) {
  const { disk } = await sdk().disks.create({ name });
  return disk;
}

// Run a command in a fresh container with the disk mounted at /mnt/data (its working directory).
// Files persist; container state does not. Returns { stdout, stderr, exitCode } as the SDK reports them.
async function run(command, id) {
  const disk = await getDisk(id);
  const res = await disk.exec(command);
  return { stdout: res.stdout || '', stderr: res.stderr || '', exitCode: res.exitCode === undefined ? 0 : res.exitCode };
}

// Object-style writes and reads: no container, straight through the disk's S3-compatible gateway.
async function writeFile(key, body, id) {
  const disk = await getDisk(id);
  await disk.putObject(key, body);
  return key;
}

async function readFile(key, id) {
  const disk = await getDisk(id);
  return Buffer.from(await disk.getObject(key)).toString('utf8');
}

module.exports = { DEFAULT_REGION, ENV_FILE, loadEnvFile, apiKey, region, diskId, getDisk, createDisk, run, writeFile, readFile };
