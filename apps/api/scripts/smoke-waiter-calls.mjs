import { io as ioClient } from 'socket.io-client';

const API = process.env.API_URL ?? 'http://localhost:4000';
const PASS = 'orvexa';

async function req(path, { method = 'GET', token, body, raw = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (raw) return res;
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json.data ?? json;
}

function label(ok, expected) {
  return ok ? 'PASS' : `FAIL (expected ${expected})`;
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log(`→ API: ${API}`);
  const mgr = await req('/auth/login', { method: 'POST', body: { email: 'manager@demo.tn', password: PASS } });
  const wat = await req('/auth/login', { method: 'POST', body: { email: 'waiter@demo.tn', password: PASS } });
  console.log(`→ logged in manager + waiter`);

  const tables = await req('/tables', { token: mgr.accessToken });
  const t = tables[0];
  console.log(`→ using ${t.label} (${t.id})`);

  // Lazy-create QR token, then open a customer session
  const qrRes = await req(`/tables/${t.id}/qr`, { token: mgr.accessToken, raw: true });
  const qrToken = qrRes.headers.get('x-qr-url').split('/').pop();
  const session = await req('/sessions', { method: 'POST', body: { qrToken, locale: 'fr' } });

  // Connect waiter socket and capture table:status events
  const waiterSocket = ioClient(API, {
    auth: { token: wat.accessToken },
    transports: ['websocket'],
    reconnection: false,
  });
  const tableStatusEvents = [];
  await new Promise((resolve) => {
    waiterSocket.on('connect', resolve);
    waiterSocket.on('table:status', (p) => tableStatusEvents.push(p));
  });
  console.log(`→ waiter socket connected`);

  // Customer rings the bell
  await req(`/tables/${t.id}/call-waiter`, { method: 'POST', token: session.token });
  await req(`/tables/${t.id}/request-bill`, { method: 'POST', token: session.token });
  await wait(200);

  // List open waiter calls
  const open = await req('/waiter-calls?status=open', { token: wat.accessToken });
  const ours = open.filter((c) => c.tableId === t.id);
  console.log(`[list open] count=${ours.length} kinds=${ours.map((c) => c.kind).join(',')} ${label(ours.length === 2, 2)}`);

  // Confirm derived status reflects open calls (request_bill should win)
  const tablesAfter = await req('/tables', { token: mgr.accessToken });
  const tNow = tablesAfter.find((x) => x.id === t.id);
  console.log(`[derived]   ${tNow.derivedStatus} ${label(tNow.derivedStatus === 'needs_bill', "'needs_bill'")}`);

  // Clear the bill request → derived should fall back to 'call_waiter'
  const billCall = ours.find((c) => c.kind === 'request_bill');
  await req(`/waiter-calls/${billCall.id}/clear`, { method: 'POST', token: wat.accessToken });
  await wait(200);
  const tablesAfter2 = await req('/tables', { token: mgr.accessToken });
  const tNow2 = tablesAfter2.find((x) => x.id === t.id);
  console.log(`[after bill clear] ${tNow2.derivedStatus} ${label(tNow2.derivedStatus === 'call_waiter', "'call_waiter'")}`);

  // Re-clear (should 409)
  const reclear = await fetch(`${API}/waiter-calls/${billCall.id}/clear`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${wat.accessToken}` },
  });
  console.log(`[double clear → 409] ${reclear.status} ${label(reclear.status === 409, 409)}`);

  // Clear the call_waiter too
  const callCall = ours.find((c) => c.kind === 'call_waiter');
  await req(`/waiter-calls/${callCall.id}/clear`, { method: 'POST', token: wat.accessToken });
  await wait(200);
  const tablesAfter3 = await req('/tables', { token: mgr.accessToken });
  const tNow3 = tablesAfter3.find((x) => x.id === t.id);
  console.log(`[after both clears] ${tNow3.derivedStatus} ${label(tNow3.derivedStatus === 'free' || tNow3.derivedStatus === 'waiting', "'free' or 'waiting'")}`);

  // Confirm waiter received table:status events on each clear (>= 2 from the clears, plus possibly initial ones from the two POSTs)
  console.log(`[socket table:status events received] count=${tableStatusEvents.length} statuses=${tableStatusEvents.map((e) => e.status).join(',')} ${label(tableStatusEvents.length >= 2, '≥ 2')}`);

  // Cross-restaurant guard: 404 on bogus id
  const bogus = await fetch(`${API}/waiter-calls/00000000-0000-0000-0000-000000000000/clear`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${wat.accessToken}` },
  });
  console.log(`[bogus id → 404] ${bogus.status} ${label(bogus.status === 404, 404)}`);

  // Kitchen role cannot list/clear (admin/manager/waiter only)
  const kit = await req('/auth/login', { method: 'POST', body: { email: 'kitchen@demo.tn', password: PASS } });
  const kitForbidden = await fetch(`${API}/waiter-calls`, { headers: { authorization: `Bearer ${kit.accessToken}` } });
  console.log(`[kitchen role → 403] ${kitForbidden.status} ${label(kitForbidden.status === 403, 403)}`);

  waiterSocket.disconnect();
  console.log(`\n✓ waiter-calls smoke done`);
}

main().catch((err) => {
  console.error('✗', err);
  process.exitCode = 1;
});
