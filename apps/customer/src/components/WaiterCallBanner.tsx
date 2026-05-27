import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { isWaiterCallStale, useWaiterCallStore } from '../store/waiterCall.js';
import { IconBellRing } from './tf-icons.js';

const ACK_DELAY_MS = 2200;

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WaiterCallBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const calledAt = useWaiterCallStore((s) => s.calledAt);
  const dismiss = useWaiterCallStore((s) => s.dismiss);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!calledAt) return;
    if (isWaiterCallStale(calledAt)) {
      dismiss();
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [calledAt, dismiss]);

  if (!calledAt) return null;

  const elapsed = now - calledAt;
  const acknowledged = elapsed >= ACK_DELAY_MS;

  return (
    <div
      className={`tf-waiter-banner${acknowledged ? ' is-ack' : ''}`}
      role="status"
      aria-live="polite"
    >
      <button type="button" className="tf-waiter-banner__main" onClick={() => navigate('/waiter')}>
        <span className="tf-waiter-banner__icon" aria-hidden="true">
          <IconBellRing size={18} />
        </span>
        <span className="tf-waiter-banner__text">
          <strong>{acknowledged ? t('waiter.banner.onWay') : t('waiter.banner.calling')}</strong>
          <span className="tf-waiter-banner__sub">
            {acknowledged
              ? t('waiter.banner.onWaySub', { defaultValue: 'A server is heading to your table.' })
              : t('waiter.banner.callingSub', { defaultValue: 'Notifying the team…' })}
          </span>
        </span>
        <span className="tf-waiter-banner__elapsed tf-tabular">{formatElapsed(elapsed)}</span>
      </button>
      <button
        type="button"
        className="tf-waiter-banner__close"
        onClick={dismiss}
        aria-label={t('waiter.banner.dismiss', { defaultValue: 'Dismiss' })}
      >
        ×
      </button>
    </div>
  );
}
