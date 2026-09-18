import { useState } from 'react';
import { generateId } from '../../utils/idGenerator';
import { X } from 'lucide-react';

export const AddGoalModal = ({ onClose, onSave, isFirst }) => {
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && examDate) {
      onSave({ 
        id: generateId(), 
        name: name.trim(), 
        examDate, 
        isActive: isFirst || isActive, 
        createdAt: new Date().toISOString() 
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configure Target Exam</h3>
          <button className="del-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Exam Name</label>
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
          <div className="form-group">
            <label className="form-label">Target Date</label>
            <input 
              type="date" 
              className="input input-rect" 
              value={examDate} 
              onChange={e => setExamDate(e.target.value)} 
              required 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 18px' }}>
            <input 
              type="checkbox" 
              id="set-active-goal" 
              className="plan-item-checkbox"
              checked={isActive} 
              onChange={e => setIsActive(e.target.checked)} 
            />
            <label htmlFor="set-active-goal" style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Set as primary active target
            </label>
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px' }}>
            Save Target Exam
          </button>
        </form>
      </div>
    </div>
  );
};
