import {describe, expect, it} from "vitest";
import {
  parseReviewSvg,
  validateCandidatesWithinPage,
  validateCandidatesOverlapStaffRows,
  validateCandidateDensity,
  validateReviewArtifactGeometry,
  validateDeterministicMeasureCandidateGate,
  validateReviewHtmlStructure,
  compareSvgGeometry,
} from "../lib/visual-regression.mjs";

const SAMPLE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img">
  <rect x="0" y="0" width="595" height="842" class="page" />
  <rect x="20" y="100" width="555" height="60" class="staff-band" />
  <rect x="20" y="200" width="555" height="60" class="staff-band" />
  <line x1="20" y1="110" x2="575" y2="110" class="staff-line" />
  <line x1="20" y1="120" x2="575" y2="120" class="staff-line" />
  <rect x="30" y="105" width="50" height="50" class="measure-candidate" />
  <rect x="90" y="105" width="50" height="50" class="measure-candidate" />
  <rect x="30" y="205" width="50" height="50" class="measure-candidate" />
</svg>`;

const BAD_SVG_OUT_OF_BOUNDS = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img">
  <rect x="0" y="0" width="595" height="842" class="page" />
  <rect x="20" y="100" width="555" height="60" class="staff-band" />
  <rect x="600" y="100" width="50" height="50" class="measure-candidate" />
</svg>`;

const BAD_SVG_NO_OVERLAP = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img">
  <rect x="0" y="0" width="595" height="842" class="page" />
  <rect x="20" y="100" width="555" height="60" class="staff-band" />
  <rect x="30" y="900" width="50" height="50" class="measure-candidate" />
</svg>`;

const DETERMINISTIC_GATE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img">
  <rect x="0" y="0" width="595" height="842" class="page" />
  <rect x="20" y="100" width="150" height="60" class="staff-band" />
  <rect x="20" y="105" width="50" height="50" class="measure-candidate" />
  <rect x="70" y="105" width="50" height="50" class="measure-candidate" />
  <rect x="120" y="105" width="50" height="50" class="measure-candidate" />
</svg>`;

const SAMPLE_HTML = `<!doctype html>
<html lang="tr">
<head><title>Test Review</title></head>
<body>
  <main>
    <header><h1>SymbTr PDF ölçü aday incelemesi</h1></header>
    <section class="summary">
      <div class="metric"><span>Porte satırı</span><strong>2</strong></div>
      <div class="metric"><span>Ölçü adayı</span><strong>3</strong></div>
    </section>
    <section class="warning">Test warning</section>
    <section class="review-grid">
      <div class="source-frame"><iframe src="test.pdf"></iframe></div>
      <div class="review-frame"><object type="image/svg+xml" data="test.svg"></object></div>
    </section>
  </main>
</body>
</html>`;

