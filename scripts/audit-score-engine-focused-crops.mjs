#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_BASE_URL = "http://localhost:4015";
const DEFAULT_OUTPUT_DIR = path.join(PROJECT_ROOT, "output", "playwright", "score-engine-focused-crops");
const DEFAULT_SYMBOLIC_CORPUS_SUMMARY = path.join(
  PROJECT_ROOT,
  "output",
  "score-engine",
  "symbolic-glyph-corpus-summary.json",
);
const ROUTE = "/studio/score-engine";
const SAME_PIECE_SOURCE_URL = "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey01.gif";

const SOURCE_PAGES = [
  {
    id: "page-1",
    url: SAME_PIECE_SOURCE_URL,
    expectedNaturalWidth: 800,
    expectedNaturalHeight: 1128,
  },
  {
    id: "page-2",
    url: "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey02.gif",
    expectedNaturalWidth: 800,
    expectedNaturalHeight: 1117,
  },
  {
    id: "page-3",
    url: "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey03.gif",
    expectedNaturalWidth: 800,
    expectedNaturalHeight: 1117,
  },
];

const SOURCE_CROPS = [
  {
    id: "source-page-1-clef-key-meter",
    sourcePageId: "page-1",
    label: "Source same-piece crop: clef, 28/4 meter, first system",
    clip: {x: 36, y: 96, width: 730, height: 190},
  },
  {
    id: "source-page-1-dense-beams",
    sourcePageId: "page-1",
    label: "Source same-piece crop: dense beamed system",
    clip: {x: 36, y: 236, width: 730, height: 190},
  },
  {
    id: "source-page-2-section-repeat-candidates",
    sourcePageId: "page-2",
    label: "Source same-piece crop: section/repeat candidates",
    clip: {x: 36, y: 72, width: 730, height: 230},
  },
  {
    id: "source-page-3-ending-candidates",
    sourcePageId: "page-3",
    label: "Source same-piece crop: ending/ornament candidates",
    clip: {x: 36, y: 72, width: 730, height: 260},
  },
];

const GLYPH_CLASS_REQUIREMENTS = [
  {
    id: "clef-key-meter",
    label: "Clef, key context and 28/4 meter",
    sourceCropIds: ["source-page-1-clef-key-meter"],
    implementationTokenKeys: ["hasClefSurface", "hasMeter28"],
    requiredForDesignQa: true,
  },
  {
    id: "inline-koma-accidentals",
    label: "Inline Turkish koma accidentals",
    sourceCropIds: ["source-page-1-clef-key-meter", "source-page-1-dense-beams"],
    implementationTokenKeys: ["hasKomaSharp", "hasKomaFlat"],
    requiredForDesignQa: true,
  },
  {
    id: "rest-and-dotted-duration",
    label: "Rests and dotted rhythmic values",
    sourceCropIds: ["source-page-1-dense-beams"],
    implementationTokenKeys: ["hasRest", "hasDotted"],
    requiredForDesignQa: true,
  },
  {
    id: "beamed-density",
    label: "Dense beamed passages stay inside staff systems",
    sourceCropIds: ["source-page-1-dense-beams"],
    implementationCropIds: ["implementation-density-systems"],
    requiredForDesignQa: true,
  },
  {
    id: "section-usul-labels",
    label: "Section and usul labels",
    sourceCropIds: ["source-page-1-clef-key-meter", "source-page-2-section-repeat-candidates"],
    implementationTokenKeys: ["hasSectionOrUsulText"],
    requiredForDesignQa: true,
  },
  {
    id: "repeat-volta-endings",
    label: "Repeat signs and volta endings",
    sourceCropIds: ["source-page-2-section-repeat-candidates", "source-page-3-ending-candidates"],
    implementationTokenKeys: ["hasRepeatOrVolta"],
    requiredForDesignQa: true,
  },
  {
    id: "slur-tie-triplet",
    label: "Slur, tie and triplet notation",
    sourceCropIds: ["source-page-3-ending-candidates"],
    implementationTokenKeys: ["hasSlurTieOrTriplet"],
    requiredForDesignQa: true,
  },
  {
    id: "natural-accidental",
    label: "Natural accidental and cancellation policy",
    sourceCropIds: ["source-page-2-section-repeat-candidates"],
    implementationTokenKeys: ["hasNaturalAccidental"],
    requiredForDesignQa: true,
  },
];

