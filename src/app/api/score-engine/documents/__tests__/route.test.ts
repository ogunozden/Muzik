import {afterEach, describe, expect, it, vi} from "vitest";
import {GET} from "../route";

const SYMBTR_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tLNS\tPay\tPayda\tMs\tLNS2\tBas\tSoz1\tOffset\tSoz2",
  "1\t51\t\t\t\t\t0\t0\t0\t\t\t\t0\t",
  "2\t9\t\tF5#4\t341\t\t1\t4\t0\t\t\t1. hane\t0.25\t",
  "3\t9\t\tA5\t358\t\t1\t4\t0\t\t\t1. hane\t0.5\t",
].join("\n");

describe("/api/score-engine/documents route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists reachable canonical score documents without accepting media sources", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(SYMBTR_FIXTURE, {status: 200})),
    );

    const response = await GET();
    const payload = (await response.json()) as {
      documents: Array<{id: string; eventCount: number; quality: {status: string}; validation: {ok: boolean}}>;
    };

    expect(response.status).toBe(200);
    expect(payload.documents).toHaveLength(6);
    expect(payload.documents[0]).toMatchObject({
      id: "score:hicazkar-pesrev-osman-bey",
      eventCount: 2,
      validation: {ok: true},
      quality: {status: expect.any(String)},
    });
  });
});
