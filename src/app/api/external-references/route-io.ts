import {randomUUID} from "node:crypto";
import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {
  MAX_CANDIDATE_IMPORT_CHARS,
  MAX_CURATION_PAYLOAD_CHARS,
  PROJECT_ROOT,
  TEMP_INPUT_DIR,
} from "./route-config";

/**
 * Gecici UI-input dosya yazicilari (M8.1 bolme): operasyon script'lerine
 * verilecek payload'lar boyut sinirlarina karsi dogrulanip temp dosyaya
 * atomik yazilir; cagiran taraf is bitince dosyayi siler.
 */

function toProjectRelativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).replaceAll(path.sep, "/");
}

export async function writeBulkTextInput(content: string): Promise<{filePath: string; relativePath: string}> {
  await mkdir(TEMP_INPUT_DIR, {recursive: true});

  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.txt`);
  await writeFile(filePath, content);
  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

export async function writeCandidateManifestInput(content: string): Promise<{filePath: string; relativePath: string}> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Aday manifest JSON girdisi gerekli."), {status: 400});
  }

  if (trimmed.length > MAX_CANDIDATE_IMPORT_CHARS) {
    throw Object.assign(new Error(`Aday manifest JSON girdisi ${MAX_CANDIDATE_IMPORT_CHARS} karakterden uzun olamaz.`), {
      status: 413,
    });
  }

  try {
    JSON.parse(trimmed);
  } catch {
    throw Object.assign(new Error("Aday manifest geçerli JSON olmalı."), {status: 400});
  }

  await mkdir(TEMP_INPUT_DIR, {recursive: true});
  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.json`);
  await writeFile(filePath, trimmed);

  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

export async function writeCandidateReviewGroupDecisionInput(content: string): Promise<{filePath: string; relativePath: string}> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Review grup karar JSON girdisi gerekli."), {status: 400});
  }

  if (trimmed.length > MAX_CANDIDATE_IMPORT_CHARS) {
    throw Object.assign(new Error(`Review grup karar JSON girdisi ${MAX_CANDIDATE_IMPORT_CHARS} karakterden uzun olamaz.`), {
      status: 413,
    });
  }

  try {
    JSON.parse(trimmed);
  } catch {
    throw Object.assign(new Error("Review grup karar girdisi geçerli JSON olmalı."), {status: 400});
  }

  await mkdir(TEMP_INPUT_DIR, {recursive: true});
  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.json`);
  await writeFile(filePath, trimmed);

  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

export async function writeJsonPayloadInput(payload: unknown): Promise<{filePath: string; relativePath: string}> {
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_CURATION_PAYLOAD_CHARS) {
    throw Object.assign(new Error(`Kürasyon operasyon girdisi ${MAX_CURATION_PAYLOAD_CHARS} karakterden uzun olamaz.`), {
      status: 413,
    });
  }

  await mkdir(TEMP_INPUT_DIR, {recursive: true});
  const filePath = path.join(TEMP_INPUT_DIR, `${randomUUID()}.json`);
  await writeFile(filePath, serialized);

  return {
    filePath,
    relativePath: toProjectRelativePath(filePath),
  };
}

