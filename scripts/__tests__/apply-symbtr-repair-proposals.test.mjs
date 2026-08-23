import {mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {buildRepairEntries} from "../apply-symbtr-repair-proposals.mjs";

const CATALOG_ID = "test--pesrev--aksak----composer";

function writeFixture(root, name, value) {
  const filePath = path.join(root, name);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function fixture() {
  const layout = {
    schemaVersion: 1,
    generatedAt: "2026-05-10",
    entries: {
      [CATALOG_ID]: {
        source: {archiveMemberPath: `pdf_v3/${CATALOG_ID}.pdf`},
        measureCandidates: [
          {rowIndex: 0, candidateIndexInRow: 0, leftPercent: 2.5, topPercent: 10, widthPercent: 20, heightPercent: 2},
          {rowIndex: 0, candidateIndexInRow: 1, leftPercent: 30, topPercent: 10, widthPercent: 20, heightPercent: 2},
          {rowIndex: 1, candidateIndexInRow: 0, leftPercent: 45, topPercent: 25, widthPercent: 20, heightPercent: 2},
          {rowIndex: 0, candidateIndexInRow: 2, leftPercent: 55, topPercent: 10, widthPercent: 20, heightPercent: 2},
        ],
      },
    },
  };
  const verification = {
    schemaVersion: 1,
    generatedAt: "2026-05-10",
    policy: "test",
    entries: {
      [CATALOG_ID]: {
        catalogId: CATALOG_ID,
        sourceLayoutGeneratedAt: "2026-05-10",
        sourceArchiveMemberPath: `pdf_v3/${CATALOG_ID}.pdf`,
        sourceMeasureCandidateCount: 4,
        candidateGeometryFingerprint: "fp-123",
        measureIndexBasis: "meter-walk-v2",
        method: "symbtr-txt-aligned",
        reviewer: "symbtr-txt-system",
        verifiedAt: "2026-05-10T00:00:00.000Z",
        measureBoxes: [
          {
            measureIndex: 1,
            leftPercent: 2.5,
            topPercent: 10,
            widthPercent: 20,
            heightPercent: 2,
            confidence: "verified",
            reviewer: "old-reviewer",
            method: "symbtr-txt-aligned",
            sourceCandidateRowIndex: 0,
            sourceCandidateIndexInRow: 0,
          },
          {
            measureIndex: 2,
            leftPercent: 30,
            topPercent: 10,
            widthPercent: 20,
            heightPercent: 2,
            confidence: "verified",
            reviewer: "old-reviewer",
            method: "symbtr-txt-aligned",
            sourceCandidateRowIndex: 0,
            sourceCandidateIndexInRow: 1,
          },
          {
            measureIndex: 3,
            leftPercent: 2.5,
            topPercent: 25,
            widthPercent: 20,
            heightPercent: 2,
            confidence: "verified",
            reviewer: "old-reviewer",
            method: "symbtr-txt-aligned",
            sourceCandidateRowIndex: 1,
            sourceCandidateIndexInRow: 0,
          },
          {
            measureIndex: 5,
            leftPercent: 55,
            topPercent: 10,
            widthPercent: 20,
            heightPercent: 2,
            confidence: "verified",
            reviewer: "old-reviewer",
            method: "symbtr-txt-aligned",
            sourceCandidateRowIndex: 0,
            sourceCandidateIndexInRow: 2,
          },
        ],
      },
    },
  };
  const proposals = {
    version: 1,
    generatedAt: "2026-08-08T00:00:00.000Z",
    entries: {
      [CATALOG_ID]: {
        catalogId: CATALOG_ID,
        counts: {keep: 1, replace: 1, review: 2, add: 1},
        actions: [
          {measureIndex: 1, action: "keep", stored: {measureIndex: 1}},
          {
            measureIndex: 2,
            action: "replace",
            reason: "different-candidate",
            stored: {measureIndex: 2},
            proposed: {sourceCandidateRowIndex: 1, sourceCandidateIndexInRow: 0, leftPercent: 45},
          },
          {measureIndex: 3, action: "review", reason: "no-new-box", stored: {measureIndex: 3}},
          {measureIndex: 5, action: "review", reason: "no-new-box", stored: {measureIndex: 5}},
          {
            measureIndex: 4,
            action: "add",
            reason: "measure-not-in-stored",
            proposed: {sourceCandidateRowIndex: 0, sourceCandidateIndexInRow: 1},
          },
        ],
      },
    },
  };
  return {layout, verification, proposals};
}

describe("apply-symbtr-repair-proposals", () => {
  it("keep korunur, replace aday geometrisine gecer, review dokunulmaz, add yazilmaz", () => {
    const root = mkdtempSync(path.join(tmpdir(), "muzik-repair-apply-"));
    const proposalPath = writeFixture(root, "repair-proposals.json", fixture().proposals);
    const verificationPath = writeFixture(root, "verification.json", fixture().verification);
    const layoutPath = writeFixture(root, "layout.json", fixture().layout);

    const {previewEntries, stats, appliedCatalogIds} = buildRepairEntries({
      proposalPath,
      verificationPath,
      layoutPath,
    });
    const entry = previewEntries[CATALOG_ID];

    expect(stats.appliedEntryCount).toBe(1);
    expect(stats.keepBoxCount).toBe(1);
    expect(stats.replaceBoxCount).toBe(1);
    expect(stats.reviewBoxCount).toBe(2);
    expect(stats.reviewBoxDroppedCandidateCollisionCount).toBe(1);
    expect(stats.addBoxExcludedCount).toBe(1);
    expect(appliedCatalogIds).toEqual([CATALOG_ID]);

    expect(entry.measureBoxes).toHaveLength(3);
    const byMeasure = new Map(entry.measureBoxes.map((box) => [box.measureIndex, box]));

    const keep = byMeasure.get(1);
    expect(keep.reviewer).toBe("old-reviewer"); // keep: stored AYNEN

    const replaced = byMeasure.get(2);
    expect(replaced.leftPercent).toBe(45); // onerilen adayin geometrisi
    expect(replaced.topPercent).toBe(25);
    expect(replaced.sourceCandidateRowIndex).toBe(1);
    expect(replaced.sourceCandidateIndexInRow).toBe(0);
    expect(replaced.reviewer).toBe("symbtr-txt-aligner-v1");
    expect(replaced.confidence).toBe("verified");

    const reviewed = byMeasure.get(3);
    expect(reviewed).toBeUndefined(); // aday 1:0'i replace sahiplendi -> verified'dan dustu

    const keptReview = byMeasure.get(5);
    expect(keptReview.reviewer).toBe("old-reviewer"); // cakismayan review: dokunulmaz

    expect(byMeasure.has(4)).toBe(false); // add: yazilmaz
    expect(entry.candidateGeometryFingerprint).toBe("fp-123"); // metadata korunur
    expect(entry.repairEvidence.replaceBoxCount).toBe(1);
    expect(entry.repairEvidence.reviewBoxCount).toBe(2);
    expect(entry.repairEvidence.reviewBoxDroppedCandidateCollisionCount).toBe(1);
    expect(entry.repairEvidence.addBoxExcludedCount).toBe(1);
  });

  it("onerilen aday yoksa giris atlanir (veri uydurulmaz)", () => {
    const root = mkdtempSync(path.join(tmpdir(), "muzik-repair-apply-"));
    const layout = fixture().layout;
    const verification = fixture().verification;
    const proposals = fixture().proposals;
    proposals.entries[CATALOG_ID].actions = [
      {
        measureIndex: 1,
        action: "replace",
        reason: "different-candidate",
        stored: {measureIndex: 1},
        proposed: {sourceCandidateRowIndex: 9, sourceCandidateIndexInRow: 9},
      },
    ];

    const {previewEntries, stats} = buildRepairEntries({
      proposalPath: writeFixture(root, "repair-proposals.json", proposals),
      verificationPath: writeFixture(root, "verification.json", verification),
      layoutPath: writeFixture(root, "layout.json", layout),
    });

    expect(stats.skippedEntryCount).toBe(1);
    expect(stats.appliedEntryCount).toBe(0);
    expect(previewEntries[CATALOG_ID].measureBoxes).toHaveLength(4); // stored dokunulmadi
  });
});
