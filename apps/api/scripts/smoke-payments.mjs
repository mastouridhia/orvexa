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

async function login(email) {
  return req('/auth/login', { method: 'POST', body: { email, password: PASS } });
}

async function openSession(mgrToken, tableId) {
  const qrRes = await req(`/tables/${tableId}/qr`, { token: mgrToken, raw: true });
  const qrToken = qrRes.headers.get('x-qr-url').split('/').pop();
  const s = await req('/sessions', { method: 'POST', body: { qrToken, locale: 'fr' } });
  return s.token;
}

async function placeAndServe(sessionToken, kitchenToken, waiterToken, menu) {
  // pick a dish without required variants so we don't have to resolve variants
  let dishId = null;
  for (const cat of menu) {
    for (const d of cat.dishes) {
      if (d.variantGroups.length === 0) { dishId = d.id; break; }
    }
    if (dishId) break;
  }
  if (!dishId) throw new Error('no variant-free dish');

  const order = await req('/orders', {
    method: 'POST',
    token: sessionToken,
    body: { items: [{ dishId, variantIds: [], quantity: 2 }] },
  });
  // received → preparing → ready → served
  await req(`/orders/${order.id}/status`, { method: 'PATCH', token: kitchenToken, body: { status: 'preparing' } });
  await req(`/orders/${order.id}/status`, { method: 'PATCH', token: kitchenToken, body: { status: 'ready' } });
  await req(`/orders/${order.id}/status`, { method: 'PATCH', token: waiterToken, body: { status: 'served' } });
  return order;
}

