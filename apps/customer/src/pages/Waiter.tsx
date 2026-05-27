import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/queries.js';
import { handleApiError } from '../api/errorMessage.js';
import { useSessionStore } from '../store/session.js';
import { useWaiterCallStore } from '../store/waiterCall.js';
import { IconBell, IconBellRing, IconChevronLeft } from '../components/tf-icons.js';

type State = 'idle' | 'pending' | 'ack';

const ACK_DELAY_MS = 2200;

export function WaiterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((s) => s.token);
  const session = useSessionStore((s) => s.session);
  const markCalled = useWaiterCallStore((s) => s.markCalled);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const ackTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!token || !session) navigate('/', { replace: true });
  }, [token, session, navigate]);

  useEffect(() => {
    return () => {
      if (ackTimer.current) window.clearTimeout(ackTimer.current);
    };
  }, []);

  const callWaiter = async () => {
    if (!token || !session) return;
    setError(null);
    setState('pending');
    try {
      await api.callWaiter(token, session.tableId);
      markCalled(session.tableId);
      // No customer-side ack channel — show "on the way" after a friendly delay
      ackTimer.current = window.setTimeout(() => {
        setState('ack');
      }, ACK_DELAY_MS);
    } catch (err) {
      setError(handleApiError(err, t));
      setState('idle');
    }
  };

  const close = () => {
    navigate(-1);
  };

  return (
    <div className="tf-waiter">
      <div className="tf-waiter__head">
        {state === 'idle' ? (
          <button type="button" className="tf-back" onClick={close}>
            <IconChevronLeft size={14} />
            {t('cart.back')}
          </button>
        ) : null}
      </div>

      <div className="tf-waiter__center">
        {state === 'idle' ? (
          <>
            <div className="tf-waiter__halo">
              <span className="tf-waiter__halo-bg" />
              <span className="tf-waiter__halo-icon">
                <IconBell size={48} color="var(--tf-accent)" />
              </span>
            </div>
            <h1 className="tf-waiter__title">{t('waiter.idleTitle')}</h1>
            <p className="tf-waiter__body">{t('waiter.idleBody')}</p>
            <button type="button" className="tf-waiter__cta" onClick={callWaiter}>
              {t('actions.callWaiter')}
            </button>
            {error ? <div className="error-banner">{error}</div> : null}
          </>
        ) : null}

        {state === 'pending' ? (
          <>
            <div className="tf-waiter__halo">
              <span className="tf-waiter__halo-bg" />
              <span className="tf-waiter__halo-ring" aria-hidden="true" />
              <span
                className="tf-waiter__halo-ring tf-waiter__halo-ring--inner"
                aria-hidden="true"
              />
              <span className="tf-waiter__halo-icon">
                <IconBellRing size={48} color="var(--tf-accent)" />
              </span>
            </div>
            <h1 className="tf-waiter__title">
              <em>{t('waiter.callingTitle')}</em> {t('waiter.callingTitleEm')}
            </h1>
            <p className="tf-waiter__body" role="status" aria-live="polite">
              {t('waiter.callingBody')}
            </p>
          </>
        ) : null}

        {state === 'ack' ? (
          <>
            <div className="tf-waiter__halo">
              <span className="tf-waiter__halo-bg tf-waiter__halo-bg--ok" />
              <span className="tf-waiter__halo-icon tf-waiter__check">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12l5 5L20 7"
                    stroke="var(--success-ink)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            <h1 className="tf-waiter__title">{t('waiter.ackTitle')}</h1>
            <p className="tf-waiter__body">{t('waiter.ackBody')}</p>
            <button type="button" className="tf-waiter__done" onClick={close}>
              {t('waiter.done')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
