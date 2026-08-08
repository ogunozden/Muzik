#!/usr/bin/env node
/**
 * Prod-cycle audit'ini URETIM SUNUCUSUYLA tek komutta kosar.
 *
 * `audit:prod-cycle` tarayici denetimleri ve layout-guard icin
 * `http://localhost:4015` adresinde CALISAN bir uretim sunucusu bekler;
 * sunucuyu kendisi baslatmaz. Bu kosucu, E2E kosucusundaki desenle (Node
 * child process) sunucuyu ayaga kaldirir, audit'i kosar ve kapatir —
 * Windows/POSIX ayrimi yok, kabuk-bagimli arka plan yok.
 */
import {spawn, spawnSync} from "node:child_process";
import net from "node:net";
import process from "node:process";

const PORT = Number(process.env.PROD_CYCLE_PORT ?? 4015);
const BASE_URL = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {method: "GET"});
      if (response.ok) return true;
    } catch {
      // Sunucu henuz ayakta degil.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}

function killServerTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {stdio: "ignore"});
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Zaten kapandi.
    }
  }
}

async function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

const skipBuild = process.argv.includes("--skip-build");
if (!skipBuild) {
  console.log("[prod-cycle] uretim derlemesi olusturuluyor…");
  const buildStatus = run(npx, ["next", "build"]);
  if (buildStatus !== 0) {
    console.error("[prod-cycle] `next build` basarisiz — audit kosulmadi.");
    process.exit(buildStatus);
  }
}

console.log(`[prod-cycle] uretim sunucusu baslatiliyor (port ${PORT})…`);
if (await isPortListening(PORT)) {
  console.error(`[prod-cycle] port ${PORT} zaten dinleniyor — orfan bir sunucu olabilir. Once temizleyin.`);
  process.exit(1);
}
const server = spawn(npx, ["next", "start", "-p", String(PORT)], {
  stdio: "ignore",
  shell: process.platform === "win32",
});

let exitCode = 1;
try {
  const ready = await waitForServer(BASE_URL, READY_TIMEOUT_MS);
  if (!ready) {
    console.error(`[prod-cycle] sunucu ${READY_TIMEOUT_MS} ms icinde yanit vermedi.`);
  } else {
    console.log("[prod-cycle] sunucu hazir; audit kosuyor…");
    exitCode = run(npm, ["run", "audit:prod-cycle"]);
  }
} finally {
  killServerTree(server.pid);
}

console.log(`[prod-cycle] audit cikisi: ${exitCode === 0 ? "OK" : "FAILED"}`);
process.exit(exitCode);