function parseCliOptions(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options.set(key, next);
      index += 1;
    } else {
      options.set(key, "true");
    }
  }
  return options;
}

function assertInsideProject(targetPath) {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(PROJECT_ROOT, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function resolveBrowserExecutable() {
  if (process.env.SCORE_ENGINE_AUDIT_BROWSER) return process.env.SCORE_ENGINE_AUDIT_BROWSER;

  const candidates = [];
  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles;
    const programFilesX86 = process.env["ProgramFiles(x86)"];
    const localAppData = process.env.LOCALAPPDATA;
    if (programFiles) {
      candidates.push(
        path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      );
    }
    if (programFilesX86) {
      candidates.push(
        path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
      );
    }
    if (localAppData) candidates.push(path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"));
  }

  candidates.push("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge");

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && existsSync(candidate)) return candidate;
    if (!path.isAbsolute(candidate)) {
      const probe = spawnSync(candidate, ["--version"], {stdio: "ignore"});
      if (!probe.error && probe.status === 0) return candidate;
    }
  }

  throw new Error("No Chrome, Chromium, or Edge executable found. Set SCORE_ENGINE_AUDIT_BROWSER.");
}

async function assertHealthyBaseUrl(baseUrl) {
  const response = await fetch(baseUrl);
  if (!response.ok && response.status >= 500) {
    throw new Error(`${baseUrl} returned ${response.status} ${response.statusText}`);
  }
}

function pngSize(filePath) {
  return statSync(filePath).size;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadSymbolicCorpusSummary(summaryPath) {
  if (!summaryPath || !existsSync(summaryPath)) return null;
  try {
    return JSON.parse(readFileSync(summaryPath, "utf8"));
  } catch {
    return null;
  }
}

function buildGlyphClassCoverage(sourceCrops, implementation, symbolicCorpus) {
  const sourceCropIds = new Set(sourceCrops.map((crop) => crop.id));
  const implementationCropIds = new Set(implementation.crops.map((crop) => crop.id));
  const tokenMap = implementation.requiredNotationTokens;
  const policyByGlyphClass = new Map(
    (symbolicCorpus?.featurePolicy || []).map((policy) => [policy.id, policy]),
  );
  const requirements = GLYPH_CLASS_REQUIREMENTS.map((requirement) => {
    const sourcePolicy = policyByGlyphClass.get(requirement.id) ?? null;
    const sourceEvidence = requirement.sourceCropIds.every((cropId) => sourceCropIds.has(cropId));
    const implementationTokenEvidence = (requirement.implementationTokenKeys || []).every((tokenKey) => tokenMap[tokenKey] === true);
    const implementationCropEvidence = (requirement.implementationCropIds || []).every((cropId) =>
      implementationCropIds.has(cropId),
    );
    const hasImplementationEvidence =
      (requirement.implementationTokenKeys || []).length > 0
        ? implementationTokenEvidence
        : implementationCropEvidence;
    const status = sourceEvidence && hasImplementationEvidence && !requirement.requiresPolicy
      ? "covered"
      : sourceEvidence || hasImplementationEvidence
        ? "partial"
        : "missing";
    const blockers = [];
    if (!sourceEvidence) blockers.push("source crop missing");
    if (!hasImplementationEvidence) blockers.push("implementation evidence missing");
    if (requirement.requiresPolicy) blockers.push(`policy missing: ${requirement.requiresPolicy}`);
    if (sourcePolicy?.focusedPieceStatus && sourcePolicy.focusedPieceStatus !== "source-available") {
      blockers.push(`focused source class: ${sourcePolicy.focusedPieceStatus}`);
    }
    return {
      id: requirement.id,
      label: requirement.label,
      requiredForDesignQa: requirement.requiredForDesignQa,
      status,
      sourceClass: sourcePolicy?.focusedPieceStatus ?? (sourceEvidence ? "visual-crop-evidence" : "missing"),
      catalogSourceClass: sourcePolicy?.catalogStatus ?? null,
      sourcePolicyStatus: sourcePolicy?.currentStatus ?? null,
      sourcePolicyEvidence: sourcePolicy?.evidence ?? [],
      sourcePolicyAction: sourcePolicy?.requiredAction ?? null,
      sourceCropIds: requirement.sourceCropIds,
      implementationTokenKeys: requirement.implementationTokenKeys || [],
      implementationCropIds: requirement.implementationCropIds || [],
      blockers,
    };
  });
  const missingRequired = requirements.filter((requirement) =>
    requirement.requiredForDesignQa && requirement.status !== "covered",
  );
  return {
    readyForDesignQaPass: missingRequired.length === 0,
    coveredCount: requirements.filter((requirement) => requirement.status === "covered").length,
    partialCount: requirements.filter((requirement) => requirement.status === "partial").length,
    missingCount: requirements.filter((requirement) => requirement.status === "missing").length,
    missingRequired: missingRequired.map((requirement) => requirement.id),
    requirements,
  };
}

async function readImageStats(browser, imagePath) {
  const page = await browser.newPage({viewport: {width: 900, height: 700}});
  const href = `data:image/png;base64,${readFileSync(imagePath).toString("base64")}`;
  await page.setContent(`
    <html>
      <body style="margin:0;background:white">
        <img id="target" src="${href}" />
        <canvas id="canvas"></canvas>
      </body>
    </html>
  `);
  await page.waitForFunction(() => {
    const image = document.querySelector("#target");
    return image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  });
  const stats = await page.evaluate(() => {
    const image = document.querySelector("#target");
    const canvas = document.querySelector("#canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let sampledPixels = 0;
    let nonWhitePixels = 0;
    let darkPixels = 0;
    for (let index = 0; index < imageData.length; index += 16) {
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];
      sampledPixels += 1;
      if (red < 245 || green < 245 || blue < 245) nonWhitePixels += 1;
      if (red < 120 && green < 120 && blue < 120) darkPixels += 1;
    }
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      sampledPixels,
      nonWhiteRatio: Number((nonWhitePixels / sampledPixels).toFixed(4)),
      darkRatio: Number((darkPixels / sampledPixels).toFixed(4)),
    };
  });
  await page.close();
  return stats;
}

