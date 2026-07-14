import type {NextRequest} from "next/server";
import {describe, expect, it} from "vitest";
import {POST} from "../route";

const SYMBTR_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tLNS\tPay\tPayda\tMs\tLNS2\tBas\tSoz1\tOffset\tSoz2",
  "1\t51\t\t\t\t\t0\t0\t0\t\t\t\t0\t",
  "2\t9\t\tF5#4\t341\t\t1\t4\t0\t\t\t1. hane\t0.25\t",
].join("\n");

function createJsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/score-engine/import/symbtr", {
    method: "POST",
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("/api/score-engine/import/symbtr route", () => {
  it("imports user-provided SymbTr raw text into canonical v2", async () => {
    const response = await POST(createJsonRequest({raw: SYMBTR_FIXTURE, scoreId: "score:user-fixture"}));
    const payload = (await response.json()) as {document: {id: string; schemaVersion: string; events: unknown[]}};

    expect(response.status).toBe(200);
    expect(payload.document).toMatchObject({
      id: "score:user-fixture",
      schemaVersion: "score-engine-v2",
    });
    expect(payload.document.events).toHaveLength(1);
  });

  it("rejects empty raw text", async () => {
    const response = await POST(createJsonRequest({raw: ""}));
    const payload = (await response.json()) as {error: string};

    expect(response.status).toBe(400);
    expect(payload.error).toContain("SymbTr");
  });
});