describe("visual-regression infrastructure", () => {
  describe("parseReviewSvg", () => {
    it("extracts page dimensions, staff bands, and candidates", () => {
      const geometry = parseReviewSvg(SAMPLE_SVG);
      expect(geometry.pageWidth).toBe(595);
      expect(geometry.pageHeight).toBe(842);
      expect(geometry.staffBands).toHaveLength(2);
      expect(geometry.candidates).toHaveLength(3);
    });

    it("parses candidate coordinates correctly", () => {
      const geometry = parseReviewSvg(SAMPLE_SVG);
      expect(geometry.candidates[0]).toEqual({x: 30, y: 105, width: 50, height: 50});
    });
  });

  describe("validateCandidatesWithinPage", () => {
    it("passes for valid in-bounds candidates", () => {
      const geometry = parseReviewSvg(SAMPLE_SVG);
      const result = validateCandidatesWithinPage(geometry);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("fails for out-of-bounds candidates", () => {
      const geometry = parseReviewSvg(BAD_SVG_OUT_OF_BOUNDS);
      const result = validateCandidatesWithinPage(geometry);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("out-of-bounds");
    });
  });

  describe("validateCandidatesOverlapStaffRows", () => {
    it("passes when candidates overlap staff bands", () => {
      const geometry = parseReviewSvg(SAMPLE_SVG);
      const result = validateCandidatesOverlapStaffRows(geometry);
      expect(result.valid).toBe(true);
      expect(result.overlapRate).toBe(100);
    });

    it("fails when candidates do not overlap any staff band", () => {
      const geometry = parseReviewSvg(BAD_SVG_NO_OVERLAP);
      const result = validateCandidatesOverlapStaffRows(geometry);
      expect(result.valid).toBe(false);
      expect(result.issues[0].type).toBe("no-staff-overlap");
    });
  });

  describe("validateCandidateDensity", () => {
    it("passes for reasonable candidate counts per band", () => {
      const geometry = parseReviewSvg(SAMPLE_SVG);
      const result = validateCandidateDensity(geometry, 20);
      expect(result.valid).toBe(true);
    });

    it("fails for excessive candidates in a single band", () => {
      // Create SVG with 25 candidates in one band
      let denseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842">
        <rect x="0" y="0" width="595" height="842" class="page" />
        <rect x="20" y="100" width="555" height="60" class="staff-band" />`;
      for (let i = 0; i < 25; i++) {
        denseSvg += `<rect x="${30 + i * 2}" y="105" width="10" height="10" class="measure-candidate" />`;
      }
      denseSvg += `</svg>`;
      const geometry = parseReviewSvg(denseSvg);
      const result = validateCandidateDensity(geometry, 20);
      expect(result.valid).toBe(false);
      expect(result.issues[0].type).toBe("excessive-density");
    });
  });

  describe("validateReviewArtifactGeometry", () => {
    it("returns valid for a well-formed review artifact", () => {
      const result = validateReviewArtifactGeometry(SAMPLE_SVG);
      expect(result.valid).toBe(true);
      expect(result.checks.pageBounds.valid).toBe(true);
      expect(result.checks.staffOverlap.valid).toBe(true);
      expect(result.checks.density.valid).toBe(true);
    });

    it("returns invalid when page bounds are violated", () => {
      const result = validateReviewArtifactGeometry(BAD_SVG_OUT_OF_BOUNDS);
      expect(result.valid).toBe(false);
      expect(result.checks.pageBounds.valid).toBe(false);
    });
  });

  describe("validateDeterministicMeasureCandidateGate", () => {
    it("passes only with fingerprint and deterministic geometry evidence", () => {
      const result = validateDeterministicMeasureCandidateGate(DETERMINISTIC_GATE_SVG, {
        candidateGeometryFingerprint: "sha256:test",
        fingerprintAlgorithm: "sha256:symbtr-layout-candidate-geometry-v1",
        measureIndexes: [1, 2, 3],
      });

      expect(result.valid).toBe(true);
      expect(result.promotionEligible).toBe(true);
      expect(result.checks.fingerprint.valid).toBe(true);
      expect(result.checks.barlineAlignment.valid).toBe(true);
      expect(result.checks.neighborGeometry.valid).toBe(true);
    });

    it("fails when current fingerprint evidence is missing", () => {
      const result = validateDeterministicMeasureCandidateGate(DETERMINISTIC_GATE_SVG, {
        measureIndexes: [1, 2, 3],
      });

      expect(result.valid).toBe(false);
      expect(result.promotionEligible).toBe(false);
      expect(result.checks.fingerprint.valid).toBe(false);
    });

    it("fails when neighboring candidates overlap", () => {
      const overlappingSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" role="img">
  <rect x="0" y="0" width="595" height="842" class="page" />
  <rect x="20" y="100" width="100" height="60" class="staff-band" />
  <rect x="20" y="105" width="60" height="50" class="measure-candidate" />
  <rect x="75" y="105" width="45" height="50" class="measure-candidate" />
</svg>`;

      const result = validateDeterministicMeasureCandidateGate(overlappingSvg, {
        candidateGeometryFingerprint: "sha256:test",
        measureIndexes: [1, 2],
      });

      expect(result.valid).toBe(false);
      expect(result.checks.neighborGeometry.issues[0].type).toBe("neighbor-overlap");
    });
  });

  describe("validateReviewHtmlStructure", () => {
    it("passes for a complete review HTML page", () => {
      const result = validateReviewHtmlStructure(SAMPLE_HTML);
      expect(result.valid).toBe(true);
      expect(result.structure.hasDoctype).toBe(true);
      expect(result.structure.hasTitle).toBe(true);
      expect(result.structure.hasSvgObject).toBe(true);
      expect(result.structure.hasPdfIframe).toBe(true);
      expect(result.structure.hasMetrics).toBe(true);
      expect(result.structure.hasWarning).toBe(true);
    });

    it("fails for incomplete HTML", () => {
      const result = validateReviewHtmlStructure("<html><body>incomplete</body></html>");
      expect(result.valid).toBe(false);
    });
  });

  describe("compareSvgGeometry", () => {
    it("reports match for identical geometries", () => {
      const geo1 = parseReviewSvg(SAMPLE_SVG);
      const geo2 = parseReviewSvg(SAMPLE_SVG);
      const result = compareSvgGeometry(geo1, geo2);
      expect(result.match).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("reports candidate count difference", () => {
      const geo1 = parseReviewSvg(SAMPLE_SVG);
      const geo2 = parseReviewSvg(BAD_SVG_NO_OVERLAP);
      const result = compareSvgGeometry(geo1, geo2);
      expect(result.match).toBe(false);
      expect(result.differences[0].type).toBe("candidate-count");
    });

    it("reports geometry drift within tolerance", () => {
      const geo1 = parseReviewSvg(SAMPLE_SVG);
      // Modify one candidate slightly (within tolerance)
      const geo2 = {
        ...geo1,
        candidates: geo1.candidates.map((c, i) => i === 0 ? {...c, x: c.x + 0.3} : c),
      };
      const result = compareSvgGeometry(geo1, geo2, 0.5);
      expect(result.match).toBe(true);
    });

    it("reports geometry drift beyond tolerance", () => {
      const geo1 = parseReviewSvg(SAMPLE_SVG);
      const geo2 = {
        ...geo1,
        candidates: geo1.candidates.map((c, i) => i === 0 ? {...c, x: c.x + 2} : c),
      };
      const result = compareSvgGeometry(geo1, geo2, 0.5);
      expect(result.match).toBe(false);
      expect(result.differences[0].type).toBe("geometry-drift");
    });
  });
});
