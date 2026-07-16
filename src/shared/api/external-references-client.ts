/**
 * external-references-client — /api/external-references icin paylasilan istemci
 * (P3.2 DRY). Ayni POST/parse boilerplate 5 curation bileseninde kopyaliydi
 * (endpoint, ops-token header, {action, ...payload} govdesi, {state, result}
 * zarfi). Bu modul tek kaynak; fetchJson uzerine kurulu (ApiError sozlesmesi).
 */

import {fetchJson} from "./fetch-json";

export const EXTERNAL_REFERENCE_OPS_TOKEN_HEADER = "x-external-reference-ops-token";

const ENDPOINT = "/api/external-references";

export interface ExternalReferenceActionResponse<TResult = unknown, TState = unknown> {
  state: TState;
  result: TResult;
}

function opsHeaders(opsToken?: string): Record<string, string> {
  return opsToken ? {[EXTERNAL_REFERENCE_OPS_TOKEN_HEADER]: opsToken} : {};
}

/** GET: curation durumunu okur (opsiyonel query + ops-token). */
export function fetchExternalReferenceState<TState>(
  params?: URLSearchParams,
  opsToken?: string,
  signal?: AbortSignal,
  fallbackErrorMessage?: string,
): Promise<TState> {
  const query = params && [...params.keys()].length > 0 ? `?${params.toString()}` : "";
  return fetchJson<TState>(
    `${ENDPOINT}${query}`,
    signal,
    {cache: "no-store", headers: opsHeaders(opsToken)},
    fallbackErrorMessage,
  );
}

/** POST: bir action calistirir; {state, result} zarfini doner. */
export function runExternalReferenceAction<TResult = unknown, TState = unknown>(
  action: string,
  payload?: Record<string, unknown>,
  opsToken?: string,
  signal?: AbortSignal,
  fallbackErrorMessage?: string,
): Promise<ExternalReferenceActionResponse<TResult, TState>> {
  return fetchJson<ExternalReferenceActionResponse<TResult, TState>>(
    ENDPOINT,
    signal,
    {
      method: "POST",
      headers: {"Content-Type": "application/json", ...opsHeaders(opsToken)},
      body: JSON.stringify({action, ...payload}),
    },
    fallbackErrorMessage,
  );
}
