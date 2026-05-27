/**
 * Extract a display-safe message from any thrown error.
 * Converts network failures and timeouts to a friendly string
 * rather than exposing the raw browser error.
 */
export function getErrorMessage(
  err: unknown,
  networkMessage = 'Network error — check your connection',
): string {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK' || err instanceof TypeError) return networkMessage;
    return err.message;
  }
  if (err instanceof TypeError) return networkMessage;
  if (err instanceof DOMException && err.name === 'AbortError')
    return 'Request timed out — please try again';
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
};

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  /** Returns raw `Response` instead of envelope-unwrapping (e.g. for binary downloads) */
  raw?: boolean;
  /** Send multipart form data instead of JSON. Sets the body and skips the JSON content-type. */
  formData?: FormData;
  /**
   * Maximum number of automatic retries on network failures or 5xx responses.
   * Defaults to 2. Pass 0 to disable retries.
   * 4xx errors are never retried (they are deterministic caller mistakes).
   */
  retries?: number;
  /** Per-attempt timeout in milliseconds. Defaults to 15 000 ms. */
  timeoutMs?: number;
};

export type ApiClient = {
  apiRequest: <T>(path: string, opts?: RequestOptions) => Promise<T>;
  apiBaseUrl: string;
};

const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 15_000;

function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return err.status >= 500;
  // Network error (TypeError from fetch) or timeout (DOMException AbortError)
  return err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createApiClient(baseUrl: string): ApiClient {
  async function attemptRequest<T>(path: string, opts: RequestOptions): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    // Merge caller's signal with our timeout signal
    const signal = opts.signal
      ? (() => {
          const merged = new AbortController();
          opts.signal!.addEventListener('abort', () => merged.abort());
          controller.signal.addEventListener('abort', () => merged.abort());
          return merged.signal;
        })()
      : controller.signal;

    try {
      const headers = new Headers();
      if (opts.body !== undefined && !opts.formData)
        headers.set('content-type', 'application/json');
      if (opts.token) headers.set('authorization', `Bearer ${opts.token}`);

      const res = await fetch(`${baseUrl}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.formData ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
        signal,
      });

      if (opts.raw) return res as unknown as T;

      const text = await res.text();
      let json: Envelope<T> | null = null;
      try {
        json = text ? (JSON.parse(text) as Envelope<T>) : null;
      } catch {
        throw new ApiError('NETWORK', `Invalid response (${res.status})`, res.status);
      }
      if (!res.ok || json?.error) {
        const err = json?.error ?? { code: 'NETWORK', message: `HTTP ${res.status}` };
        throw new ApiError(err.code, err.message, res.status, err.details);
      }
      return json?.data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const maxRetries = opts.retries ?? DEFAULT_RETRIES;
    let attempt = 0;
    while (true) {
      try {
        return await attemptRequest<T>(path, opts);
      } catch (err) {
        // Never retry 4xx — those are deterministic caller errors.
        // Never retry if the caller's own AbortSignal was fired.
        const callerAborted = opts.signal?.aborted;
        if (callerAborted || !isRetryable(err) || attempt >= maxRetries) throw err;
        attempt++;
        // Exponential back-off: 300ms, 900ms, 2700ms, …
        await delay(300 * Math.pow(3, attempt - 1));
      }
    }
  }

  return { apiRequest, apiBaseUrl: baseUrl };
}
