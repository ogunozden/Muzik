import {execFileSync} from "node:child_process";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";

const scriptPath = path.resolve("scripts/import-symbtr-layout-verification.mjs");
const catalogId = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";

function writeJson(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-layout-verification-import-"));
  writeJson(root, "src/data/symbtr/layout.generated.json", {
    schemaVersion: 1,
    generatedAt: "2026-05-10",
    entries: {
      [catalogId]: {
        catalogId,
        source: {archiveMemberPath: `pdf_v3/${catalogId}.PDF`},
        measureCandidates: [
          {
            rowIndex: 0,
            candidateIndexInRow: 0,
          },
        ],
      },
    },
  });
  writeJson(root, "src/data/symbtr/layout-verification.generated.json", {
    schemaVersion: 1,
    generatedAt: "2026-05-10",
    policy: "Only human-reviewed or visual-regression-approved PDF measure boxes may be promoted.",
    entries: {},
  });
  mkdirSync(path.join(root, "scripts"), {recursive: true});
  writeFileSync(path.join(root, "scripts/validate-symbtr-layout-verification.mjs"), "process.exit(0);\n");
  return root;
}

function validEntry() {
  return {
    catalogId,
    sourceLayoutGeneratedAt: "2026-05-10",
    sourceArchiveMemberPath: `pdf_v3/${catalogId}.PDF`,
    sourceMeasureCandidateCount: 1,
    verifiedAt: "2026-06-01",
    reviewer: "visual-regression-batch",
    method: "visual-regression",
    measureBoxes: [
      {
        measureIndex: 1,
        sourceCandidateRowIndex: 0,
        sourceCandidateIndexInRow: 0,
        leftPercent: 2,
        topPercent: 10,
        widthPercent: 20,
        heightPercent: 3,
        confidence: "verified",
      },
    ],
  };
}

function runScript(root, inputPath, write = false) {
  return execFileSync(
    process.execPath,
    [scriptPath, "--input", inputPath, write ? "--write" : "--dry-run"],
    {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]},
  );
}

describe("import-symbtr-layout-verification", () => {
  it("imports verified measure boxes only after generated candidate validation", () => {
    const root = createRoot();
    writeJson(root, "input/verification.json", {
      generatedAt: "2026-06-01",
      entries: {[catalogId]: validEntry()},
    });

    const output = JSON.parse(runScript(root, "input/verification.json", true));
    const manifest = JSON.parse(readFileSync(
      path.join(root, "src/data/symbtr/layout-verification.generated.json"),
      "utf8",
    ));

    expect(output).toEqual(expect.objectContaining({
      dryRun: false,
      inputEntryCount: 1,
      outputEntryCount: 1,
      verifiedMeasureBoxCount: 1,
    }));
    expect(manifest.entries[catalogId].measureBoxes).toHaveLength(1);
  });

  it("rejects verified boxes that do not map to generated PDF candidates", () => {
    const root = createRoot();
    const entry = validEntry();
    entry.measureBoxes[0].sourceCandidateIndexInRow = 9;
    writeJson(root, "input/verification.json", {
      generatedAt: "2026-06-01",
      entries: {[catalogId]: entry},
    });

    expect(() => runScript(root, "input/verification.json", true)).toThrow(
      "references missing generated candidate 0:9",
    );
  });

  it("rejects unverified or empty promotion attempts", () => {
    const root = createRoot();
    const entry = validEntry();
    entry.measureBoxes[0].confidence = "pdf-vector-candidate";
    writeJson(root, "input/verification.json", {
      generatedAt: "2026-06-01",
      entries: {[catalogId]: entry},
    });

    expect(() => runScript(root, "input/verification.json", true)).toThrow(
      "confidence must be verified",
    );
  });
});
