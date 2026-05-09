import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { LanguageCode } from '@orvexa/shared';
import { useEscapeKey, useFocusTrap } from '@orvexa/ui';
import { api } from '../api/queries.js';
import { ApiError } from '../api/client.js';
import {
  buildPlaceOrderItems,
  cartLineCount,
  cartSubtotal,
  lineSubtotal,
  useCartStore,
  variantSummary,
} from '../store/cart.js';
import { useSessionStore } from '../store/session.js';
import { useOrderRefsStore } from '../store/orders.js';
import { formatMillimes, pickLang } from '../utils/format.js';
import { IconArrowRight, IconBag, IconMinus, IconPlus } from './tf-icons.js';

export function CartDrawer({
  lang,
  onClose,
}: {
  lang: LanguageCode;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clearCart = useCartStore((s) => s.clear);
  const editingOrderId = useCartStore((s) => s.editingOrderId);
  const ownerSessionId = useCartStore((s) => s.ownerSessionId);
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const isOwner = !ownerSessionId || !session || ownerSessionId === session.id;
  const rememberOrder = useOrderRefsStore((s) => s.remember);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  const subtotal = cartSubtotal(lines);
  const taxPercent = restaurant?.taxPercent ?? 0;
  const servicePercent = restaurant?.servicePercent ?? 0;
  const tax = Math.round((subtotal * taxPercent) / 100);
  const service = Math.round((subtotal * servicePercent) / 100);
  const total = subtotal + tax + service;

  const checkout = async () => {
    if (!token || lines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const order = editingOrderId
        ? await api.addItemsToOrder(token, editingOrderId, {
            items: buildPlaceOrderItems(lines),
          })
        : await api.placeOrder(token, { items: buildPlaceOrderItems(lines) });
      rememberOrder(order.id);
      clearCart();
      onClose();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tableShort = session?.tableLabel ?? '—';
  const restaurantName = restaurant?.name ?? t('app.name');

  return (
    <>
      <div
        className="tf-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="tf-cartsheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        <div className="tf-cartsheet__grabber" aria-hidden="true">
          <span />
        </div>
        <div className="tf-cartsheet__head">
          <div>
            <h2 id="cart-title" className="tf-cartsheet__title">
              {t('cart.titleLead', { defaultValue: 'Your' })}{' '}
              <em>{t('cart.titleEm', { defaultValue: 'order' })}</em>
            </h2>
            <div className="tf-cartsheet__sub">
              {t('header.tableShort')} {tableShort} · {restaurantName}
              {' · '}
              {t('cart.items', { count: cartLineCount(lines) })}
            </div>
          </div>
          <button
            type="button"
            className="tf-cartsheet__close"
            aria-label={t('cart.back')}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="tf-cartsheet__body">
          {lines.length === 0 ? (
            <div className="tf-cart-empty">
              <div className="tf-cart-empty__icon">
                <IconBag />
              </div>
              <div className="tf-cart-empty__title">{t('cart.empty')}</div>
              <div className="tf-cart-empty__sub">
                {t('cart.emptySub', {
                  defaultValue: 'Browse the menu to get started.',
                })}
              </div>
            </div>
          ) : (
            <div className="tf-cartsheet__list">
              {lines.map((line) => (
                <div className="tf-cartline" key={line.uid}>
                  {line.imageUrl ? (
                    <img
                      className="tf-cartline__hero"
                      src={line.imageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="tf-cartline__hero" aria-hidden="true" />
                  )}
                  <div className="tf-cartline__body">
                    <h4 className="tf-cartline__name">{pickLang(line.name, lang)}</h4>
                    {line.variants.length ? (
                      <p className="tf-cartline__variants">{variantSummary(line, lang)}</p>
                    ) : null}
                    {line.notes ? (
                      <p className="tf-cartline__notes">{line.notes}</p>
                    ) : null}
                    <span className="tf-cartline__price tf-tabular">
                      {formatMillimes(lineSubtotal(line))}
                    </span>
                  </div>
                  <div className="tf-stepper tf-stepper--sm" aria-label={t('dish.quantity')}>
                    <button
                      type="button"
                      className="tf-stepper__btn"
                      onClick={() => {
                        if (line.quantity <= 1) remove(line.uid);
                        else setQuantity(line.uid, line.quantity - 1);
                      }}
                      aria-label="-"
                    >
                      <IconMinus size={14} />
                    </button>
                    <span className="tf-stepper__val">{line.quantity}</span>
                    <button
                      type="button"
                      className="tf-stepper__btn"
                      onClick={() =>
                        setQuantity(line.uid, Math.min(99, line.quantity + 1))
                      }
                      aria-label="+"
                    >
                      <IconPlus size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="tf-totals">
                <div className="tf-totals__row">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatMillimes(subtotal)}</span>
                </div>
                {taxPercent > 0 ? (
                  <div className="tf-totals__row">
                    <span>{t('cart.tax', { percent: taxPercent })}</span>
                    <span>{formatMillimes(tax)}</span>
                  </div>
                ) : null}
                {servicePercent > 0 ? (
                  <div className="tf-totals__row">
                    <span>{t('cart.service', { percent: servicePercent })}</span>
                    <span>{formatMillimes(service)}</span>
                  </div>
                ) : null}
                <div className="tf-totals__grand">
                  <span className="tf-totals__grand-label">{t('cart.total')}</span>
                  <span className="tf-totals__grand-value">
                    {formatMillimes(total)}
                  </span>
                </div>
              </div>
            </div>
          )}
          {error ? <div className="error-banner">{error}</div> : null}
        </div>

        {lines.length > 0 ? (
          <div className="tf-cartsheet__bar">
            {isOwner ? (
              <button
                type="button"
                className="tf-cartsheet__cta"
                disabled={busy}
                onClick={checkout}
              >
                <span>{busy ? t('actions.calling') : t('cart.confirmOrder')}</span>
                <IconArrowRight size={16} />
              </button>
            ) : (
              <div className="tf-cartsheet__viewonly" role="status">
                <strong>{t('cart.viewOnly')}</strong>
                <span className="tf-cartsheet__hint">{t('cart.viewOnlyHint')}</span>
              </div>
            )}
            <div className="tf-cartsheet__hint">
              {t('cart.payAtTable', {
                defaultValue: "Pay at the table when you're done.",
              })}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
