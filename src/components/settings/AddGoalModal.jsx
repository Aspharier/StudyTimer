import { useState } from 'react';
import { generateId } from '../../utils/idGenerator';

export const AddGoalModal = ({ onClose, onSave, isFirst }) => {
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [targetScore, setTargetScore] = useState(80);
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && examDate) {
      onSave({ 
        id: generateId(), 
        name: name.trim(), 
        examDate, 
        targetScore: parseFloat(targetScore) || 80,
        isActive: isFirst || isActive, 
        createdAt: new Date().toISOString() 
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>// CONFIGURE_TARGET_EXAM</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">EXAM_IDENTIFIER</label>
            <input 
              type="text" 
              className="input input-rect" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. GATE CSE 2027" 
              required 
              autoFocus 
            />
          </div>
          <div className="grid-2col" style={{ gap: '12px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">TARGET_DATE</label>
              <input 
                type="date" 
                className="input input-rect" 
                value={examDate} 
                onChange={e => setExamDate(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">TARGET_ACCURACY (%)</label>
              <input 
                type="number" 
                min="10" 
                max="100" 
                className="input input-rect" 
                value={targetScore} 
                onChange={e => setTargetScore(e.target.value)} 
                required 
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 16px' }}>
            <input 
              type="checkbox" 
              id="set-active-goal" 
              className="plan-item-checkbox"
              checked={isActive} 
              onChange={e => setIsActive(e.target.checked)} 
            />
            <label htmlFor="set-active-goal" style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              SET_AS_PRIMARY_ACTIVE_TARGET
            </label>
          </div>
          <button type="submit" className="btn btn-primary w-full">
            [ REGISTER TARGET ]
          </button>
        </form>
      </div>
    </div>
  );
};