async function captureSourceCrops(browser, outputDir) {
  const page = await browser.newPage({viewport: {width: 900, height: 1200}, deviceScaleFactor: 1});
  const sourcePages = [];
  const crops = [];

  for (const sourcePage of SOURCE_PAGES) {
    await page.setContent(`
      <html>
        <body style="margin:0;background:#fff">
          <img id="score-source" src="${sourcePage.url}" style="display:block;width:800px;height:auto" />
        </body>
      </html>
    `);
    await page.waitForFunction(() => {
      const image = document.querySelector("#score-source");
      return image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    }, {timeout: 30_000});
    const sourceImage = await page.evaluate(() => {
      const image = document.querySelector("#score-source");
      return {
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: Math.round(image.getBoundingClientRect().width),
        renderedHeight: Math.round(image.getBoundingClientRect().height),
      };
    });

    sourcePages.push({
      id: sourcePage.id,
      url: sourcePage.url,
      ...sourceImage,
      expectedNaturalWidth: sourcePage.expectedNaturalWidth,
      expectedNaturalHeight: sourcePage.expectedNaturalHeight,
      dimensionMatch:
        sourceImage.naturalWidth === sourcePage.expectedNaturalWidth &&
        sourceImage.naturalHeight === sourcePage.expectedNaturalHeight,
    });

    for (const crop of SOURCE_CROPS.filter((candidate) => candidate.sourcePageId === sourcePage.id)) {
      const filePath = path.join(outputDir, `${crop.id}.png`);
      await page.screenshot({path: filePath, clip: crop.clip});
      crops.push({
        ...crop,
        path: path.relative(PROJECT_ROOT, filePath).replaceAll("\\", "/"),
        bytes: pngSize(filePath),
      });
    }
  }

  await page.close();
  return {sourcePages, crops};
}

