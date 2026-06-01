import fs from "node:fs";
import path from "node:path";

const EXTERNAL_REFERENCE_POLICY = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/data/references/external-reference-policy.json"), "utf8"),
);
const DEFAULT_TIMEOUT_MS = EXTERNAL_REFERENCE_POLICY.metadataFetchTimeoutMs;
const DEFAULT_MAX_BYTES = EXTERNAL_REFERENCE_POLICY.metadataFetchMaxBytes;
const ALLOWED_HTML_CONTENT_TYPES = EXTERNAL_REFERENCE_POLICY.metadataFetchAllowedContentTypes;

function appendNote(sourceNotes, message) {
  return `${sourceNotes ?? ""} ${message}`.trim();
}

function normalizeHostname(hostname) {
  return String(hostname ?? "").replace(/^\[|\]$/g, "").toLocaleLowerCase("en-US");
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedMetadataHost(hostname) {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    isPrivateIpv4(normalized)
  );
}

function validateMetadataUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return {ok: false, reason: "invalid URL"};
  }

  if (url.protocol !== "https:") {
    return {ok: false, reason: "URL must use HTTPS"};
  }

  if (url.username || url.password) {
    return {ok: false, reason: "URL credentials are not allowed"};
  }

  if (isBlockedMetadataHost(url.hostname)) {
    return {ok: false, reason: "loopback or private host is not allowed"};
  }

  return {ok: true, url};
}

export function extractHtmlMetadata(html) {
  const metaTitle =
    html.match(/<meta\s+[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ??
    html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["'][^>]*>/i)?.[1];
  const pageTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description =
    html.match(/<meta\s+[^>]*(?:property|name)=["'](?:og:description|description)["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ??
    html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:description|description)["'][^>]*>/i)?.[1];
  const author =
    html.match(/<meta\s+[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ??
    html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']author["'][^>]*>/i)?.[1];

  return {
    title: (metaTitle ?? pageTitle ?? "").replace(/\s+/g, " ").trim(),
    description: (description ?? "").replace(/\s+/g, " ").trim(),
    author: (author ?? "").replace(/\s+/g, " ").trim(),
    metadataSignals: [
      metaTitle ? "html:og-title" : pageTitle ? "html:title" : "",
      description ? "html:description" : "",
      author ? "html:author" : "",
    ].filter(Boolean),
  };
}

async function readTextWithLimit(response, maxBytes) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {ok: false, reason: `metadata response exceeds ${maxBytes} bytes`};
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      return {ok: false, reason: `metadata response exceeds ${maxBytes} bytes`};
    }
    return {ok: true, text};
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return {ok: false, reason: `metadata response exceeds ${maxBytes} bytes`};
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {ok: true, text: new TextDecoder("utf-8", {fatal: false}).decode(buffer)};
}

export async function fetchExternalHtmlMetadata(source, {
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
  allowedContentTypes = ALLOWED_HTML_CONTENT_TYPES,
} = {}) {
  const validation = validateMetadataUrl(source.url);
  if (!validation.ok) {
    return {
      notes: appendNote(source.notes, `Page metadata fetch skipped: ${validation.reason}.`),
    };
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetchImpl(validation.url, {
      method: "GET",
      redirect: "follow",
      signal: abortController.signal,
    });

    if (!response.ok) {
      return {
        notes: appendNote(source.notes, `Page metadata fetch failed with HTTP ${response.status}.`),
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!allowedContentTypes.some((allowedType) => contentType.toLocaleLowerCase("en-US").includes(allowedType))) {
      return {
        notes: appendNote(source.notes, `Page metadata fetch skipped non-HTML content type ${contentType || "<missing>"}.`),
      };
    }

    const textResult = await readTextWithLimit(response, maxBytes);
    if (!textResult.ok) {
      return {
        notes: appendNote(source.notes, `Page metadata fetch skipped: ${textResult.reason}.`),
      };
    }

    return extractHtmlMetadata(textResult.text);
  } catch (error) {
    const message = error?.name === "AbortError"
      ? `Page metadata fetch timed out after ${timeoutMs}ms.`
      : `Page metadata fetch failed: ${error instanceof Error ? error.message : "unknown error"}.`;
    return {
      notes: appendNote(source.notes, message),
    };
  } finally {
    clearTimeout(timeout);
  }
}
