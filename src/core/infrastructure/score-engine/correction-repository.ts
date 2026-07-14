import "server-only";
import {getDatabase} from "../persistence/database";
import type {ScoreCorrectionEvent} from "@/data/score-engine/canonical-score";

/**
 * ScoreEngine correction event kalici deposu (ADR 0001: core/infrastructure).
 *
 * Onceki `output/score-engine/corrections/events.json` read-modify-write
 * akisi es zamanli istekte event kaybedebiliyordu; her append artik tek atomik
 * INSERT (F3.5). Duplike deterministik id'ye izin verilir (eski append
 * semantigi), `seq` AUTOINCREMENT her kaydin korunmasini garanti eder.
 */

interface CorrectionRow {
  id: string;
  document_id: string;
  type: string;
  target_id: string;
  payload: string;
  created_at: string;
  author_id: string | null;
  validator_state: string;
}

function rowToEvent(row: CorrectionRow): ScoreCorrectionEvent {
  return {
    id: row.id,
    documentId: row.document_id,
    type: row.type as ScoreCorrectionEvent["type"],
    targetId: row.target_id,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    createdAt: row.created_at,
    authorId: row.author_id,
    validatorState: row.validator_state as ScoreCorrectionEvent["validatorState"],
  };
}

/** Bir correction event'i atomik olarak ekler ve toplam kayit sayisini doner. */
export function appendCorrectionEvent(event: ScoreCorrectionEvent): {stored: true; eventCount: number} {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO correction_events
       (id, document_id, type, target_id, payload, created_at, author_id, validator_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    event.id,
    event.documentId,
    event.type,
    event.targetId,
    JSON.stringify(event.payload),
    event.createdAt,
    event.authorId,
    event.validatorState,
  );

  const countRow = db.prepare("SELECT COUNT(*) AS count FROM correction_events").get() as unknown as {
    count: number;
  };
  return {stored: true, eventCount: countRow.count};
}

/** Tum correction event'leri ekleme sirasina gore doner. */
export function listCorrectionEvents(): ScoreCorrectionEvent[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM correction_events ORDER BY seq ASC")
    .all() as unknown as CorrectionRow[];
  return rows.map(rowToEvent);
}
