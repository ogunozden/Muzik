import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";

interface LocalOperationAccessOptions {
  enabledEnv: string;
  tokenEnv: string;
  unsafeLocalEnv: string;
  tokenHeader: string;
  disabledMessage: string;
  missingProductionTokenMessage: string;
  missingTokenMessage: string;
  invalidTokenMessage: string;
}

function isLoopbackRequest(request: Request): boolean {
  const host = new URL(request.url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

// CSRF savunmasi: Host-tabanli loopback kontrolu tek basina yetmez — kotucul bir
// sayfa `text/plain` POST (CORS "simple request") ile localhost'a yazip yerel
// script/dosya islemi tetikleyebilir. Taraycilar fetch/XHR'de her zaman
// Sec-Fetch-Site gonderir; "cross-site"/"same-site" = baska origin'den (CSRF
// adayi) → tokensiz unsafe-local yolu icin reddet. "same-origin"/"none" veya
// header yoklugu (tarayici-disi istemci: curl/script) guvenli sayilir.
function isCrossOriginBrowserRequest(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  return secFetchSite === "cross-site" || secFetchSite === "same-site";
}

function tokenMatches(actual: string | null, expected: string): boolean {
  if (!actual) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function getLocalOperationAccessError(
  request: Request,
  options: LocalOperationAccessOptions,
): NextResponse | null {
  const operationsEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env[options.enabledEnv] === "true";
  const requiredToken = process.env[options.tokenEnv];
  const allowUnsafeLocalTokenless =
    process.env.NODE_ENV !== "production" &&
    process.env[options.unsafeLocalEnv] === "true" &&
    isLoopbackRequest(request) &&
    !isCrossOriginBrowserRequest(request);

  if (!operationsEnabled) {
    return NextResponse.json({error: options.disabledMessage}, {status: 403});
  }

  if (process.env.NODE_ENV === "production" && !requiredToken) {
    return NextResponse.json({error: options.missingProductionTokenMessage}, {status: 403});
  }

  if (!requiredToken && !allowUnsafeLocalTokenless) {
    return NextResponse.json({error: options.missingTokenMessage}, {status: 403});
  }

  if (requiredToken && !tokenMatches(request.headers.get(options.tokenHeader), requiredToken)) {
    return NextResponse.json({error: options.invalidTokenMessage}, {status: 401});
  }

  return null;
}
