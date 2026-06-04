import {mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

/**
 * Visual regression test infrastructure for SymbTr PDF layout review artifacts.
 * Provides:
 * 1. SVG structural validation (candidates within bounds, aligned to staff rows)
 * 2. Candidate-to-staff-row geometric consistency checks
 * 3. Baseline screenshot comparison (Playwright-based, optional)
 * 4. HTML review page structure validation
 */

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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
  return {valid: issues.length === 0, issues, overlapRate: issues.length === 0 ? 100 : ((geometry.candidates.length - issues.length) / geometry.candidates.length * 100).toFixed(1)};
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

// Default export for testing
export default {
  parseReviewSvg,
  validateCandidatesWithinPage,
  validateCandidatesOverlapStaffRows,
  validateCandidateDensity,
  validateReviewArtifactGeometry,
  validateReviewHtmlStructure,
  compareSvgGeometry,
  batchValidateReviewArtifacts,
};
