import "server-only";

import {unlink} from "node:fs/promises";
import {NextResponse} from "next/server";

import {MAX_BULK_TEXT_CHARS} from "../route-config";
import {writeBulkTextInput} from "../route-io";
import type {OperationBody} from "../route-types";
import {runNodeScript} from "./runtime";
import {pushArg, validateSourceFieldLengths} from "./validation";

export async function stageSources(body: OperationBody): Promise<unknown> {
  const args = ["scripts/stage-external-sources.mjs"];
  const source = body.source ?? {};
  const hasSourceUrl = typeof source.url === "string" && source.url.trim().length > 0;
  const hasBulkText = typeof body.bulkText === "string" && body.bulkText.trim().length > 0;
  let tempInputFilePath: string | null = null;

  if (!hasSourceUrl && !hasBulkText) {
    return NextResponse.json({error: "Kaynak URL veya toplu metin gerekli."}, {status: 400});
  }

  if (hasBulkText && (body.bulkText ?? "").length > MAX_BULK_TEXT_CHARS) {
    return NextResponse.json(
      {error: `Toplu kaynak metni ${MAX_BULK_TEXT_CHARS} karakterden uzun olamaz.`},
      {status: 413},
    );
  }

  const fieldLengthError = validateSourceFieldLengths(source);
  if (fieldLengthError) return fieldLengthError;

  if (hasBulkText) {
    const tempInput = await writeBulkTextInput(body.bulkText ?? "");
    tempInputFilePath = tempInput.filePath;
    args.push("--input", tempInput.relativePath);
  }

  if (hasSourceUrl) {
    pushArg(args, "--url", source.url);
    pushArg(args, "--title", source.title);
    pushArg(args, "--provider", source.provider === "auto" ? "" : source.provider);
    pushArg(args, "--source-provider", source.sourceProvider);
    pushArg(args, "--checked-at", source.checkedAt);
    pushArg(args, "--catalog-id", source.catalogId);
    pushArg(args, "--observed-title", source.observedTitle);
    pushArg(args, "--makam", source.makam);
    pushArg(args, "--form", source.form);
    pushArg(args, "--usul", source.usul);
    pushArg(args, "--composer", source.composer);
    pushArg(args, "--lyricist", source.lyricist);
    pushArg(args, "--lyrics", source.lyrics);
  }

  if (body.dryRun) args.push("--dry-run");

  try {
    return await runNodeScript(args);
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}
