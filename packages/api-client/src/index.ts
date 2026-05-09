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
};

export type ApiClient = {
  apiRequest: <T>(path: string, opts?: RequestOptions) => Promise<T>;
  apiBaseUrl: string;
};

export function createApiClient(baseUrl: string): ApiClient {
  async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers = new Headers();
    if (opts.body !== undefined && !opts.formData) headers.set('content-type', 'application/json');
    if (opts.token) headers.set('authorization', `Bearer ${opts.token}`);

    const res = await fetch(`${baseUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.formData ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
      signal: opts.signal,
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
  }

  return { apiRequest, apiBaseUrl: baseUrl };
}
