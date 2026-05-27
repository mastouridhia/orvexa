import { useTranslation } from 'react-i18next';
import { IconBell, IconMap, IconTable } from './tf-icons.js';

export type WaiterTab = 'floor' | 'calls' | 'tables';

export function TabBar({
  tab,
  setTab,
  callCount,
}: {
  tab: WaiterTab;
  setTab: (t: WaiterTab) => void;
  callCount: number;
}) {
  const { t } = useTranslation();
  const tabs: { id: WaiterTab; key: string; icon: 'map' | 'bell' | 'table' }[] = [
    { id: 'floor', key: 'tabs.floor', icon: 'map' },
    { id: 'calls', key: 'tabs.calls', icon: 'bell' },
    { id: 'tables', key: 'tabs.tables', icon: 'table' },
  ];
  return (
    <nav className="tf-w-tabbar" aria-label={t('tabs.label')}>
      {tabs.map((tb) => {
        const on = tab === tb.id;
        const badge = tb.id === 'calls' ? callCount : 0;
        return (
          <button
            key={tb.id}
            type="button"
            className={`tf-w-tab${on ? ' is-on' : ''}`}
            onClick={() => setTab(tb.id)}
            aria-pressed={on}
          >
            <span className="tf-w-tab__ico">
              {tb.icon === 'map' ? <IconMap /> : tb.icon === 'bell' ? <IconBell /> : <IconTable />}
            </span>
            <span className="tf-w-tab__label">{t(tb.key)}</span>
            {badge > 0 ? <span className="tf-w-tab__badge tf-tabular">{badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
