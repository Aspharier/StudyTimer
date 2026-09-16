import { useState } from 'react';
import { generateId } from '../../utils/idGenerator';

export const AddTopicModal = ({ activeGoal, subjectId, onClose, onAdd }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: generateId(),
      examGoalId: activeGoal.id,
      subjectId,
      name: name.trim(),
      status: 'NOT_STARTED',
      confidenceScore: 0,
      accuracy: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      reviewCount: 0
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>// ADD_TOPIC_NODE</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">TOPIC_TITLE</label>
            <input 
              className="input input-rect" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Binary Search Trees"
              autoFocus 
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={!name.trim()}>
            [ REGISTER TOPIC ]
          </button>
        </form>
      </div>
    </div>
  );
};
