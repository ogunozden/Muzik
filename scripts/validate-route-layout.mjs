import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const appDir = path.join(projectRoot, "src", "app");
const layoutGuardTempRoot = path.join(projectRoot, ".layout-guard");
const cliOptions = parseCliOptions(process.argv.slice(2));

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
];

const BASE_URL_CANDIDATES = [
  "http://localhost:4000",
  "http://localhost:4001",
  "http://localhost:4002",
  "http://localhost:3000",
];

const CHECK_EXPRESSION = String.raw`
(async () => {
  const waitForMeaningfulMain = async () => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const main = document.querySelector("main");
      const mainText = ((main?.innerText || main?.textContent || "")).trim();
      if (mainText.length >= 20) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  await waitForMeaningfulMain();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }

  const doc = document.documentElement;
  const body = document.body;
  const main = document.querySelector("main");
  const bodyText = (body?.innerText || "").trim();
  const mainText = ((main?.innerText || main?.textContent || "")).trim();
  const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth || 0);
  const frameworkOverlay = Boolean(
    document.querySelector("[data-nextjs-dialog-overlay]") ||
    /(?:Runtime Error|Unhandled Runtime Error|Build Error|Module not found|Hydration failed)/i.test(bodyText),
  );

  const offscreenElements = Array.from(document.querySelectorAll("body *"))
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (rect.width < 1 || rect.height < 1) return false;
      if (style.position === "fixed" && rect.bottom < 0) return false;
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    })
    .slice(0, 8)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className: String(element.className || "").slice(0, 96),
        text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 96),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    });

  return {
    url: location.href,
    title: document.title,
    viewportWidth: window.innerWidth,
    scrollWidth,
    horizontalOverflow: scrollWidth > window.innerWidth + 1,
    blankMain: !main || mainText.length < 20,
    frameworkOverlay,
    offscreenElements,
  };
})()
`;

function parseCliOptions(args) {
  const options = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(rawKey, inlineValue);
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      options.set(rawKey, next);
      index += 1;
    } else {
      options.set(rawKey, "true");
    }
  }

  return options;
}

function discoverRoutes() {
  const configuredRoutes = cliOptions.get("routes") || process.env.LAYOUT_GUARD_ROUTES;
  if (configuredRoutes) {
    return configuredRoutes.split(",")
      .map((route) => route.trim())
      .filter(Boolean)
      .map((route) => (route.startsWith("/") ? route : `/${route}`));
  }

  const routes = [];

  function walk(dir, segments) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith("_") || entry.name === "api") continue;
      if (entry.name.startsWith("@")) continue;
      if (entry.name.startsWith("[") && entry.name.endsWith("]")) continue;

      const nextSegments = entry.name.startsWith("(") && entry.name.endsWith(")")
        ? segments
        : [...segments, entry.name];

      walk(path.join(dir, entry.name), nextSegments);
    }

    if (existsSync(path.join(dir, "page.tsx"))) {
      routes.push(`/${segments.join("/")}`.replace(/\/$/, "") || "/");
    }
  }

  walk(appDir, []);
  return [...new Set(routes)].sort((a, b) => a.localeCompare(b));
}

async function resolveBaseUrl() {
  const configuredBaseUrl = cliOptions.get("base-url") || process.env.LAYOUT_GUARD_BASE_URL;
  const candidates = configuredBaseUrl
    ? [configuredBaseUrl]
    : BASE_URL_CANDIDATES;
  const failures = [];

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\/$/, "");
    const health = await checkBaseUrlHealth(normalized);
    if (health.ok) {
      return normalized;
    }
    failures.push(`${normalized}: ${health.reason}`);
  }

  throw new Error(
    `No healthy local app found. Start the dev server first, or set --base-url/ LAYOUT_GUARD_BASE_URL.\n${failures.join("\n")}`,
  );
}

