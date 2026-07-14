import {afterAll, beforeEach, describe, expect, it} from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type {NextRequest} from "next/server";
import {resetDatabaseForTests} from "@/core/infrastructure/persistence/database";
import {createScore} from "@/core/infrastructure/scores/score-repository";

const DB_PATH = path.join(os.tmpdir(), `muzik-scores-id-test-${process.pid}.db`);
process.env.MUZIK_DB_PATH = DB_PATH;

import {DELETE, GET, PUT} from "../route";

const context = (id: string) => ({
  params: Promise.resolve({id}),
});

let seededId = "";

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

describe("/api/scores/[id] route", () => {
  beforeEach(() => {
    cleanDatabase();
    const created = createScore({
      title: "Nihavend Peşrev",
      composer: null,
      makam: "nihavend",
      usul: "duyek",
      form: null,
      notesData: [{pitch: "C4", duration: 0.5, velocity: 100, startTime: 0}],
    });
    seededId = created.id;
  });

  afterAll(cleanDatabase);

  it("returns a single score by id", async () => {
    const response = await GET(
      new Request(`http://localhost/api/scores/${seededId}`) as NextRequest,
      context(seededId),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.score).toMatchObject({title: "Nihavend Peşrev"});
  });

  it("returns 404 for non-existent id", async () => {
    const response = await GET(
      new Request("http://localhost/api/scores/non-existent") as NextRequest,
      context("non-existent"),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({error: "Eser bulunamadı"});
  });

  it("updates a score and returns updated", async () => {
    const request = new Request(`http://localhost/api/scores/${seededId}`, {
      method: "PUT",
      body: JSON.stringify({title: "Güncel eser"}),
    }) as NextRequest;

    const response = await PUT(request, context(seededId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.score.title).toBe("Güncel eser");
  });

  it("rejects updates with no allowed fields", async () => {
    const request = new Request(`http://localhost/api/scores/${seededId}`, {
      method: "PUT",
      body: JSON.stringify({userId: 42}),
    }) as NextRequest;

    const response = await PUT(request, context(seededId));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Güncellenecek alan bulunamadı");
  });

  it("rejects updates with invalid notesData", async () => {
    const request = new Request(`http://localhost/api/scores/${seededId}`, {
      method: "PUT",
      body: JSON.stringify({notesData: [{pitch: "C4", startTime: 0}]}),
    }) as NextRequest;

    const response = await PUT(request, context(seededId));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("notesData");
  });

  it("deletes a score and returns message plus deleted score", async () => {
    const response = await DELETE(
      new Request(`http://localhost/api/scores/${seededId}`) as NextRequest,
      context(seededId),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Eser silindi");
    expect(body.score.id).toBe(seededId);
  });

  it("returns 404 when deleting non-existent score", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/scores/non-existent") as NextRequest,
      context("non-existent"),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({error: "Eser bulunamadı"});
  });
});
