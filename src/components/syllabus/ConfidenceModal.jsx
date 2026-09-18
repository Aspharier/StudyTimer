import { useState } from 'react';
import { RECALL_RATINGS } from '../../utils/constants';
import { X } from 'lucide-react';

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
          <h3>Evaluate Recall: {topic.name}</h3>
          <button className="del-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '16px' }}>
          Evaluate retention and recall capability without referencing notes:
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
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: selectedRating === key ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${selectedRating === key ? 'var(--accent-neon)' : 'var(--border-glass)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="radio" 
                  name="recall_rating" 
                  value={key} 
                  checked={selectedRating === key} 
                  onChange={() => setSelectedRating(key)} 
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1, fontSize: '0.88rem' }}>
                  {rating.label.replace(/^0\d\s\/\/\s/, '')}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Level {rating.value}
                </span>
              </label>
            ))}
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px' }}>
            Save Confidence
          </button>
        </form>
      </div>
    </div>
  );
};
