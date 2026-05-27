import { useTranslation } from 'react-i18next';
import type { TableWithDerived, WaiterCall } from '@orvexa/shared';
import { callAgeSeconds, callUrgency, fmtAgeShort } from '../utils/waiter.js';
import { IconCheck, IconLeaf, IconReceipt } from './tf-icons.js';

export function CallsView({
  calls,
  tables,
  now,
  busyCallId,
  onAck,
  onOpenTable,
}: {
  calls: WaiterCall[];
  tables: TableWithDerived[];
  now: number;
  busyCallId: string | null;
  onAck: (id: string) => void;
  onOpenTable: (tableId: string) => void;
}) {
  const { t } = useTranslation();
  const tableLabel = (id: string) => tables.find((tt) => tt.id === id)?.label ?? id.slice(0, 6);
  const tableSeats = (id: string) => tables.find((tt) => tt.id === id)?.seats ?? null;

  // Oldest first — most urgent at the top.
  const ordered = [...calls].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="tf-w-calls">
      <header className="tf-w-calls__head">
        <div className="tf-caption">{t('calls.caption')}</div>
        <h1 className="tf-w-calls__title">
          {ordered.length === 0 ? (
            <>
              {t('calls.empty.lead')} <span className="tf-display">{t('calls.empty.tail')}</span>
            </>
          ) : (
            t('calls.summary', { count: ordered.length })
          )}
        </h1>
      </header>

      <div className="tf-w-calls__list">
        {ordered.length === 0 ? <EmptyCalls /> : null}
        {ordered.map((c, i) => {
          const age = callAgeSeconds(c, now);
          const urg = callUrgency(age);
          const seats = tableSeats(c.tableId);
          return (
            <article
              key={c.id}
              className={`tf-w-call tf-w-call--${urg}${i === 0 && age < 30 ? ' just-arrived' : ''}`}
            >
              <span
                className={`tf-w-call__age-strip tf-w-call__age-strip--${urg}`}
                aria-hidden="true"
              />
              <div className="tf-w-call__top">
                <div className={`tf-w-call__icon tf-w-call__icon--${urg}`}>
                  {c.kind === 'request_bill' ? <IconReceipt /> : <IconLeaf />}
                  {/* extras + call_waiter share the leaf icon — note disambiguates */}
                </div>
                <div className="tf-w-call__body">
                  <div className="tf-w-call__head-line">
                    <span className="tf-display tf-w-call__table">
                      {t('calls.tableLabel', { label: tableLabel(c.tableId) })}
                    </span>
                    {seats !== null ? (
                      <span className="tf-mono tf-w-call__pax">
                        {t('calls.pax', { count: seats })}
                      </span>
                    ) : null}
                  </div>
                  <div className="tf-w-call__what">
                    {c.kind === 'request_bill'
                      ? t('calls.kind.bill')
                      : c.kind === 'request_extras'
                        ? t('calls.kind.extras')
                        : t('calls.kind.help')}
                  </div>
                  {c.note ? <div className="tf-w-call__note">{c.note}</div> : null}
                  <div className={`tf-mono tf-w-call__age tf-w-call__age--${urg}`}>
                    {fmtAgeShort(age)} · {t(`calls.urgency.${urg}`)}
                  </div>
                </div>
              </div>
              <div className="tf-w-call__actions">
                <button
                  type="button"
                  className="tf-w-call__open"
                  onClick={() => onOpenTable(c.tableId)}
                >
                  {t('calls.openTable')}
                </button>
                <button
                  type="button"
                  className="tf-w-call__ack"
                  disabled={busyCallId === c.id}
                  onClick={() => onAck(c.id)}
                >
                  <IconCheck />
                  <span>{busyCallId === c.id ? t('calls.acking') : t('calls.onTheWay')}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EmptyCalls() {
  const { t } = useTranslation();
  return (
    <div className="tf-w-calls__empty">
      <div className="tf-w-calls__empty-halo">
        <IconCheck />
      </div>
      <div className="tf-w-calls__empty-sub">{t('calls.empty.body')}</div>
      <div className="tf-caption tf-w-calls__empty-section">{t('calls.empty.last4h')}</div>
      <div className="tf-w-calls__empty-stats">
        {/* These are aspirational — real backend doesn't track per-shift answer-rate yet. */}
        <Row k={t('calls.empty.answered')} v="0" subtle="/ 0" />
        <Row k={t('calls.empty.avgResponse')} v="—" />
        <Row k={t('calls.empty.lateCalls')} v="0" />
      </div>
    </div>
  );
}

function Row({ k, v, subtle }: { k: string; v: string; subtle?: string }) {
  return (
    <div className="tf-w-calls__empty-row">
      <span className="tf-w-calls__empty-row-k">{k}</span>
      <span className="tf-tabular tf-w-calls__empty-row-v">
        {v}
        {subtle ? <span className="tf-w-calls__empty-row-sub">{subtle}</span> : null}
      </span>
    </div>
  );
}

/** Standalone state — used by Dashboard when calls tab has zero items at first load too. */
export function WaiterEmptyCalls() {
  const { t } = useTranslation();
  return (
    <div className="tf-w-calls">
      <header className="tf-w-calls__head">
        <div className="tf-caption">{t('calls.caption')}</div>
        <h1 className="tf-w-calls__title">
          {t('calls.empty.lead')} <span className="tf-display">{t('calls.empty.tail')}</span>
        </h1>
      </header>
      <div className="tf-w-calls__list">
        <EmptyCalls />
      </div>
    </div>
  );
}
