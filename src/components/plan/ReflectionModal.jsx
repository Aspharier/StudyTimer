import { useState } from 'react';

const FOCUS_STATE_OPTIONS = [
  { value: 1, code: '01_DRAINED', label: 'Drained / Friction' },
  { value: 2, code: '02_FATIGUED', label: 'Fatigued' },
  { value: 3, code: '03_NEUTRAL', label: 'Nominal' },
  { value: 4, code: '04_FLOW', label: 'Good Focus' },
  { value: 5, code: '05_PEAK', label: 'Peak Momentum' }
];

export const ReflectionModal = ({ onClose, onSave, initialData }) => {
  const [rating, setRating] = useState(initialData?.rating || 3);
  const [feeling, setFeeling] = useState(initialData?.feeling || 3);
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSave = () => {
    onSave({
      rating,
      feeling,
      notes: notes.trim()
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>DAILY_DEBRIEF // LOG_ENTRY</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>

        <div className="form-group">
          <label className="form-label">SUBJECTIVE_ENERGY_STATE</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px', margin: '6px 0 16px' }}>
            {FOCUS_STATE_OPTIONS.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setFeeling(opt.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${feeling === opt.value ? 'var(--text-primary)' : 'var(--border)'}`,
                  background: feeling === opt.value ? 'var(--text-primary)' : 'var(--bg-secondary)',
                  color: feeling === opt.value ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textAlign: 'center'
                }}
                title={opt.label}
              >
                [{opt.code}]
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">EXECUTION_SCORE [1-5]</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[1, 2, 3, 4, 5].map(val => (
              <button
                type="button"
                key={val}
                className={`rating-btn ${val <= rating ? 'active' : ''}`}
                onClick={() => setRating(val)}
              >
                0{val}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">OBSERVATIONS &amp; DEFICITS_NOTED</label>
          <textarea 
            className="input input-rect" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            rows="4" 
            placeholder="Document error patterns, gaps in retrieval, or tomorrow's priority missions..."
          />
        </div>

        <button className="btn btn-primary w-full" onClick={handleSave}>
          [ COMMIT DEBRIEF ]
        </button>
      </div>
    </div>
  );
};
