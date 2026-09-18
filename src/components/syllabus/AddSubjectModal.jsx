import { useState } from 'react';
import { generateId } from '../../utils/idGenerator';
import { X } from 'lucide-react';

export const AddSubjectModal = ({ activeGoal, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: generateId(),
      examGoalId: activeGoal.id,
      name: name.trim(),
      code: code.trim().toUpperCase() || name.trim().substring(0, 4).toUpperCase(),
      colorHex: '#ffffff',
      color: '#ffffff'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Subject Module</h3>
          <button className="del-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Module Name</label>
            <input 
              className="input input-rect" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Operating Systems"
              autoFocus 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Module Code (Optional)</label>
            <input 
              className="input input-rect" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              placeholder="e.g. OS"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px' }} disabled={!name.trim()}>
            Add Module
          </button>
        </form>
      </div>
    </div>
  );
};
