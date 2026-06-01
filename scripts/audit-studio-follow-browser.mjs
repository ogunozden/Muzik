#!/usr/bin/env node
import {spawn, spawnSync} from "node:child_process";
import {existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output", "playwright");
const TEMP_ROOT = path.join(PROJECT_ROOT, ".layout-guard");
const DEFAULT_BASE_URL = "http://localhost:4015";
const ROUTE = "/studio/follow";

const VIEWPORTS = [
  {name: "desktop", width: 1440, height: 1000},
  {name: "mobile", width: 390, height: 844},
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
    throw new Error(`Refusing to use path outside project: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function resolveBrowserExecutable() {
  if (process.env.STUDIO_FOLLOW_AUDIT_BROWSER) return process.env.STUDIO_FOLLOW_AUDIT_BROWSER;

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

  throw new Error("No Chrome, Chromium, or Edge executable found. Set STUDIO_FOLLOW_AUDIT_BROWSER.");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") reject(new Error("Could not allocate debug port."));
        else resolve(address.port);
      });
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "unknown error"}`);
}

async function createTarget(debugPort) {
  const endpoint = `http://127.0.0.1:${debugPort}/json/new?about:blank`;
  let response = await fetch(endpoint, {method: "PUT"});
  if (!response.ok) response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Could not create browser target: ${response.status}`);
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) throw new Error("Browser target did not expose websocket URL.");
  return target.webSocketDebuggerUrl;
}

function createCdpClient(wsUrl) {
  if (typeof WebSocket !== "function") throw new Error("Node runtime does not provide WebSocket.");
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  const handlers = new Map();
  let nextId = 0;
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, {once: true});
    socket.addEventListener("error", reject, {once: true});
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const {resolve, reject, timer, method} = pending.get(message.id);
      clearTimeout(timer);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
      return;
    }
    if (message.method && handlers.has(message.method)) {
      for (const handler of handlers.get(message.method)) handler(message.params ?? {});
    }
  });

  return {
    async ready() {
      await opened;
    },
    send(method, params = {}, timeoutMs = 15_000) {
      const id = ++nextId;
      socket.send(JSON.stringify({id, method, params}));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }, timeoutMs);
        pending.set(id, {method, resolve, reject, timer});
      });
    },
    on(method, handler) {
      const current = handlers.get(method) ?? new Set();
      current.add(handler);
      handlers.set(method, current);
    },
    close() {
      socket.close();
    },
  };
}

function createProfileDir() {
  mkdirSync(TEMP_ROOT, {recursive: true});
  const profileDir = mkdtempSync(path.join(TEMP_ROOT, "studio-follow-audit-"));
  assertInsideProject(profileDir);
  return profileDir;
}

async function removeProfileDir(profileDir) {
  assertInsideProject(profileDir);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      rmSync(profileDir, {recursive: true, force: true});
      return;
    } catch {
      await delay(250 * (attempt + 1));
    }
  }

  console.warn(`Warning: could not remove browser profile ${path.relative(PROJECT_ROOT, profileDir)}; it is inside .layout-guard.`);
}

async function assertHealthyBaseUrl(baseUrl) {
  const response = await fetch(baseUrl);
  if (!response.ok && response.status >= 500) {
    throw new Error(`${baseUrl} returned ${response.status} ${response.statusText}`);
  }
}

async function navigate(client, baseUrl, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 700,
  });
  await client.send("Page.navigate", {url: `${baseUrl}${ROUTE}`});
  await delay(1600);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed.");
  }
  return result.result.value;
}

const AUDIT_EXPRESSION = String.raw`
(async () => {
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      if (predicate()) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };
  await waitFor(() => document.body.innerText.includes("Hicazkar Peşrev"));
  await waitFor(() => document.body.innerText.includes("Yerel SymbTr kaynakları"));

  const textOf = () => document.body.innerText;
  const normalizedTextOf = () => textOf().toLocaleLowerCase("tr-TR");
  const has = (needle) => textOf().includes(needle);
  const hasText = (needle) => normalizedTextOf().includes(needle.toLocaleLowerCase("tr-TR"));
  const labelControl = (labelText) => {
    const label = Array.from(document.querySelectorAll("label")).find((item) => item.textContent.includes(labelText));
    const forId = label?.getAttribute("for");
    return forId ? document.getElementById(forId) : label?.querySelector("input,select,textarea");
  };
  const clickButton = (name) => {
    const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent.trim() === name);
    if (!button) return false;
    button.click();
    return true;
  };

  const setInputValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", {bubbles: true}));
    input.dispatchEvent(new Event("change", {bubbles: true}));
  };

  const bpmInput = document.querySelector('input[aria-label="BPM değeri"]');
  if (bpmInput) {
    setInputValue(bpmInput, "96");
  }

  const melodicSelect = document.querySelector('select[aria-label="Melodik enstrüman ekle"]');
  if (melodicSelect) {
    melodicSelect.value = "ney";
    melodicSelect.dispatchEvent(new Event("change", {bubbles: true}));
  }
  const addMelodicClicked = clickButton("Ekle");

  const percussionSelect = document.querySelector('select[aria-label="Vurmalı enstrüman ekle"]');
  if (percussionSelect) {
    percussionSelect.value = "def";
    percussionSelect.dispatchEvent(new Event("change", {bubbles: true}));
  }
  const percussionChanged = clickButton("Değiştir");
  await new Promise((resolve) => setTimeout(resolve, 300));

  const catalogSearch = labelControl("Katalog ara");
  if (catalogSearch) {
    setInputValue(catalogSearch, "aldanma dunya");
  }
  await new Promise((resolve) => setTimeout(resolve, 300));

  const doc = document.documentElement;
  const requiredTexts = {
    title: hasText("Hicazkar Peşrev"),
    playButton: hasText("Parçayı Çal"),
    bpm: has("96 BPM") || has("72 BPM"),
    makam: hasText("Hicazkar"),
    usul: hasText("Usul Devr-i Kebir") && has("28/4"),
    currentCue: hasText("Takip") && hasText("Hazır") && hasText("1. HANE"),
    notation: has("Fa♯4/5") && has("SymbTr F5#4"),
    turkishPitch: has("Koma53") && has("Rast=A4"),
    visualTracking: hasText("Sayfa eşleme") && hasText("Aktif satır") && hasText("Yakın notalar"),
    localSymbTrSources: hasText("Yerel SymbTr kaynakları"),
    externalSources: hasText("Kaynak") && has("SymbTr v3 Zenodo") && has("MTG/SymbTr GitHub"),
    pdfCandidateSafety: hasText("PDF vektör ölçü adayları") && hasText("Bu veriler kesin ölçü kutusu olarak işaretlenmez"),
    verifiedPdfStatus: hasText("Doğrulanmış PDF ölçü kutusu: 0") || hasText("Doğrulanmış PDF ölçü kutusu: 1"),
    sampleFallback: hasText("sample yok, sentez kullanılır") || hasText("Sample"),
    instrumentControls: Boolean(melodicSelect) && Boolean(percussionSelect) && addMelodicClicked && percussionChanged,
    catalogSearch: Boolean(catalogSearch) && (hasText("aldanma dunya") || has("aldanma_dunya") || hasText("Aldanma Dunya")),
  };

  return {
    url: location.href,
    title: document.title,
    requiredTexts,
    allRequiredTextsPresent: Object.values(requiredTexts).every(Boolean),
    dimensions: {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
    },
  };
})()
`;

async function captureScreenshot(client, outputPath) {
  const metrics = await client.send("Page.getLayoutMetrics");
  const contentSize = metrics.contentSize;
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.min(contentSize.width, 1600),
      height: Math.min(contentSize.height, 12000),
      scale: 1,
    },
  });
  writeFileSync(outputPath, Buffer.from(screenshot.data, "base64"));
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const baseUrl = (options.get("base-url") ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const summaryOutput = assertInsideProject(options.get("summary-output") ?? path.join(OUTPUT_DIR, "studio-follow-browser-audit-20260601.json"));
  const screenshotOutput = assertInsideProject(options.get("screenshot-output") ?? path.join(OUTPUT_DIR, "studio-follow-browser-audit-20260601.png"));
  const browserExecutable = resolveBrowserExecutable();
  const debugPort = await findFreePort();
  const profileDir = createProfileDir();
  const browserEvents = [];

  await assertHealthyBaseUrl(baseUrl);

  const browser = spawn(browserExecutable, [
    "--headless=new",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "about:blank",
  ], {stdio: ["ignore", "ignore", "pipe"]});
  browser.stderr.on("data", () => undefined);

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const wsUrl = await createTarget(debugPort);
    const client = createCdpClient(wsUrl);
    await client.ready();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    client.on("Runtime.exceptionThrown", (params) => browserEvents.push({type: "exception", text: params.exceptionDetails?.text ?? "runtime exception"}));
    client.on("Log.entryAdded", (params) => {
      if (params.entry?.level === "error" || params.entry?.level === "warning") {
        browserEvents.push({type: params.entry.level, text: params.entry.text});
      }
    });

    const viewportResults = [];
    for (const viewport of VIEWPORTS) {
      await navigate(client, baseUrl, viewport);
      const result = await evaluate(client, AUDIT_EXPRESSION);
      viewportResults.push({viewport: viewport.name, ...result});
      if (viewport.name === "desktop") {
        mkdirSync(path.dirname(screenshotOutput), {recursive: true});
        await captureScreenshot(client, screenshotOutput);
      }
    }

    const summary = {
      version: 1,
      type: "studio-follow-browser-audit",
      generatedAt: "2026-06-01",
      baseUrl,
      route: ROUTE,
      viewports: viewportResults,
      browserWarningOrErrorCount: browserEvents.length,
      browserEvents,
      screenshot: path.relative(PROJECT_ROOT, screenshotOutput).split(path.sep).join("/"),
      ok: browserEvents.length === 0 && viewportResults.every((result) => (
        result.allRequiredTextsPresent && !result.dimensions.horizontalOverflow
      )),
    };

    mkdirSync(path.dirname(summaryOutput), {recursive: true});
    writeFileSync(summaryOutput, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));

    if (!summary.ok) process.exitCode = 1;
    await client.send("Browser.close").catch(() => undefined);
    client.close();
  } finally {
    if (browser.exitCode === null && browser.signalCode === null) browser.kill();
    await delay(500);
    await removeProfileDir(profileDir);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
