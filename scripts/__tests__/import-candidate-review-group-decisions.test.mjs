import {execFileSync} from "node:child_process";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {getCandidateReviewGroupFingerprint} from "../../src/data/references/candidate-review-group-fingerprint.mjs";

const scriptPath = path.resolve("scripts/import-candidate-review-group-decisions.mjs");
const catalogId = "ussak--ilahi--duyek--dostun_senden--ali_rifat_cagatay";
const secondCatalogId = "hicaz--sarki--sofyan--bir_ihtimal_daha_var--yesari_asim_arsoy";
const unknownCatalogId = "rast--sarki--sofyan--unknown--besteci";

function reviewGroupFor(id) {
  return {
    groupId: `${id}:review-group`,
    catalogId: id,
    status: "needs-review",
  };
}

function writeJson(root, projectPath, value) {
  const filePath = path.join(root, projectPath);
  mkdirSync(path.dirname(filePath), {recursive: true});
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "muzik-group-decision-import-"));
  writeJson(root, "src/data/symbtr/catalog.generated.json", {
    entries: [
      {id: catalogId},
      {id: secondCatalogId},
      {id: unknownCatalogId},
    ],
  });
  writeJson(root, "output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json", [
    reviewGroupFor(catalogId),
    reviewGroupFor(secondCatalogId),
  ]);
  writeJson(root, "src/data/references/candidate-review-group-decisions.json", {
    version: 1,
    decisions: [],
  });
  return root;
}

function runScript(root, inputPath, write = false) {
  return execFileSync(
    process.execPath,
    [scriptPath, "--input", inputPath, write ? "--write" : "--dry-run"],
    {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]},
  );
}