async function main() {
  console.log(`→ API: ${API}`);
  const mgr = await login('manager@demo.tn');
  const kit = await login('kitchen@demo.tn');
  const wat = await login('waiter@demo.tn');
  console.log(`→ logged in manager/kitchen/waiter`);

  const tables = await req('/tables', { token: mgr.accessToken });
  const menu = await req('/menu', { token: mgr.accessToken });

  // ─── Scenario 1: cash pay in full ─────────────────
  const t1 = tables[0];
  const s1 = await openSession(mgr.accessToken, t1.id);
  const o1 = await placeAndServe(s1, kit.accessToken, wat.accessToken, menu);
  console.log(`\n[scenario 1] full cash pay`);
  console.log(`  order total = ${o1.totalMillimes}`);

  const cashPay = await req(`/orders/${o1.id}/pay`, {
    method: 'POST',
    token: wat.accessToken,
    body: { method: 'cash', tipMillimes: 1000 },
  });
  console.log(`  paid=${cashPay.payment.amountMillimes} tip=${cashPay.payment.tipMillimes} status=${cashPay.payment.status} fullyPaid=${cashPay.fullyPaid} ${label(cashPay.fullyPaid && cashPay.payment.status === 'paid' && cashPay.order.paymentStatus === 'paid', "fullyPaid=true, paymentStatus='paid'")}`);

  // Second pay on same order should conflict
  const dup = await fetch(`${API}/orders/${o1.id}/pay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${wat.accessToken}` },
    body: JSON.stringify({ method: 'cash' }),
  });
  console.log(`  second pay on already-paid → ${dup.status} ${label(dup.status === 409, 409)}`);

  const r1 = await req(`/orders/${o1.id}/receipt`, { token: wat.accessToken });
  console.log(`  receipt: paid=${r1.amountPaidMillimes} due=${r1.amountDueMillimes} tips=${r1.tipTotalMillimes} ${label(r1.amountDueMillimes === 0 && r1.tipTotalMillimes === 1000, "due=0, tips=1000")}`);

  // ─── Scenario 2: split bill over two cash payments ─
  const t2 = tables[1];
  const s2 = await openSession(mgr.accessToken, t2.id);
  const o2 = await placeAndServe(s2, kit.accessToken, wat.accessToken, menu);
  const half = Math.floor(o2.totalMillimes / 2);
  const rest = o2.totalMillimes - half;
  console.log(`\n[scenario 2] split bill (${half} + ${rest} = ${o2.totalMillimes})`);

  const p2a = await req(`/orders/${o2.id}/pay`, {
    method: 'POST',
    token: wat.accessToken,
    body: { method: 'cash', amountMillimes: half, tipMillimes: 500 },
  });
  console.log(`  after 1st: fullyPaid=${p2a.fullyPaid} orderPaymentStatus=${p2a.order.paymentStatus} ${label(!p2a.fullyPaid && p2a.order.paymentStatus === 'pending', "fullyPaid=false, still pending")}`);

  const p2b = await req(`/orders/${o2.id}/pay`, {
    method: 'POST',
    token: wat.accessToken,
    body: { method: 'cash', amountMillimes: rest },
  });
  console.log(`  after 2nd: fullyPaid=${p2b.fullyPaid} orderPaymentStatus=${p2b.order.paymentStatus} ${label(p2b.fullyPaid && p2b.order.paymentStatus === 'paid', "fullyPaid=true, paymentStatus='paid'")}`);

  const r2 = await req(`/orders/${o2.id}/receipt`, { token: wat.accessToken });
  console.log(`  receipt: payments=${r2.payments.length} paid=${r2.amountPaidMillimes} due=${r2.amountDueMillimes} ${label(r2.payments.length === 2 && r2.amountDueMillimes === 0, "2 payments, due=0")}`);

  // ─── Scenario 3: card stub (pending, doesn't complete) ─
  const t3 = tables[2];
  const s3 = await openSession(mgr.accessToken, t3.id);
  const o3 = await placeAndServe(s3, kit.accessToken, wat.accessToken, menu);
  console.log(`\n[scenario 3] card stub`);
  const p3 = await req(`/orders/${o3.id}/pay`, {
    method: 'POST',
    token: wat.accessToken,
    body: { method: 'card' },
  });
  console.log(`  card payment: status=${p3.payment.status} providerReference=${p3.payment.providerReference?.startsWith('stub-')} fullyPaid=${p3.fullyPaid} orderPaymentStatus=${p3.order.paymentStatus} ${label(p3.payment.status === 'pending' && !p3.fullyPaid && p3.order.paymentStatus === 'pending', "status='pending', fullyPaid=false")}`);

  // ─── Scenario 4: HTML receipt + customer access ─
  const r4html = await fetch(`${API}/orders/${o1.id}/receipt.html`, { headers: { authorization: `Bearer ${wat.accessToken}` } });
  const html = await r4html.text();
  console.log(`\n[scenario 4] HTML receipt`);
  console.log(`  content-type=${r4html.headers.get('content-type')} length=${html.length} hasTotal=${html.includes('Total')} ${label(r4html.ok && html.includes('Total') && r4html.headers.get('content-type').includes('text/html'), 'HTML receipt with Total line')}`);

  // Customer accessing their own receipt
  const rCustomer = await req(`/orders/${o1.id}/receipt`, { token: s1 });
  console.log(`  customer-fetched receipt paid=${rCustomer.amountPaidMillimes} ${label(rCustomer.amountPaidMillimes === o1.totalMillimes, `${o1.totalMillimes}`)}`);

  // Cross-session must 403
  const sOther = await openSession(mgr.accessToken, t3.id);
  const crossAttempt = await fetch(`${API}/orders/${o1.id}/receipt`, { headers: { authorization: `Bearer ${sOther}` } });
  console.log(`  cross-session receipt → ${crossAttempt.status} ${label(crossAttempt.status === 403, 403)}`);

  // ─── Scenario 5: pay before served fails ─
  const t4 = tables[3];
  const s4 = await openSession(mgr.accessToken, t4.id);
  const menu4 = await req('/menu', { token: mgr.accessToken });
  let dishId = null;
  for (const cat of menu4) for (const d of cat.dishes) if (d.variantGroups.length === 0) { dishId = d.id; break; }
  const o4 = await req('/orders', { method: 'POST', token: s4, body: { items: [{ dishId, variantIds: [], quantity: 1 }] } });
  const earlyPay = await fetch(`${API}/orders/${o4.id}/pay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${wat.accessToken}` },
    body: JSON.stringify({ method: 'cash' }),
  });
  console.log(`\n[scenario 5] pay-too-early → ${earlyPay.status} ${label(earlyPay.status === 409, 409)}`);

  console.log(`\n✓ payments smoke done`);
}

main().catch((err) => {
  console.error('✗', err);
  process.exitCode = 1;
});
