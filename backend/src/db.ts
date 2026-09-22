import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Farmer } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// This table only ever holds SYNCED farmers. "Pending" and "failed" are client-side (IndexedDB) states that never touch the server — the server doesn't need to know about a farmer until it has actually landed. - SIGNED 8:23AM 22/09/2026
db.exec(`
  CREATE TABLE IF NOT EXISTS farmers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    state TEXT NOT NULL,
    village TEXT NOT NULL,
    programme TEXT NOT NULL,
    synced_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
`);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO farmers (id, name, phone, state, village, programme, synced_at)
  VALUES (@id, @name, @phone, @state, @village, @programme, @syncedAt)
`);

const selectByIdStmt = db.prepare(`SELECT * FROM farmers WHERE id = ?`);
const selectByPhoneStmt = db.prepare(`SELECT * FROM farmers WHERE phone = ?`);
const selectAllStmt = db.prepare(
  `SELECT * FROM farmers ORDER BY synced_at DESC`,
);

export function upsertFarmer(farmer: Farmer): {
  inserted: boolean;
  row: unknown;
} {
  const existing = selectByIdStmt.get(farmer.id);
  if (existing) {
    return { inserted: false, row: existing };
  }
  insertStmt.run({ ...farmer, syncedAt: new Date().toISOString() });
  return { inserted: true, row: selectByIdStmt.get(farmer.id) };
}

export function findByPhone(phone: string) {
  return selectByPhoneStmt.get(phone);
}

export function getAllFarmers() {
  return selectAllStmt.all();
}
