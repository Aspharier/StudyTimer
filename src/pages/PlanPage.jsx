import { useState, useMemo } from 'react';
import { usePlanStore } from '../stores/usePlanStore';
import { useExamStore } from '../stores/useExamStore';
import { useUIStore } from '../stores/useUIStore';
import { AddTaskModal } from '../components/plan/AddTaskModal';
import { ReflectionModal } from '../components/plan/ReflectionModal';
import { todayISO, addDaysToDate } from '../utils/dateUtils';
import { TYPE_LABELS } from '../utils/constants';
import { generateId } from '../utils/idGenerator';

const STATE_CODES = {
  1: '[DRAINED]',
  2: '[FATIGUED]',
  3: '[NEUTRAL]',
  4: '[FLOW]',
  5: '[PEAK]'
};

export const PlanPage = () => {
  const { dailyPlans, saveDailyPlan } = usePlanStore();
  const { subjects, topics } = useExamStore();
  const { showToast } = useUIStore();

  const [currentDate, setCurrentDate] = useState(todayISO());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showReflect, setShowReflect] = useState(false);

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

  const navigateDate = (days) => {
    setCurrentDate(prev => addDaysToDate(prev, days));
  };

  const handleSavePlan = async (updatedPlan) => {
    try {
      await saveDailyPlan(updatedPlan);
    } catch {
      showToast("Failed to save plan");
    }
  };

  const handleToggleTask = (taskId) => {
    const updated = { ...plan, items: items.map(i => i.id === taskId ? { ...i, completed: !i.completed } : i) };
    handleSavePlan(updated);
  };

  const handleDeleteTask = (taskId) => {
    const updated = { ...plan, items: items.filter(i => i.id !== taskId) };
    handleSavePlan(updated);
  };

  const copyPrevious = () => {
    const prevDate = addDaysToDate(currentDate, -1);
    const prevPlan = dailyPlans.find(p => p.date === prevDate);
    if (prevPlan && prevPlan.items && prevPlan.items.length > 0) {
      const newItems = prevPlan.items.map(i => ({ ...i, id: generateId(), completed: false }));
      handleSavePlan({ ...plan, items: [...items, ...newItems] });
      showToast("Copied missions from previous day");
    } else {
      showToast("No plan found on previous day");
    }
  };

  const applyTemplate = (type) => {
    let newItems = [];
    if (type === 'Standard') {
      newItems = [
        { id: generateId(), type: 'LECTURE', title: 'Deep Work: Concept Learning', duration: 120, completed: false },
        { id: generateId(), type: 'PRACTICE', title: 'Active Problem Solving', duration: 90, completed: false },
        { id: generateId(), type: 'REVISION', title: 'Retrieval Practice & Spaced Review', duration: 60, completed: false }
      ];
    } else if (type === 'Heavy') {
      newItems = [
        { id: generateId(), type: 'LECTURE', title: 'Concept Block 1', duration: 120, completed: false },
        { id: generateId(), type: 'LECTURE', title: 'Concept Block 2', duration: 120, completed: false },
        { id: generateId(), type: 'PRACTICE', title: 'Extensive Problem Set', duration: 120, completed: false },
        { id: generateId(), type: 'REVISION', title: 'Evening Recall Session', duration: 60, completed: false }
      ];
    } else if (type === 'Revision') {
      newItems = [
        { id: generateId(), type: 'REVISION', title: 'Spaced Retrieval Practice', duration: 120, completed: false },
        { id: generateId(), type: 'MOCK_TEST', title: 'Timed Sectional Test', duration: 90, completed: false },
        { id: generateId(), type: 'PRACTICE', title: 'Mistake Analysis & Correction', duration: 60, completed: false }
      ];
    }
    handleSavePlan({ ...plan, items: [...items, ...newItems] });
    showToast(`${type} Day template applied`);
  };

  // Mini calendar days: -7 to +21 days
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = -7; i <= 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: dStr,
        label: d.getDate(),
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isToday: dStr === todayISO()
      });
    }
    return days;
  }, []);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(-1)}>← Prev</button>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
          {new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(1)}>Next →</button>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '8px', marginBottom: '16px' }} className="mini-calendar">
        {calendarDays.map(d => {
          const hasPlan = dailyPlans.some(p => p.date === d.date && p.items && p.items.length > 0);
          const isSelected = d.date === currentDate;
          return (
            <div 
              key={d.date} 
              onClick={() => setCurrentDate(d.date)} 
              style={{
                minWidth: '40px', padding: '8px 4px', textAlign: 'center', cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                color: isSelected ? 'var(--primary-inv)' : 'inherit',
                border: isSelected ? '1px solid var(--primary)' : d.isToday ? '1px solid var(--border-light)' : '1px solid var(--border)',
                opacity: hasPlan || isSelected || d.isToday ? 1 : 0.6
              }}
            >
              <div style={{ fontSize: '0.72rem', opacity: isSelected ? 0.9 : 0.6, fontWeight: 700 }}>{d.dayLabel}</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{d.label}</div>
              {hasPlan && (
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? 'var(--primary-inv)' : 'var(--primary)', margin: '2px auto 0' }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 className="card-title" style={{ marginBottom: '4px' }}>Daily Missions</h3>
            <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
              {completedCount} of {items.length} missions completed • {Math.round(completedMins / 60 * 10) / 10}h / {Math.round(totalMins / 60 * 10) / 10}h focus
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowReflect(true)}>
              Daily Debrief
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>
              + Add Mission
            </button>
          </div>
        </div>

        <div className="progress-bar-bg" style={{ marginBottom: '20px' }}>
          <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }}></div>
        </div>

        {items.length === 0 ? (
          <div className="empty" style={{ padding: '2rem 0', textAlign: 'center' }}>
            <p style={{ marginBottom: '16px' }}>No missions planned for this day.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={copyPrevious}>Copy Previous Day</button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTemplate('Standard')}>Standard Day (4.5h)</button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTemplate('Heavy')}>Heavy Day (7h)</button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTemplate('Revision')}>Revision Day (4.5h)</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(item => {
              const subject = subjects.find(s => s.id === item.subjectId);
              const subjColor = subject?.colorHex || subject?.color || '#3b82f6';
              const duration = item.duration || item.estimatedMinutes || 60;
              return (
                <div key={item.id} className="plan-item" style={{ opacity: item.completed ? 0.6 : 1 }}>
                  <input 
                    type="checkbox" 
                    className="plan-item-checkbox" 
                    checked={!!item.completed} 
                    onChange={() => handleToggleTask(item.id)} 
                  />
                  <span className="chip" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  {subject && (
                    <span className="chip" style={{ backgroundColor: subjColor + '20', color: subjColor, border: `1px solid ${subjColor}` }}>
                      {subject.name}
                    </span>
                  )}
                  <span style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none' }}>
                    {item.title}
                  </span>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                    {duration}m
                  </span>
                  <button className="del-btn" onClick={() => handleDeleteTask(item.id)} style={{ marginLeft: '8px' }}>
                    ×
                  </button>
                </div>
              );
            })}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
              <button className="btn btn-secondary btn-xs" onClick={copyPrevious}>Copy Previous</button>
              <button className="btn btn-secondary btn-xs" onClick={() => applyTemplate('Standard')}>+ Standard</button>
              <button className="btn btn-secondary btn-xs" onClick={() => applyTemplate('Heavy')}>+ Heavy</button>
              <button className="btn btn-secondary btn-xs" onClick={() => applyTemplate('Revision')}>+ Revision</button>
            </div>
          </div>
        )}
      </div>

      {plan.reflection && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>DEBRIEF_TELEMETRY</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {plan.reflection.feeling && (
                <span className="chip" style={{ fontWeight: 800 }}>
                  STATE: {STATE_CODES[plan.reflection.feeling] || '[NOMINAL]'}
                </span>
              )}
              <span className="chip" style={{ fontWeight: 800 }}>
                SCORE: 0{plan.reflection.rating} / 05
              </span>
            </div>
          </div>
          {plan.reflection.notes && (
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: '0.85rem' }}>
              {plan.reflection.notes}
            </p>
          )}
        </div>
      )}

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
            showToast("Mission added to day");
          }}
          subjects={subjects}
          topics={topics}
        />
      )}

      {showReflect && (
        <ReflectionModal
          onClose={() => setShowReflect(false)}
          onSave={async (reflection) => {
            await handleSavePlan({ ...plan, reflection });
            setShowReflect(false);
            showToast("Daily debrief saved");
          }}
          initialData={plan.reflection}
        />
      )}
    </>
  );
};
