import "server-only";
import {randomUUID} from "node:crypto";
import {getDatabase} from "../persistence/database";
import type {ScoreCreatePayload, ScoreUpdatePayload} from "@/core/application/score-payload";
import type {NotaEvent} from "@/core/domain/models";

/**
 * Eser (score) kalici kayit deposu (ADR 0001: core/infrastructure).
 *
 * Onceki `src/data/scores/scores.json` runtime yazimi kaynak agacini
 * kirletiyordu ve read-only FS'te patliyordu; kayitlar artik `var/` SQLite'ta.
 */

export interface ScoreRecord {
  id: string;
  title: string;
  composer: string | null;
  makam: string;
  usul: string;
  form: string | null;
  notesData: NotaEvent[];
  userId: null;
  createdAt: string;
  updatedAt: string;
}

interface ScoreRow {
  id: string;
  title: string;
  composer: string | null;
  makam: string;
  usul: string;
  form: string | null;
  notes_data: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: ScoreRow): ScoreRecord {
  return {
    id: row.id,
    title: row.title,
    composer: row.composer,
    makam: row.makam,
    usul: row.usul,
    form: row.form,
    notesData: JSON.parse(row.notes_data) as NotaEvent[],
    userId: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listScores(): ScoreRecord[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM scores ORDER BY created_at ASC")
    .all() as unknown as ScoreRow[];
  return rows.map(rowToRecord);
}

export function getScoreById(id: string): ScoreRecord | null {
  const row = getDatabase()
    .prepare("SELECT * FROM scores WHERE id = ?")
    .get(id) as unknown as ScoreRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createScore(payload: ScoreCreatePayload): ScoreRecord {
  const now = new Date().toISOString();
  const record: ScoreRecord = {
    id: randomUUID(),
    ...payload,
    userId: null,
    createdAt: now,
    updatedAt: now,
  };

  getDatabase()
    .prepare(
      `INSERT INTO scores (id, title, composer, makam, usul, form, notes_data, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.id,
      record.title,
      record.composer,
      record.makam,
      record.usul,
      record.form,
      JSON.stringify(record.notesData),
      record.userId,
      record.createdAt,
      record.updatedAt,
    );

  return record;
}

export function updateScore(id: string, patch: ScoreUpdatePayload): ScoreRecord | null {
  const existing = getScoreById(id);
  if (!existing) return null;

  const updated: ScoreRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  getDatabase()
    .prepare(
      `UPDATE scores
       SET title = ?, composer = ?, makam = ?, usul = ?, form = ?, notes_data = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      updated.title,
      updated.composer,
      updated.makam,
      updated.usul,
      updated.form,
      JSON.stringify(updated.notesData),
      updated.updatedAt,
      id,
    );

  return updated;
}

export function deleteScore(id: string): ScoreRecord | null {
  const existing = getScoreById(id);
  if (!existing) return null;

  getDatabase().prepare("DELETE FROM scores WHERE id = ?").run(id);
  return existing;
}
