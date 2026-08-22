import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

const packageJson = readJson("package.json");
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

const bannedDependencies = [
  "@heroui/react",
  "@heroui/styles",
  "tailwind-variants",
  "i18next-http-backend",
  "i18next-localstorage-cache",
  "socket.io",
  "socket.io-client",
  "cors",
  "@next/bundle-analyzer",
];

for (const dependency of bannedDependencies) {
  if (dependencies[dependency]) {
    failures.push(`Remove banned dependency from package.json: ${dependency}`);
  }
}

const bannedActivePaths = [
  "src/app/ensemble/page.tsx",
  "src/app/tutorial/page.tsx",
  "src/hooks/useEnsemble.ts",
  "src/hooks/useOrchestrator.ts",
  "src/contexts/OrchestratorContext.tsx",
];

for (const relativePath of bannedActivePaths) {
  if (exists(relativePath)) {
    failures.push(`Move inactive/deferred file under gereksiz: ${relativePath}`);
  }
}

const requiredProductRoutes = [
  "src/app/studio/page.tsx",
  "src/app/studio/follow/page.tsx",
  "src/app/archive/page.tsx",
  "src/app/rhythm/page.tsx",
  "src/app/samples/page.tsx",
];

for (const relativePath of requiredProductRoutes) {
  if (!exists(relativePath)) {
    failures.push(`Missing required product route: ${relativePath}`);
  }
}

const legacyRedirectRoutes = [
  "src/app/nota-editor/page.tsx",
  "src/app/eser-takip/page.tsx",
  "src/app/usul/page.tsx",
  "src/app/sesler/page.tsx",
  "src/app/makam/page.tsx",
  "src/app/nota/page.tsx",
  "src/app/recording/page.tsx",
];

for (const relativePath of legacyRedirectRoutes) {
  if (!exists(relativePath)) continue;
  const content = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (!content.includes("redirect(")) {
    failures.push(`Legacy route must only redirect: ${relativePath}`);
  }
}

const navigationConfigPath = "src/shared/config/navigation.config.ts";
if (exists(navigationConfigPath)) {
  const navigationConfig = fs.readFileSync(path.join(root, navigationConfigPath), "utf8");
  const primaryNavigationBlock = navigationConfig.match(
    /export const navigation:\s*NavItem\[\]\s*=\s*\[([\s\S]*?)\n\];/
  )?.[1] ?? "";
  const requiredVisibleRouteKeys = [
    "studio",
    "studioFollow",
    "references",
    "referencesCuration",
    "archive",
    "rhythm",
    "samples",
  ];

  for (const routeKey of requiredVisibleRouteKeys) {
    const idPattern = new RegExp(`id:\\s*["']${routeKey}["']`);
    const hrefPattern = new RegExp(`href:\\s*routes\\.${routeKey}\\b`);
    if (!idPattern.test(primaryNavigationBlock) || !hrefPattern.test(primaryNavigationBlock)) {
      failures.push(`Static app route must be visible in main navigation: ${routeKey}`);
    }
  }

  // Legacy aliaslar TEK KAYNAK: src/shared/config/legacy-routes.ts LEGACY_ROUTE_MAP
  const usesLegacyMap = navigationConfig.includes("LEGACY_ROUTE_MAP") && navigationConfig.includes("legacyNavigationAliases");
  if (!usesLegacyMap) {
    failures.push("Legacy alias must be derived from LEGACY_ROUTE_MAP (centralized atomic source): src/shared/config/navigation.config.ts");
  }
  // Legacy id'ler ana navigasyonda GORUNMEZ olmali
  const legacyIdsInPrimary = ["makam", "usul", "nota", "notaEditor", "recording", "sesler", "eserTakip"];
  for (const routeKey of legacyIdsInPrimary) {
    const idPattern = new RegExp(`id:\\s*["']${routeKey}["']`);
    if (idPattern.test(primaryNavigationBlock)) {
      failures.push(`Legacy redirect route must not be visible in main navigation: ${routeKey}`);
    }
  }
  // Tek kaynak dosyasi var mi ve 7 anahtar tam mi?
  const legacyRoutesPath = "src/shared/config/legacy-routes.ts";
  if (exists(legacyRoutesPath)) {
    const legacyRoutes = fs.readFileSync(path.join(root, legacyRoutesPath), "utf8");
    const requiredLegacyPaths = ["makam", "usul", "nota", "nota-editor", "recording", "sesler", "eser-takip"];
    for (const p of requiredLegacyPaths) {
      if (!legacyRoutes.includes(`"${p}"`) && !legacyRoutes.includes(`'${p}'`) && !legacyRoutes.includes(p + ":")) {
        failures.push(`Legacy route missing in central map: ${p} (src/shared/config/legacy-routes.ts)`);
      }
    }
  } else {
    failures.push("Missing central legacy route map: src/shared/config/legacy-routes.ts");
  }
}

