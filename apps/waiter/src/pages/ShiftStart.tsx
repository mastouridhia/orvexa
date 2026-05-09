import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.js';

/**
 * Pre-shift "clock-in" intro screen — shown the first time the waiter signs in
 * for the day. Non-blocking; tapping "Clock in" advances to the live Dashboard.
 *
 * Shift mechanics (assigned sections, reservations count, specials count) aren't
 * tracked in the backend yet — this screen reads what we know (date, name) and
 * leaves the rest as visual scaffolding the design intends. A real backend hook
 * (`GET /staff/me/shift?date=`) can fill the cards later without re-shuffling.
 */
export function ShiftStart({ onStart }: { onStart: () => void }) {
  const { t, i18n } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const meName = me?.email ? me.email.split('@')[0] : t('shift.defaultName');
  const today = new Date();
  const weekday = today.toLocaleDateString(i18n.resolvedLanguage ?? 'fr', { weekday: 'long' });
  const time = today.toLocaleTimeString(i18n.resolvedLanguage ?? 'fr', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // These are deliberately placeholder figures — see comment above.
  const cards: { k: string; v: string }[] = [
    { k: t('shift.cards.sections'), v: '—' },
    { k: t('shift.cards.yourTables'), v: '—' },
    { k: t('shift.cards.reservations'), v: '—' },
    { k: t('shift.cards.specials'), v: '—' },
  ];

  return (
    <div className="tf-w-shift">
      <div className="tf-caption">
        {weekday} · {time}
      </div>
      <h1 className="tf-w-shift__title">
        {t('shift.greeting')} <span className="tf-display">{meName}</span>.
      </h1>
      <p className="tf-w-shift__sub">{t('shift.body')}</p>
      <div className="tf-w-shift__cards">
        {cards.map((c) => (
          <div className="tf-w-shift__card" key={c.k}>
            <div className="tf-caption">{c.k}</div>
            <div className="tf-w-shift__card-v">{c.v}</div>
          </div>
        ))}
      </div>
      <button type="button" className="tf-w-shift__cta" onClick={onStart}>
        {t('shift.clockIn')} →
      </button>
    </div>
  );
}