async function checkBaseUrlHealth(baseUrl) {
  try {
    const response = await fetch(baseUrl, { method: "GET" });
    if (!response.ok && response.status >= 500) {
      return {ok: false, reason: `${response.status} ${response.statusText}`};
    }

    const html = await response.text();
    const assetUrls = Array.from(html.matchAll(/(?:href|src)="([^"]*\/_next\/static\/[^"]+\.(?:css|js)(?:\?[^"]*)?)"/g))
      .map((match) => match[1])
      .slice(0, 8);

    for (const assetUrl of assetUrls) {
      const assetResponse = await fetch(new URL(assetUrl, baseUrl).toString(), {method: "GET"});
      const contentType = assetResponse.headers.get("content-type") || "";

      if (!assetResponse.ok) {
        return {ok: false, reason: `asset ${assetUrl} returned ${assetResponse.status}`};
      }

      if (assetUrl.includes(".css") && !contentType.includes("text/css")) {
        return {ok: false, reason: `asset ${assetUrl} returned ${contentType || "unknown MIME"}`};
      }

      if (assetUrl.includes(".js") && !contentType.includes("javascript")) {
        return {ok: false, reason: `asset ${assetUrl} returned ${contentType || "unknown MIME"}`};
      }
    }

    return {ok: true, reason: "ok"};
  } catch (error) {
    return {ok: false, reason: error.message};
  }
}

function resolveBrowserExecutable() {
  if (process.env.LAYOUT_GUARD_BROWSER) {
    return process.env.LAYOUT_GUARD_BROWSER;
  }

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
    if (localAppData) {
      candidates.push(path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"));
    }
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  }

  candidates.push("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge");

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && existsSync(candidate)) {
      return candidate;
    }

    if (!path.isAbsolute(candidate)) {
      const probe = spawnSync(candidate, ["--version"], { stdio: "ignore" });
      if (!probe.error && probe.status === 0) {
        return candidate;
      }
    }
  }

  throw new Error(
    "No Chrome, Chromium, or Edge executable found. Set LAYOUT_GUARD_BROWSER to an installed browser path.",
  );
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Could not allocate a local debugging port."));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertInsideProject(targetPath) {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(projectRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to touch a path outside the project: ${resolvedTarget}`);
  }
}

function createProfileDir() {
  mkdirSync(layoutGuardTempRoot, { recursive: true });
  const profileDir = mkdtempSync(path.join(layoutGuardTempRoot, "chrome-profile-"));
  assertInsideProject(profileDir);
  return profileDir;
}

async function waitForProcessExit(child, timeoutMs = 10_000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeDirectoryWithRetry(dir) {
  assertInsideProject(dir);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      await delay(250 * (attempt + 1));
    }
  }

  console.warn(`Warning: could not remove browser profile ${path.relative(projectRoot, dir)}; it is inside the ignored .layout-guard directory.`);
}

async function waitForJson(url, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "unknown error"}`);
}

async function createTarget(debugPort) {
  const endpoint = `http://127.0.0.1:${debugPort}/json/new?about:blank`;
  let response = await fetch(endpoint, { method: "PUT" });
  if (!response.ok) {
    response = await fetch(endpoint);
  }
  if (!response.ok) {
    throw new Error(`Could not create Chrome target: ${response.status} ${response.statusText}`);
  }

  const target = await response.json();
  if (!target.webSocketDebuggerUrl) {
    throw new Error("Chrome target did not expose a webSocketDebuggerUrl.");
  }
  return target.webSocketDebuggerUrl;
}

function createCdpClient(wsUrl) {
  if (typeof WebSocket !== "function") {
    throw new Error("This Node.js runtime does not provide global WebSocket.");
  }

  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  const eventHandlers = new Map();
  let nextId = 0;

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer);
      pending.delete(message.id);

      if (message.error) {
        reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ""}`));
      } else {
        resolve(message.result);
      }
      return;
    }

    if (message.method && eventHandlers.has(message.method)) {
      for (const handler of eventHandlers.get(message.method)) {
        handler(message.params || {});
      }
    }
  });

  socket.addEventListener("close", () => {
    for (const [id, { method, reject, timer }] of pending.entries()) {
      clearTimeout(timer);
      reject(new Error(`CDP socket closed before command completed: ${method} (#${id}).`));
    }
    pending.clear();
  });

  return {
    async ready() {
      await opened;
    },
    send(method, params = {}, timeoutMs = 10_000) {
      const id = ++nextId;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }, timeoutMs);
        pending.set(id, { method, resolve, reject, timer });
      });
    },
    on(method, handler) {
      const handlers = eventHandlers.get(method) || new Set();
      handlers.add(handler);
      eventHandlers.set(method, handlers);
      return () => handlers.delete(handler);
    },
    once(method, timeoutMs = 10_000) {
      return new Promise((resolve, reject) => {
        const off = this.on(method, (params) => {
          clearTimeout(timer);
          off();
          resolve(params);
        });
        const timer = setTimeout(() => {
          off();
          reject(new Error(`Timed out waiting for ${method}`));
        }, timeoutMs);
      });
    },
    close() {
      socket.close();
    },
  };
}

