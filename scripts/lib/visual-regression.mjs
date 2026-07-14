import {readFileSync, existsSync, readdirSync} from "node:fs";
import path from "node:path";

/**
 * Visual regression test infrastructure for SymbTr PDF layout review artifacts.
 * Provides:
 * 1. SVG structural validation (candidates within bounds, aligned to staff rows)
 * 2. Candidate-to-staff-row geometric consistency checks
 * 3. Baseline screenshot comparison (Playwright-based, optional)
 * 4. HTML review page structure validation
 */

// Parse an SVG review artifact and extract geometric data
export function parseReviewSvg(svgContent) {
  const svgMatch = svgContent.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const pageWidth = svgMatch ? Number(svgMatch[1]) : 0;
  const pageHeight = svgMatch ? Number(svgMatch[2]) : 0;

  const staffBands = [];
  const bandRegex = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" class="staff-band"/g;
  let bandMatch;
  while ((bandMatch = bandRegex.exec(svgContent)) !== null) {
    staffBands.push({
      x: Number(bandMatch[1]),
      y: Number(bandMatch[2]),
      width: Number(bandMatch[3]),
      height: Number(bandMatch[4]),
    });
  }

  const candidates = [];
  const candidateRegex = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" class="measure-candidate"/g;
  let candidateMatch;
  while ((candidateMatch = candidateRegex.exec(svgContent)) !== null) {
    candidates.push({
      x: Number(candidateMatch[1]),
      y: Number(candidateMatch[2]),
      width: Number(candidateMatch[3]),
      height: Number(candidateMatch[4]),
    });
  }

  return {pageWidth, pageHeight, staffBands, candidates};
}

// Validate that all candidates are within the page bounds
export function validateCandidatesWithinPage(geometry) {
  const issues = [];
  for (const c of geometry.candidates) {
    if (c.x < 0 || c.y < 0 || c.x + c.width > geometry.pageWidth + 1 || c.y + c.height > geometry.pageHeight + 1) {
      issues.push({type: "out-of-bounds", candidate: c, page: {w: geometry.pageWidth, h: geometry.pageHeight}});
    }
  }
  return {valid: issues.length === 0, issues};
}

// Validate that candidates overlap with at least one staff band
export function validateCandidatesOverlapStaffRows(geometry, minOverlapPercent = 50) {
  const issues = [];
  for (const c of geometry.candidates) {
    const cx = c.x + c.width / 2;
    const cy = c.y + c.height / 2;
    let overlaps = false;
    for (const band of geometry.staffBands) {
      if (cx >= band.x && cx <= band.x + band.width && cy >= band.y && cy <= band.y + band.height) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      issues.push({type: "no-staff-overlap", candidate: c});
    }
  }
  const overlapRate = geometry.candidates.length === 0
    ? 100
    : Number(((geometry.candidates.length - issues.length) / geometry.candidates.length * 100).toFixed(1));
  return {valid: issues.length === 0 && overlapRate >= minOverlapPercent, issues, overlapRate};
}

// Validate candidate density (no excessive candidates per staff band)
export function validateCandidateDensity(geometry, maxPerBand = 20) {
  const bandCandidates = new Map();
  for (const c of geometry.candidates) {
    const cy = c.y + c.height / 2;
    for (let i = 0; i < geometry.staffBands.length; i++) {
      const band = geometry.staffBands[i];
      if (cy >= band.y && cy <= band.y + band.height) {
        bandCandidates.set(i, (bandCandidates.get(i) || 0) + 1);
        break;
      }
    }
  }
  const issues = [];
  for (const [bandIndex, count] of bandCandidates.entries()) {
    if (count > maxPerBand) {
      issues.push({type: "excessive-density", bandIndex, count, max: maxPerBand});
    }
  }
  return {valid: issues.length === 0, issues};
}

// Run all geometric validations on a review artifact
export function validateReviewArtifactGeometry(svgContent, options = {}) {
  const geometry = parseReviewSvg(svgContent);
  const pageCheck = validateCandidatesWithinPage(geometry);
  const overlapCheck = validateCandidatesOverlapStaffRows(geometry, options.minOverlapPercent);
  const densityCheck = validateCandidateDensity(geometry, options.maxPerBand);

  return {
    valid: pageCheck.valid && overlapCheck.valid && densityCheck.valid,
    geometry,
    checks: {
      pageBounds: pageCheck,
      staffOverlap: overlapCheck,
      density: densityCheck,
    },
  };
}

