import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DataService } from './services/dataService';
import { signInWithPopup, googleProvider, auth, signOut } from './firebase';

const PLAN_ITEM_TYPES = ['LECTURE', 'PRACTICE', 'TEST', 'REVISION', 'MOCK_TEST'];
const TYPE_ICONS = { LECTURE: '📖', PRACTICE: '✏️', TEST: '📝', REVISION: '🔄', MOCK_TEST: '🏆' };
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
          <div className="stat-label">🔥 Plan Streak</div>
          <div className="stat-value">{currentStreak}</div>
          <div className="stat-sub">Days (≥80%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📊 Avg Completion</div>
          <div className="stat-value">{Math.round(avgCompletion * 100)}%</div>
          <div className="stat-sub">Last 7 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📚 Syllabus</div>
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
                    <span className="plan-type-badge">{TYPE_ICONS[item.type]}</span>
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
            <button className="btn btn-secondary btn-sm" onClick={() => setShowReflect(true)}>✍️ Reflect</button>
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
                  <span className="plan-type-badge">{TYPE_ICONS[item.type]}</span>
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
          <div className="star-rating" style={{ marginBottom: '8px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} className={`star ${star <= plan.reflection.rating ? 'active' : ''}`}>★</span>
            ))}
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
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
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
          <div className="star-rating" style={{ fontSize: '2rem', justifyContent: 'center', marginBottom: '16px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} className={`star ${star <= rating ? 'active' : ''}`} onClick={() => setRating(star)} style={{ cursor: 'pointer' }}>★</span>
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

  const STATUS_COLORS = {
    'NOT_STARTED': 'var(--text-light)',
    'IN_PROGRESS': 'var(--warning)',
    'COMPLETED': 'var(--success)',
    'NEEDS_REVISION': 'var(--danger)'
  };

  const STATUS_LABELS = {
    'NOT_STARTED': 'Not Started',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed',
    'NEEDS_REVISION': 'Needs Revision'
  };

  const cycleStatus = (topic) => {
    const nextStatus = STATUS_CYCLE[topic.status || 'NOT_STARTED'];
    DataService.saveTopic({ ...topic, status: nextStatus }).catch(() => showToast("Error updating status"));
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

  const addSubtopic = (parentId) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Syllabus Tracker</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubject(true)}>+ Subject</button>
      </div>

      {goalSubjects.length === 0 ? (
        <div className="empty card" style={{ padding: '3rem 1rem' }}>
          <p>No subjects added yet. Start building your syllabus!</p>
        </div>
      ) : (
        goalSubjects.map(subject => {
          const subjectTopics = topics.filter(t => t.subjectId === subject.id && !t.parentId);
          const completedTopics = subjectTopics.filter(t => t.status === 'COMPLETED').length;
          const progress = subjectTopics.length > 0 ? completedTopics / subjectTopics.length : 0;
          const isExpanded = expandedSubjects[subject.id];
          const subjColor = subject.colorHex || subject.color || '#3b82f6';

          return (
            <div key={subject.id} className="subject card" style={{ padding: '0', overflow: 'hidden', marginBottom: '16px' }}>
              <div className="subject-head" onClick={() => toggleSubject(subject.id)} style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', backgroundColor: isExpanded ? 'var(--bg-app)' : 'transparent' }}>
                <div className="dot" style={{ backgroundColor: subjColor }}></div>
                <div style={{ flex: 1 }}>
                  <div className="subject-title">{subject.name}</div>
                  <div className="progress-mini" style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '6px', width: '100px' }}>
                    <div style={{ height: '100%', backgroundColor: subjColor, width: `${progress * 100}%`, borderRadius: '2px' }}></div>
                  </div>
                </div>
                <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginRight: '16px' }}>
                  {completedTopics}/{subjectTopics.length}
                </div>
                <button className="del-btn" onClick={(e) => deleteSubject(subject.id, e)}>×</button>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                  {subjectTopics.length === 0 ? (
                    <div className="empty" style={{ padding: '1rem 0' }}>No topics yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {subjectTopics.map(topic => {
                        const subtopics = topics.filter(t => t.parentId === topic.id);
                        return (
                          <div key={topic.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: '500' }}>{topic.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div onClick={() => cycleStatus(topic)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: STATUS_COLORS[topic.status || 'NOT_STARTED'] }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: STATUS_COLORS[topic.status || 'NOT_STARTED'] }}></div>
                                  {STATUS_LABELS[topic.status || 'NOT_STARTED']}
                                </div>
                                <button className="btn btn-secondary btn-xs" onClick={() => addSubtopic(topic.id)}>+ Sub</button>
                                <button className="del-btn" onClick={() => deleteTopic(topic.id)}>×</button>
                              </div>
                            </div>
                            
                            {subtopics.length > 0 && (
                              <div style={{ marginTop: '12px', paddingLeft: '16px', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {subtopics.map(sub => (
                                  <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                    <div style={{ color: 'var(--text-light)' }}>{sub.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div onClick={() => cycleStatus(sub)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: STATUS_COLORS[sub.status || 'NOT_STARTED'] }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[sub.status || 'NOT_STARTED'] }}></div>
                                        {STATUS_LABELS[sub.status || 'NOT_STARTED']}
                                      </div>
                                      <button className="del-btn" onClick={() => deleteTopic(sub.id)}>×</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button className="btn btn-secondary btn-sm w-full" style={{ marginTop: '12px' }} onClick={() => { setSelectedSubjectId(subject.id); setShowAddTopic(true); }}>
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

function SettingsView({ user, examGoals, mockTests, subjects, topics, activeGoal, onSaveGoal, onDeleteGoal, onSetActiveGoal, onSaveMockTest, onDeleteMockTest, showToast }) {
  const [showAddGoal, setShowAddGoal] = useState(false);

  return (
    <>
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && examDate) {
      onSave({ id: generateId(), name, examDate, isActive: isFirst, createdAt: new Date().toISOString() });
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

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setClockTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
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

  const activeGoal = examGoals.find(g => g.isActive) || null;
  const daysRemaining = activeGoal ? getDaysRemaining(activeGoal.examDate) : null;

  const handleSetActiveGoal = (id) => {
    DataService.setActiveExamGoal(id);
    showToast("Active goal updated");
  };

  const tabs = [
    { id: 'dashboard', label: '🎯 Dashboard' },
    { id: 'plan', label: '📋 Plan' },
    { id: 'syllabus', label: '📚 Syllabus' },
    { id: 'settings', label: '⚙️ Settings' }
  ];

  return (
    <div className="app-container">
      {toastMsg && <div className="toast">{toastMsg}</div>}
      <div className="wrap">
        <header className="app-header">
          <div className="logo">
            <span className="logo-text">focusly</span>
          </div>
          <div className="clock-pill">{clockTime}</div>
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
              activeGoal={activeGoal}
              onSaveGoal={(g) => { DataService.saveExamGoal(g); showToast("Goal saved"); }}
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
