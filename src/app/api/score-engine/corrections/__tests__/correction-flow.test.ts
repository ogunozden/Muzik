import {afterAll, beforeEach, describe, expect, it} from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type {NextRequest} from "next/server";
import {resetDatabaseForTests} from "@/core/infrastructure/persistence/database";

const DB_PATH = path.join(os.tmpdir(), `muzik-correction-flow-test-${process.pid}.db`);
process.env.MUZIK_DB_PATH = DB_PATH;

import {POST} from "../route";
import {listCorrectionEvents} from "@/core/infrastructure/score-engine/correction-repository";
import {SCORE_ENGINE_DEMO_DOCUMENT} from "@/data/score-engine/demo-score";
import {applyScoreCorrectionEvents} from "@/data/score-engine/corrections";

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

/**
 * F6.2 akis 3: correction event POST -> SQLite'a kayit -> reducer ile derived
 * dokuman. Canli server/Playwright gerektirmeyen uctan uca entegrasyon.
 */
describe("correction flow (POST -> store -> derived document)", () => {
  beforeEach(cleanDatabase);
  afterAll(cleanDatabase);

  it("persists a pitch_changed event and applies it to the derived document", async () => {
    const targetEvent = SCORE_ENGINE_DEMO_DOCUMENT.events[0];
    expect(targetEvent).toBeDefined();

    const request = new Request("http://localhost/api/score-engine/corrections", {
      method: "POST",
      body: JSON.stringify({
        documentId: SCORE_ENGINE_DEMO_DOCUMENT.id,
        type: "pitch_changed",
        targetId: targetEvent.id,
        payload: {sourcePitch: "La5"},
      }),
    }) as unknown as NextRequest;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.stored).toBe(true);
    expect(body.eventCount).toBe(1);

    const storedEvents = listCorrectionEvents();
    expect(storedEvents).toHaveLength(1);
    expect(storedEvents[0]).toMatchObject({
      documentId: SCORE_ENGINE_DEMO_DOCUMENT.id,
      type: "pitch_changed",
      targetId: targetEvent.id,
    });

    const {document: derived, appliedEventIds} = applyScoreCorrectionEvents(
      SCORE_ENGINE_DEMO_DOCUMENT,
      storedEvents,
    );

    expect(appliedEventIds).toContain(storedEvents[0].id);
    const derivedTarget = derived.events.find((event) => event.id === targetEvent.id);
    expect(derivedTarget?.pitch.source).toBe("La5");
    // Kaynak dokuman degismemeli (immutability)
    expect(SCORE_ENGINE_DEMO_DOCUMENT.events[0].pitch.source).not.toBe("La5");
  });

  it("rejects an invalid correction type at the route boundary", async () => {
    const request = new Request("http://localhost/api/score-engine/corrections", {
      method: "POST",
      body: JSON.stringify({
        documentId: SCORE_ENGINE_DEMO_DOCUMENT.id,
        type: "not_a_real_type",
        targetId: "x",
      }),
    }) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(listCorrectionEvents()).toHaveLength(0);
  });
});