function findStaffBandIndexForCandidate(candidate, staffBands) {
  const cx = candidate.x + candidate.width / 2;
  const cy = candidate.y + candidate.height / 2;
  return staffBands.findIndex((band) => (
    cx >= band.x &&
    cx <= band.x + band.width &&
    cy >= band.y &&
    cy <= band.y + band.height
  ));
}

function groupCandidatesByStaffBand(geometry) {
  const rows = new Map();
  for (const [candidateIndex, candidate] of geometry.candidates.entries()) {
    const bandIndex = findStaffBandIndexForCandidate(candidate, geometry.staffBands);
    if (bandIndex < 0) continue;
    rows.set(bandIndex, [...(rows.get(bandIndex) ?? []), {...candidate, candidateIndex}]);
  }
  return rows;
}

export function validateDeterministicMeasureCandidateGate(svgContent, options = {}) {
  const base = validateReviewArtifactGeometry(svgContent, options);
  const {geometry} = base;
  const fingerprint = options.candidateGeometryFingerprint ?? "";
  const measureIndexes = Array.isArray(options.measureIndexes) ? options.measureIndexes : [];
  const expectedMeasureCount = Number.isInteger(options.expectedMeasureCount)
    ? options.expectedMeasureCount
    : measureIndexes.length || null;
  const edgeTolerance = Number(options.edgeTolerance ?? 1);
  const neighborOverlapTolerance = Number(options.neighborOverlapTolerance ?? 0.5);
  const neighborGapTolerance = Number(options.neighborGapTolerance ?? 2);
  const requireCompleteStaffCoverage = options.requireCompleteStaffCoverage !== false;

  const fingerprintCheck = {
    valid: typeof fingerprint === "string" && fingerprint.trim().length > 0,
    algorithm: options.fingerprintAlgorithm ?? null,
    value: fingerprint,
  };

  const measureIndexIssues = [];
  if (expectedMeasureCount !== null && expectedMeasureCount !== geometry.candidates.length) {
    measureIndexIssues.push({
      type: "measure-count-mismatch",
      expected: expectedMeasureCount,
      candidateCount: geometry.candidates.length,
    });
  }
  for (const measureIndex of measureIndexes) {
    if (!Number.isInteger(measureIndex) || measureIndex < 1) {
      measureIndexIssues.push({type: "invalid-measure-index", measureIndex});
    }
  }

  const neighborIssues = [];
  const barlineIssues = [];
  const rows = groupCandidatesByStaffBand(geometry);
  for (const [bandIndex, candidates] of rows.entries()) {
    const band = geometry.staffBands[bandIndex];
    const sorted = candidates.sort((left, right) => left.x - right.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (requireCompleteStaffCoverage && Math.abs(first.x - band.x) > edgeTolerance) {
      barlineIssues.push({type: "row-start-not-aligned", bandIndex, expectedX: band.x, actualX: first.x});
    }
    if (requireCompleteStaffCoverage && Math.abs((last.x + last.width) - (band.x + band.width)) > edgeTolerance) {
      barlineIssues.push({
        type: "row-end-not-aligned",
        bandIndex,
        expectedX: band.x + band.width,
        actualX: last.x + last.width,
      });
    }

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const current = sorted[index];
      const next = sorted[index + 1];
      const gap = next.x - (current.x + current.width);
      if (gap < -neighborOverlapTolerance) {
        neighborIssues.push({
          type: "neighbor-overlap",
          bandIndex,
          leftCandidateIndex: current.candidateIndex,
          rightCandidateIndex: next.candidateIndex,
          overlap: Math.abs(gap),
        });
      } else if (gap > neighborGapTolerance) {
        neighborIssues.push({
          type: "neighbor-gap",
          bandIndex,
          leftCandidateIndex: current.candidateIndex,
          rightCandidateIndex: next.candidateIndex,
          gap,
        });
      }
    }
  }

  const rowCoverageIssues = geometry.candidates.length > 0 && rows.size === 0
    ? [{type: "no-candidates-assigned-to-staff"}]
    : [];

  const checks = {
    ...base.checks,
    fingerprint: fingerprintCheck,
    measureIndex: {
      valid: measureIndexIssues.length === 0,
      expectedMeasureCount,
      measureIndexCount: measureIndexes.length,
      issues: measureIndexIssues,
    },
    rowCoverage: {
      valid: rowCoverageIssues.length === 0,
      checkedRowCount: rows.size,
      issues: rowCoverageIssues,
    },
    neighborGeometry: {
      valid: neighborIssues.length === 0,
      issues: neighborIssues,
    },
    barlineAlignment: {
      valid: barlineIssues.length === 0,
      evidence: "candidate-rectangle edges aligned to staff-row bounds and neighboring candidate edges",
      issues: barlineIssues,
    },
  };

  const valid = (
    base.valid &&
    fingerprintCheck.valid &&
    checks.measureIndex.valid &&
    checks.rowCoverage.valid &&
    checks.neighborGeometry.valid &&
    checks.barlineAlignment.valid
  );

  return {
    valid,
    promotionEligible: valid,
    policy: "Auto-pass requires page bounds, staff overlap, neighbor gap/overlap, barline edge alignment, current fingerprint and valid measureIndex evidence.",
    geometry,
    checks,
  };
}