async function captureImplementationCrops(browser, baseUrl, outputDir) {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
  await page.goto(`${baseUrl}${ROUTE}`, {waitUntil: "domcontentloaded"});
  await page.waitForSelector('[data-testid="vexflow-score-surface"] svg', {timeout: 15_000});
  // Workbench once demo dokumani cizer, sonra ilk erisilebilir tam dokumani
  // otomatik yukler; sabit bekleme demo manifestini okumaya acikti. Tam
  // dokuman (canonical-vex-map > 100 satir) gorunene dek bekle.
  await page.waitForFunction(
    () => {
      const map = document.querySelector('[data-testid="canonical-vex-map"]')?.textContent || "";
      return map.split("\n").filter((line) => line.trim()).length > 100;
    },
    {timeout: 45_000},
  );
  await page.waitForTimeout(400);

  const surfaceBox = await page.locator('[data-testid="vexflow-score-surface"]').boundingBox();
  if (!surfaceBox) throw new Error("Could not locate vexflow-score-surface");

  const renderManifest = await page.locator('[data-testid="score-render-systems"]').textContent();
  const vexMap = await page.locator('[data-testid="canonical-vex-map"]').textContent();
  const glyphMap = await page.locator('[data-testid="score-glyph-class-map"]').textContent();
  const bodyText = await page.locator("body").innerText();
  const svgPathCount = await page.locator('[data-testid="vexflow-score-surface"] svg path').count();
  const firstSystemsPath = path.join(outputDir, "implementation-first-systems.png");
  const denseSystemsPath = path.join(outputDir, "implementation-density-systems.png");
  const firstSystemsClip = {
    x: Math.max(0, surfaceBox.x + 34),
    y: Math.max(0, surfaceBox.y + 82),
    width: Math.min(1080, surfaceBox.width - 68),
    height: 420,
  };
  const denseSystemsClip = {
    x: Math.max(0, surfaceBox.x + 34),
    y: Math.max(0, surfaceBox.y + 230),
    width: Math.min(1080, surfaceBox.width - 68),
    height: 390,
  };

  await page.screenshot({path: firstSystemsPath, clip: firstSystemsClip});
  await page.screenshot({path: denseSystemsPath, clip: denseSystemsClip});
  await page.close();

  const systemLines = String(renderManifest || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const firstMeasureSystems = systemLines.filter((line) => /:m1:system:/.test(line));
  return {
    surfaceBox: {
      x: Math.round(surfaceBox.x),
      y: Math.round(surfaceBox.y),
      width: Math.round(surfaceBox.width),
      height: Math.round(surfaceBox.height),
    },
    renderSystemCount: systemLines.length,
    firstMeasureSystemCount: firstMeasureSystems.length,
    firstMeasureSystems,
    requiredNotationTokens: {
      hasKomaSharp: String(vexMap || "").includes(":#4"),
      hasKomaFlat: String(vexMap || "").includes(":b5"),
      hasRest: /:(?:w|h|q|8|16)r:/.test(String(vexMap || "")),
      hasDotted: String(vexMap || "").includes(":dotted:"),
      hasMeter28: String(glyphMap || "").includes("meter-label:28/4") || bodyText.includes("28/4"),
      hasClefSurface: svgPathCount > 20,
      hasSectionOrUsulText:
        String(glyphMap || "").includes("section-label:") && String(glyphMap || "").includes("usul-label:"),
      hasRepeatOrVolta: /(?:repeat-token|volta-token)/i.test(String(glyphMap || "")),
      hasSlurTieOrTriplet: /:(?:slur|tie|triplet|tuplet):/i.test(String(vexMap || "")),
      hasNaturalAccidental:
        String(glyphMap || "").includes("natural-accidental-token") || String(vexMap || "").includes(":n:"),
    },
    crops: [
      {
        id: "implementation-first-systems",
        label: "Implementation crop: first measure split into render systems",
        clip: firstSystemsClip,
        path: path.relative(PROJECT_ROOT, firstSystemsPath).replaceAll("\\", "/"),
        bytes: pngSize(firstSystemsPath),
      },
      {
        id: "implementation-density-systems",
        label: "Implementation crop: dense systems after segmentation",
        clip: denseSystemsClip,
        path: path.relative(PROJECT_ROOT, denseSystemsPath).replaceAll("\\", "/"),
        bytes: pngSize(denseSystemsPath),
      },
    ],
  };
}

async function captureComparisonBoard(browser, outputDir, sourceCrops, implementationCrops, glyphClassCoverage) {
  const comparisonPath = path.join(outputDir, "comparison-board.png");
  const page = await browser.newPage({viewport: {width: 1400, height: 1800}, deviceScaleFactor: 1});
  const toPngDataUri = (relativePath) => {
    const bytes = readFileSync(path.join(PROJECT_ROOT, relativePath));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  };
  const renderPanels = (crops, titlePrefix) => crops.map((crop) => `
    <article class="panel">
      <div class="label">${escapeHtml(titlePrefix)}: ${escapeHtml(crop.label)}</div>
      <img src="${toPngDataUri(crop.path)}" />
    </article>
  `).join("");
  const glyphRows = glyphClassCoverage.requirements.map((requirement) => `
    <tr class="status-${escapeHtml(requirement.status)}">
      <td>${escapeHtml(requirement.label)}</td>
      <td>${escapeHtml(requirement.status)}</td>
      <td>${escapeHtml(requirement.sourceCropIds.join(", "))}</td>
      <td>${escapeHtml(requirement.sourceClass)}${requirement.catalogSourceClass ? `<br/><span>${escapeHtml(`catalog: ${requirement.catalogSourceClass}`)}</span>` : ""}</td>
      <td>${escapeHtml([...requirement.implementationTokenKeys, ...requirement.implementationCropIds].join(", ") || "none")}</td>
      <td>${escapeHtml(requirement.blockers.join("; ") || "none")}</td>
    </tr>
  `).join("");
  await page.setContent(`
    <html>
      <head>
        <style>
          body {
            margin: 0;
            background: #f4efe7;
            color: #241006;
            font-family: Arial, sans-serif;
          }
          .board {
            padding: 24px;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }
          p {
            margin: 0 0 18px;
            max-width: 980px;
            line-height: 1.45;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            align-items: start;
          }
          .grid > div {
            display: grid;
            gap: 18px;
          }
          .panel {
            background: #fffdf9;
            border: 1px solid #d7c9bb;
            border-radius: 6px;
            padding: 14px;
          }
          .label {
            margin-bottom: 10px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: .02em;
            text-transform: uppercase;
          }
          img {
            display: block;
            width: 100%;
            height: auto;
            background: white;
            border: 1px solid #eadfd2;
          }
          .matrix {
            margin-top: 22px;
            background: #fffdf9;
            border: 1px solid #d7c9bb;
            border-radius: 6px;
            padding: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border-bottom: 1px solid #eadfd2;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            color: #5d2b13;
            font-size: 11px;
            text-transform: uppercase;
          }
          .status-covered td:first-child::before {
            content: "covered";
            display: inline-block;
            margin-right: 8px;
            color: #207344;
            font-weight: 700;
          }
          .status-partial td:first-child::before {
            content: "partial";
            display: inline-block;
            margin-right: 8px;
            color: #9a5a00;
            font-weight: 700;
          }
          .status-missing td:first-child::before {
            content: "missing";
            display: inline-block;
            margin-right: 8px;
            color: #9d2b1f;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <main class="board">
          <h1>ScoreEngine focused same-piece QA board</h1>
          <p>Left crops are from the same Hicazkar Pesrev source image. Right crops are from the canonical VexFlow surface. This board is structural QA evidence, not a claim of pixel-perfect engraving fidelity.</p>
          <section class="grid">
            <div>${renderPanels(sourceCrops, "Source")}</div>
            <div>${renderPanels(implementationCrops, "Implementation")}</div>
          </section>
          <section class="matrix">
            <div class="label">Glyph-class coverage matrix</div>
            <table>
              <thead>
                <tr>
                  <th>Glyph class</th>
                  <th>Status</th>
                  <th>Source evidence</th>
                  <th>Source class</th>
                  <th>Implementation evidence</th>
                  <th>Blockers</th>
                </tr>
              </thead>
              <tbody>${glyphRows}</tbody>
            </table>
          </section>
        </main>
      </body>
    </html>
  `);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
  await page.screenshot({path: comparisonPath, fullPage: true});
  await page.close();
  return {
    path: path.relative(PROJECT_ROOT, comparisonPath).replaceAll("\\", "/"),
    bytes: pngSize(comparisonPath),
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const baseUrl = (options.get("base-url") || DEFAULT_BASE_URL).replace(/\/$/, "");
  const outputDir = assertInsideProject(options.get("output-dir") || DEFAULT_OUTPUT_DIR);
  const summaryOutput = assertInsideProject(options.get("summary-output") || path.join(outputDir, "summary.json"));
  const symbolicCorpusSummaryPath = assertInsideProject(
    options.get("symbolic-corpus-summary") || DEFAULT_SYMBOLIC_CORPUS_SUMMARY,
  );
  const strictGlyphCoverage = options.get("strict-glyph-coverage") === "true";

  mkdirSync(outputDir, {recursive: true});
  await assertHealthyBaseUrl(baseUrl);

  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveBrowserExecutable(),
  });

  try {
    const source = await captureSourceCrops(browser, outputDir);
    const implementation = await captureImplementationCrops(browser, baseUrl, outputDir);
    const symbolicCorpus = loadSymbolicCorpusSummary(symbolicCorpusSummaryPath);
    const glyphClassCoverage = buildGlyphClassCoverage(source.crops, implementation, symbolicCorpus);
    const comparisonBoard = await captureComparisonBoard(
      browser,
      outputDir,
      source.crops,
      implementation.crops,
      glyphClassCoverage,
    );
    const allCrops = [...source.crops, ...implementation.crops, comparisonBoard];
    const cropStats = {};
    for (const crop of allCrops) {
      const absolutePath = path.join(PROJECT_ROOT, crop.path);
      cropStats[crop.path] = await readImageStats(browser, absolutePath);
    }

    const checks = {
      sourceLoaded: source.sourcePages.every((sourcePage) => sourcePage.naturalWidth > 0 && sourcePage.naturalHeight > 0),
      sourceDimensionsMatch: source.sourcePages.every((sourcePage) => sourcePage.dimensionMatch),
      sourceCropsNonBlank: source.crops.every((crop) => crop.bytes > 5_000 && cropStats[crop.path].nonWhiteRatio > 0.02),
      implementationCropsNonBlank: implementation.crops.every((crop) => crop.bytes > 5_000 && cropStats[crop.path].nonWhiteRatio > 0.02),
      implementationSplitsLongMeasure: implementation.firstMeasureSystemCount > 1,
      implementationHasBaselineNotationTokens: [
        "hasClefSurface",
        "hasMeter28",
        "hasKomaSharp",
        "hasKomaFlat",
        "hasRest",
        "hasDotted",
      ].every((tokenKey) => implementation.requiredNotationTokens[tokenKey] === true),
      comparisonBoardNonBlank: comparisonBoard.bytes > 10_000 && cropStats[comparisonBoard.path].nonWhiteRatio > 0.02,
    };
    const artifactErrors = Object.entries(checks)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    const glyphClassErrors = strictGlyphCoverage
      ? glyphClassCoverage.missingRequired.map((glyphClassId) => `glyphClassCoverage:${glyphClassId}`)
      : [];
    const errors = [...artifactErrors, ...glyphClassErrors];
    const summary = {
      version: 1,
      type: "score-engine-focused-crops",
      generatedAt: new Date().toISOString(),
      baseUrl,
      route: ROUTE,
      ok: errors.length === 0,
      errors,
      artifactErrors,
      glyphClassErrors,
      strictGlyphCoverage,
      samePieceSource: {
        id: "neyzen-hicazkar-pesrev-page-1",
        url: SAME_PIECE_SOURCE_URL,
        note: "Local QA crop only; not product media ingestion and not accepted source truth by itself.",
        pages: source.sourcePages,
      },
      sourceCrops: source.crops,
      implementation,
      symbolicCorpus: {
        loaded: Boolean(symbolicCorpus),
        path: path.relative(PROJECT_ROOT, symbolicCorpusSummaryPath).replaceAll("\\", "/"),
        ok: symbolicCorpus?.ok ?? false,
        generatedAt: symbolicCorpus?.generatedAt ?? null,
        verdict: symbolicCorpus?.verdict ?? null,
      },
      comparisonBoard,
      cropStats,
      checks,
      glyphClassCoverage,
      designQaVerdict: glyphClassCoverage.readyForDesignQaPass ? "passed" : "blocked",
      designQaBlocker: glyphClassCoverage.readyForDesignQaPass
        ? null
        : `Missing required glyph classes: ${glyphClassCoverage.missingRequired.join(", ")}`,
    };

    writeFileSync(summaryOutput, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
