import type { Receipt } from '@orvexa/shared';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMillimes(m: number, currency: string): string {
  const whole = Math.floor(m / 1000);
  const frac = Math.abs(m % 1000)
    .toString()
    .padStart(3, '0');
  return `${whole}.${frac} ${currency}`;
}

function formatDateTime(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function renderReceiptHtml(receipt: Receipt): string {
  const { order, payments, restaurant, amountPaidMillimes, amountDueMillimes, tipTotalMillimes } =
    receipt;
  const itemRows = order.items
    .map((item) => {
      const variantLines = item.variants
        .map(
          (v) =>
            `<div class="var">+ ${escape(v.nameSnapshot.fr)}${
              v.priceDeltaMillimes !== 0
                ? ` (${formatMillimes(v.priceDeltaMillimes, restaurant.currency)})`
                : ''
            }</div>`,
        )
        .join('');
      const variantDelta = item.variants.reduce((s, v) => s + v.priceDeltaMillimes, 0);
      const lineTotal = (item.unitPriceMillimes + variantDelta) * item.quantity;
      const noteLine = item.notes ? `<div class="note">${escape(item.notes)}</div>` : '';
      return `
        <tr>
          <td>${item.quantity}×</td>
          <td>
            <div>${escape(item.nameSnapshot.fr)}</div>
            ${variantLines}
            ${noteLine}
          </td>
          <td class="r">${formatMillimes(lineTotal, restaurant.currency)}</td>
        </tr>`;
    })
    .join('');

  const paymentRows = payments
    .map(
      (p) => `
      <tr>
        <td>${escape(p.method)}</td>
        <td>${escape(p.status)}</td>
        <td class="r">${formatMillimes(p.amountMillimes, restaurant.currency)}</td>
        <td class="r">${formatMillimes(p.tipMillimes, restaurant.currency)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Reçu ${order.id.slice(0, 8)}</title>
<style>
  body { font-family: ui-monospace, Menlo, Consolas, monospace; max-width: 420px; margin: 1rem auto; padding: 0 1rem; color: #111; }
  h1 { font-size: 1.1rem; text-align: center; margin: 0 0 .25rem; }
  .meta { text-align: center; color: #555; font-size: .85rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .25rem .15rem; vertical-align: top; font-size: .9rem; }
  th { border-bottom: 1px dashed #aaa; text-align: left; }
  td.r, th.r { text-align: right; }
  .var { color: #555; font-size: .8rem; padding-left: .5rem; }
  .note { color: #555; font-style: italic; font-size: .8rem; padding-left: .5rem; }
  .totals { margin-top: .75rem; border-top: 1px dashed #aaa; padding-top: .5rem; }
  .totals .row { display: flex; justify-content: space-between; padding: .1rem 0; }
  .totals .grand { font-weight: 700; border-top: 1px solid #111; margin-top: .25rem; padding-top: .25rem; }
  .pay { margin-top: 1rem; }
  .footer { margin-top: 1rem; text-align: center; color: #555; font-size: .8rem; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>${escape(restaurant.name)}</h1>
  <div class="meta">
    Commande ${order.id.slice(0, 8)} · ${formatDateTime(order.createdAt, restaurant.timezone)}
  </div>
  <table>
    <thead><tr><th>Qt</th><th>Article</th><th class="r">Montant</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Sous-total</span><span>${formatMillimes(order.subtotalMillimes, restaurant.currency)}</span></div>
    <div class="row"><span>TVA (${restaurant.taxPercent}%)</span><span>${formatMillimes(order.taxMillimes, restaurant.currency)}</span></div>
    <div class="row"><span>Service (${restaurant.servicePercent}%)</span><span>${formatMillimes(order.serviceMillimes, restaurant.currency)}</span></div>
    <div class="row grand"><span>Total</span><span>${formatMillimes(order.totalMillimes, restaurant.currency)}</span></div>
  </div>
  ${
    payments.length
      ? `<div class="pay">
           <table>
             <thead><tr><th>Mode</th><th>Statut</th><th class="r">Montant</th><th class="r">Pourboire</th></tr></thead>
             <tbody>${paymentRows}</tbody>
           </table>
           <div class="totals">
             <div class="row"><span>Payé</span><span>${formatMillimes(amountPaidMillimes, restaurant.currency)}</span></div>
             ${tipTotalMillimes ? `<div class="row"><span>Pourboires</span><span>${formatMillimes(tipTotalMillimes, restaurant.currency)}</span></div>` : ''}
             <div class="row grand"><span>Reste dû</span><span>${formatMillimes(amountDueMillimes, restaurant.currency)}</span></div>
           </div>
         </div>`
      : ''
  }
  <div class="footer">Merci de votre visite</div>
</body>
</html>`;
}
