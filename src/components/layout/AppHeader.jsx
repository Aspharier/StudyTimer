import { useState, useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { formatClockTime } from '../../utils/dateUtils';

export const AppHeader = () => {
  const { theme, setTheme, isSyncing } = useUIStore();
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
      <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="logo-text">FOCUSLY.OS</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          // v2.0
        </span>
        {user && (
          <span 
            className="chip" 
            style={{ 
              fontSize: '0.68rem', 
              padding: '2px 6px', 
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)'
            }}
            title={`Connected: ${user.email}`}
          >
            {isSyncing ? '[SYNCING...]' : '[CLOUD_OK]'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-secondary btn-xs"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
        >
          {theme === 'dark' ? '[LIGHT_THEME]' : '[DARK_THEME]'}
        </button>
        <div className="clock-pill">SYS_TIME: {clockTime}</div>
      </div>
    </header>
  );
};