async function runLayoutCheck(client, baseUrl, route, viewport, browserErrors) {
  const url = `${baseUrl}${route}`;
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 700,
  });

  const loadEvent = client.once("Page.loadEventFired", 15_000).catch(() => undefined);
  await client.send("Page.navigate", { url }, 15_000);
  await loadEvent;

  const result = await client.send("Runtime.evaluate", {
    expression: CHECK_EXPRESSION,
    awaitPromise: true,
    returnByValue: true,
  }, 15_000);

  if (result.exceptionDetails) {
    throw new Error(`Runtime evaluation failed on ${route} (${viewport.name}).`);
  }

  const value = result.result.value;
  const issues = [];

  if (value.frameworkOverlay) issues.push("framework overlay detected");
  if (value.blankMain) issues.push("main content is blank or too short");
  if (value.horizontalOverflow) {
    issues.push(`horizontal overflow: viewport ${value.viewportWidth}px, document ${value.scrollWidth}px`);
  }

  const pageErrors = browserErrors.splice(0);
  if (pageErrors.length > 0) {
    issues.push(`browser errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  }

  if (issues.length > 0) {
    const offscreen = value.offscreenElements
      .map((element) => `${element.tag}.${element.className} ${element.left}-${element.right}px "${element.text}"`)
      .join("\n  ");
    throw new Error(
      `${route} (${viewport.name}) failed: ${issues.join("; ")}${offscreen ? `\n  Offscreen candidates:\n  ${offscreen}` : ""}`,
    );
  }

  const offscreenNote = value.offscreenElements.length > 0
    ? `; ${value.offscreenElements.length} clipped candidates within non-overflowing page`
    : "";
  console.log(`OK ${viewport.name.padEnd(7)} ${route.padEnd(18)} ${value.title || "(untitled)"}${offscreenNote}`);
}

async function main() {
  const routes = discoverRoutes();
  if (routes.length === 0) {
    throw new Error("No static app routes found under src/app.");
  }

  const baseUrl = await resolveBaseUrl();
  const browserExecutable = resolveBrowserExecutable();
  const debugPort = await findFreePort();
  const profileDir = createProfileDir();
  const browserErrors = [];
  const browserEnv = { ...process.env };
  for (const key of Object.keys(browserEnv)) {
    if (key.startsWith("LAYOUT_GUARD_")) {
      delete browserEnv[key];
    }
  }

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
  ], {
    env: browserEnv,
    stdio: ["ignore", "ignore", "pipe"],
  });

  browser.stderr.on("data", () => undefined);

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const wsUrl = await createTarget(debugPort);
    const client = createCdpClient(wsUrl);
    await client.ready();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");

    client.on("Runtime.exceptionThrown", (params) => {
      const details = params.exceptionDetails;
      browserErrors.push((details?.text || "runtime exception").slice(0, 240));
    });
    client.on("Log.entryAdded", (params) => {
      if (params.entry?.level === "error") {
        browserErrors.push(String(params.entry.text || "browser log error").slice(0, 240));
      }
    });

    console.log(`Layout guard base URL: ${baseUrl}`);
    console.log(`Routes: ${routes.join(", ")}`);

    for (const route of routes) {
      for (const viewport of VIEWPORTS) {
        await runLayoutCheck(client, baseUrl, route, viewport, browserErrors);
      }
    }

    await client.send("Browser.close").catch(() => undefined);
    client.close();
    console.log(`Layout guard passed for ${routes.length} routes across ${VIEWPORTS.length} viewports.`);
  } finally {
    if (browser.exitCode === null && browser.signalCode === null) {
      browser.kill();
    }
    await waitForProcessExit(browser);
    await removeDirectoryWithRetry(profileDir);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
