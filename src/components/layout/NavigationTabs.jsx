import { useUIStore } from '../../stores/useUIStore';

export const NavigationTabs = () => {
  const { activeTab, setActiveTab } = useUIStore();

  const tabs = [
    { id: 'dashboard', code: '01', label: 'DASHBOARD' },
    { id: 'plan', code: '02', label: 'DAILY_PLAN' },
    { id: 'syllabus', code: '03', label: 'SYLLABUS' },
    { id: 'settings', code: '04', label: 'SETTINGS' }
  ];

  return (
    <div className="tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => setActiveTab(t.id)}
        >
          <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>[{t.code}]</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
};
