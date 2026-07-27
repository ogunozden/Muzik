import {mkdir, readFile, stat, unlink, writeFile} from "node:fs/promises";
import path from "node:path";
import {SAMPLE_SLOT_BY_KEY, SAMPLE_SLOTS} from "@/engines/ses/sample-library";
import {summarizeSampleCoverage} from "@/engines/ses/sample-coverage";
import {
  getLocalOperationAccessError,
  isAllowedSampleUpload,
  MAX_SAMPLE_UPLOAD_BYTES,
  SAMPLE_UPLOAD_EXTENSIONS,
} from "@/shared/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLES_ROOT = path.resolve(process.cwd(), "public", "samples");
const ALLOWED_SAMPLE_EXTENSIONS = SAMPLE_UPLOAD_EXTENSIONS.join(", ");
const SAMPLE_OPS_TOKEN_HEADER = "x-sample-operations-token";
const SAMPLE_UNSAFE_LOCAL_FLAG = "SAMPLE_OPERATIONS_ALLOW_UNSAFE_LOCAL";

function getSampleOperationAccessError(request: Request) {
  return getLocalOperationAccessError(request, {
    enabledEnv: "SAMPLE_OPERATIONS_ENABLED",
    tokenEnv: "SAMPLE_OPERATIONS_TOKEN",
    unsafeLocalEnv: SAMPLE_UNSAFE_LOCAL_FLAG,
    tokenHeader: SAMPLE_OPS_TOKEN_HEADER,
    disabledMessage: "Sample operasyonları production ortamında açık değil.",
    missingProductionTokenMessage: "Production ortamında sample operasyon token'ı zorunlu.",
    missingTokenMessage: `Sample operasyon token'ı gerekli. Local tokenless kullanım için ${SAMPLE_UNSAFE_LOCAL_FLAG}=true gerekir.`,
    invalidTokenMessage: "Sample operasyon token'ı geçersiz veya eksik.",
  });
}

function resolveSlotPath(relativePath: string): string {
  const resolved = path.resolve(SAMPLES_ROOT, ...relativePath.split("/"));
  if (!resolved.startsWith(`${SAMPLES_ROOT}${path.sep}`)) {
    throw new Error("Invalid sample path");
  }
  return resolved;
}

async function getSlotStatus(slotKey: string) {
  const slot = SAMPLE_SLOT_BY_KEY.get(slotKey);
  if (!slot) return null;

  const filePath = resolveSlotPath(slot.relativePath);

  try {
    const fileStat = await stat(filePath);
    return {
      key: slot.key,
      category: slot.category,
      instrumentId: slot.instrumentId,
      instrumentName: slot.instrumentName,
      groupLabel: slot.groupLabel,
      label: slot.label,
      fileName: slot.fileName,
      relativePath: slot.relativePath,
      url: slot.url,
      midiNumber: slot.midiNumber ?? null,
      noteName: slot.noteName ?? null,
      symbol: slot.symbol ?? null,
      isAccent: slot.isAccent ?? false,
      derivedFrom: slot.derivedFrom ?? null,
      extrapolatedFrom: slot.extrapolatedFrom ?? null,
      installed: fileStat.isFile(),
      size: fileStat.size,
      updatedAt: fileStat.mtime.toISOString(),
    };
  } catch {
    return {
      key: slot.key,
      category: slot.category,
      instrumentId: slot.instrumentId,
      instrumentName: slot.instrumentName,
      groupLabel: slot.groupLabel,
      label: slot.label,
      fileName: slot.fileName,
      relativePath: slot.relativePath,
      url: slot.url,
      midiNumber: slot.midiNumber ?? null,
      noteName: slot.noteName ?? null,
      symbol: slot.symbol ?? null,
      isAccent: slot.isAccent ?? false,
      derivedFrom: slot.derivedFrom ?? null,
      extrapolatedFrom: slot.extrapolatedFrom ?? null,
      installed: false,
      size: 0,
      updatedAt: null,
    };
  }
}

/**
 * Her ses klasorunun kaynagi (PLAN.md §11/H4).
 *
 * Kayit `public/samples/provenance.json`de veri olarak durur; buradan disari
 * verilir ki `/samples` sayfasi "bu ses nereden geldi" sorusunu
 * cevaplayabilsin. Kaydi olmayan klasor **gizlenmez**, `unknown` gorunur.
 */
async function readFolderProvenance(): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path.join(SAMPLES_ROOT, "provenance.json"), "utf8");
    const parsed = JSON.parse(raw) as {folders?: Record<string, unknown>};
    return parsed.folders ?? {};
  } catch {
    // Kayit okunamazsa sayfa calismaya devam etsin; eksiklik `unknown` olarak
    // gorunur, sessizce "kaynagi var" gibi gosterilmez.
    return {};
  }
}

export async function GET() {
  const [slots, folderProvenance] = await Promise.all([
    Promise.all(SAMPLE_SLOTS.map((slot) => getSlotStatus(slot.key))),
    readFolderProvenance(),
  ]);
  const validSlots = slots.filter((slot) => slot !== null);

  return Response.json({
    total: validSlots.length,
    installed: validSlots.filter((slot) => slot.installed).length,
    coverage: summarizeSampleCoverage(validSlots),
    slots: validSlots,
    provenance: folderProvenance,
  });
}

export async function POST(request: Request) {
  const accessError = getSampleOperationAccessError(request);
  if (accessError) return accessError;

  const formData = await request.formData();
  const slotKey = formData.get("slotKey");
  const file = formData.get("file");

  if (typeof slotKey !== "string") {
    return Response.json({error: "Missing sample slot"}, {status: 400});
  }

  const slot = SAMPLE_SLOT_BY_KEY.get(slotKey);
  if (!slot) {
    return Response.json({error: "Unknown sample slot"}, {status: 404});
  }

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({error: "Missing audio file"}, {status: 400});
  }

  if (!isAllowedSampleUpload(file.name, file.size)) {
    const status = file.size > MAX_SAMPLE_UPLOAD_BYTES ? 413 : 400;
    return Response.json(
      {error: `Sample file must be ${ALLOWED_SAMPLE_EXTENSIONS} and at most 25 MB`},
      {status},
    );
  }

  const filePath = resolveSlotPath(slot.relativePath);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(path.dirname(filePath), {recursive: true});
  await writeFile(filePath, Buffer.from(arrayBuffer));

  const status = await getSlotStatus(slot.key);
  return Response.json({slot: status});
}

export async function DELETE(request: Request) {
  const accessError = getSampleOperationAccessError(request);
  if (accessError) return accessError;

  let slotKey: unknown;

  try {
    const body = await request.json();
    slotKey = body.slotKey;
  } catch {
    return Response.json({error: "Invalid JSON body"}, {status: 400});
  }

  if (typeof slotKey !== "string") {
    return Response.json({error: "Missing sample slot"}, {status: 400});
  }

  const slot = SAMPLE_SLOT_BY_KEY.get(slotKey);
  if (!slot) {
    return Response.json({error: "Unknown sample slot"}, {status: 404});
  }

  const filePath = resolveSlotPath(slot.relativePath);

  try {
    await unlink(filePath);
  } catch {
    // Deleting an already-missing local sample should leave the slot missing.
  }

  const status = await getSlotStatus(slot.key);
  return Response.json({slot: status});
}
