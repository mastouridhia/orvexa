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
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json.data ?? json;
}

function label(ok, expected) {
  return ok ? 'PASS' : `FAIL (expected ${expected})`;
}

async function placeAndServe(token, sessionToken, kitchenToken, waiterToken, menu) {
  let dishId = null;
  for (const cat of menu)
    for (const d of cat.dishes)
      if ((d.variantGroups?.length ?? 0) === 0) {
        dishId = d.id;
        break;
      }
  if (!dishId) throw new Error('no variant-free dish');
  const order = await req('/orders', {
    method: 'POST',
    token: sessionToken,
    body: { items: [{ dishId, variantIds: [], quantity: 2 }] },
  });
  await req(`/orders/${order.id}/status`, {
    method: 'PATCH',
    token: kitchenToken,
    body: { status: 'preparing' },
  });
  await req(`/orders/${order.id}/status`, {
    method: 'PATCH',
    token: kitchenToken,
    body: { status: 'ready' },
  });
  await req(`/orders/${order.id}/status`, {
    method: 'PATCH',
    token: waiterToken,
    body: { status: 'served' },
  });
  await req(`/orders/${order.id}/pay`, {
    method: 'POST',
    token: waiterToken,
    body: { method: 'cash' },
  });
  return order;
}

async function openSession(mgrToken, tableId) {
  const qrRes = await req(`/tables/${tableId}/qr`, { token: mgrToken, raw: true });
  const qrToken = qrRes.headers.get('x-qr-url').split('/').pop();
  const s = await req('/sessions', { method: 'POST', body: { qrToken, locale: 'fr' } });
  return s.token;
}

