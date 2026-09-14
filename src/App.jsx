import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DataService } from './services/dataService';
import { signInWithPopup, googleProvider, auth, signOut } from './firebase';

const PLAN_ITEM_TYPES = ['LECTURE', 'PRACTICE', 'TEST', 'REVISION', 'MOCK_TEST'];
const TYPE_LABELS = { LECTURE: 'Lecture', PRACTICE: 'Practice', TEST: 'Test', REVISION: 'Revision', MOCK_TEST: 'Mock Test' };

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDaysRemaining = (targetDate) => {
  const diff = new Date(targetDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const pad = (n) => String(n).padStart(2, '0');

// Generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

function SignInView({ onLogin }) {
  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <div className="sign-in-logo">focusly</div>
        <p className="sign-in-subtitle">Your focused exam preparation companion</p>
        <button className="btn btn-primary btn-google w-full" onClick={onLogin}>
          Sign in with Google
        </button>
        <p className="sign-in-note">Sign in to sync your data across all devices</p>
      </div>
    </div>
  );
}

function DashboardView({ daysRemaining, dailyPlans, subjects, topics, activeGoal, mockTests, setActiveTab, showToast }) {
  const todayStr = todayISO();
  const todayPlan = dailyPlans.find(p => p.date === todayStr);
  const todayItems = todayPlan?.items || [];
  const completedItems = todayItems.filter(i => i.completed);
  const planProgress = todayItems.length > 0 ? completedItems.length / todayItems.length : 0;

  const goalProgressPct = useMemo(() => {
    if (!activeGoal) return 0;
    const start = new Date(activeGoal.createdAt || activeGoal.examDate);
    const end = new Date(activeGoal.examDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const elapsed = totalDays - (daysRemaining || 0);
    return Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
  }, [activeGoal, daysRemaining]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    let d = new Date();
    while (true) {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const p = dailyPlans.find(plan => plan.date === dStr);
      if (!p || p.items.length === 0) break;
      const comp = p.items.filter(i => i.completed).length;
      if (comp / p.items.length >= 0.8) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [dailyPlans]);

  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const p = dailyPlans.find(plan => plan.date === dStr);
      let completion = 0;
      let completedCount = 0;
      let totalCount = 0;
      if (p && p.items.length > 0) {
        totalCount = p.items.length;
        completedCount = p.items.filter(item => item.completed).length;
        completion = completedCount / totalCount;
      }
      days.push({ date: dStr, label: d.toLocaleDateString('en-US', { weekday: 'short' }), completion, completedCount, totalCount, hasPlan: !!p && p.items.length > 0 });
    }
    return days;
  }, [dailyPlans]);

  const avgCompletion = useMemo(() => {
    const plansCount = last7Days.filter(d => d.hasPlan).length;
    if (plansCount === 0) return 0;
    return last7Days.reduce((sum, d) => sum + d.completion, 0) / plansCount;
  }, [last7Days]);

  const syllabusProgress = useMemo(() => {
    if (topics.length === 0) return 0;
    return topics.filter(t => t.status === 'COMPLETED').length / topics.length;
  }, [topics]);

  const readinessInfo = useMemo(() => {
    const goalTests = activeGoal ? mockTests.filter(t => String(t.examGoalId) === String(activeGoal.id)) : [];
    const avgMockScore = goalTests.length > 0 ? goalTests.reduce((a, t) => a + t.scorePercentage, 0) / goalTests.length : 0;
    
    // Consistency score logic
    const last30Plans = dailyPlans.filter(p => {
      const pDate = new Date(p.date);
      const diff = new Date() - pDate;
      return diff <= 30 * 24 * 60 * 60 * 1000 && diff >= 0;
    });
    const creationRate = last30Plans.length / 30;
    const avgComp30 = last30Plans.length > 0 ? last30Plans.reduce((a, p) => {
      const c = p.items.filter(i => i.completed).length;
      return a + (p.items.length > 0 ? c / p.items.length : 0);
    }, 0) / last30Plans.length : 0;
    const streakBonus = Math.min(currentStreak / 30, 1);
    
    const consistencyScore = (creationRate * 40) + (avgComp30 * 40) + (streakBonus * 20);
    const readiness = (syllabusProgress * 30) + ((avgMockScore / 100) * 40) + ((consistencyScore / 100) * 30);
    
    let levelText = 'Not Ready';
    if (readiness >= 80) levelText = 'Ready';
    else if (readiness >= 60) levelText = 'Almost There';
    else if (readiness >= 35) levelText = 'Getting There';

    return { readiness: Math.round(readiness), levelText, syllabusProgress: Math.round(syllabusProgress * 100), avgMockScore: Math.round(avgMockScore), consistencyScore: Math.round(consistencyScore) };
  }, [activeGoal, mockTests, dailyPlans, syllabusProgress, currentStreak]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const p = dailyPlans.find(plan => plan.date === dStr);
      if (p && p.items.length > 0) {
        const comp = p.items.filter(item => item.completed).length / p.items.length * 100;
        data.push({ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), completion: comp });
      }
    }
    return data;
  }, [dailyPlans]);

  const toggleTask = (taskId) => {
    if (!todayPlan) return;
    const updatedPlan = { ...todayPlan, items: todayPlan.items.map(i => i.id === taskId ? { ...i, completed: !i.completed } : i) };
    DataService.saveDailyPlan(updatedPlan).catch(() => showToast("Error saving task"));
  };

  return (
    <>
      {activeGoal ? (
        <div className="countdown-hero card">
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{activeGoal.name}</h2>
            <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--primary)', lineHeight: 1 }}>{daysRemaining}</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-light)', letterSpacing: '2px' }}>DAYS REMAINING</div>
            <div style={{ marginTop: '8px', color: 'var(--text-light)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="progress-bar-bg" style={{ marginTop: '16px', maxWidth: '300px', margin: '16px auto 0' }}>
              <div className="progress-bar-fill" style={{ width: `${goalProgressPct}%` }}></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>No Active Exam Goal</h2>
          <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Set a goal in Settings to start tracking your progress.</p>
          <button className="btn btn-primary" onClick={() => setActiveTab('settings')}>Go to Settings</button>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Plan Streak</div>
          <div className="stat-value">{currentStreak}</div>
          <div className="stat-sub">Days (≥80%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Completion</div>
          <div className="stat-value">{Math.round(avgCompletion * 100)}%</div>
          <div className="stat-sub">Last 7 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Syllabus</div>
          <div className="stat-value">{Math.round(syllabusProgress * 100)}%</div>
          <div className="stat-sub">Topics Completed</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="card-title">Today's Plan</h3>
          <span style={{ color: 'var(--text-light)' }}>{completedItems.length} / {todayItems.length} completed</span>
        </div>
        {todayItems.length > 0 ? (
          <>
            <div className="progress-bar-bg" style={{ marginBottom: '16px' }}>
              <div className="progress-bar-fill" style={{ width: `${planProgress * 100}%` }}></div>
            </div>
            <div>
              {todayItems.map(item => {
                const subject = subjects.find(s => s.id === item.subjectId);
                const subjColor = subject?.colorHex || subject?.color || '#3b82f6';
                const duration = item.duration || item.estimatedMinutes || 60;
                return (
                  <div key={item.id} className="plan-item" style={{ opacity: item.completed ? 0.6 : 1 }}>
                    <input type="checkbox" className="plan-item-checkbox" checked={!!item.completed} onChange={() => toggleTask(item.id)} />
                    <span className="chip" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{TYPE_LABELS[item.type] || item.type}</span>
                    {subject && <span className="chip" style={{ backgroundColor: subjColor + '20', color: subjColor, border: `1px solid ${subjColor}` }}>{subject.name}</span>}
                    <span style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{duration}m</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty" style={{ padding: '2rem 0' }}>
            <p>No plan for today.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('plan')} style={{ marginTop: '10px' }}>Create Plan</button>
          </div>
        )}
      </div>

      <div className="grid-2col">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>7-Day Consistency</h3>
          <div className="consistency-grid">
            {last7Days.map((day, idx) => {
              let color = 'var(--bg-card)';
              if (day.hasPlan) {
                if (day.completion >= 0.8) color = 'var(--success)';
                else if (day.completion >= 0.5) color = 'var(--warning)';
                else color = 'var(--danger)';
              }
              return (
                <div key={idx} className="consistency-day">
                  <div className="consistency-day-label">{day.label}</div>
                  <div className="consistency-day-value" style={{ backgroundColor: color, color: day.hasPlan && day.completion >= 0.5 ? '#fff' : 'inherit', padding: '8px', borderRadius: '8px', margin: '4px 0', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {day.hasPlan ? `${Math.round(day.completion * 100)}%` : '-'}
                  </div>
                  <div className="consistency-day-sub">{day.hasPlan ? `${day.completedCount}/${day.totalCount}` : 'No plan'}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>GATE Readiness</h3>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: readinessInfo.readiness >= 80 ? 'var(--success)' : readinessInfo.readiness >= 60 ? 'var(--primary)' : 'var(--warning)' }}>
              {readinessInfo.readiness}%
            </div>
            <div style={{ fontWeight: '500', fontSize: '1.2rem', marginBottom: '16px' }}>{readinessInfo.levelText}</div>
            
            <div className="progress-bar-bg" style={{ marginBottom: '16px' }}>
              <div className="progress-bar-fill" style={{ width: `${readinessInfo.readiness}%`, backgroundColor: readinessInfo.readiness >= 80 ? 'var(--success)' : 'var(--primary)' }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              <div>Syllabus: {readinessInfo.syllabusProgress}%</div>
              <div>Mocks: {readinessInfo.avgMockScore}%</div>
              <div>Consistency: {readinessInfo.consistencyScore}%</div>
            </div>
          </div>
        </div>
      </div>

      {trendData.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Plan Completion Trend (30 Days)</h3>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="date" stroke="var(--text-light)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-light)" fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="completion" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3, fill: 'var(--primary)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}

function DailyPlanView({ dailyPlans, subjects, topics, showToast }) {
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showReflect, setShowReflect] = useState(false);

  const plan = dailyPlans.find(p => p.date === currentDate) || { id: generateId(), date: currentDate, items: [], reflection: null };
  const items = plan.items || [];
  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? completedCount / items.length : 0;
  
  const totalMins = items.reduce((sum, item) => sum + (parseInt(item.duration) || 0), 0);
  const completedMins = items.filter(i => i.completed).reduce((sum, item) => sum + (parseInt(item.duration) || 0), 0);

  const navigateDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const savePlan = (updatedPlan) => {
    DataService.saveDailyPlan(updatedPlan).catch(() => showToast("Failed to save plan"));
  };

  const toggleTask = (taskId) => {
    const updated = { ...plan, items: items.map(i => i.id === taskId ? { ...i, completed: !i.completed } : i) };
    savePlan(updated);
  };

  const deleteTask = (taskId) => {
    const updated = { ...plan, items: items.filter(i => i.id !== taskId) };
    savePlan(updated);
  };

  const copyPrevious = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    const prevDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const prevPlan = dailyPlans.find(p => p.date === prevDate);
    if (prevPlan && prevPlan.items.length > 0) {
      const newItems = prevPlan.items.map(i => ({ ...i, id: generateId(), completed: false }));
      savePlan({ ...plan, items: [...items, ...newItems] });
      showToast("Copied from previous day");
    } else {
      showToast("No plan found on previous day");
    }
  };

  const applyTemplate = (type) => {
    let newItems = [];
    if (type === 'Standard') {
      newItems = [
        { id: generateId(), type: 'LECTURE', title: 'Morning Lecture', duration: 120, completed: false },
        { id: generateId(), type: 'PRACTICE', title: 'Problem Solving', duration: 90, completed: false },
        { id: generateId(), type: 'REVISION', title: 'Evening Review', duration: 60, completed: false }
      ];
    } else if (type === 'Heavy') {
      newItems = [
        { id: generateId(), type: 'LECTURE', title: 'Lecture 1', duration: 120, completed: false },
        { id: generateId(), type: 'LECTURE', title: 'Lecture 2', duration: 120, completed: false },
        { id: generateId(), type: 'PRACTICE', title: 'Practice Set', duration: 120, completed: false },
        { id: generateId(), type: 'REVISION', title: 'Quick Revision', duration: 60, completed: false }
      ];
    } else if (type === 'Revision') {
      newItems = [
        { id: generateId(), type: 'REVISION', title: 'Deep Revision', duration: 180, completed: false },
        { id: generateId(), type: 'MOCK_TEST', title: 'Sectional Test', duration: 90, completed: false },
        { id: generateId(), type: 'PRACTICE', title: 'Test Analysis', duration: 60, completed: false }
      ];
    }
    savePlan({ ...plan, items: [...items, ...newItems] });
    showToast(`${type} template applied`);
  };

  // Mini calendar logic
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = -7; i <= 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: dStr, label: d.getDate(), dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }), isToday: dStr === todayISO() });
    }
    return days;
  }, []);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(-1)}>← Prev</button>
        <h2 style={{ margin: 0 }}>{new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(1)}>Next →</button>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '8px', marginBottom: '16px' }} className="mini-calendar">
        {calendarDays.map(d => {
          const hasPlan = dailyPlans.some(p => p.date === d.date && p.items.length > 0);
          const isSelected = d.date === currentDate;
          return (
            <div key={d.date} onClick={() => setCurrentDate(d.date)} style={{
              minWidth: '40px', padding: '8px 4px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-card)',
              color: isSelected ? '#fff' : 'inherit',
              border: d.isToday && !isSelected ? '2px solid var(--primary)' : '2px solid transparent',
              opacity: hasPlan || isSelected || d.isToday ? 1 : 0.6
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{d.dayLabel}</div>
              <div style={{ fontWeight: 'bold' }}>{d.label}</div>
              {hasPlan && <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#fff' : 'var(--primary)', margin: '2px auto 0' }}></div>}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h3 className="card-title" style={{ marginBottom: '4px' }}>Daily Tasks</h3>
            <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
              {completedCount} of {items.length} completed • {Math.round(completedMins / 60 * 10) / 10}h / {Math.round(totalMins / 60 * 10) / 10}h planned
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowReflect(true)}>Reflect</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>+ Add Task</button>
          </div>
        </div>

        <div className="progress-bar-bg" style={{ marginBottom: '20px' }}>
          <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }}></div>
        </div>

        {items.length === 0 ? (
          <div className="empty" style={{ padding: '2rem 0' }}>
            <p>No tasks planned for this day.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={copyPrevious}>Copy Previous Day</button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTemplate('Standard')}>Standard Day</button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTemplate('Heavy')}>Heavy Day</button>
              <button className="btn btn-secondary btn-sm" onClick={() => applyTemplate('Revision')}>Revision Day</button>
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
                  <input type="checkbox" className="plan-item-checkbox" checked={!!item.completed} onChange={() => toggleTask(item.id)} />
                  <span className="chip" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{TYPE_LABELS[item.type] || item.type}</span>
                  {subject && <span className="chip" style={{ backgroundColor: subjColor + '20', color: subjColor, border: `1px solid ${subjColor}` }}>{subject.name}</span>}
                  <span style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</span>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{duration}m</span>
                  <button className="del-btn" onClick={() => deleteTask(item.id)} style={{ marginLeft: '8px' }}>×</button>
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
        <div className="card reflection-card">
          <h3 className="card-title">Reflection</h3>
          <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '0.95rem' }}>
            Day Rating: {plan.reflection.rating} / 5
          </div>
          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-light)' }}>{plan.reflection.notes}</p>
        </div>
      )}

      {showAddTask && (
        <AddTaskModal 
          onClose={() => setShowAddTask(false)} 
          onAdd={(task) => {
            savePlan({ ...plan, items: [...items, { ...task, id: generateId(), completed: false, duration: task.duration, estimatedMinutes: task.duration }] });
            setShowAddTask(false);
          }}
          subjects={subjects}
          topics={topics}
        />
      )}

      {showReflect && (
        <ReflectionModal
          onClose={() => setShowReflect(false)}
          onSave={(reflection) => {
            savePlan({ ...plan, reflection });
            setShowReflect(false);
          }}
          initialData={plan.reflection}
        />
      )}
    </>
  );
}

