import 'server-only';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import { createClient } from '@supabase/supabase-js';
import { initialState } from './catalog';
import { isDemo } from './config';
import { ShopError } from './model';
const require = createRequire(import.meta.url);
const categories = ['products', 'carts', 'orders', 'sessions', 'rate_limits', 'email_jobs'];
export function supabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new ShopError('Configure Supabase before running the live shop. For local practice, use DEMO_MODE=true with npm run dev.', 503);
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
}
function localFile() { return path.resolve(process.env.DEMO_DB_PATH || '.data/shop.sqlite'); }
function persist(db) {
  const file = localFile();
  writeFileSync(file + '.tmp', db.export(), { mode: 0o600 });
  renameSync(file + '.tmp', file);
}
async function localDatabase() {
  // Keep one database through development hot reloads. Local demo supports one server process.
  globalThis.naijaDatabase ||= (async () => {
    const file = localFile();
    mkdirSync(path.dirname(file), { recursive: true });
    const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
    const db = new SQL.Database(existsSync(file) ? readFileSync(file) : undefined);
    db.run('CREATE TABLE IF NOT EXISTS app_records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id))');
    for (const p of Object.values(initialState().products))
      db.run('INSERT OR IGNORE INTO app_records VALUES (?, ?, ?)', ['products', p.id, JSON.stringify(p)]);
    persist(db);
    return db;
  })();
  return globalThis.naijaDatabase;
}
function localRead(db) {
  const state = Object.fromEntries(categories.map(k => [k, {}]));
  const rows = db.exec('SELECT kind, id, data FROM app_records')[0]?.values || [];
  for (const [kind, id, data] of rows) state[kind][id] = JSON.parse(data);
  return state;
}
function logSupabaseError(error) {
  if (!error) return;
  console.error('Supabase error:', error.code, error.message);
}
async function snapshot() {
  let data, error;
  try {
    ({ data, error } = await supabase().rpc('shop_snapshot'));
  } catch (err) {
    if (err instanceof ShopError) throw err;
    logSupabaseError(err);
    throw new ShopError('Database is unavailable. Check the Supabase setup and schema.', 503);
  }
  if (error) {
    logSupabaseError(error);
    throw new ShopError('Database is unavailable. Check the Supabase setup and schema.', 503);
  }
  return data;
}
export async function readState() {
  return isDemo() ? localRead(await localDatabase()) : (await snapshot()).state;
}
export async function transact(change) {
  if (isDemo()) {
    const db = await localDatabase();
    const state = localRead(db);
    const result = change(state);
    if (result instanceof Promise) throw new Error('Database mutations must be synchronous.');
    db.run('BEGIN IMMEDIATE');
    try {
      db.run('DELETE FROM app_records');
      for (const kind of categories) for (const [id, data] of Object.entries(state[kind]))
        db.run('INSERT INTO app_records VALUES (?, ?, ?)', [kind, id, JSON.stringify(data)]);
      db.run('COMMIT');
      persist(db);
    } catch (error) {
      try { db.run('ROLLBACK'); } catch { /* COMMIT may already have completed. */ }
      throw error;
    }
    return result;
  }
  // Compare-and-swap commits inventory, order, cart and outbox together. On conflict, recompute.
  for (let attempt = 0; attempt < 8; attempt++) {
    const { state, version } = await snapshot();
    const result = change(state);
    if (result instanceof Promise) throw new Error('Database mutations must be synchronous.');
    let data, error;
    try {
      ({ data, error } = await supabase().rpc('shop_commit', { expected_version: version, new_state: state }));
    } catch (err) {
      if (err instanceof ShopError) throw err;
      logSupabaseError(err);
      throw new ShopError('Could not save your changes. Please try again.', 503);
    }
    if (error) {
      logSupabaseError(error);
      throw new ShopError('Could not save your changes. Please try again.', 503);
    }
    if (data) return result;
  }
  throw new ShopError('The shop is busy. Please try again.', 409);
}