async function main() {
  console.log(`→ API: ${API}`);
  const admin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo.tn', password: PASS },
  });
  const mgr = await req('/auth/login', {
    method: 'POST',
    body: { email: 'manager@demo.tn', password: PASS },
  });
  const kit = await req('/auth/login', {
    method: 'POST',
    body: { email: 'kitchen@demo.tn', password: PASS },
  });
  const wat = await req('/auth/login', {
    method: 'POST',
    body: { email: 'waiter@demo.tn', password: PASS },
  });
  console.log(`→ logged in admin/manager/kitchen/waiter`);

  // ─── Staff CRUD ────────────────────────────────────────
  console.log(`\n[staff]`);
  const list0 = await req('/staff', { token: admin.accessToken });
  console.log(`  list → ${list0.length} ${label(list0.length >= 4, '>=4')}`);

  const rnd = `test-${Date.now()}`;
  const created = await req('/staff', {
    method: 'POST',
    token: admin.accessToken,
    body: { email: `${rnd}@demo.tn`, name: 'Temp Waiter', role: 'waiter', password: 'orvexa' },
  });
  console.log(
    `  create → ${created.email} / ${created.role} ${label(created.role === 'waiter', "'waiter'")}`,
  );

  const dup = await fetch(`${API}/staff`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${admin.accessToken}` },
    body: JSON.stringify({ email: created.email, name: 'X', role: 'waiter', password: 'orvexa' }),
  });
  console.log(`  dup email → ${dup.status} ${label(dup.status === 409, 409)}`);

  const patched = await req(`/staff/${created.id}`, {
    method: 'PATCH',
    token: admin.accessToken,
    body: { name: 'Renamed', role: 'kitchen' },
  });
  console.log(
    `  patch → ${patched.name} / ${patched.role} ${label(patched.name === 'Renamed' && patched.role === 'kitchen', 'Renamed/kitchen')}`,
  );

  const disabled = await req(`/staff/${created.id}/disable`, {
    method: 'POST',
    token: admin.accessToken,
  });
  console.log(
    `  disable → disabledAt=${disabled.disabledAt ? 'set' : 'null'} ${label(disabled.disabledAt !== null, 'set')}`,
  );

  const reDisable = await fetch(`${API}/staff/${created.id}/disable`, {
    method: 'POST',
    headers: { authorization: `Bearer ${admin.accessToken}` },
  });
  console.log(`  re-disable → ${reDisable.status} ${label(reDisable.status === 409, 409)}`);

  const enabled = await req(`/staff/${created.id}/enable`, {
    method: 'POST',
    token: admin.accessToken,
  });
  console.log(
    `  enable → disabledAt=${enabled.disabledAt} ${label(enabled.disabledAt === null, 'null')}`,
  );

  const selfDisable = await fetch(`${API}/staff/${admin.user.id}/disable`, {
    method: 'POST',
    headers: { authorization: `Bearer ${admin.accessToken}` },
  });
  console.log(`  self-disable → ${selfDisable.status} ${label(selfDisable.status === 409, 409)}`);

  const managerCreates = await fetch(`${API}/staff`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${mgr.accessToken}` },
    body: JSON.stringify({
      email: `mgr-test-${Date.now()}@demo.tn`,
      name: 'X',
      role: 'waiter',
      password: 'orvexa',
    }),
  });
  console.log(
    `  manager POST → ${managerCreates.status} ${label(managerCreates.status === 403, 403)}`,
  );

  // ─── Seed some sales so reports have data ───────────────
  console.log(`\n[seed sales]`);
  const tables = await req('/tables', { token: admin.accessToken });
  const menu = await req('/menu', { token: admin.accessToken });
  for (let i = 0; i < 3; i++) {
    const s = await openSession(admin.accessToken, tables[i].id);
    await placeAndServe(admin.accessToken, s, kit.accessToken, wat.accessToken, menu);
  }
  console.log(`  3 orders served + paid`);

  // ─── Dashboard summary ─────────────────────────────────
  console.log(`\n[dashboard]`);
  const sum = await req('/dashboard/summary', { token: admin.accessToken });
  console.log(
    `  salesTodayMillimes=${sum.salesTodayMillimes} ordersTodayCount=${sum.ordersTodayCount} activeOrdersCount=${sum.activeOrdersCount} tablesTotal=${sum.tablesTotal} ${label(sum.ordersTodayCount >= 3 && sum.salesTodayMillimes > 0 && sum.tablesTotal >= 8, 'today ≥3 orders, sales>0, 8+ tables')}`,
  );
  console.log(
    `  topItemsToday → ${sum.topItemsToday.length} items, [0]=${sum.topItemsToday[0]?.name.fr} ×${sum.topItemsToday[0]?.quantity}`,
  );

  // ─── Reports: sales ─────────────────────────────────────
  console.log(`\n[reports]`);
  const sales = await req('/reports/sales?granularity=day', { token: admin.accessToken });
  console.log(
    `  sales (day) → ${sales.length} buckets, today total=${sales.at(-1)?.totalMillimes} ${label(sales.length >= 1, '≥1 bucket')}`,
  );

  const top = await req('/reports/top-items?limit=3', { token: admin.accessToken });
  console.log(
    `  top-items (3) → ${top.length}, first=${top[0]?.name.fr} ×${top[0]?.quantity} ${label(top.length <= 3, '≤3')}`,
  );

  const cat = await req('/reports/revenue-by-category', { token: admin.accessToken });
  console.log(
    `  revenue-by-category → ${cat.length} categories, top=${cat[0]?.name?.fr} = ${cat[0]?.revenueMillimes} ${label(cat.length >= 1, '≥1')}`,
  );

  // ─── Kitchen/waiter role can't see reports ──────────────
  const kitReports = await fetch(`${API}/reports/sales`, {
    headers: { authorization: `Bearer ${kit.accessToken}` },
  });
  console.log(
    `  kitchen /reports/sales → ${kitReports.status} ${label(kitReports.status === 403, 403)}`,
  );

  console.log(`\n✓ admin api smoke done`);
}

main().catch((err) => {
  console.error('✗', err);
  process.exitCode = 1;
});