describe("import-candidate-review-group-decisions", () => {
  it("imports only decisions that match generated review groups", () => {
    const root = createRoot();
    writeJson(root, "input/decisions.json", {
      version: 1,
      decisions: [
        {
          groupId: `${catalogId}:review-group`,
          catalogId,
          sourceGroupFingerprint: getCandidateReviewGroupFingerprint(reviewGroupFor(catalogId)),
          status: "rejected",
          reason: "batch-reviewed-no-safe-source",
          reviewedAt: "2026-06-01",
          reviewedBy: "local-operator",
        },
      ],
    });

    const output = JSON.parse(runScript(root, "input/decisions.json", true));
    const manifest = JSON.parse(readFileSync(
      path.join(root, "src/data/references/candidate-review-group-decisions.json"),
      "utf8",
    ));

    expect(output).toEqual(expect.objectContaining({
      dryRun: false,
      inputDecisionCount: 1,
      addedDecisionCount: 1,
      outputDecisionCount: 1,
    }));
    expect(manifest.decisions).toEqual([
      expect.objectContaining({
        groupId: `${catalogId}:review-group`,
        status: "rejected",
      }),
    ]);
  });

  it("treats an empty decision manifest as an idempotent no-op", () => {
    const root = createRoot();
    writeJson(root, "input/decisions.json", {
      version: 1,
      decisions: [],
    });

    const output = JSON.parse(runScript(root, "input/decisions.json", true));
    const manifest = JSON.parse(readFileSync(
      path.join(root, "src/data/references/candidate-review-group-decisions.json"),
      "utf8",
    ));

    expect(output).toEqual(expect.objectContaining({
      dryRun: false,
      inputDecisionCount: 0,
      addedDecisionCount: 0,
      updatedDecisionCount: 0,
      outputDecisionCount: 0,
    }));
    expect(manifest.decisions).toEqual([]);
  });

  it("imports decision rows from a candidate review batch plan packet", () => {
    const root = createRoot();
    writeJson(root, "input/batch-plan.json", {
      version: 1,
      type: "candidate-review-batch-plan",
      packets: [
        {
          packetId: "candidate-review-packet-0001",
          decisionTemplate: {
            version: 1,
            type: "candidate-review-group-decision-template",
            decisions: [
              {
                groupId: `${catalogId}:review-group`,
                catalogId,
                sourceGroupFingerprint: getCandidateReviewGroupFingerprint(reviewGroupFor(catalogId)),
                status: "rejected",
                reason: "batch-reviewed-no-safe-source",
                reviewedAt: "2026-06-01",
                reviewedBy: "local-operator",
              },
            ],
          },
        },
      ],
    });

    const output = JSON.parse(runScript(root, "input/batch-plan.json", true));
    const manifest = JSON.parse(readFileSync(
      path.join(root, "src/data/references/candidate-review-group-decisions.json"),
      "utf8",
    ));

    expect(output).toEqual(expect.objectContaining({
      dryRun: false,
      inputKind: "candidate-review-batch-plan",
      importedPacketCount: 1,
      inputDecisionCount: 1,
      addedDecisionCount: 1,
    }));
    expect(manifest.decisions).toEqual([
      expect.objectContaining({
        catalogId,
        status: "rejected",
      }),
    ]);
  });

  it("can import a single packet from a larger batch plan", () => {
    const root = createRoot();
    writeJson(root, "input/batch-plan.json", {
      version: 1,
      type: "candidate-review-batch-plan",
      packets: [
        {
          packetId: "candidate-review-packet-0001",
          decisionTemplate: {
            decisions: [
              {
                groupId: `${catalogId}:review-group`,
                catalogId,
                sourceGroupFingerprint: getCandidateReviewGroupFingerprint(reviewGroupFor(catalogId)),
                status: "rejected",
                reason: "batch-reviewed-no-safe-source",
                reviewedAt: "2026-06-01",
                reviewedBy: "local-operator",
              },
            ],
          },
        },
        {
          packetId: "candidate-review-packet-0002",
          decisionTemplate: {
            decisions: [
              {
                groupId: `${secondCatalogId}:review-group`,
                catalogId: secondCatalogId,
                sourceGroupFingerprint: getCandidateReviewGroupFingerprint(reviewGroupFor(secondCatalogId)),
                status: "deferred",
                reason: "batch-review-needs-source-context",
                reviewedAt: "2026-06-01",
                reviewedBy: "local-operator",
              },
            ],
          },
        },
      ],
    });

    const output = execFileSync(
      process.execPath,
      [scriptPath, "--input", "input/batch-plan.json", "--packet-id", "candidate-review-packet-0002", "--write"],
      {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]},
    );
    const manifest = JSON.parse(readFileSync(
      path.join(root, "src/data/references/candidate-review-group-decisions.json"),
      "utf8",
    ));

    expect(JSON.parse(output)).toEqual(expect.objectContaining({
      importedPacketCount: 1,
      inputDecisionCount: 1,
      outputDecisionCount: 1,
    }));
    expect(manifest.decisions).toEqual([
      expect.objectContaining({
        catalogId: secondCatalogId,
        status: "deferred",
      }),
    ]);
  });

  it("rejects packet imports that carry source identity fields", () => {
    const root = createRoot();
    writeJson(root, "input/batch-plan.json", {
      version: 1,
      type: "candidate-review-batch-plan",
      packets: [
        {
          packetId: "candidate-review-packet-0001",
          sourceUrl: "https://example.com/not-allowed",
          decisionTemplate: {
            decisions: [
              {
                groupId: `${catalogId}:review-group`,
                catalogId,
                sourceGroupFingerprint: getCandidateReviewGroupFingerprint(reviewGroupFor(catalogId)),
                status: "rejected",
                reason: "batch-reviewed-no-safe-source",
                reviewedAt: "2026-06-01",
                reviewedBy: "local-operator",
              },
            ],
          },
        },
      ],
    });

    expect(() => runScript(root, "input/batch-plan.json", true)).toThrow(
      "packet decision imports must not carry accepted source ids or source URLs",
    );
  });

  it("rejects decisions for catalog rows that are not in the generated review group artifact", () => {
    const root = createRoot();
    writeJson(root, "input/decisions.json", {
      version: 1,
      decisions: [
        {
          groupId: `${unknownCatalogId}:review-group`,
          catalogId: unknownCatalogId,
          sourceGroupFingerprint: "0".repeat(64),
          status: "rejected",
          reason: "batch-reviewed-no-safe-source",
          reviewedAt: "2026-06-01",
          reviewedBy: "local-operator",
        },
      ],
    });

    expect(() => runScript(root, "input/decisions.json", true)).toThrow(
      "review group decision does not match a generated candidate review group",
    );
  });

  it("rejects decisions whose group id belongs to a different catalog row", () => {
    const root = createRoot();
    writeJson(root, "input/decisions.json", {
      version: 1,
      decisions: [
        {
          groupId: `${secondCatalogId}:review-group`,
          catalogId,
          sourceGroupFingerprint: getCandidateReviewGroupFingerprint(reviewGroupFor(secondCatalogId)),
          status: "rejected",
          reason: "batch-reviewed-no-safe-source",
          reviewedAt: "2026-06-01",
          reviewedBy: "local-operator",
        },
      ],
    });

    expect(() => runScript(root, "input/decisions.json", true)).toThrow(
      "review group decision does not match a generated candidate review group",
    );
  });

  it("rejects stale decisions whose fingerprint no longer matches the generated group", () => {
    const root = createRoot();
    writeJson(root, "input/decisions.json", {
      version: 1,
      decisions: [
        {
          groupId: `${catalogId}:review-group`,
          catalogId,
          sourceGroupFingerprint: "0".repeat(64),
          status: "rejected",
          reason: "batch-reviewed-no-safe-source",
          reviewedAt: "2026-06-01",
          reviewedBy: "local-operator",
        },
      ],
    });

    expect(() => runScript(root, "input/decisions.json", true)).toThrow(
      "sourceGroupFingerprint must match the generated candidate review group",
    );
  });
});