// Validate HTML review page structure
export function validateReviewHtmlStructure(htmlContent) {
  const hasDoctype = htmlContent.includes("<!doctype html>");
  const hasTitle = /<title>.*<\/title>/i.test(htmlContent);
  const hasSvgObject = /<object type="image\/svg\+xml"/.test(htmlContent);
  const hasPdfIframe = /<iframe[^>]*src="[^"]*\.pdf"/.test(htmlContent);
  const hasMetrics = htmlContent.includes("Porte satırı") && htmlContent.includes("Ölçü adayı");
  const hasWarning = htmlContent.includes("class=\"warning\"");

  return {
    valid: hasDoctype && hasTitle && hasSvgObject && hasPdfIframe && hasMetrics && hasWarning,
    structure: {hasDoctype, hasTitle, hasSvgObject, hasPdfIframe, hasMetrics, hasWarning},
  };
}

// Compare two SVG geometries and report differences (for regression)
export function compareSvgGeometry(baselineGeometry, currentGeometry, tolerance = 0.5) {
  const differences = [];

  if (baselineGeometry.candidates.length !== currentGeometry.candidates.length) {
    differences.push({
      type: "candidate-count",
      baseline: baselineGeometry.candidates.length,
      current: currentGeometry.candidates.length,
    });
  }

  const minLength = Math.min(baselineGeometry.candidates.length, currentGeometry.candidates.length);
  for (let i = 0; i < minLength; i++) {
    const b = baselineGeometry.candidates[i];
    const c = currentGeometry.candidates[i];
    const dx = Math.abs(b.x - c.x);
    const dy = Math.abs(b.y - c.y);
    const dw = Math.abs(b.width - c.width);
    const dh = Math.abs(b.height - c.height);
    if (dx > tolerance || dy > tolerance || dw > tolerance || dh > tolerance) {
      differences.push({type: "geometry-drift", index: i, baseline: b, current: c, deltas: {dx, dy, dw, dh}});
    }
  }

  return {
    match: differences.length === 0,
    differences,
  };
}

// Batch validate all review artifacts in a directory
export function batchValidateReviewArtifacts(reviewDir, options = {}) {
  const results = [];
  const files = readdirSync(reviewDir).filter(f => f.endsWith("-layout-review.svg"));

  for (const file of files) {
    const svgPath = path.join(reviewDir, file);
    const htmlPath = svgPath.replace(".svg", ".html");
    const svgContent = readFileSync(svgPath, "utf8");
    const geometryResult = validateReviewArtifactGeometry(svgContent, options);
    let htmlResult = {valid: true, structure: {skipped: true}};
    if (existsSync(htmlPath)) {
      const htmlContent = readFileSync(htmlPath, "utf8");
      htmlResult = validateReviewHtmlStructure(htmlContent);
    }
    results.push({
      catalogId: file.replace("-layout-review.svg", ""),
      svgValid: geometryResult.valid,
      htmlValid: htmlResult.valid,
      geometry: geometryResult.geometry,
      checks: geometryResult.checks,
      htmlStructure: htmlResult.structure,
    });
  }

  return {
    total: results.length,
    svgValid: results.filter(r => r.svgValid).length,
    htmlValid: results.filter(r => r.htmlValid).length,
    invalid: results.filter(r => !r.svgValid || !r.htmlValid),
    results,
  };
}

const visualRegression = {
  parseReviewSvg,
  validateCandidatesWithinPage,
  validateCandidatesOverlapStaffRows,
  validateCandidateDensity,
  validateReviewArtifactGeometry,
  validateDeterministicMeasureCandidateGate,
  validateReviewHtmlStructure,
  compareSvgGeometry,
  batchValidateReviewArtifacts,
};

export default visualRegression;
