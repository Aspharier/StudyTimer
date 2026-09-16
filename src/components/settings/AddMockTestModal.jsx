import { useState } from 'react';
import { todayISO } from '../../utils/dateUtils';
import { generateId } from '../../utils/idGenerator';

export const AddMockTestModal = ({ activeGoal, subjects, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('FULL_MOCK');
  const [date, setDate] = useState(todayISO());
  const [subjectId, setSubjectId] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title && score && maxScore) {
      const numScore = parseFloat(score);
      const numMax = parseFloat(maxScore);
      const percentage = Math.round((numScore / numMax) * 100);
      onSave({
        id: generateId(),
        examGoalId: activeGoal.id,
        title: title.trim(),
        type,
        date,
        subjectId,
        score: numScore,
        maxScore: numMax,
        scorePercentage: percentage
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>// RECORD_TEST_TELEMETRY</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">TEST_TITLE</label>
            <input 
              type="text" 
              className="input input-rect" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
              autoFocus 
              placeholder="e.g. Made Easy Mock Test 1" 
            />
          </div>
          <div className="grid-2col" style={{ gap: '12px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">TEST_FORMAT</label>
              <select className="input input-rect" value={type} onChange={e => setType(e.target.value)}>
                <option value="FULL_MOCK">FULL_MOCK</option>
                <option value="SECTIONAL">SECTIONAL</option>
                <option value="TOPIC">TOPIC_TEST</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">TEST_DATE</label>
              <input 
                type="date" 
                className="input input-rect" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required 
              />
            </div>
          </div>
          {type !== 'FULL_MOCK' && (
            <div className="form-group">
              <label className="form-label">MODULE_ID</label>
              <select className="input input-rect" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                <option value="">[NONE]</option>
                {subjects.filter(s => String(s.examGoalId) === String(activeGoal.id)).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid-2col" style={{ gap: '12px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">SCORE_OBTAINED</label>
              <input 
                type="number" 
                step="0.5" 
                className="input input-rect" 
                value={score} 
                onChange={e => setScore(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">MAX_POSSIBLE_SCORE</label>
              <input 
                type="number" 
                step="1" 
                className="input input-rect" 
                value={maxScore} 
                onChange={e => setMaxScore(e.target.value)} 
                required 
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full">
            [ COMMIT SCORE ]
          </button>
        </form>
      </div>
    </div>
  );
};
