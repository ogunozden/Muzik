import "server-only";

import {NextResponse} from "next/server";

import {MAX_SOURCE_FIELD_CHARS} from "../route-config";
import type {StageSourceBody} from "../route-types";

export function validateSourceFieldLengths(source: StageSourceBody): NextResponse | null {
  for (const [field, value] of Object.entries(source)) {
    if (typeof value === "string" && value.length > MAX_SOURCE_FIELD_CHARS) {
      return NextResponse.json(
        {error: `${field} alanı ${MAX_SOURCE_FIELD_CHARS} karakterden uzun olamaz.`},
        {status: 413},
      );
    }
  }

  return null;
}

export function pushArg(args: string[], key: string, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) return;
  args.push(key, value.trim());
}

export function requiredObjectPayload(value: unknown, label: string): unknown | NextResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({error: `${label} gerekli.`}, {status: 400});
  }

  return value;
}

export function requiredArrayPayload(value: unknown, label: string): unknown[] | NextResponse {
  if (!Array.isArray(value) || value.length === 0) {
    return NextResponse.json({error: `${label} gerekli.`}, {status: 400});
  }

  return value;
}