const unifiedLayoutPath = "src/shared/ui/layout/UnifiedLayout.tsx";
if (exists(unifiedLayoutPath)) {
  const unifiedLayout = fs.readFileSync(path.join(root, unifiedLayoutPath), "utf8");
  if (!unifiedLayout.includes('href="/"')) {
    failures.push("Home route must remain reachable from the app header brand link");
  }
}

const sharedUiIndexPath = "src/shared/ui/index.ts";
if (exists(sharedUiIndexPath)) {
  const sharedUiIndex = fs.readFileSync(path.join(root, sharedUiIndexPath), "utf8");
  if (sharedUiIndex.includes('from "@/components";') || sharedUiIndex.includes("from '@/components';")) {
    failures.push("shared/ui must export canonical component paths directly, not bridge through @/components");
  }
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "gereksiz"].includes(entry.name)) continue;
      walk(fullPath, files);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs|css)$/.test(entry.name)) {
      files.push({ fullPath, relativePath });
    }
  }
  return files;
}

// Server-only sinir kontrolu (F2.3): generated agir veri tasiyan moduller
// yalniz server tarafinda okunur. `"use client"` dosyalari bunlari dogrudan
// import edemez; veri API dilimi uzerinden gelir (ADR 0001). `server-only`
// paketi bunu build sirasinda da zorlar; bu kapi daha erken ve net sinyal verir.
const SERVER_ONLY_MODULE_SPECIFIERS = [
  "@/data/symbtr/layout",
  "@/data/symbtr/catalog",
  "@/data/score-engine/canonical-score-anchors",
];

function importsServerOnlyModule(content) {
  return SERVER_ONLY_MODULE_SPECIFIERS.filter((specifier) => {
    // type-only import client bundle'a girmez; yalniz value importlari yakala.
    const valueImport = new RegExp(
      `import\\s+(?!type\\b)[^;]*?from\\s+["']${specifier.replace(/[/\\]/g, "\\$&")}["']`,
    );
    return valueImport.test(content);
  });
}

