import { useState } from 'react';
import { X } from 'lucide-react';

export const AddSubtopicModal = ({ parentTopic, onClose, onAdd }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <span className="planner-box-header" style={{ margin: 0, padding: '2px 8px', fontSize: '0.68rem' }}>
              ADD SUBTOPIC
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: 'var(--ink-primary)' }}>
              {parentTopic?.name}
            </h3>
          </div>
          <button className="del-btn" onClick={onClose} title="Close" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
              Subtopic Title
            </label>
            <input 
              className="input input-rect" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Inorder Traversal & Threaded Trees"
              autoFocus 
              style={{ padding: '10px 12px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose} 
              style={{ flex: 1, padding: '10px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '10px' }} 
              disabled={!name.trim()}
            >
              Add Subtopic
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
