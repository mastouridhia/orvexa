import { useTranslation } from 'react-i18next';
import { WEEKDAYS } from '@orvexa/shared';
import { useEscapeKey, useFocusTrap } from '@orvexa/ui';
import type { RestaurantInfo } from '../api/queries.js';

const href = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

/** True when the owner has filled at least one info-card field worth showing. */
export function hasRestaurantInfo(restaurant: RestaurantInfo): boolean {
  const hours = restaurant.openingHours ?? null;
  const hasHours = !!hours && WEEKDAYS.some((d) => hours[d] !== undefined);
  const hasSocials = !!(restaurant.instagramUrl || restaurant.facebookUrl || restaurant.tiktokUrl);
  const hasContact = !!(restaurant.address || restaurant.phone);
  const hasWifi = !!restaurant.wifiSsid;
  return hasHours || hasContact || hasWifi || hasSocials;
}

/** The hours/contact/wifi/socials blocks, shared between any host container. */
function InfoBlocks({ restaurant }: { restaurant: RestaurantInfo }) {
  const { t } = useTranslation();

  const hours = restaurant.openingHours ?? null;
  const hourDays = hours ? WEEKDAYS.filter((d) => hours[d] !== undefined) : [];
  const socials = [
    restaurant.instagramUrl ? { key: 'instagram', label: 'Instagram', url: restaurant.instagramUrl } : null,
    restaurant.facebookUrl ? { key: 'facebook', label: 'Facebook', url: restaurant.facebookUrl } : null,
    restaurant.tiktokUrl ? { key: 'tiktok', label: 'TikTok', url: restaurant.tiktokUrl } : null,
  ].filter((s): s is { key: string; label: string; url: string } => s !== null);
  const hasWifi = !!restaurant.wifiSsid;
  const hasContact = !!(restaurant.address || restaurant.phone);

  return (
    <>
      {hourDays.length > 0 && (
        <div className="tf-info__block">
          <div className="tf-info__block-label">{t('info.hours')}</div>
          <ul className="tf-info__hours">
            {hourDays.map((d) => {
              const dh = hours![d];
              return (
                <li key={d} className="tf-info__hours-row">
                  <span className="tf-info__day">{t(`info.days.${d}`)}</span>
                  <span className="tf-info__time">
                    {dh ? `${dh.open} – ${dh.close}` : t('info.closed')}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasContact && (
        <div className="tf-info__block">
          {restaurant.address && (
            <div className="tf-info__line">
              <span>{restaurant.address}</span>
              {restaurant.mapUrl && (
                <a
                  className="tf-info__link"
                  href={href(restaurant.mapUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('info.directions')}
                </a>
              )}
            </div>
          )}
          {restaurant.phone && (
            <div className="tf-info__line">
              <a className="tf-info__link" href={`tel:${restaurant.phone}`}>
                {t('info.call')} · {restaurant.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {hasWifi && (
        <div className="tf-info__block">
          <div className="tf-info__block-label">{t('info.wifi')}</div>
          <div className="tf-info__line">
            <span>
              {t('info.wifiNetwork')}: <b>{restaurant.wifiSsid}</b>
            </span>
            {restaurant.wifiPassword && (
              <span>
                {t('info.wifiPassword')}: <b>{restaurant.wifiPassword}</b>
              </span>
            )}
          </div>
        </div>
      )}

      {socials.length > 0 && (
        <div className="tf-info__block">
          <div className="tf-info__block-label">{t('info.follow')}</div>
          <div className="tf-info__socials">
            {socials.map((s) => (
              <a
                key={s.key}
                className="tf-info__social"
                href={href(s.url)}
                target="_blank"
                rel="noreferrer"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Read-only restaurant info (hours, contact, wifi, socials) presented as a
 * bottom sheet so it stays out of the menu flow and only appears on tap.
 * Trigger visibility is gated by {@link hasRestaurantInfo}.
 */
export function RestaurantInfoSheet({
  restaurant,
  onClose,
}: {
  restaurant: RestaurantInfo;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const sheetRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);

  return (
    <>
      <div className="tf-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="tf-extras-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
      >
        <div className="tf-cartsheet__grabber" aria-hidden="true">
          <span />
        </div>
        <header className="tf-extras-sheet__head">
          <h2 id="info-title" className="tf-extras-sheet__title">
            {t('info.title')}
          </h2>
          <button
            type="button"
            className="tf-cartsheet__close"
            aria-label={t('cart.back')}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="tf-extras-sheet__body">
          <div className="tf-info tf-info--sheet">
            <InfoBlocks restaurant={restaurant} />
          </div>
        </div>
      </div>
    </>
  );
}