function AddTaskModal({ onClose, onAdd, subjects, topics }) {
  const [type, setType] = useState('LECTURE');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);

  const subjectTopics = topics.filter(t => t.subjectId === subjectId && !t.parentId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ type, subjectId, topicId, title, duration: parseInt(duration) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Task</h3>
          <button className="del-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {PLAN_ITEM_TYPES.map(t => (
                <button type="button" key={t} className={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setType(t)}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input type="text" className="input input-rect" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Watch Calculus Lec 4" autoFocus />
          </div>
          <div className="grid-2col" style={{ marginBottom: '16px', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject (Optional)</label>
              <select className="input input-rect" value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(''); }}>
                <option value="">None</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Topic (Optional)</label>
              <select className="input input-rect" value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!subjectId}>
                <option value="">None</option>
                {subjectTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="range" min="15" max="240" step="15" value={duration} onChange={e => setDuration(e.target.value)} style={{ flex: 1 }} />
              <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold' }}>{duration}m</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={!title.trim()}>Add Task</button>
        </form>
      </div>
    </div>
  );
}

function ReflectionModal({ onClose, onSave, initialData }) {
  const [rating, setRating] = useState(initialData?.rating || 3);
  const [notes, setNotes] = useState(initialData?.notes || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Day Reflection</h3>
          <button className="del-btn" onClick={onClose}>×</button>
        </div>
        <div className="form-group">
          <label className="form-label">How did today go?</label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
            {[1, 2, 3, 4, 5].map(val => (
              <button
                type="button"
                key={val}
                className={`rating-btn ${val <= rating ? 'active' : ''}`}
                onClick={() => setRating(val)}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes / Learnings</label>
          <textarea className="input input-rect" value={notes} onChange={e => setNotes(e.target.value)} rows="4" placeholder="What went well? What needs improvement?"></textarea>
        </div>
        <button className="btn btn-primary w-full" onClick={() => onSave({ rating, notes })}>Save Reflection</button>
      </div>
    </div>
  );
}

function SyllabusView({ activeGoal, subjects, topics, showToast, setActiveTab }) {
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});

  if (!activeGoal) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h2>No Active Exam Goal</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Set a goal in Settings to build your syllabus.</p>
        <button className="btn btn-primary" onClick={() => setActiveTab('settings')}>Go to Settings</button>
      </div>
    );
  }

  const goalSubjects = subjects.filter(s => String(s.examGoalId) === String(activeGoal.id));

  const toggleSubject = (id) => setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));

  const STATUS_CYCLE = {
    'NOT_STARTED': 'IN_PROGRESS',
    'IN_PROGRESS': 'COMPLETED',
    'COMPLETED': 'NEEDS_REVISION',
    'NEEDS_REVISION': 'COMPLETED'
  };

  const STATUS_CONFIG = {
    'NOT_STARTED': {
      label: 'Not Started',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.1)',
      border: 'rgba(148,163,184,0.3)',
      icon: '',
      gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    },
    'IN_PROGRESS': {
      label: 'In Progress',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.35)',
      icon: '',
      gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    },
    'COMPLETED': {
      label: 'Completed',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.35)',
      icon: '',
      gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    },
    'NEEDS_REVISION': {
      label: 'Needs Revision',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.3)',
      icon: '',
      gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    },
  };

  // Cycle a single topic/subtopic status. If it's a subtopic and all siblings are now
  // COMPLETED, automatically mark the parent topic as COMPLETED too.
  const cycleStatus = (topic) => {
    const nextStatus = STATUS_CYCLE[topic.status || 'NOT_STARTED'];
    const updated = { ...topic, status: nextStatus };
    DataService.saveTopic(updated).catch(() => showToast('Error updating status'));

    // Auto-complete parent if every sibling subtopic is now COMPLETED
    if (topic.parentId) {
      const siblings = topics.filter(t => t.parentId === topic.parentId && t.id !== topic.id);
      const allSiblingsDone = siblings.every(t => t.status === 'COMPLETED');
      if (allSiblingsDone && nextStatus === 'COMPLETED') {
        const parent = topics.find(t => t.id === topic.parentId);
        if (parent && parent.status !== 'COMPLETED') {
          DataService.saveTopic({ ...parent, status: 'COMPLETED' }).catch(() => {});
        }
      }
    }
  };

  const deleteTopic = (id) => {
    if (window.confirm("Delete this topic?")) {
      DataService.deleteTopic(id).catch(() => showToast("Error deleting topic"));
    }
  };

  const deleteSubject = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this subject and ALL its topics?")) {
      DataService.deleteSubject(id).catch(() => showToast("Error deleting subject"));
    }
  };


  const addSubtopic = (parentId, e) => {
    e.stopPropagation();
    const name = window.prompt("Subtopic name:");
    if (name) {
      const parent = topics.find(t => t.id === parentId);
      if (parent) {
        DataService.saveTopic({
          id: generateId(), examGoalId: activeGoal.id, subjectId: parent.subjectId, parentId, name, status: 'NOT_STARTED'
        });
      }
    }
  };

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem' }}>Syllabus Tracker</h2>
            <p style={{ color: 'var(--text-light)', margin: '4px 0 0', fontSize: '0.9rem' }}>{activeGoal.name}</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubject(true)}>+ Subject</button>
        </div>
      </div>


      {goalSubjects.length === 0 ? (
        <div className="empty card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <p style={{ fontWeight: '600', marginBottom: '6px' }}>No subjects added yet</p>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Start building your syllabus by adding subjects!</p>
        </div>
      ) : (
        goalSubjects.map(subject => {
          const subjectTopics = topics.filter(t => t.subjectId === subject.id && !t.parentId);
          const completedCount = subjectTopics.filter(t => t.status === 'COMPLETED').length;
          const inProgressCount = subjectTopics.filter(t => t.status === 'IN_PROGRESS').length;
          const needsRevisionCount = subjectTopics.filter(t => t.status === 'NEEDS_REVISION').length;
          const pct = subjectTopics.length > 0 ? Math.round((completedCount / subjectTopics.length) * 100) : 0;
          const isExpanded = expandedSubjects[subject.id] !== false;
          const subjColor = subject.colorHex || subject.color || '#3b82f6';

          return (
            <div key={subject.id} style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: `1.5px solid ${subjColor}40`,
              boxShadow: `0 2px 12px ${subjColor}15`,
              marginBottom: '20px',
              overflow: 'hidden',
            }}>
              {/* Subject Header */}
              <div
                onClick={() => toggleSubject(subject.id)}
                style={{
                  padding: '16px 20px',
                  background: `linear-gradient(135deg, ${subjColor}18 0%, ${subjColor}08 100%)`,
                  borderBottom: isExpanded ? `1px solid ${subjColor}25` : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  userSelect: 'none',
                }}
              >
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  backgroundColor: subjColor, flexShrink: 0,
                  boxShadow: `0 0 8px ${subjColor}80`,
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{subject.name}</div>
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: `${subjColor}20`, borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct === 100
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : `linear-gradient(90deg, ${subjColor}, ${subjColor}cc)`,
                        borderRadius: '6px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: subjColor, minWidth: '32px' }}>{pct}%</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {completedCount > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      {completedCount} Completed
                    </span>
                  )}
                  {inProgressCount > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      {inProgressCount} In Progress
                    </span>
                  )}
                  {needsRevisionCount > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      {needsRevisionCount} Needs Revision
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginLeft: '4px' }}>
                    {subjectTopics.length} topics
                  </span>
                </div>

                <button className="del-btn" onClick={(e) => deleteSubject(subject.id, e)} style={{ flexShrink: 0 }}>×</button>
                <span style={{
                  color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: '600', flexShrink: 0,
                  padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-secondary)',
                }}>{isExpanded ? 'Hide' : 'Show'}</span>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px 20px' }}>



                  {subjectTopics.length === 0 ? (
                    <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                      No topics yet. Add your first topic below!
                    </div>
                  ) : (
                    /* Grid of topic cards */
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: '14px',
                    }}>
                      {subjectTopics.map(topic => {
                        const st = topic.status || 'NOT_STARTED';
                        const cfg = STATUS_CONFIG[st];
                        const subtopics = topics.filter(t => t.parentId === topic.id);
                        const subCompleted = subtopics.filter(t => t.status === 'COMPLETED').length;

                        return (
                          <div key={topic.id}
                            style={{
                              background: cfg.gradient,
                              border: `1.5px solid ${cfg.border}`,
                              borderRadius: '12px',
                              padding: '12px',
                              transition: 'transform 0.15s, box-shadow 0.15s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.color}25`;
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = '';
                              e.currentTarget.style.boxShadow = '';
                            }}
                          >
                            {/* Top row: status badge + delete */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.65rem', fontWeight: '700',
                                padding: '2px 8px', borderRadius: '20px',
                                background: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {cfg.label}
                              </span>
                              <button
                                className="del-btn"
                                onClick={() => deleteTopic(topic.id)}
                                style={{ opacity: 0.5, fontSize: '0.85rem', flexShrink: 0 }}
                              >×</button>
                            </div>

                            {/* Topic name */}
                            <div style={{
                              fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)',
                              lineHeight: 1.35,
                            }}>
                              {topic.name}
                            </div>

                            {/* Subtopics */}
                            {subtopics.length > 0 && (
                              <div>
                                {subtopics.map(sub => {
                                  const subCfg = STATUS_CONFIG[sub.status || 'NOT_STARTED'];
                                  return (
                                    <div key={sub.id} style={{
                                      display: 'flex', alignItems: 'center', gap: '4px',
                                      fontSize: '0.76rem', padding: '3px 6px', borderRadius: '6px',
                                      marginBottom: '3px', background: `${subCfg.color}10`,
                                    }}>
                                      <span style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
                                      <span
                                        onClick={() => cycleStatus(sub)}
                                        style={{ cursor: 'pointer', color: subCfg.color, fontWeight: '700', fontSize: '0.7rem', flexShrink: 0, padding: '1px 4px', borderRadius: '4px', background: subCfg.bg }}
                                        title="Click to change status"
                                      >{subCfg.label}</span>
                                      <button className="del-btn" onClick={() => deleteTopic(sub.id)} style={{ fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>×</button>
                                    </div>
                                  );
                                })}
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                  {subCompleted}/{subtopics.length} subtopics done
                                </div>
                              </div>
                            )}

                            {/* Bottom action row */}
                            <div style={{ display: 'flex', justifyContent: subtopics.length > 0 ? 'flex-end' : 'space-between', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                              {/* Only show manual cycle button for topics WITHOUT subtopics */}
                              {subtopics.length === 0 && (
                                <button
                                  onClick={() => cycleStatus(topic)}
                                  style={{
                                    fontSize: '0.72rem', fontWeight: '600',
                                    padding: '5px 10px', borderRadius: '8px',
                                    background: cfg.bg, color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                  }}
                                >
                                  {st === 'NOT_STARTED' ? 'Start' :
                                    st === 'IN_PROGRESS' ? 'Mark Done' :
                                      st === 'COMPLETED' ? 'Revise' : 'Mark Done'}
                                </button>
                              )}
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                                onClick={(e) => addSubtopic(topic.id, e)}
                              >+ Sub</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    className="btn btn-secondary btn-sm w-full"
                    style={{ marginTop: '4px' }}
                    onClick={() => { setSelectedSubjectId(subject.id); setShowAddTopic(true); }}
                  >
                    + Add Topic
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {showAddSubject && (
        <AddSubjectModal
          activeGoal={activeGoal}
          onClose={() => setShowAddSubject(false)}
          onAdd={(s) => { DataService.saveSubject({ ...s, colorHex: s.color }); setShowAddSubject(false); }}
        />
      )}

      {showAddTopic && (
        <AddTopicModal
          activeGoal={activeGoal}
          subjectId={selectedSubjectId}
          onClose={() => { setShowAddTopic(false); setSelectedSubjectId(null); }}
          onAdd={(t) => { DataService.saveTopic(t); setShowAddTopic(false); setSelectedSubjectId(null); }}
        />
      )}
    </>
  );
}

function AddSubjectModal({ activeGoal, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Subject</h3>
          <button className="del-btn" onClick={onClose}>×</button>
        </div>
        <div className="form-group">
          <label className="form-label">Subject Name</label>
          <input className="input input-rect" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Color</label>
          <div className="color-picker" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {colors.map(c => (
              <div key={c} className="color-option" onClick={() => setColor(c)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: color === c ? '3px solid #fff' : 'none', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}></div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary w-full" onClick={() => onAdd({ id: generateId(), examGoalId: activeGoal.id, name, color })} disabled={!name.trim()}>Add Subject</button>
      </div>
    </div>
  );
}

function AddTopicModal({ activeGoal, subjectId, onClose, onAdd }) {
  const [name, setName] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Topic</h3>
          <button className="del-btn" onClick={onClose}>×</button>
        </div>
        <div className="form-group">
          <label className="form-label">Topic Name</label>
          <input className="input input-rect" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <button className="btn btn-primary w-full" onClick={() => onAdd({ id: generateId(), examGoalId: activeGoal.id, subjectId, name, status: 'NOT_STARTED' })} disabled={!name.trim()}>Add Topic</button>
      </div>
    </div>
  );
}

function SettingsView({ user, examGoals, mockTests, subjects, topics, dailyPlans, activeGoal, onSaveGoal, onDeleteGoal, onSetActiveGoal, onSaveMockTest, onDeleteMockTest, showToast, theme, setTheme, isSyncing }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);

  const handleManualSync = async () => {
    try {
      setManualSyncing(true);
      const res = await DataService.syncAllData();
      showToast(`Synced ${res.goals} goals, ${res.subjects} subjects, ${res.topics} topics, ${res.plans} plans`);
    } catch (err) {
      showToast("Sync warning: " + err.message);
    } finally {
      setManualSyncing(false);
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title">Appearance</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>Dark Mode</div>
            <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
              Currently using {theme === 'dark' ? 'Dark' : 'Light'} theme
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title">Cloud Synchronization</h3>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>Status</span>
            <span className="chip" style={{ backgroundColor: isSyncing || manualSyncing ? 'var(--warning)' : 'var(--bg-secondary)', color: isSyncing || manualSyncing ? '#fff' : 'var(--success)', border: '1px solid var(--border)' }}>
              {isSyncing || manualSyncing ? 'Syncing...' : 'Connected & Realtime'}
            </span>
          </div>
          <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '12px' }}>
            Logged in as <strong>{user?.email || 'Not signed in'}</strong>. Your data syncs automatically to all devices using this Google account.
          </div>
          <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Local items: {examGoals.length} goals, {subjects.length} subjects, {topics.length} topics, {dailyPlans?.length || 0} daily plans
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleManualSync}
            disabled={manualSyncing || isSyncing}
          >
            {manualSyncing || isSyncing ? 'Syncing...' : 'Force Sync to Cloud'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title">Account</h3>
        {user ? (
          <div>
            <div className="account-info-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              {user.photoURL ? <img src={user.photoURL} alt="User" style={{ width: '48px', height: '48px', borderRadius: '50%' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>{user.email?.[0].toUpperCase()}</div>}
              <div>
                <div style={{ fontWeight: 'bold' }}>{user.displayName || 'User'}</div>
                <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{user.email}</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => signOut(auth)}>Sign Out</button>
          </div>
        ) : (
          <p>Not signed in.</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Exam Goals</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddGoal(true)}>+ Add Goal</button>
        </div>
        
        {examGoals.length === 0 ? (
          <div className="empty" style={{ padding: '1rem 0' }}>No exam goals. Create one!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {examGoals.map(goal => (
              <div key={goal.id} className="goal-card" style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: goal.isActive ? 'var(--bg-app)' : 'transparent', borderColor: goal.isActive ? 'var(--primary)' : 'var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="goal-card-name" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{goal.name}</span>
                    {goal.isActive && <span className="chip" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>Active</span>}
                  </div>
                  <div className="goal-card-meta" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    Target Date: {new Date(goal.examDate).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!goal.isActive && <button className="btn btn-secondary btn-sm" onClick={() => onSetActiveGoal(goal.id)}>Activate</button>}
                  <button className="del-btn" onClick={() => { if(window.confirm('Delete this goal and all associated data?')) onDeleteGoal(goal.id); }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MockTestSection mockTests={mockTests} subjects={subjects} topics={topics} activeGoal={activeGoal} onSave={onSaveMockTest} onDelete={onDeleteMockTest} showToast={showToast} />

      {showAddGoal && (
        <AddGoalModal onClose={() => setShowAddGoal(false)} onSave={(g) => { onSaveGoal(g); setShowAddGoal(false); }} isFirst={examGoals.length === 0} />
      )}
    </>
  );
}

function AddGoalModal({ onClose, onSave, isFirst }) {
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
          <h3>Add Exam Goal</h3>
          <button className="del-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Exam Name</label>
            <input type="text" className="input input-rect" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. GATE CSE 2027" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Target Exam Date</label>
            <input type="date" className="input input-rect" value={examDate} onChange={e => setExamDate(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 16px' }}>
            <input 
              type="checkbox" 
              id="set-active-goal" 
              checked={isActive} 
              onChange={e => setIsActive(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="set-active-goal" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              Set as current active target
            </label>
          </div>
          <button type="submit" className="btn btn-primary w-full">Save Goal</button>
        </form>
      </div>
    </div>
  );
}

function MockTestSection({ mockTests, subjects, activeGoal, onSave, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState('ALL');

  if (!activeGoal) return null;

  const goalTests = mockTests.filter(t => String(t.examGoalId) === String(activeGoal.id)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const filteredTests = filterType === 'ALL' ? goalTests : goalTests.filter(t => t.type === filterType);

  const chartData = [...filteredTests].reverse().map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: t.scorePercentage
  }));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>Mock Tests & Scores</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Score</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['ALL', 'FULL_MOCK', 'SECTIONAL', 'TOPIC'].map(type => (
          <button key={type} className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType(type)}>
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {chartData.length > 1 && (
        <div style={{ height: '200px', width: '100%', marginBottom: '24px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="name" stroke="var(--text-light)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-light)" fontSize={12} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {filteredTests.length === 0 ? (
        <div className="empty" style={{ padding: '2rem 0' }}>No test scores recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTests.map(test => {
            const subject = subjects.find(s => s.id === test.subjectId);
            return (
              <div key={test.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>{test.title}</span>
                    <span className="chip" style={{ backgroundColor: 'var(--bg-app)' }}>{test.type.replace('_', ' ')}</span>
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                    {new Date(test.date).toLocaleDateString()} {subject && `• ${subject.name}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: test.scorePercentage >= 80 ? 'var(--success)' : test.scorePercentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {test.scorePercentage}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{test.score} / {test.maxScore}</div>
                  </div>
                  <button className="del-btn" onClick={() => { if(window.confirm('Delete this test score?')) onDelete(test.id); }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddMockTestModal 
          activeGoal={activeGoal}
          subjects={subjects}
          onClose={() => setShowAdd(false)}
          onSave={(t) => { onSave(t); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function AddMockTestModal({ activeGoal, subjects, onClose, onSave }) {
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
        title, type, date, subjectId,
        score: numScore, maxScore: numMax, scorePercentage: percentage
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Test Score</h3>
          <button className="del-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Test Title</label>
            <input type="text" className="input input-rect" value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="e.g. Made Easy Mock 1" />
          </div>
          <div className="grid-2col" style={{ gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Type</label>
              <select className="input input-rect" value={type} onChange={e => setType(e.target.value)}>
                <option value="FULL_MOCK">Full Mock</option>
                <option value="SECTIONAL">Sectional</option>
                <option value="TOPIC">Topic Test</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input type="date" className="input input-rect" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>
          {type !== 'FULL_MOCK' && (
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="input input-rect" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                <option value="">None</option>
                {subjects.filter(s => String(s.examGoalId) === String(activeGoal.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid-2col" style={{ gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Marks Obtained</label>
              <input type="number" step="0.5" className="input input-rect" value={score} onChange={e => setScore(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Max Marks</label>
              <input type="number" step="1" className="input input-rect" value={maxScore} onChange={e => setMaxScore(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full">Save Result</button>
        </form>
      </div>
    </div>
  );
}


function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [examGoals, setExamGoals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [mockTests, setMockTests] = useState([]);
  const [dailyPlans, setDailyPlans] = useState([]);
  
  const [clockTime, setClockTime] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('focusly_theme');
    if (saved) return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('focusly_theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setClockTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubSync = DataService.subscribeToSyncStatus(setIsSyncing);
    const unsubAuth = DataService.subscribeToAuth((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    const unsubGoals = DataService.subscribeToExamGoals(setExamGoals);
    const unsubSubjects = DataService.subscribeToSubjects(setSubjects);
    const unsubTopics = DataService.subscribeToTopics(setTopics);
    const unsubMockTests = DataService.subscribeToMockTests(setMockTests);
    const unsubDailyPlans = DataService.subscribeToDailyPlans(setDailyPlans);

    return () => {
      unsubSync();
      unsubAuth();
      unsubGoals();
      unsubSubjects();
      unsubTopics();
      unsubMockTests();
      unsubDailyPlans();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '1') setActiveTab('dashboard');
      if (e.key === '2') setActiveTab('plan');
      if (e.key === '3') setActiveTab('syllabus');
      if (e.key === '4') setActiveTab('settings');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      showToast("Sign in failed");
    }
  };

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <div className="loading-text">Loading Focusly...</div>
      </div>
    );
  }

  if (!user) {
    return <SignInView onLogin={handleLogin} />;
  }

  const activeGoal = examGoals.find(g => g.isActive) || examGoals[0] || null;
  const daysRemaining = activeGoal ? getDaysRemaining(activeGoal.examDate) : null;

  const handleSetActiveGoal = (id) => {
    DataService.setActiveExamGoal(id);
    showToast("Active goal updated");
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'plan', label: 'Plan' },
    { id: 'syllabus', label: 'Syllabus' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="app-container">
      {toastMsg && <div className="toast">{toastMsg}</div>}
      <div className="wrap">
        <header className="app-header">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="logo-text">focusly</span>
            {user && (
              <span 
                className="chip" 
                style={{ 
                  fontSize: '0.72rem', 
                  padding: '2px 8px', 
                  backgroundColor: isSyncing ? 'var(--warning)' : 'var(--bg-secondary)', 
                  color: isSyncing ? '#fff' : 'var(--success)', 
                  border: '1px solid var(--border)',
                  cursor: 'default'
                }}
                title={`Signed in as ${user.email}`}
              >
                {isSyncing ? 'Syncing...' : 'Cloud Synced'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="clock-pill">{clockTime}</div>
          </div>
        </header>

        <div className="tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <main style={{ paddingBottom: '40px' }}>
          {activeTab === 'dashboard' && (
            <DashboardView 
              daysRemaining={daysRemaining} 
              dailyPlans={dailyPlans} 
              subjects={subjects} 
              topics={topics} 
              activeGoal={activeGoal} 
              mockTests={mockTests} 
              setActiveTab={setActiveTab} 
              showToast={showToast} 
            />
          )}
          {activeTab === 'plan' && (
            <DailyPlanView 
              dailyPlans={dailyPlans} 
              subjects={subjects} 
              topics={topics} 
              showToast={showToast} 
            />
          )}
          {activeTab === 'syllabus' && (
            <SyllabusView 
              activeGoal={activeGoal} 
              subjects={subjects} 
              topics={topics} 
              showToast={showToast} 
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView 
              user={user}
              examGoals={examGoals} 
              mockTests={mockTests} 
              subjects={subjects} 
              topics={topics} 
              dailyPlans={dailyPlans}
              activeGoal={activeGoal}
              theme={theme}
              setTheme={setTheme}
              isSyncing={isSyncing}
              onSaveGoal={async (g) => { 
                try {
                  await DataService.saveExamGoal(g); 
                  showToast("Goal saved & synced to cloud"); 
                } catch (err) {
                  showToast("Saved locally. Cloud sync warning: " + err.message);
                }
              }}
              onDeleteGoal={(id) => { DataService.deleteExamGoal(id); showToast("Goal deleted"); }}
              onSetActiveGoal={handleSetActiveGoal}
              onSaveMockTest={(t) => { DataService.saveMockTest(t); showToast("Test score saved"); }}
              onDeleteMockTest={(id) => { DataService.deleteMockTest(id); showToast("Test score deleted"); }}
              showToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
