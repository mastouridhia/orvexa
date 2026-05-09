import { io as ioClient } from 'socket.io-client';

const API = process.env.API_URL ?? 'http://localhost:4000';

const PASS = 'orvexa';
const STAFF = {
  manager: 'manager@demo.tn',
  kitchen: 'kitchen@demo.tn',
  waiter: 'waiter@demo.tn',
};

const TRACKED_EVENTS = [
  'order:created',
  'order:status',
  'waiter:called',
  'bill:requested',
  'menu:updated',
  'table:status',
];

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

async function login(email) {
  return req('/auth/login', { method: 'POST', body: { email, password: PASS } });
}

function connectSocket(label, token) {
  return new Promise((resolve, reject) => {
    const sock = ioClient(API, { auth: { token }, transports: ['websocket'], reconnection: false });
    const received = [];
    for (const event of TRACKED_EVENTS) {
      sock.on(event, (payload) => received.push({ event, payload }));
    }
    sock.on('connect', () => resolve({ label, sock, received }));
    sock.on('connect_error', (err) => reject(new Error(`${label} connect_error: ${err.message}`)));
  });
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function pickEvents(received, event) {
  return received.filter((e) => e.event === event);
}

function label(got, expected) {
  return got ? 'PASS' : `FAIL (expected ${expected})`;
}

async function main() {
  console.log(`→ API: ${API}`);

  const mgr = await login(STAFF.manager);
  const kit = await login(STAFF.kitchen);
  const wat = await login(STAFF.waiter);
  console.log(`→ logged in as manager/kitchen/waiter`);

  const tables = await req('/tables', { token: mgr.accessToken });
  if (!tables.length) throw new Error('no tables in restaurant');
  const table = tables[0];
  console.log(`→ using ${table.label} (${table.id})`);

  // Trigger lazy creation of today's day-token via QR endpoint, then grab the token
  const qrRes = await req(`/tables/${table.id}/qr`, { token: mgr.accessToken, raw: true });
  const qrUrl = qrRes.headers.get('x-qr-url');
  const qrToken = qrUrl.split('/').pop();
  console.log(`→ qr token: ${qrToken.slice(0, 8)}…`);

  const sessionRes = await req('/sessions', {
    method: 'POST',
    body: { qrToken, locale: 'fr' },
  });
  const customerToken = sessionRes.token;
  console.log(`→ opened customer session ${sessionRes.session.id.slice(0, 8)}…`);

  // Connect 3 sockets
  const customer = await connectSocket('customer', customerToken);
  const kitchen = await connectSocket('kitchen', kit.accessToken);
  const waiter = await connectSocket('waiter', wat.accessToken);
  console.log(`→ connected sockets: customer, kitchen, waiter`);

  // Grab a dish to place an order with
  const menu = await req('/menu', { token: mgr.accessToken });
  let dishId = null;
  for (const cat of menu) {
    for (const d of cat.dishes) {
      if (d.variantGroups.length === 0) { dishId = d.id; break; }
    }
    if (dishId) break;
  }
  if (!dishId) throw new Error('no dish without required variant found');
  console.log(`→ placing order for dish ${dishId.slice(0, 8)}…`);

  const order = await req('/orders', {
    method: 'POST',
    token: customerToken,
    body: { items: [{ dishId, variantIds: [], quantity: 1 }] },
  });
  await wait(300);

  const kitchenCreated = pickEvents(kitchen.received, 'order:created');
  const waiterCreated = pickEvents(waiter.received, 'order:created');
  const customerCreated = pickEvents(customer.received, 'order:created');
  const tableStatusOnCreate = pickEvents(waiter.received, 'table:status');
  const createStatus = tableStatusOnCreate.at(-1)?.payload.status;

  console.log(`[order:created]  kitchen=${label(kitchenCreated.length === 1, 1)}  waiter=${label(waiterCreated.length === 1, 1)}  table=${label(customerCreated.length === 1, 1)}`);
  console.log(`[table:status]   on create → ${createStatus} ${label(createStatus === 'waiting', "'waiting'")}`);

  // Advance order status: received → preparing
  await req(`/orders/${order.id}/status`, {
    method: 'PATCH',
    token: kit.accessToken,
    body: { status: 'preparing' },
  });
  await wait(300);

  const customerStatus = pickEvents(customer.received, 'order:status');
  const waiterStatus = pickEvents(waiter.received, 'order:status');
  console.log(`[order:status]   customer=${label(customerStatus.length === 1, 1)}  waiter=${label(waiterStatus.length === 1, 1)}  payload=${JSON.stringify(customerStatus.at(-1)?.payload)}`);

  // Customer calls waiter
  await req(`/tables/${table.id}/call-waiter`, { method: 'POST', token: customerToken });
  await wait(300);
  const calls = pickEvents(waiter.received, 'waiter:called');
  console.log(`[waiter:called]  waiter=${label(calls.length === 1, 1)}  payload=${JSON.stringify(calls.at(-1)?.payload)}`);

  // Customer requests bill
  await req(`/tables/${table.id}/request-bill`, { method: 'POST', token: customerToken });
  await wait(300);
  const bills = pickEvents(waiter.received, 'bill:requested');
  console.log(`[bill:requested] waiter=${label(bills.length === 1, 1)}  payload=${JSON.stringify(bills.at(-1)?.payload)}`);

  const tableStatusFinal = pickEvents(waiter.received, 'table:status');
  const finalStatus = tableStatusFinal.at(-1)?.payload.status;
  console.log(`[table:status]   final → ${finalStatus} ${label(finalStatus === 'needs_bill', "'needs_bill'")}`);

  // Manager patches a category — broadcast menu:updated
  const categories = await req('/categories', { token: mgr.accessToken });
  await req(`/categories/${categories[0].id}`, {
    method: 'PATCH',
    token: mgr.accessToken,
    body: { sortOrder: categories[0].sortOrder },
  });
  await wait(300);
  const menuUpdCustomer = pickEvents(customer.received, 'menu:updated');
  const menuUpdKitchen = pickEvents(kitchen.received, 'menu:updated');
  console.log(`[menu:updated]   customer=${label(menuUpdCustomer.length === 1, 1)}  kitchen=${label(menuUpdKitchen.length === 1, 1)}`);

  // Unauthorized handshake
  const bad = await new Promise((resolve) => {
    const s = ioClient(API, { auth: { token: 'not-a-token' }, transports: ['websocket'], reconnection: false });
    s.on('connect', () => { s.disconnect(); resolve('connected'); });
    s.on('connect_error', (err) => resolve(err.message));
  });
  console.log(`[unauth]         rejected → "${bad}" ${label(bad !== 'connected', 'rejection')}`);

  // Clean up
  customer.sock.disconnect();
  kitchen.sock.disconnect();
  waiter.sock.disconnect();
  await wait(100);
  console.log(`\n✓ smoke done`);
}

main().catch((err) => {
  console.error('✗', err);
  process.exitCode = 1;
});
