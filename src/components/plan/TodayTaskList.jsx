import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { usePlanStore } from '../../stores/usePlanStore';
import { useExamStore } from '../../stores/useExamStore';
import { useUIStore } from '../../stores/useUIStore';
import { AddTaskModal } from './AddTaskModal';
import { todayISO, addDaysToDate } from '../../utils/dateUtils';
import { TYPE_LABELS } from '../../utils/constants';
import { generateId } from '../../utils/idGenerator';

export const TodayTaskList = () => {
  const { dailyPlans, saveDailyPlan } = usePlanStore();
  const { subjects, topics } = useExamStore();
  const { showToast } = useUIStore();

  const [showAddTask, setShowAddTask] = useState(false);
  const currentDate = todayISO();

  const plan = dailyPlans.find(p => p.date === currentDate) || {
    id: generateId(),
    date: currentDate,
    items: [],
    reflection: null
  };
  const items = plan.items || [];
  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? completedCount / items.length : 0;
  
  const totalMins = items.reduce((sum, item) => sum + (parseInt(item.duration) || 0), 0);
  const completedMins = items.filter(i => i.completed).reduce((sum, item) => sum + (parseInt(item.duration) || 0), 0);

  const handleSavePlan = async (updatedPlan) => {
    try {
      await saveDailyPlan(updatedPlan);
    } catch {
      showToast("Failed to save mission plan");
    }
  };

  const handleToggleTask = (taskId) => {
    const updated = {
      ...plan,
      items: items.map(i => i.id === taskId ? { ...i, completed: !i.completed } : i)
    };
    handleSavePlan(updated);
  };

  const handleDeleteTask = (taskId) => {
    const updated = {
      ...plan,
      items: items.filter(i => i.id !== taskId)
    };
    handleSavePlan(updated);
  };

  const todayDisplay = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  const [selectedMood, setSelectedMood] = useState(3);
  const moods = ['☹', '🙁', '😐', '🙂', '😀'];

  const getTypeChipClass = (t) => {
    switch (t) {
      case 'LECTURE': return 'chip chip-blue';
      case 'PRACTICE': return 'chip chip-yellow';
      case 'REVISION': return 'chip chip-mint';
      case 'MOCK_TEST': return 'chip chip-coral';
      default: return 'chip';
    }
  };

  return (
    <>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="planner-box-header" style={{ margin: 0, padding: '2px 8px', fontSize: '0.68rem' }}>
              TODAY'S MISSIONS
            </span>
            {completedCount > 0 && completedCount === items.length && (
              <span className="sticker-starburst" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                I DID IT! ★
              </span>
            )}
          </div>
          <div style={{ color: 'var(--ink-secondary)', fontSize: '0.82rem', marginTop: '4px', fontWeight: 600 }}>
            {completedCount} of {items.length} completed • {Math.round(completedMins / 60 * 10) / 10}h / {Math.round(totalMins / 60 * 10) / 10}h scheduled
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>
          + Add Mission
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="progress-bar-bg" style={{ height: '6px' }}>
          <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }}></div>
        </div>
      </div>

      {/* Task List or Empty State */}
      {items.length === 0 ? (
        <div className="empty" style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>📝</div>
          <p style={{ marginBottom: '12px', color: 'var(--ink-secondary)', fontSize: '0.86rem', fontWeight: 600 }}>
            No missions scheduled for today yet.
          </p>
          <button className="btn btn-primary btn-xs" onClick={() => setShowAddTask(true)}>
            + Add First Mission
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map(item => {
            const subject = subjects.find(s => s.id === item.subjectId);
            const duration = item.duration || item.estimatedMinutes || 60;
            return (
              <div 
                key={item.id} 
                className="plan-item" 
                style={{ 
                  opacity: item.completed ? 0.6 : 1,
                }}
              >
                <input 
                  type="checkbox" 
                  className="plan-item-checkbox" 
                  checked={!!item.completed} 
                  onChange={() => handleToggleTask(item.id)} 
                />
                <span className={getTypeChipClass(item.type)}>
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                {subject && (
                  <span 
                    className="chip" 
                    style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 8px',
                      color: 'var(--ink-primary)',
                      background: '#f1f5f9'
                    }}
                  >
                    {subject.name}
                  </span>
                )}
                <span style={{ 
                  flex: 1, 
                  textDecoration: item.completed ? 'line-through' : 'none', 
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: item.completed ? 'var(--ink-muted)' : 'var(--ink-primary)'
                }}>
                  {item.title}
                </span>
                <span style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', minWidth: '36px', textAlign: 'right', fontWeight: 700 }}>
                  {duration}m
                </span>
                <button 
                  className="del-btn" 
                  onClick={() => handleDeleteTask(item.id)} 
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily Mood & Reflection Tracker at bottom of left page (matching reference screenshot) */}
      <div className="mood-tracker">
        <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.6px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
          MOOD:
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {moods.map((m, idx) => (
            <span 
              key={idx} 
              className={`mood-face ${selectedMood === idx ? 'active' : ''}`}
              onClick={() => setSelectedMood(idx)}
              title={`Rate mood: ${idx + 1}/5`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>

      {showAddTask && (
        <AddTaskModal 
          onClose={() => setShowAddTask(false)} 
          onAdd={async (task) => {
            const newItem = {
              ...task,
              id: generateId(),
              completed: false,
              duration: task.duration,
              estimatedMinutes: task.duration
            };
            await handleSavePlan({ ...plan, items: [...items, newItem] });
            setShowAddTask(false);
            showToast("Mission added for today");
          }}
          subjects={subjects}
          topics={topics}
        />
      )}
    </>
  );
};
