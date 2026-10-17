/**
 * ============================================================================
 *  Content store — a small JSON "database" on disk
 * ----------------------------------------------------------------------------
 *  Files (all inside DATA_DIR, default ./storage):
 *    content.json        Sections edited in the admin (settings, products, …)
 *    submissions.json    Newsletter sign-ups, contact messages, order requests
 *    uploads/            Images uploaded in the admin (served at /media/…)
 *    backups/            Automatic snapshots of content.json before each save
 *
 *  How reads work:
 *    getSection('products') → the admin-saved copy if one exists,
 *                             otherwise the default from /data (the seed).
 *
 *  Why a JSON file? The site has one owner editing at a time and a small
 *  catalogue, so a file is fast, zero-config and easy to back up. To move to
 *  a database or headless CMS later, re-implement the functions exported from
 *  this file (and server/data.js) — nothing else needs to change.
 * ============================================================================
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { seed } from '../data/index.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'storage');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

/** Section keys the store knows about (anything else is rejected). */
export const SECTION_KEYS = Object.keys(seed);

/** In-memory copy of content.json so every page render doesn't hit the disk. */
let contentCache = null;

/** Make sure the storage folders exist (called once at server start). */
export async function initStore() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

/** Read a JSON file, returning `fallback` if it doesn't exist or is corrupt. */
async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`[store] Could not read ${file}:`, err.message);
    return fallback;
  }
}

/**
 * Write JSON atomically: write to a temp file, then rename over the original.
 * A crash mid-write can therefore never leave a half-written (corrupt) file.
 */
async function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

async function loadContent() {
  if (!contentCache) contentCache = await readJson(CONTENT_FILE, {});
  return contentCache;
}

/** Deep clone so callers can never mutate the cache or the seed by accident. */
const clone = (value) => structuredClone(value);

/**
 * Get one content section (admin-saved copy, or the /data default).
 * @param {string} key  One of SECTION_KEYS.
 */
export async function getSection(key) {
  const content = await loadContent();
  if (Object.hasOwn(content, key)) return clone(content[key]);
  return clone(seed[key]);
}

/** Has the client saved this section in the admin (vs. still using defaults)? */
export async function isCustomised(key) {
  const content = await loadContent();
  return Object.hasOwn(content, key);
}

/** Get the untouched default for a section (used by "Reset to defaults"). */
export function getDefault(key) {
  return clone(seed[key]);
}

/** Copy content.json into backups/ and keep only the newest MAX_BACKUPS. */
async function backupContent() {
  try {
    await fs.access(CONTENT_FILE);
  } catch {
    return; // nothing saved yet → nothing to back up
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.copyFile(CONTENT_FILE, path.join(BACKUP_DIR, `content-${stamp}.json`));
  const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.startsWith('content-')).sort();
  await Promise.all(files.slice(0, Math.max(0, files.length - MAX_BACKUPS)).map((f) => fs.rm(path.join(BACKUP_DIR, f))));
}

/**
 * Writes are queued so two quick saves from the admin can't interleave and
 * overwrite each other.
 */
let writeQueue = Promise.resolve();
function enqueue(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

/** Save a section (replaces it entirely). */
export function setSection(key, value) {
  if (!SECTION_KEYS.includes(key)) throw new Error(`Unknown section "${key}"`);
  return enqueue(async () => {
    const content = await loadContent();
    await backupContent();
    const next = { ...content, [key]: clone(value) };
    await writeJsonAtomic(CONTENT_FILE, next);
    contentCache = next;
  });
}

/** Remove the saved copy so the section falls back to its /data default. */
export function resetSection(key) {
  return enqueue(async () => {
    const content = await loadContent();
    if (!Object.hasOwn(content, key)) return;
    await backupContent();
    const next = { ...content };
    delete next[key];
    await writeJsonAtomic(CONTENT_FILE, next);
    contentCache = next;
  });
}

/** Everything (for the admin's "Export backup" button). */
export async function exportAll() {
  const out = {};
  for (const key of SECTION_KEYS) out[key] = await getSection(key);
  return out;
}

/** Replace all saved content from an exported backup. Unknown keys are ignored. */
export function importAll(data) {
  return enqueue(async () => {
    await backupContent();
    const next = {};
    for (const key of SECTION_KEYS) if (Object.hasOwn(data, key)) next[key] = data[key];
    await writeJsonAtomic(CONTENT_FILE, next);
    contentCache = next;
  });
}

/* ---------------------------------------------------------------------------
 *  Submissions (newsletter / contact / orders)
 * ------------------------------------------------------------------------ */

/** @typedef {'newsletter'|'contact'|'orders'} SubmissionKind */
const EMPTY_SUBMISSIONS = { newsletter: [], contact: [], orders: [] };

export async function getSubmissions() {
  return { ...EMPTY_SUBMISSIONS, ...(await readJson(SUBMISSIONS_FILE, {})) };
}

/**
 * Append a submission. Each gets an id + timestamp.
 * @param {SubmissionKind} kind
 * @param {object} entry
 */
export function addSubmission(kind, entry) {
  return enqueue(async () => {
    const all = await getSubmissions();
    const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry };
    all[kind] = [record, ...(all[kind] || [])].slice(0, 5000); // cap growth
    await writeJsonAtomic(SUBMISSIONS_FILE, all);
    return record;
  });
}

/** Update fields on a submission (e.g. mark an order as "confirmed"). */
export function updateSubmission(kind, id, patch) {
  return enqueue(async () => {
    const all = await getSubmissions();
    all[kind] = (all[kind] || []).map((s) => (s.id === id ? { ...s, ...patch } : s));
    await writeJsonAtomic(SUBMISSIONS_FILE, all);
  });
}

export function deleteSubmission(kind, id) {
  return enqueue(async () => {
    const all = await getSubmissions();
    all[kind] = (all[kind] || []).filter((s) => s.id !== id);
    await writeJsonAtomic(SUBMISSIONS_FILE, all);
  });
}
