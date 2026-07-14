import {afterAll, beforeEach, describe, expect, it} from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import {resetDatabaseForTests} from "../../persistence/database";

const DB_PATH = path.join(os.tmpdir(), `muzik-corrections-test-${process.pid}.db`);
process.env.MUZIK_DB_PATH = DB_PATH;

import {appendCorrectionEvent, listCorrectionEvents} from "../correction-repository";
import {createScoreCorrectionEvent} from "@/data/score-engine/corrections";

function cleanDatabase(): void {
  resetDatabaseForTests();
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(DB_PATH + suffix);
    } catch {
      // dosya yoksa sorun degil
    }
  }
}

describe("correction-repository", () => {
  beforeEach(cleanDatabase);
  afterAll(cleanDatabase);

  it("appends and lists an event in insertion order", () => {
    const event = createScoreCorrectionEvent({
      documentId: "doc-1",
      type: "pitch_changed",
      targetId: "doc-1:m1:n1",
      payload: {toPitch: "A4"},
      authorId: null,
    });

    const result = appendCorrectionEvent(event);
    expect(result).toEqual({stored: true, eventCount: 1});

    const events = listCorrectionEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      documentId: "doc-1",
      type: "pitch_changed",
      targetId: "doc-1:m1:n1",
      payload: {toPitch: "A4"},
    });
  });

  it("does not lose events under concurrent appends (no read-modify-write race)", async () => {
    const APPENDS = 200;

    // Ayni documentId'ye ayni anda 200 append. Eski JSON read-modify-write
    // akisinda es zamanli istekler birbirinin yazimini eziyordu; atomik INSERT
    // ile her event korunur.
    await Promise.all(
      Array.from({length: APPENDS}, (_unused, index) =>
        Promise.resolve().then(() =>
          appendCorrectionEvent(
            createScoreCorrectionEvent({
              documentId: "doc-concurrent",
              type: "pitch_changed",
              targetId: `doc-concurrent:m1:n${index}`,
              payload: {index},
              authorId: null,
            }),
          ),
        ),
      ),
    );

    const events = listCorrectionEvents();
    expect(events).toHaveLength(APPENDS);

    const storedIndexes = new Set(events.map((event) => event.payload.index as number));
    expect(storedIndexes.size).toBe(APPENDS);
  });

  it("preserves duplicate deterministic ids as separate append records", () => {
    const shared = {
      documentId: "doc-dup",
      type: "verified" as const,
      targetId: "doc-dup:m1",
      payload: {},
      authorId: null,
      createdAt: "2026-07-14T00:00:00.000Z",
    };

    appendCorrectionEvent(createScoreCorrectionEvent(shared));
    appendCorrectionEvent(createScoreCorrectionEvent(shared));

    expect(listCorrectionEvents()).toHaveLength(2);
  });
});
