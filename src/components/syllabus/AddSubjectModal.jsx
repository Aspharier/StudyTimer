import { useState } from 'react';
import { generateId } from '../../utils/idGenerator';

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
          <h3>// ADD_SUBJECT_MODULE</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">MODULE_NAME</label>
            <input 
              className="input input-rect" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Operating Systems"
              autoFocus 
            />
          </div>
          <div className="form-group">
            <label className="form-label">MODULE_CODE [OPTIONAL]</label>
            <input 
              className="input input-rect" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              placeholder="e.g. OS_2026"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={!name.trim()}>
            [ REGISTER MODULE ]
          </button>
        </form>
      </div>
    </div>
  );
};