for (const file of walk(path.join(root, "src"))) {
  const content = fs.readFileSync(file.fullPath, "utf8");
  if (content.includes("gereksiz/") || content.includes("gereksiz\\")) {
    failures.push(`Active source must not reference gereksiz: ${file.relativePath}`);
  }
  if (content.includes("@heroui/")) {
    failures.push(`Active source must not import HeroUI: ${file.relativePath}`);
  }

  const isClientModule = /^\s*["']use client["']/.test(content);
  if (isClientModule) {
    for (const specifier of importsServerOnlyModule(content)) {
      failures.push(
        `Client module must not value-import server-only data (${specifier}); use an API slice: ${file.relativePath}`,
      );
    }
  }

  // Katman-yonu sinirlari (F4.2, ADR 0001 Karar 3):
  // app -> features -> core/application -> core/domain; core/application ->
  // core/infrastructure; engines/data saf alt katmandir. Ters yon yasaktir.
  const rel = file.relativePath;
  const importsFeatures = /from\s+["']@\/features\//.test(content);
  const importsApp = /from\s+["']@\/app\//.test(content);

  // Zaman cekirdegi (PLAN.md §2.1 / G1): `src/core/time` ANA MOTORUN en alt
  // katmanidir ve HICBIR seyi import etmez. Bir bagimlilik girerse cekirdek
  // artik "her yerden cagrilabilir" olmaktan cikar ve goc tikanir.
  if (rel.startsWith("src/core/time/") && !rel.includes("__tests__")) {
    if (/from\s+["'](@\/|\.\.\/)/.test(content)) {
      failures.push(`core/time is the engine kernel and must import nothing outside itself: ${rel}`);
    }
  }

  if (rel.startsWith("src/core/domain/")) {
    if (/from\s+["']@\/(features|app|core\/application|core\/infrastructure|engines)\//.test(content)) {
      failures.push(`core/domain must stay pure (no app/features/application/infrastructure/engines import): ${rel}`);
    }
  }
  if (rel.startsWith("src/core/") && (importsFeatures || importsApp)) {
    failures.push(`core layer must not import upward into features/app: ${rel}`);
  }
  if ((rel.startsWith("src/engines/") || rel.startsWith("src/data/")) && !rel.includes("__tests__")) {
    if (importsFeatures || importsApp) {
      failures.push(`engines/data are lower layers and must not import features/app: ${rel}`);
    }
  }

  // Tek tema kaynagi: yalniz shared/tokens `@/lib/design-system` importlayabilir
  // (ADR/ENGINEERING_RULESET: tek tema kaynagi shared/tokens).
  if (!rel.startsWith("src/shared/tokens/") && !rel.startsWith("src/lib/design-system/")) {
    if (/from\s+["']@\/lib\/design-system/.test(content)) {
      failures.push(`Design tokens must be imported via @/shared/tokens, not @/lib/design-system directly: ${rel}`);
    }
  }
}

// Max-line guardrail (F4.8): dosyalar <=800 satir. Mevcut buyuk dosyalar
// aktif decomposition hedefidir (M8.1-M8.3) ve grandfather edilir; bu allowlist
// yalniz kuculdukce kisalir (ratchet). YENI dosya 800'u asamaz.
const MAX_LINES = 800;
// H6 (2026-07-27): `studio/follow/page.tsx` (1024 -> 685) ve
// `references/curation/page.tsx` (848 -> 559) bu listeden CIKARILDI — artik
// normal 800 kuralina tabiler. Liste yalnizca kisalir; bir dosya buraya geri
// eklenemez.
const GRANDFATHERED_LARGE_FILES = new Map([
  // [dosya, tavan] — mevcut satirin ustune cikamaz; decomposition ile azalir.
  ["src/app/api/external-references/route.ts", 800],
  ["src/features/references/ReferencesCurationDetail.tsx", 810],
  ["src/engines/usul/data.ts", 810], // saf veri dosyasi (usul tanimlari)
  ["src/engines/makam/data.ts", 810], // saf veri dosyasi (makam tanimlari)
  ["src/app/api/external-references/route-state.ts", 685],
]);

for (const file of walk(path.join(root, "src"))) {
  const rel = file.relativePath;
  if (rel.includes("__tests__") || rel.endsWith(".generated.json") || rel.endsWith(".css")) continue;
  if (!/\.(ts|tsx)$/.test(rel)) continue;
  const lineCount = fs.readFileSync(file.fullPath, "utf8").split("\n").length;
  const grandfatherCeiling = GRANDFATHERED_LARGE_FILES.get(rel);

  if (grandfatherCeiling !== undefined) {
    if (lineCount > grandfatherCeiling) {
      failures.push(
        `Large file grew past its ratchet ceiling (${lineCount} > ${grandfatherCeiling}); decompose, don't grow: ${rel}`,
      );
    }
  } else if (lineCount > MAX_LINES) {
    failures.push(`File exceeds ${MAX_LINES} lines (${lineCount}); split into modules: ${rel}`);
  }
}

// Hardcode renk literal'i kapisi (ENGINEERING_RULESET: "Hardcode yok").
// Bilesenlerde #hex / rgb( / oklch( literal'i yazilmaz; tek kaynak
// shared/tokens + lib/design-system (tema tanimlari) katmanidir.
const COLOR_LITERAL_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgb\(|oklch\(/;
for (const file of walk(path.join(root, "src"))) {
  const rel = file.relativePath;
  if (rel.includes("__tests__") || rel.endsWith(".generated.json") || rel.endsWith(".css")) continue;
  if (!/\.(ts|tsx)$/.test(rel)) continue;
  if (rel.startsWith("src/shared/tokens/") || rel.startsWith("src/lib/design-system/")) continue;
  const lines = fs.readFileSync(file.fullPath, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (COLOR_LITERAL_PATTERN.test(line)) {
      failures.push(`Color literal in component (move to shared/tokens): ${rel}:${index + 1}`);
    }
  });
}

if (failures.length > 0) {
  console.error("Architecture guardrails failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Architecture guardrails passed.");
