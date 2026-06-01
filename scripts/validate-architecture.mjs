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
  const requiredVisibleRouteKeys = [
    "home",
    "studio",
    "studioFollow",
    "references",
    "referencesCuration",
    "archive",
    "rhythm",
    "samples",
    "makam",
    "usul",
    "nota",
    "notaEditor",
    "recording",
    "sesler",
    "eserTakip",
  ];

  for (const routeKey of requiredVisibleRouteKeys) {
    const idPattern = new RegExp(`id:\\s*["']${routeKey}["']`);
    const hrefPattern = new RegExp(`href:\\s*routes\\.${routeKey}\\b`);
    if (!idPattern.test(navigationConfig) || !hrefPattern.test(navigationConfig)) {
      failures.push(`Static app route must be visible in main navigation: ${routeKey}`);
    }
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

for (const file of walk(path.join(root, "src"))) {
  const content = fs.readFileSync(file.fullPath, "utf8");
  if (content.includes("gereksiz/") || content.includes("gereksiz\\")) {
    failures.push(`Active source must not reference gereksiz: ${file.relativePath}`);
  }
  if (content.includes("@heroui/")) {
    failures.push(`Active source must not import HeroUI: ${file.relativePath}`);
  }
}

if (failures.length > 0) {
  console.error("Architecture guardrails failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Architecture guardrails passed.");
