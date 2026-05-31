import {beforeEach, describe, expect, it, vi} from "vitest";
import type {NextRequest} from "next/server";
import {mkdir, stat, writeFile} from "node:fs/promises";
import {GET, POST} from "../route";

vi.mock("node:fs/promises", () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };

  return {
    ...promises,
    default: promises,
  };
});

vi.mock("@/engines/ses/sample-library", () => {
  const sampleSlot = {
    key: "ney:C4",
    category: "melodic",
    instrumentId: "ney",
    instrumentName: "Ney",
    groupLabel: "Ney",
    label: "C4",
    fileName: "C4.wav",
    relativePath: "ney/C4.wav",
    url: "/samples/ney/C4.wav",
    midiNumber: 60,
    noteName: "C4",
  };

  return {
    SAMPLE_SLOTS: [sampleSlot],
    SAMPLE_SLOT_BY_KEY: new Map([[sampleSlot.key, sampleSlot]]),
  };
});

function makeUploadRequest(fileName: string, type: string, slotKey = "ney:C4") {
  const file = new File(["audio"], fileName, {type});
  const formData = {
    get: vi.fn((key: string) => {
      if (key === "slotKey") return slotKey;
      if (key === "file") return file;
      return null;
    }),
  };

  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as NextRequest;
}

describe("/api/samples route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stat).mockResolvedValue({
      isFile: () => true,
      size: 2048,
      mtime: new Date("2026-05-10T00:00:00.000Z"),
    } as never);
  });

  it("returns sample slot status", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.installed).toBe(1);
    expect(body.slots[0]).toEqual(
      expect.objectContaining({
        key: "ney:C4",
        installed: true,
        size: 2048,
      }),
    );
  });

  it("rejects sample uploads that do not match the central upload policy", async () => {
    const request = makeUploadRequest("sample.m4a", "audio/mp4");

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain(".wav");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("accepts allowed sample uploads and writes them to the slot path", async () => {
    const request = makeUploadRequest("sample.wav", "audio/wav");

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slot).toEqual(expect.objectContaining({key: "ney:C4", installed: true}));
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("ney"), {recursive: true});
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("C4.wav"), expect.any(Buffer));
  });
});
