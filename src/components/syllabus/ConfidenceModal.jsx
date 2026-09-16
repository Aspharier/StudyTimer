import { useState } from 'react';
import { RECALL_RATINGS } from '../../utils/constants';

export const ConfidenceModal = ({ topic, onClose, onSave }) => {
  const [selectedRating, setSelectedRating] = useState(
    topic.confidenceScore >= 80 ? 'CONFIDENT' :
    topic.confidenceScore >= 60 ? 'COULD_EXPLAIN' :
    topic.confidenceScore >= 40 ? 'MOSTLY_KNEW' :
    topic.confidenceScore >= 20 ? 'STRUGGLED' : 'COULDNT_RECALL'
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const scoreMap = {
      COULDNT_RECALL: 15,
      STRUGGLED: 35,
      MOSTLY_KNEW: 60,
      COULD_EXPLAIN: 80,
      CONFIDENT: 95
    };
    const newScore = scoreMap[selectedRating] || 50;
    const newStatus = 
      newScore >= 80 ? 'MASTERED' : 
      newScore >= 55 ? 'PRACTICING' : 
      newScore >= 35 ? 'LEARNING' : 'WEAK';

    onSave({
      ...topic,
      confidenceScore: newScore,
      status: newStatus,
      lastStudiedAt: new Date().toISOString()
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>METACOGNITION // {topic.name}</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '16px' }}>
          Evaluate retention & retrieval capability without referencing course notes:
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {Object.entries(RECALL_RATINGS).map(([key, rating]) => (
              <label 
                key={key} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedRating === key ? 'var(--bg-secondary)' : 'var(--bg-card)',
                  border: `1px solid ${selectedRating === key ? 'var(--text-primary)' : 'var(--border)'}`,
                  cursor: 'pointer'
                }}
              >
                <input 
                  type="radio" 
                  name="recall_rating" 
                  value={key} 
                  checked={selectedRating === key} 
                  onChange={() => setSelectedRating(key)} 
                />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', flex: 1, fontSize: '0.82rem' }}>
                  {rating.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  LVL_{rating.value}
                </span>
              </label>
            ))}
          </div>

          <button type="submit" className="btn btn-primary w-full">
            [ UPDATE TELEMETRY ]
          </button>
        </form>
      </div>
    </div>
  );
};
