import { useState } from 'react';
import { PLAN_ITEM_TYPES, TYPE_LABELS } from '../../utils/constants';

export const AddTaskModal = ({ onClose, onAdd, subjects, topics }) => {
  const [type, setType] = useState('LECTURE');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);

  const subjectTopics = topics.filter(t => t.subjectId === subjectId && !t.parentId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ type, subjectId, topicId, title: title.trim(), duration: parseInt(duration) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>// SCHEDULE_MISSION</h3>
          <button className="del-btn" onClick={onClose}>[X]</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">MISSION_TYPE</label>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {PLAN_ITEM_TYPES.map(t => (
                <button 
                  type="button" 
                  key={t} 
                  className={`btn btn-xs ${type === t ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setType(t)}
                >
                  [{TYPE_LABELS[t]}]
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">OBJECTIVE_SPECIFICATION</label>
            <input 
              type="text" 
              className="input input-rect" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Solve 15 B-Tree traversal problems" 
              autoFocus 
            />
          </div>
          <div className="grid-2col" style={{ marginBottom: '16px', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">MODULE_ID</label>
              <select className="input input-rect" value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(''); }}>
                <option value="">[NONE]</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">TOPIC_NODE</label>
              <select className="input input-rect" value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!subjectId}>
                <option value="">[NONE]</option>
                {subjectTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ESTIMATED_DURATION (MINUTES)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="range" 
                min="15" 
                max="240" 
                step="15" 
                value={duration} 
                onChange={e => setDuration(e.target.value)} 
                style={{ flex: 1 }} 
              />
              <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 800 }}>{duration}m</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={!title.trim()}>
            [ COMMIT MISSION ]
          </button>
        </form>
      </div>
    </div>
  );
};
