import "server-only";

import {NextResponse} from "next/server";

import {getLocalOperationAccessError} from "@/shared/security";
import {OPS_TOKEN_HEADER, UNSAFE_LOCAL_FLAG} from "../route-config";

export function getAccessError(request: Request): NextResponse | null {
  return getLocalOperationAccessError(request, {
    enabledEnv: "EXTERNAL_REFERENCE_OPERATIONS_ENABLED",
    tokenEnv: "EXTERNAL_REFERENCE_OPERATIONS_TOKEN",
    unsafeLocalEnv: UNSAFE_LOCAL_FLAG,
    tokenHeader: OPS_TOKEN_HEADER,
    disabledMessage: "Harici kaynak operasyonları production ortamında açık değil.",
    missingProductionTokenMessage: "Production ortamında harici kaynak operasyon token'ı zorunlu.",
    missingTokenMessage: `Harici kaynak operasyon token'ı gerekli. Local tokenless kullanım için ${UNSAFE_LOCAL_FLAG}=true gerekir.`,
    invalidTokenMessage: "Harici kaynak operasyon token'ı geçersiz veya eksik.",
  });
}
