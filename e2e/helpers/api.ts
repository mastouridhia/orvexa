const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

type Json = Record<string, unknown>;

async function api<T>(method: string, path: string, body?: Json, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json: { data?: unknown; error?: { message?: string } } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    /* keep text */
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${json.error?.message ?? text}`);
  }
  return json.data as T;
}

export async function loginStaff(
  email: string,
  password = 'orvexa',
): Promise<{ accessToken: string; restaurantId: string }> {
  type LoginPayload = { accessToken: string; user: { restaurantId: string } };
  const data = await api<LoginPayload>('POST', '/auth/login', { email, password });
  return { accessToken: data.accessToken, restaurantId: data.user.restaurantId };
}

export async function getTableQrToken(adminToken: string, tableId: string): Promise<string> {
  const res = await fetch(`${API_URL}/tables/${tableId}/qr?format=svg`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) throw new Error(`qr: ${res.status}`);
  const url = res.headers.get('x-qr-url') ?? '';
  const m = url.match(/\/t\/(.+)$/);
  if (!m) throw new Error(`qr: missing x-qr-url header (got "${url}")`);
  return m[1]!;
}

export async function listTables(
  adminToken: string,
): Promise<Array<{ id: string; label: string }>> {
  return api<Array<{ id: string; label: string }>>('GET', '/tables', undefined, adminToken);
}
