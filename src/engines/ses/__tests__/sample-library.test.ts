import {existsSync, readFileSync, readdirSync, statSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {SAMPLE_SLOTS} from "../sample-library";

const samplesRoot = path.join(process.cwd(), "public", "samples");

const knownMissingNeySlots = new Set([
  "ney/A3.wav",
  "ney/A4.wav",
  "ney/A5.wav",
  "ney/As3.wav",
  "ney/As5.wav",
  "ney/B4.wav",
  "ney/B5.wav",
  "ney/C3.wav",
  "ney/C4.wav",
  "ney/Cs3.wav",
  "ney/Cs5.wav",
  "ney/D5.wav",
  "ney/Ds3.wav",
  "ney/Ds5.wav",
  "ney/E3.wav",
  "ney/E5.wav",
  "ney/F3.wav",
  "ney/F4.wav",
  "ney/F5.wav",
  "ney/Fs3.wav",
  "ney/G3.wav",
  "ney/G4.wav",
  "ney/G5.wav",
  "ney/Gs3.wav",
  "ney/Gs4.wav",
  "ney/Gs5.wav",
]);

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return fullPath;
  });
}

function toSampleRelativePath(fullPath: string): string {
  return path.relative(samplesRoot, fullPath).replace(/\\/g, "/");
}

describe("sample asset inventory", () => {
  const sampleFiles = walkFiles(samplesRoot);
  const actualWav = sampleFiles
    .map(toSampleRelativePath)
    .filter((relativePath) => relativePath.toLowerCase().endsWith(".wav"))
    .sort();
  const expectedWav = SAMPLE_SLOTS.map((slot) => slot.relativePath).sort();

  it("does not ship unexpected wav files or obsolete placeholder files", () => {
    const expectedSet = new Set(expectedWav);
    const extras = actualWav.filter((relativePath) => !expectedSet.has(relativePath));
    const nonWav = sampleFiles
      .map(toSampleRelativePath)
      .filter((relativePath) => !relativePath.toLowerCase().endsWith(".wav"))
      .sort();

    expect(extras).toEqual([]);
    expect(nonWav).toEqual(["README.md"]);
  });

  it("keeps installed wav files non-empty and decodable as RIFF/WAVE assets", () => {
    for (const relativePath of actualWav) {
      const fullPath = path.join(samplesRoot, ...relativePath.split("/"));
      const fileStat = statSync(fullPath);
      const header = readFileSync(fullPath).subarray(0, 12);

      expect(fileStat.size, relativePath).toBeGreaterThan(44);
      expect(header.subarray(0, 4).toString("ascii"), relativePath).toBe("RIFF");
      expect(header.subarray(8, 12).toString("ascii"), relativePath).toBe("WAVE");
    }
  });

  it("limits missing sample slots to the known Ney source gap", () => {
    const actualSet = new Set(actualWav);
    const missing = expectedWav.filter((relativePath) => !actualSet.has(relativePath));

    expect(missing.every((relativePath) => knownMissingNeySlots.has(relativePath))).toBe(true);
    expect(missing.length).toBeLessThanOrEqual(knownMissingNeySlots.size);
  });
});
