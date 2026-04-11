import {mkdir, stat, unlink, writeFile} from "node:fs/promises";
import path from "node:path";
import {SAMPLE_SLOT_BY_KEY, SAMPLE_SLOTS} from "@/engines/ses/sample-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLES_ROOT = path.resolve(process.cwd(), "public", "samples");
const MAX_SAMPLE_BYTES = 100 * 1024 * 1024;

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
      installed: false,
      size: 0,
      updatedAt: null,
    };
  }
}

export async function GET() {
  const slots = await Promise.all(SAMPLE_SLOTS.map((slot) => getSlotStatus(slot.key)));
  const validSlots = slots.filter((slot) => slot !== null);

  return Response.json({
    total: validSlots.length,
    installed: validSlots.filter((slot) => slot.installed).length,
    slots: validSlots,
  });
}

export async function POST(request: Request) {
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

  if (file.size > MAX_SAMPLE_BYTES) {
    return Response.json({error: "Sample file is too large"}, {status: 413});
  }

  const filePath = resolveSlotPath(slot.relativePath);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(path.dirname(filePath), {recursive: true});
  await writeFile(filePath, Buffer.from(arrayBuffer));

  const status = await getSlotStatus(slot.key);
  return Response.json({slot: status});
}

export async function DELETE(request: Request) {
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
