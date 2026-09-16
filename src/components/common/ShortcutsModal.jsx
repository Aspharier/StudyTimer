export const ShortcutsModal = ({ onClose }) => {
  const shortcuts = [
    { key: '1', desc: 'NAV_DISPATCH -> DASHBOARD' },
    { key: '2', desc: 'NAV_DISPATCH -> DAILY_PLAN' },
    { key: '3', desc: 'NAV_DISPATCH -> SYLLABUS_TREE' },
    { key: '4', desc: 'NAV_DISPATCH -> SETTINGS_CONFIG' },
    { key: '?', desc: 'TOGGLE_SHORTCUTS_OVERLAY' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>KEYBOARD_CONTROLS // CLI_ACCELERATORS</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '16px' }}>
          Execute fast single-key controls directly from keyboard:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {shortcuts.map(s => (
            <div 
              key={s.key} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '8px 12px', 
                borderRadius: 'var(--radius-sm)', 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border)' 
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{s.desc}</span>
              <kbd style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border-light)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '2px 8px', 
                fontSize: '0.8rem', 
                fontWeight: 800,
                color: 'var(--text-primary)'
              }}>
                [{s.key}]
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
