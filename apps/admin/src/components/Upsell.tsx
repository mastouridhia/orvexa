import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type Capability, PLAN_NAMES, PLAN_PRICING, tierFor } from '@orvexa/shared';
import { useCan } from '../utils/plan.js';
import { IconLock } from './tf-icons.js';

/**
 * Owner-facing upsell. A locked feature is shown (not hidden) with a prompt to
 * upgrade to the tier that unlocks it. Never rendered in the customer app.
 */
export function UpsellPanel({ cap, featureKey }: { cap: Capability; featureKey: string }) {
  const { t } = useTranslation();
  const tier = tierFor(cap);
  const plan = `Orvexa ${PLAN_NAMES[tier]}`;
  const price = PLAN_PRICING[tier].monthly;
  const feature = t(`upsell.features.${featureKey}`);

  return (
    <div className="tf-a-upsell">
      <div className="tf-a-upsell__card">
        <div className="tf-a-upsell__icon">
          <IconLock size={26} />
        </div>
        <div className="tf-a-upsell__plan">{plan}</div>
        <h2 className="tf-a-upsell__title">{t('upsell.title', { feature })}</h2>
        <p className="tf-a-upsell__body">{t('upsell.body', { plan, price })}</p>
        <a className="tf-a-upsell__cta" href="https://orvexa.tn/#plans" target="_blank" rel="noreferrer">
          {t('upsell.cta')}
        </a>
      </div>
    </div>
  );
}

/** Route guard: renders children when the plan unlocks `cap`, otherwise the upsell. */
export function Guarded({
  cap,
  featureKey,
  children,
}: {
  cap: Capability;
  featureKey: string;
  children: ReactNode;
}) {
  const can = useCan();
  return can(cap) ? <>{children}</> : <UpsellPanel cap={cap} featureKey={featureKey} />;
}
