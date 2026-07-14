import {DatabaseSync} from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Eski runtime JSON'larini (`src/data/scores/scores.json`,
 * `output/score-engine/corrections/events.json`) `var/muzik.db` SQLite'ina
 * tasir (F3.4). Idempotent: ayni id/documentId+seq zaten varsa atlar.
 *
 * Kullanim:
 *   node scripts/migrate-json-to-sqlite.mjs --dry-run   (yalniz rapor)
 *   node scripts/migrate-json-to-sqlite.mjs             (gercek yazim)
 */

const root = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const DB_PATH = process.env.MUZIK_DB_PATH ?? path.join(root, "var", "muzik.db");
const SCORES_JSON = path.join(root, "src", "data", "scores", "scores.json");
const CORRECTIONS_JSON = path.join(root, "output", "score-engine", "corrections", "events.json");

function readJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`[migrate] ${path.relative(root, file)} okunamadi: ${error.message}`);
    return [];
  }
}

function applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, composer TEXT, makam TEXT NOT NULL,
      usul TEXT NOT NULL, form TEXT, notes_data TEXT NOT NULL, user_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS correction_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL, document_id TEXT NOT NULL,
      type TEXT NOT NULL, target_id TEXT NOT NULL, payload TEXT NOT NULL,
      created_at TEXT NOT NULL, author_id TEXT, validator_state TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_correction_events_document ON correction_events (document_id);
  `);
}

function main() {
  const scores = readJsonArray(SCORES_JSON);
  const corrections = readJsonArray(CORRECTIONS_JSON);

  console.log(`[migrate] scores.json: ${scores.length} kayit`);
  console.log(`[migrate] corrections events.json: ${corrections.length} kayit`);

  if (DRY_RUN) {
    console.log("[migrate] --dry-run: yazim yapilmadi.");
    return;
  }

  if (scores.length === 0 && corrections.length === 0) {
    console.log("[migrate] Tasinacak veri yok; SQLite dokunulmadi.");
    return;
  }

  fs.mkdirSync(path.dirname(DB_PATH), {recursive: true});
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  applySchema(db);

  let migratedScores = 0;
  const insertScore = db.prepare(
    `INSERT OR IGNORE INTO scores
       (id, title, composer, makam, usul, form, notes_data, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const score of scores) {
    const result = insertScore.run(
      score.id,
      score.title,
      score.composer ?? null,
      score.makam,
      score.usul,
      score.form ?? null,
      JSON.stringify(score.notesData ?? []),
      null,
      score.createdAt,
      score.updatedAt,
    );
    migratedScores += Number(result.changes) > 0 ? 1 : 0;
  }

  let migratedCorrections = 0;
  const existingCount = db.prepare("SELECT COUNT(*) AS count FROM correction_events").get().count;
  if (existingCount === 0) {
    const insertCorrection = db.prepare(
      `INSERT INTO correction_events
         (id, document_id, type, target_id, payload, created_at, author_id, validator_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const event of corrections) {
      insertCorrection.run(
        event.id,
        event.documentId,
        event.type,
        event.targetId,
        JSON.stringify(event.payload ?? {}),
        event.createdAt,
        event.authorId ?? null,
        event.validatorState ?? "pending",
      );
      migratedCorrections += 1;
    }
  } else {
    console.log(`[migrate] correction_events zaten ${existingCount} kayit iceriyor; atlandi.`);
  }

  db.close();
  console.log(`[migrate] OK: ${migratedScores} yeni score, ${migratedCorrections} correction event tasindi.`);
}

main();
