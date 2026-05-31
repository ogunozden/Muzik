import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {runImport} from "../import-external-reference-candidates.mjs";

function writeJson(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createImportRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-reference-import-"));
  writeJson(root, "src/data/symbtr/catalog.generated.json", {
    entries: [
      {id: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci"},
      {id: "ussak--ilahi--duyek--dostun_senden--ali_rifat_cagatay"},
    ],
  });
  writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {
    version: 1,
    candidates: [
      {
        catalogId: "ussak--ilahi--duyek--dostun_senden--ali_rifat_cagatay",
        status: "accepted",
        checkedAt: "2026-05-10",
        source: {
          id: "divanmakam-example",
          label: "Nota kaynağı",
          provider: "score",
          url: "https://divanmakam.com/forum/example.1/",
          access: "external-link",
          verification: "manual",
          verifiedAt: "2026-05-10",
        },
      },
    ],
  });
  return root;
}

describe("import-external-reference-candidates", () => {
  it("imports conflict candidates without auto-attach source requirements", async () => {
    const root = createImportRoot();
    writeJson(root, "input/candidates.json", {
      candidates: [
        {
          catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
          status: "conflict",
          checkedAt: "2026-05-10",
          source: {id: "conflict-example"},
        },
      ],
    });
    const summary = runImport({root, inputPath: "input/candidates.json", dryRun: false});
    const manifest = JSON.parse(readFileSync(path.join(root, "src/data/references/external-reference-bulk-candidates.json"), "utf8"));

    expect(summary).toEqual(expect.objectContaining({
      addedCandidateCount: 1,
      skippedDuplicateCount: 0,
      outputCandidateCount: 2,
    }));
    expect(manifest.candidates.map((candidate) => candidate.status)).toEqual(["accepted", "conflict"]);
  });

  it("keeps accepted URL identity dedupe deterministic during dry run", async () => {
    const root = createImportRoot();
    writeJson(root, "input/candidates.json", {
      candidates: [
        {
          catalogId: "rast--sarki--sofyan--ikinci_eser--ikinci_besteci",
          status: "accepted",
          checkedAt: "2026-05-10",
          source: {
            id: "duplicate-url",
            label: "Duplicate",
            provider: "score",
            url: "https://divanmakam.com/forum/example.1/#fragment",
            access: "external-link",
            verification: "manual",
            verifiedAt: "2026-05-10",
          },
        },
      ],
    });
    const summary = runImport({root, inputPath: "input/candidates.json", dryRun: true});
    const manifest = JSON.parse(readFileSync(path.join(root, "src/data/references/external-reference-bulk-candidates.json"), "utf8"));

    expect(summary).toEqual(expect.objectContaining({
      addedCandidateCount: 0,
      skippedDuplicateCount: 1,
      outputCandidateCount: 1,
    }));
    expect(manifest.candidates).toHaveLength(1);
  });
});
