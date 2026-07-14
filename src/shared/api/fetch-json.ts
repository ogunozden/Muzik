/**
 * Merkezi client veri erisim yardimcisi (F5.3).
 *
 * Ham fetch-in-useEffect dagilimini teklestirir: her cagri ayni hata
 * sozlesmesini kullanir, iptal edilebilir ve JSON hata govdesini okur.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiErrorBody {
  error?: string;
}

/**
 * Verilen endpoint'ten JSON okur. HTTP hatalarinda ApiError firlatir;
 * cagiran taraf `signal` ile istegi iptal edebilir (AbortError yayilir).
 */
export async function fetchJson<T>(input: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(input, {
    signal,
    headers: {Accept: "application/json"},
  });

  if (!response.ok) {
    let message = `Istek basarisiz (${response.status})`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (typeof body.error === "string" && body.error.length > 0) {
        message = body.error;
      }
    } catch {
      // JSON hata govdesi yoksa varsayilan mesaj kalir.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
