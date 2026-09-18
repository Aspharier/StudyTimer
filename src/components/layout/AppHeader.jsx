import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { formatClockTime } from '../../utils/dateUtils';
import { Settings, Cloud, BookOpen } from 'lucide-react';

export const AppHeader = ({ onOpenSettings }) => {
  const { user } = useAuthStore();
  const [clockTime, setClockTime] = useState(formatClockTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(formatClockTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      {/* Brand & Edition */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="planner-logo-badge">
          <BookOpen size={16} />
        </div>
        <div>
          <span className="logo-text">Focusly</span>
          <span className="logo-tag">Digital Study Planner</span>
        </div>
      </div>

      {/* Action Controls & Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="cloud-status-pill" title={user ? `Signed in as ${user.email || 'Google User'}` : 'Offline Mode'}>
          <Cloud size={13} style={{ color: user?.isGuest ? '#f59e0b' : '#10b981' }} />
          <span>{user?.isGuest ? 'Local Cache' : 'Cloud Synced'}</span>
        </div>

        <button
          className="btn btn-secondary btn-xs"
          onClick={onOpenSettings}
          title="Open Planner Settings"
          aria-label="Settings"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>

        <div className="clock-pill">{clockTime}</div>
      </div>
    </header>
  );
};
