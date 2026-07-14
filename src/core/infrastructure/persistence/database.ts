import "server-only";
import {DatabaseSync} from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Runtime mutable durum icin tek SQLite baglantisi (ADR 0001 Karar 3).
 *
 * Kaynak agaci (`src/`) read-only kabul edilir; mutable veri `var/` altinda
 * tutulur. `node:sqlite` Node 26 yerlesiktir (yeni bagimlilik yok) ve
 * senkrondur; her yazim atomik oldugu icin JSON read-modify-write yarisindaki
 * event kaybi ortadan kalkar (F3).
 */

const DEFAULT_DB_PATH = path.join(process.cwd(), "var", "muzik.db");

function resolveDbPath(): string {
  return process.env.MUZIK_DB_PATH ?? DEFAULT_DB_PATH;
}

let cachedDb: DatabaseSync | null = null;
let cachedPath: string | null = null;

function applySchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      composer TEXT,
      makam TEXT NOT NULL,
      usul TEXT NOT NULL,
      form TEXT,
      notes_data TEXT NOT NULL,
      user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS correction_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      author_id TEXT,
      validator_state TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_correction_events_document
      ON correction_events (document_id);
  `);
}

/**
 * Paylasilan SQLite baglantisini doner (yoksa acar, semayi kurar). `var/`
 * dizini gerekiyorsa olusturulur. `MUZIK_DB_PATH` ile ozellikle test/isolate
 * ortaminda yol degistirilebilir.
 */
export function getDatabase(): DatabaseSync {
  const dbPath = resolveDbPath();
  if (cachedDb && cachedPath === dbPath) return cachedDb;

  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
  }

  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), {recursive: true});
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  applySchema(db);

  cachedDb = db;
  cachedPath = dbPath;
  return db;
}

/**
 * Test izolasyonu icin baglantiyi kapatir ve cache'i sifirlar. Uretim
 * kodunda cagrilmaz.
 */
export function resetDatabaseForTests(): void {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
    cachedPath = null;
  }
}
