import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  buildSourceIntakeAcceptedImportDryRun,
  runSourceIntakeAcceptedImportDryRun,
} from "../verify-external-source-intake-import.mjs";

const catalogId = "ussak--ilahi--duyek--allah_emrin--zekai_dede";

function writeJson(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function acceptedCandidate(overrides = {}) {
  return {
    catalogId,
    status: "accepted",
    checkedAt: "2026-06-01",
    evidence: {
      title: "Allah Emrin Tutalım Rahmetine Batalım",
      makam: "Uşşak",
      form: "İlahi",
      usul: "Düyek",
      composer: "Zekai Dede",
      sourceProvider: "OGM Materyal",
    },
    source: {
      id: "ogm-materyal-allah-emrin-tutalim-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://ogmmateryal.eba.gov.tr/kitap/guzel-sanatlar-lisesi/muzik/12/thm-teori-uygulama/files/basic-html/page37.html",
      title: "Allah Emrin Tutalım Rahmetine Batalım - Uşşak İlahi",
      access: "external-link",
      verification: "manual",
      verifiedAt: "2026-06-01",
    },
    ...overrides,
  };
}

function createRoot({candidate = acceptedCandidate()} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-source-intake-dry-run-"));

  writeJson(root, "src/data/symbtr/catalog.generated.json", {
    entries: [{id: catalogId}],
  });
  writeJson(root, "src/data/references/research-source-profiles.json", {
    version: 1,
    profiles: [
      {
        id: "ogm-materyal",
        provider: "score",
        baseUrl: "https://ogmmateryal.eba.gov.tr/",
        enabled: true,
      },
    ],
  });
  writeJson(root, "src/data/references/external-reference-bulk-candidates.json", {
    version: 1,
    candidates: [candidate],
  });

  return root;
}

describe("verify-external-source-intake-import", () => {
  it("proves accepted source intake examples through a no-write dry-run import", () => {
    const root = createRoot();
    const report = runSourceIntakeAcceptedImportDryRun({
      root,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const written = JSON.parse(readFileSync(
      path.join(root, "output/external-reference-coverage/source-intake-accepted-import-dry-run.json"),
      "utf8",
    ));

    expect(report).toEqual(expect.objectContaining({
      type: "source-intake-accepted-import-dry-run",
      dryRun: true,
      summaryOutput: "output/external-reference-coverage/source-intake-accepted-import-dry-run.json",
    }));
    expect(report.summary).toEqual(expect.objectContaining({
      acceptedCandidateCount: 1,
      httpsAcceptedCount: 1,
      evidenceCompleteCount: 1,
      dryRunAddedCandidateCount: 0,
      dryRunSkippedDuplicateCount: 1,
      dryRunExistingCandidateCount: 1,
      dryRunOutputCandidateCount: 1,
    }));
    expect(written.errors).toEqual([]);
  });

  it("rejects accepted candidates without complete evidence", () => {
    const candidate = acceptedCandidate({
      evidence: {
        title: "Allah Emrin Tutalım Rahmetine Batalım",
        makam: "Uşşak",
      },
    });
    const root = createRoot({candidate});

    expect(() => buildSourceIntakeAcceptedImportDryRun({root})).toThrow(
      "accepted candidate evidence missing form, usul, composer, sourceProvider",
    );
  });
});
