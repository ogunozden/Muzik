#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_BASE_URL = "http://localhost:4015";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output", "playwright");
const LAYOUT_SUMMARY_PATH = path.join(PROJECT_ROOT, "output", "symbtr-layout-review", "layout-verification-summary.json");
const ROUTE = "/studio/score-engine";

const VIEWPORTS = [
  {name: "desktop", width: 1440, height: 1000},
  {name: "mobile", width: 390, height: 844},
];

const SOURCE_REFERENCE_POOL = [
  {
    id: "abc-hicazkar-osman-bey",
    kind: "symbolic-reference",
    url: "https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fmirror%2FSeymourShlien%2Fmakams%2Fmakamu10%2F0054",
    evidence: "Hicazkar Pesrev metadata has makam/form/usul and M: 28/4.",
  },
  {
    id: "ross-daly-hicaz-devri-kebir",
    kind: "engraving-reference",
    url: "https://www.rossdaly.gr/resources/Music_Scores/Pesrev/Hica%CC%82z%20Pesrev.pdf",
    evidence: "Printed 28/4 pesrev keeps clef, key context, staff spacing, beams, rests and section labels readable across systems.",
  },
  {
    id: "neyzen-hicaz-humayun-osman-bey",
    kind: "engraving-reference",
    url: "https://neyzen.com/nota_arsivi/02_klasik_eserler/037_hicaz_humayun/hicaz_humayun_pesrev_osman_bey_tanburi_buyuk.pdf",
    evidence: "Turkish music score shows 28/4, hane/teslim labels, repeat endings, accidentals, rests and dense beaming in one staff system.",
  },
  {
    id: "semazen-rast-devri-kebir",
    kind: "engraving-reference",
    url: "https://dosyalar.semazen.net/ayinnotalar/Rast-Nota.pdf",
    evidence: "Rast Pesrev page shows many staff systems with repeated clef/key context and dense note groups that stay inside staff width.",
  },
  {
    id: "vexflow-formatter",
    kind: "engine-reference",
    url: "https://www.vexflow.com/build/docs/formatter.html",
    evidence: "Formatter assigns tick grids and minimum widths for notes/modifiers; autobeam and rest alignment are explicit rendering concerns.",
  },
  {
    id: "vexflow-accidentals",
    kind: "engine-reference",
    url: "https://www.vexflow.com/build/docs/accidental.html",
    evidence: "Accidentals need column layout and vertical collision handling, not manual glyph placement by eye.",
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

function readLayoutSampleSummary() {
  if (!existsSync(LAYOUT_SUMMARY_PATH)) {
    return {
      path: path.relative(PROJECT_ROOT, LAYOUT_SUMMARY_PATH).replaceAll("\\", "/"),
      available: false,
    };
  }

  const summary = JSON.parse(readFileSync(LAYOUT_SUMMARY_PATH, "utf8"));
  return {
    path: path.relative(PROJECT_ROOT, LAYOUT_SUMMARY_PATH).replaceAll("\\", "/"),
    available: true,
    candidateEntries: Number(summary.candidateEntries ?? 0),
    verifiedEntries: Number(summary.verifiedEntries ?? 0),
    verifiedMeasureBoxes: Number(summary.verifiedMeasureBoxes ?? 0),
    unresolvedCandidateEntries: Number(summary.unresolvedCandidateEntries ?? 0),
    scoreMeasureSummaryCount: Array.isArray(summary.scoreMeasureSummaries) ? summary.scoreMeasureSummaries.length : 0,
    devriKebirExamples: Array.isArray(summary.scoreMeasureSummaries)
      ? summary.scoreMeasureSummaries
        .filter((entry) => String(entry.catalogId ?? "").includes("devrikebir"))
        .slice(0, 8)
        .map((entry) => ({
          catalogId: entry.catalogId,
          pdfMeasureCandidateCount: entry.pdfMeasureCandidateCount,
          symbtrMeasureCount: entry.symbtrMeasureCount,
        }))
      : [],
  };
}

async function assertHealthyBaseUrl(baseUrl) {
  const response = await fetch(baseUrl);
  if (!response.ok && response.status >= 500) {
    throw new Error(`${baseUrl} returned ${response.status} ${response.statusText}`);
  }
}

async function readScoreDocuments(baseUrl) {
  const response = await fetch(`${baseUrl}/api/score-engine/documents`);
  if (!response.ok) throw new Error(`/api/score-engine/documents returned ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.documents) ? payload.documents : [];
}

function makeAuditExpression() {
  return String.raw`
(() => {
  const bodyText = document.body.innerText || "";
  const doc = document.documentElement;
  const systemText = document.querySelector('[data-testid="score-render-systems"]')?.textContent || "";
  const vexMap = document.querySelector('[data-testid="canonical-vex-map"]')?.textContent || "";
  const systemLines = systemText.split("\n").map((line) => line.trim()).filter(Boolean);
  const systems = systemLines.map((line) => {
    const parts = line.split(":");
    const beatSpan = parts.pop() || "";
    const eventCount = Number(parts.pop() || 0);
    const segment = parts.pop() || "0/0";
    const [segmentIndex, segmentCount] = segment.split("/").map((part) => Number(part));
    const [startBeat, endBeat] = beatSpan.split("-").map((part) => Number(part));
    const measureMatch = line.match(/:m(\d+):system:(\d+):/);
    return {
      line,
      measureIndex: measureMatch ? Number(measureMatch[1]) : null,
      eventCount,
      segmentIndex,
      segmentCount,
      startBeat,
      endBeat,
      span: Number.isFinite(startBeat) && Number.isFinite(endBeat) ? endBeat - startBeat : null,
    };
  });
  const firstMeasureSystems = systems.filter((system) => system.measureIndex === 1);
  const surface = document.querySelector('[data-testid="vexflow-score-surface"]');
  const surfaceSvg = surface?.querySelector("svg");
  const overlaySvg = Array.from(document.querySelectorAll("svg")).find((svg) => svg !== surfaceSvg && svg.querySelector('line[stroke="#2f8a45"]'));
  const cursorLineHeights = overlaySvg
    ? Array.from(overlaySvg.querySelectorAll('line[stroke="#2f8a45"]'))
      .map((line) => Math.abs(Number(line.getAttribute("y2") || 0) - Number(line.getAttribute("y1") || 0)))
      .filter((height) => Number.isFinite(height))
    : [];
  const surfaceBox = surface?.getBoundingClientRect();
  const svgBox = surfaceSvg?.getBoundingClientRect();
  const outOfBoundsGraphics = surfaceSvg
    ? Array.from(surfaceSvg.querySelectorAll("*"))
      .filter((element) => typeof element.getBBox === "function")
      .map((element) => {
        try {
          const bbox = element.getBBox();
          return {
            tag: element.tagName,
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((bbox) => bbox.width > 0 && bbox.height > 0)
      .filter((bbox) => bbox.x < -2 || bbox.y < -2 || bbox.x + bbox.width > 1182 || bbox.y + bbox.height > ((surfaceBox?.height || 0) + 2))
      .slice(0, 12)
    : [];

  return {
    title: document.title,
    route: location.pathname,
    blankMain: !document.querySelector("main") || (document.querySelector("main")?.textContent || "").trim().length < 40,
    frameworkOverlay: Boolean(
      document.querySelector("[data-nextjs-dialog-overlay]") ||
      /(?:Runtime Error|Unhandled Runtime Error|Build Error|Module not found|Hydration failed)/i.test(bodyText),
    ),
    hasHorizontalOverflow: doc.scrollWidth > window.innerWidth + 1,
    scrollWidth: doc.scrollWidth,
    viewportWidth: window.innerWidth,
    systemCount: systems.length,
    firstMeasureSystemCount: firstMeasureSystems.length,
    firstMeasureSystems: firstMeasureSystems.map((system) => system.line),
    maxEventsPerSystem: Math.max(...systems.map((system) => system.eventCount), 0),
    maxBeatSpanPerSystem: Math.max(...systems.map((system) => system.span || 0), 0),
    denseSystemCount: systems.filter((system) => system.eventCount > 24).length,
    overlongSystemCount: systems.filter((system) => (system.span || 0) > 7.25).length,
    svgPathCount: surfaceSvg?.querySelectorAll("path").length || 0,
    svgBox: svgBox ? {width: Math.round(svgBox.width), height: Math.round(svgBox.height)} : null,
    surfaceBox: surfaceBox ? {width: Math.round(surfaceBox.width), height: Math.round(surfaceBox.height)} : null,
    outOfBoundsGraphics,
    requiredNotationTokens: {
      hasKomaSharp: vexMap.includes(":#4"),
      hasKomaFlat: vexMap.includes(":b5"),
      hasRest: /:(?:w|h|q|8|16)r:/.test(vexMap),
      hasDotted: vexMap.includes(":dotted:"),
      hasMeter28: bodyText.includes("28/4"),
      hasClefSurface: (surfaceSvg?.querySelectorAll("path").length || 0) > 20,
    },
    activeCursorLineCount: overlaySvg?.querySelectorAll('line[stroke="#2f8a45"]').length || 0,
    cursorLineMaxHeight: Math.max(...cursorLineHeights, 0),
  };
})()
`;
}

function collectCheckFailures(viewportResult) {
  const failures = [];
  const data = viewportResult.data;
  if (data.blankMain) failures.push("main content is blank");
  if (data.frameworkOverlay) failures.push("framework overlay is visible");
  if (data.hasHorizontalOverflow) failures.push("page has horizontal overflow");
  if (data.systemCount <= 0) failures.push("no score render systems found");
  // NOT: burada eskiden `firstMeasureSystemCount <= 1` kontrolu vardi ve
  // "ilk 28/4 olcusu birden fazla sisteme bolunmeli" diyordu. G6 pivotundan
  // sonra olcu izgarasi yazili mertebeden turuyor; demo eserin 1. olcusu
  // artik 5 event / 4 vurus tutuyor ve TEK sisteme SIGIYOR. Yani kontrol
  // gecersiz bir varsayimi kovaliyordu.
  //
  // Korunmasi gereken GERCEK degismez zaten asagida: hicbir sistem yogunluk
  // ya da vurus-acikligi sinirini asmamali. "Uzun olcu bolunur mu?"
  // sorusunun kendisi ise `score-layout.test.ts` icinde birim testiyle
  // korunuyor — tarayici denetimine gerek yok, CI'da da kosuyor.
  if (data.denseSystemCount > 0) failures.push(`${data.denseSystemCount} render systems exceed event density limit`);
  if (data.overlongSystemCount > 0) failures.push(`${data.overlongSystemCount} render systems exceed beat-span limit`);
  if (data.svgPathCount <= 20) failures.push("VexFlow SVG appears blank or under-rendered");
  if (data.outOfBoundsGraphics.length > 0) failures.push("VexFlow graphics extend outside the canonical surface");
  if (data.cursorLineMaxHeight > 180) failures.push("active cursor line extends beyond the active render system");
  for (const [key, value] of Object.entries(data.requiredNotationTokens)) {
    if (!value) failures.push(`missing notation token: ${key}`);
  }
  if (viewportResult.consoleWarningOrErrorCount > 0) failures.push("browser console has warnings/errors");
  return failures;
}

async function auditViewport(browser, baseUrl, viewport, screenshotOutput) {
  const page = await browser.newPage({
    viewport: {width: viewport.width, height: viewport.height},
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
  });
  const browserEvents = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      browserEvents.push({type: message.type(), text: message.text().slice(0, 240)});
    }
  });
  page.on("pageerror", (error) => {
    browserEvents.push({type: "pageerror", text: error.message.slice(0, 240)});
  });

  await page.goto(`${baseUrl}${ROUTE}`, {waitUntil: "domcontentloaded"});
  await page.waitForSelector('[data-testid="vexflow-score-surface"] svg', {timeout: 15_000});
  // Sabit bekleme yarisa acikti: workbench once demo dokumani cizer, sonra
  // ilk erisilebilir tam dokumani (279 event) otomatik yukler. Split/density
  // kontrolleri tam dokuman manifestine bakmali; canonical-vex-map satir
  // sayisi tam dokumani deterministik gosterir (demo ~15 satir).
  await page.waitForFunction(
    () => {
      const map = document.querySelector('[data-testid="canonical-vex-map"]')?.textContent || "";
      return map.split("\n").filter((line) => line.trim()).length > 100;
    },
    {timeout: 45_000},
  );
  await page.waitForTimeout(400);
  const data = await page.evaluate(makeAuditExpression());

  const playButton = page.getByRole("button", {name: "Motoru \u00c7al"});
  if (await playButton.count()) {
    await playButton.click();
    await page.waitForTimeout(1300);
    const playback = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const activeMatch = text.match(/(\d+)\/279\s*\u00b7\s*1\.\s*\u00f6l\u00e7\u00fc/);
      const cursorLines = document.querySelectorAll('svg line[stroke="#2f8a45"]').length;
      return {
        activeIndex: activeMatch ? Number(activeMatch[1]) : null,
        cursorLineCount: cursorLines,
        isPlaying: text.includes("Durdur"),
      };
    });
    data.playback = playback;
    const stopButton = page.getByRole("button", {name: "Durdur"});
    if (await stopButton.count()) await stopButton.click();
  } else {
    data.playback = {activeIndex: null, cursorLineCount: 0, isPlaying: false};
  }

  if (screenshotOutput && viewport.name === "desktop") {
    await page.screenshot({path: screenshotOutput, fullPage: false});
  }

  await page.close();
  const result = {
    viewport,
    data,
    browserEvents,
    consoleWarningOrErrorCount: browserEvents.length,
  };
  return {
    ...result,
    checkFailures: collectCheckFailures(result),
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const baseUrl = (options.get("base-url") || DEFAULT_BASE_URL).replace(/\/$/, "");
  const summaryOutput = assertInsideProject(
    options.get("summary-output") || path.join(OUTPUT_DIR, "score-engine-engraving-audit.json"),
  );
  const screenshotOutput = assertInsideProject(
    options.get("screenshot-output") || path.join(OUTPUT_DIR, "score-engine-engraving-audit.png"),
  );

  mkdirSync(path.dirname(summaryOutput), {recursive: true});
  mkdirSync(path.dirname(screenshotOutput), {recursive: true});
  await assertHealthyBaseUrl(baseUrl);

  const documents = await readScoreDocuments(baseUrl);
  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveBrowserExecutable(),
  });

  try {
    const viewports = [];
    for (const viewport of VIEWPORTS) {
      viewports.push(await auditViewport(browser, baseUrl, viewport, screenshotOutput));
    }

    const errors = viewports.flatMap((viewport) =>
      viewport.checkFailures.map((failure) => `${viewport.viewport.name}: ${failure}`),
    );
    const summary = {
      version: 1,
      type: "score-engine-engraving-audit",
      generatedAt: new Date().toISOString(),
      baseUrl,
      route: ROUTE,
      ok: errors.length === 0,
      errors,
      sourceReferencePool: SOURCE_REFERENCE_POOL,
      localSamplePool: readLayoutSampleSummary(),
      canonicalDocuments: documents.map((document) => ({
        id: document.id,
        title: document.title,
        eventCount: document.eventCount,
        measureCount: document.measureCount,
        validationOk: document.validation?.ok === true,
        qualityStatus: document.quality?.status ?? null,
      })),
      viewports,
      screenshot: path.relative(PROJECT_ROOT, screenshotOutput).replaceAll("\\", "/"),
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
