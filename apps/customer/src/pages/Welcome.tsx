import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LanguageSelector } from '@orvexa/ui';
import { useSessionStore } from '../store/session.js';
import { useOrderRefsStore } from '../store/orders.js';
import { IconQR } from '../components/tf-icons.js';
import { isPlan1 } from '../utils/plan.js';

export function Welcome() {
  const { t } = useTranslation();
  const session = useSessionStore((s) => s.session);
  const restaurant = useSessionStore((s) => s.restaurant);
  const setLocale = useSessionStore((s) => s.setLocale);
  const orderIds = useOrderRefsStore((s) => s.ids);

  return (
    <section className="tf-welcome">
      <div className="tf-welcome__hero" aria-hidden="true">
        <div className="tf-welcome__halo" />
        <IconQR size={42} color="var(--tf-accent)" />
      </div>

      <h1 className="tf-welcome__title">
        <span>{t('welcome.title')}</span>
        <span className="tf-display tf-welcome__brand">{restaurant?.name ?? 'Orvexa'}</span>
      </h1>

      {!session ? (
        <p className="tf-welcome__sub">{t('welcome.noSession')}</p>
      ) : (
        <p className="tf-welcome__sub">{t('welcome.greeting')}</p>
      )}

      {session ? (
        <div className="tf-welcome__table" aria-live="polite">
          <span className="tf-welcome__table-label">{t('header.tableShort')}</span>
          <span className="tf-welcome__table-value">{session.tableLabel}</span>
        </div>
      ) : null}

      <div className="tf-welcome__lang">
        <LanguageSelector onChange={setLocale} />
      </div>

      <div className="tf-welcome__actions">
        {session ? (
          <>
            <Link to="/menu" className="btn btn-primary btn-lg">
              {t('welcome.browseMenu')}
            </Link>
            {!isPlan1 && orderIds.length ? (
              <Link to="/history" className="btn btn-pill">
                {t('order.history')}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
