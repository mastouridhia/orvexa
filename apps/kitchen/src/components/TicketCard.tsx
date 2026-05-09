import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode, Order, OrderStatus } from '@orvexa/shared';
import { pickLang } from '../utils/format.js';
import {
  ageBucket,
  AGE_LABELS,
  elapsedMs,
  formatMMSS,
  nextStatus,
  shortTicketId,
  type AgeBucket,
} from '../utils/kds.js';
import { IconBolt, IconCheck, IconInfo, IconUser } from './tf-icons.js';

const HOLD_MS = 600;

type AdvanceTo = 'preparing' | 'ready' | 'served';

export function TicketCard({
  order,
  lang,
  tableLabels,
  now,
  onAdvance,
  on86Dish,
  large = false,
  freshlyArrived = false,
}: {
  order: Order;
  lang: LanguageCode;
  tableLabels: Map<string, string>;
  now: number;
  onAdvance: (orderId: string, status: AdvanceTo) => void | Promise<void>;
  on86Dish?: (dishId: string) => void | Promise<void>;
  large?: boolean;
  freshlyArrived?: boolean;
}) {
  const { t } = useTranslation();
  const elapsed = elapsedMs(order.createdAt, now);
  const bucket: AgeBucket = ageBucket(order.createdAt, now);
  const meta = AGE_LABELS[bucket];
  const next = nextStatus(order.status);
  const isReady = order.status === 'ready';
  const isNew = order.status === 'received';
  const tableLabel = tableLabels.get(order.tableId) ?? order.tableId.slice(0, 4).toUpperCase();
  const ticketId = shortTicketId(order.id);

  // Hold-to-bump: press for HOLD_MS, then advance.
  const [holdPct, setHoldPct] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) window.clearInterval(holdTimerRef.current);
    };
  }, []);

  const startHold = () => {
    if (!next) return;
    holdStartRef.current = performance.now();
    if (holdTimerRef.current !== null) window.clearInterval(holdTimerRef.current);
    holdTimerRef.current = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - holdStartRef.current) / HOLD_MS);
      setHoldPct(p);
      if (p >= 1) {
        if (holdTimerRef.current !== null) window.clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setHoldPct(0);
        void onAdvance(order.id, next);
      }
    }, 16);
  };

  const endHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldPct(0);
  };

  return (
    <article
      className={`tf-kds-card tf-kds-card--${bucket}${isReady ? ' is-ready' : ''}${isNew ? ' is-new' : ''}${freshlyArrived ? ' just-arrived' : ''}${large ? ' is-large' : ''}`}
      aria-label={`Order ${ticketId} · ${t(`board.status.${order.status}`)}`}
    >
      {/* Header strip — color reflects age bucket */}
      <div
        className="tf-kds-card__head"
        style={{ background: meta.bg, color: meta.ink }}
      >
        {isNew ? <span className="tf-kds-card__sweep" aria-hidden="true" /> : null}
        <div className="tf-kds-card__head-left">
          <span className="tf-mono tf-kds-card__head-table">T-{tableLabel}</span>
          <span className="tf-kds-card__head-id">#{ticketId}</span>
        </div>
        <div className="tf-kds-card__head-right">
          <span className="tf-mono tf-kds-card__head-age">{t(meta.key)}</span>
          <span className="tf-mono tf-kds-card__head-mmss">{formatMMSS(elapsed)}</span>
        </div>
      </div>

      {/* Meta row */}
      <div className="tf-kds-card__meta">
        <span className="tf-kds-card__meta-pax">
          <IconUser />
          <span>{t('card.itemCount', { count: order.items.length })}</span>
        </span>
        {order.etaMinutes != null ? (
          <span className="tf-mono tf-kds-card__meta-eta" title={t('card.eta')}>
            ⏱ {order.etaMinutes}m
          </span>
        ) : null}
        <span className="tf-mono tf-kds-card__meta-fired">
          {t('card.firedAgo', { time: formatMMSS(elapsed) })}
        </span>
      </div>

      {/* Items */}
      <div className="tf-kds-card__items">
        {order.items.map((item) => (
          <div className="tf-kds-card__item" key={item.id}>
            <span className="tf-kds-card__item-qty tf-tabular">{item.quantity}×</span>
            <span className="tf-kds-card__item-body">
              <span className="tf-kds-card__item-name">{pickLang(item.nameSnapshot, lang)}</span>
              {lang !== 'ar' && item.nameSnapshot.ar ? (
                <span className="tf-kds-card__item-ar" dir="rtl">
                  {item.nameSnapshot.ar}
                </span>
              ) : null}
              {item.variants.length > 0 ? (
                <span className="tf-kds-card__item-variants">
                  {item.variants.map((v) => pickLang(v.nameSnapshot, lang)).join(' · ')}
                </span>
              ) : null}
              {item.notes ? (
                <span className="tf-kds-card__item-notes">
                  <IconInfo />
                  <span>{item.notes}</span>
                </span>
              ) : null}
            </span>
            {on86Dish ? (
              <button
                type="button"
                className="tf-kds-card__item-86"
                title={t('card.outOfStock')}
                onClick={() => {
                  if (window.confirm(t('card.outOfStockConfirm'))) {
                    void on86Dish(item.dishId);
                  }
                }}
              >
                86
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Bump bar */}
      <div className="tf-kds-card__bump">
        {isReady ? (
          <div className="tf-kds-card__ready">
            <IconCheck />
            <span>{t('card.readyToPass')}</span>
          </div>
        ) : next ? (
          <button
            type="button"
            className="tf-kds-card__hold"
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            disabled={!next}
          >
            {holdPct > 0 ? (
              <span className="tf-kds-card__hold-fill" style={{ width: `${holdPct * 100}%` }} />
            ) : null}
            <span className="tf-kds-card__hold-label">
              <IconBolt />
              <span>
                {holdPct > 0
                  ? t('card.holding', { pct: Math.round(holdPct * 100) })
                  : t(`card.holdTo.${next as AdvanceTo}`)}
              </span>
            </span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

export type { OrderStatus };
