import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { DataService } from './services/dataService';
import { signInWithPopup, googleProvider, auth, signOut } from './firebase';

// ── Constants ──
const GATE_EXAM_DATE = '2027-02-06';
const GATE_TARGET_RANK = 10;
const PLAN_ITEM_TYPES = ['LECTURE', 'PRACTICE', 'TEST', 'REVISION', 'MOCK_TEST'];
const TYPE_ICONS = { LECTURE: '📖', PRACTICE: '✏️', TEST: '📝', REVISION: '🔄', MOCK_TEST: '🏆' };
const TYPE_LABELS = { LECTURE: 'Lecture', PRACTICE: 'Practice', TEST: 'Test', REVISION: 'Revision', MOCK_TEST: 'Mock Test' };

// ── Helpers ──
const todayISO = () => new Date().toISOString().split('T')[0];
const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };
const getDaysRemaining = (targetDate) => {
  const diff = new Date(targetDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
const pad = (n) => String(n).padStart(2, '0');

export default function App() {
  const [activeTab, setActiveTab] = useState('command');
  const [user, setUser] = useState(null);

  // Database States
  const [examGoals, setExamGoals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [mockTests, setMockTests] = useState([]);
  const [dailyPlans, setDailyPlans] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const [clockTime, setClockTime] = useState('--:--');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load subscriptions
  useEffect(() => {
    const unsubAuth       = DataService.subscribeToAuth(setUser);
    const unsubGoals      = DataService.subscribeToExamGoals(setExamGoals);
    const unsubSubjects   = DataService.subscribeToSubjects(setSubjects);
    const unsubTopics     = DataService.subscribeToTopics(setTopics);
    const unsubSessions   = DataService.subscribeToSessions(setSessions);
    const unsubMockTests  = DataService.subscribeToMockTests(setMockTests);
    const unsubPlans      = DataService.subscribeToDailyPlans(setDailyPlans);
    const unsubLastSync   = DataService.subscribeToLastSyncTime(setLastSyncTime);

    return () => {
      unsubAuth(); unsubGoals(); unsubSubjects(); unsubTopics();
      unsubSessions(); unsubMockTests(); unsubPlans(); unsubLastSync();
    };
  }, []);

  // Clock tick which is working right now 
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const key = e.key;
      if (key === '1') setActiveTab('command');
      else if (key === '2') setActiveTab('plan');
      else if (key === '3') setActiveTab('syllabus');
      else if (key === '4') setActiveTab('analytics');
      else if (key === '5') setActiveTab('settings');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeGoal = examGoals.find(g => g.isActive) || null;
  const daysRemaining = getDaysRemaining(GATE_EXAM_DATE);

  const todayStr = todayISO();
  const todaySessions = sessions.filter(s => s.date === todayStr);
  const todaySeconds = todaySessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);
  const todayHours = (todaySeconds / 3600).toFixed(1);

  // Consistency streak: consecutive days with ≥80% plan completion
  const currentStreak = useMemo(() => {
    let streak = 0;
    let d = new Date();
    let checkDateStr = d.toISOString().split('T')[0];

    // Check if today counts
    const todayPlan = dailyPlans.find(p => p.date === checkDateStr);
    if (!todayPlan || todayPlan.items?.length === 0) {
      d.setDate(d.getDate() - 1);
      checkDateStr = d.toISOString().split('T')[0];
    }

    while (true) {
      const plan = dailyPlans.find(p => p.date === checkDateStr);
      if (!plan || !plan.items || plan.items.length === 0) break;
      const completed = plan.items.filter(i => i.completed).length;
      const rate = completed / plan.items.length;
      if (rate < 0.8) break;
      streak++;
      d.setDate(d.getDate() - 1);
      checkDateStr = d.toISOString().split('T')[0];
    }
    return streak;
  }, [dailyPlans]);

  // Study streak (consecutive days studied)
  const studyStreak = useMemo(() => {
    const dates = new Set(sessions.filter(s => s.completedDurationSeconds > 0).map(s => s.date));
    let streak = 0;
    let d = new Date();
    let checkDateStr = d.toISOString().split('T')[0];
    if (!dates.has(checkDateStr)) {
      d.setDate(d.getDate() - 1);
      checkDateStr = d.toISOString().split('T')[0];
    }
    while (dates.has(checkDateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
      checkDateStr = d.toISOString().split('T')[0];
    }
    return streak;
  }, [sessions]);

  const TABS = [
    { id: 'command',   label: '🎯 command' },
    { id: 'plan',      label: '📋 plan' },
    { id: 'syllabus',  label: '📚 syllabus' },
    { id: 'analytics', label: '📊 analytics' },
    { id: 'settings',  label: '⚙️ settings' },
  ];

  return (
    <div className="app-container">
      {/* NOTIFICATION TOAST */}
      {toastMsg && <div className="toast">{toastMsg}</div>}

      <div className="wrap">
        {/* HEADER */}
        <header className="app-header">
          <div className="logo">
            <span className="logo-text">focusly</span>
          </div>
          <div className="clock-pill">{clockTime}</div>
        </header>

        {/* TABS */}
        <div className="tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* VIEWS */}
        {activeTab === 'command' && (
          <CommandCenterView
            daysRemaining={daysRemaining}
            todayHours={todayHours}
            currentStreak={currentStreak}
            studyStreak={studyStreak}
            dailyPlans={dailyPlans}
            sessions={sessions}
            subjects={subjects}
            topics={topics}
            activeGoal={activeGoal}
            setActiveTab={setActiveTab}
            showToast={showToast}
          />
        )}

        {activeTab === 'plan' && (
          <DailyPlanView
            dailyPlans={dailyPlans}
            subjects={subjects}
            topics={topics}
            sessions={sessions}
            activeGoal={activeGoal}
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

        {activeTab === 'analytics' && (
          <AnalyticsView
            sessions={sessions}
            subjects={subjects}
            topics={topics}
            activeGoal={activeGoal}
            mockTests={mockTests}
            dailyPlans={dailyPlans}
            onSaveMockTest={(test) => {
              DataService.saveMockTest(test);
              showToast('Mock test score saved');
            }}
            onDeleteMockTest={(id) => {
              DataService.deleteMockTest(id);
              showToast('Mock test deleted');
            }}
            streak={studyStreak}
            showToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            user={user}
            examGoals={examGoals}
            lastSyncTime={lastSyncTime}
            onSaveGoal={(goal) => {
              DataService.saveExamGoal(goal);
              showToast('Exam goal saved');
            }}
            onDeleteGoal={(id) => {
              DataService.deleteExamGoal(id);
              showToast('Exam goal deleted');
            }}
            onSetActiveGoal={(id) => {
              DataService.setActiveExamGoal(id);
              showToast('Active goal updated');
            }}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

// ====================================================
// COMMAND CENTER VIEW
// ====================================================

function CommandCenterView({ daysRemaining, todayHours, currentStreak, studyStreak, dailyPlans, sessions, subjects, topics, activeGoal, setActiveTab, showToast }) {
  const todayStr = todayISO();
  const todayPlan = dailyPlans.find(p => p.date === todayStr);
  const todayItems = todayPlan?.items || [];
  const completedItems = todayItems.filter(i => i.completed);
  const planProgress = todayItems.length > 0 ? completedItems.length / todayItems.length : 0;

  // Daily target
  const dailyTargetHours = activeGoal ? (activeGoal.dailyTargetMinutes / 60) : 10;
  const hoursProgress = Math.min(parseFloat(todayHours) / dailyTargetHours, 1);

  // Last 7 days plan completion
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const plan = dailyPlans.find(p => p.date === iso);
      const items = plan?.items || [];
      const completed = items.filter(it => it.completed).length;
      const total = items.length;
      const rate = total > 0 ? completed / total : -1; // -1 = no plan
      days.push({
        date: iso,
        dayLabel: d.toLocaleDateString(undefined, { weekday: 'short' }),
        rate,
        completed,
        total
      });
    }
    return days;
  }, [dailyPlans]);

  const avgCompletion = useMemo(() => {
    const withPlans = last7Days.filter(d => d.rate >= 0);
    if (withPlans.length === 0) return 0;
    return withPlans.reduce((a, d) => a + d.rate, 0) / withPlans.length;
  }, [last7Days]);

  const handleToggleItem = (itemId) => {
    if (!todayPlan) return;
    const updatedItems = todayPlan.items.map(i =>
      i.id === itemId ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : null } : i
    );
    DataService.saveDailyPlan({ ...todayPlan, items: updatedItems });
  };

  // GATE countdown progress (from prep start to exam date)
  const totalPrepDays = 365; // approximate full prep period
  const percentElapsed = Math.min(((totalPrepDays - daysRemaining) / totalPrepDays) * 100, 100);

  // SVG ring constants
  const CIRCUM = 2 * Math.PI * 46;

  return (
    <>
      {/* ── GATE Countdown Hero ── */}
      <div className="card countdown-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>GATE 2027 CSE</div>
            <div style={{ fontSize: 14, color: 'var(--accent-gold)', fontWeight: 700, marginTop: 2 }}>TARGET: AIR &lt; {GATE_TARGET_RANK}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{daysRemaining}</div>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>DAYS REMAINING</div>
        </div>

        <div className="progress-bar-bg" style={{ marginBottom: 6 }}>
          <div className="progress-bar-fill" style={{ width: `${percentElapsed}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>Prep started</span>
          <span>{percentElapsed.toFixed(0)}% timeline elapsed</span>
          <span>Feb 6, 2027</span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="card">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">🔥 Study Streak</div>
            <div className="stat-value" style={{ color: 'var(--accent-gold)' }}>{studyStreak}</div>
            <div className="stat-sub">days</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">⏱ Studied Today</div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{todayHours}h</div>
            <div className="stat-sub">of {dailyTargetHours}h target</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">📋 Plan Streak</div>
            <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{currentStreak}</div>
            <div className="stat-sub">days ≥80%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">📊 Avg Completion</div>
            <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>{(avgCompletion * 100).toFixed(0)}%</div>
            <div className="stat-sub">last 7 days</div>
          </div>
        </div>
      </div>

      {/* ── Today's Plan Execution ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>📋 Today's Battle Plan</div>
          {todayItems.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: planProgress >= 0.8 ? 'var(--accent-emerald)' : planProgress >= 0.5 ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
              {completedItems.length}/{todayItems.length} ({(planProgress * 100).toFixed(0)}%)
            </span>
          )}
        </div>

        {todayItems.length > 0 && (
          <div className="progress-bar-bg" style={{ marginBottom: 16 }}>
            <div className="progress-bar-fill" style={{
              width: `${planProgress * 100}%`,
              background: planProgress >= 0.8 ? 'var(--accent-emerald)' : planProgress >= 0.5 ? 'var(--accent-gold)' : 'var(--accent-red)'
            }} />
          </div>
        )}

        {todayItems.length === 0 ? (
          <div className="empty">
            No plan for today yet.
            <br />
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setActiveTab('plan')}>
              Create Today's Plan →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayItems.map(item => {
              const subj = subjects.find(s => String(s.id) === String(item.subjectId));
              return (
                <div key={item.id}
                  className={`plan-item ${item.completed ? 'completed' : ''}`}
                  onClick={() => handleToggleItem(item.id)}
                >
                  <div className="plan-item-checkbox">
                    {item.completed ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span className="plan-type-badge" data-type={item.type}>{TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}</span>
                      {subj && <span className="chip" style={{ border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 10 }}>{subj.name}</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, opacity: item.completed ? 0.5 : 1, textDecoration: item.completed ? 'line-through' : 'none' }}>
                      {item.title}
                    </div>
                  </div>
                  {item.estimatedMinutes && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {item.estimatedMinutes}m
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Hours Progress Ring + Quick Log ── */}
      <div className="grid-2col">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">⏱ Hours Progress</div>
          <div className="ring-container" style={{ flexDirection: 'column' }}>
            <svg viewBox="0 0 100 100" style={{ width: 120, height: 120 }}>
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-blue)" />
                  <stop offset="100%" stopColor="var(--accent-purple)" />
                </linearGradient>
              </defs>
              <circle className="ring-bg" cx="50" cy="50" r="46" />
              <circle className="ring-fg" cx="50" cy="50" r="46"
                transform="rotate(-90 50 50)"
                style={{
                  strokeDasharray: CIRCUM,
                  strokeDashoffset: CIRCUM - CIRCUM * hoursProgress,
                }}
              />
              <text x="50" y="48" fontSize="14" fontWeight="700" fill="var(--text-primary)" style={{ textAnchor: 'middle' }}>{todayHours}h</text>
              <text x="50" y="62" fontSize="7" fill="var(--text-secondary)" style={{ textAnchor: 'middle' }}>of {dailyTargetHours}h</text>
            </svg>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">⚡ Quick Actions</div>
          <div className="quick-actions">
            <button className="btn btn-primary quick-action-btn" onClick={() => setActiveTab('plan')}>
              📋 Plan Day
            </button>
            <button className="btn btn-secondary quick-action-btn" onClick={() => setActiveTab('syllabus')}>
              📚 Syllabus
            </button>
            <button className="btn btn-secondary quick-action-btn" onClick={() => setActiveTab('analytics')}>
              📊 Analytics
            </button>
          </div>
        </div>
      </div>

      {/* ── 7-Day Consistency ── */}
      <div className="card">
        <div className="card-title">📅 7-Day Consistency</div>
        <div className="consistency-grid">
          {last7Days.map(day => {
            let colorClass = 'gray';
            if (day.rate >= 0.8) colorClass = 'green';
            else if (day.rate >= 0.5) colorClass = 'yellow';
            else if (day.rate >= 0) colorClass = 'red';
            return (
              <div key={day.date} className={`consistency-day ${colorClass}`}>
                <div className="consistency-day-label">{day.dayLabel}</div>
                <div className="consistency-day-value">
                  {day.rate < 0 ? '—' : `${(day.rate * 100).toFixed(0)}%`}
                </div>
                {day.total > 0 && <div className="consistency-day-sub">{day.completed}/{day.total}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ====================================================
// DAILY PLAN VIEW
// ====================================================

function DailyPlanView({ dailyPlans, subjects, topics, sessions, activeGoal, showToast }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = todayISO();
    const todayPlan = dailyPlans.find(p => p.date === today);
    // If today has a plan, show today. Otherwise, show today for creation.
    return today;
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showSessionLogger, setShowSessionLogger] = useState(false);

  // Add item form
  const [itemType, setItemType] = useState('LECTURE');
  const [itemSubjectId, setItemSubjectId] = useState('');
  const [itemTopicId, setItemTopicId] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemMinutes, setItemMinutes] = useState(60);

  // Reflection form
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionRating, setReflectionRating] = useState(3);

  const currentPlan = dailyPlans.find(p => p.date === selectedDate);
  const planItems = currentPlan?.items || [];
  const completedItems = planItems.filter(i => i.completed);

  const isToday = selectedDate === todayISO();
  const isPast = selectedDate < todayISO();

  const topicsForSubject = topics.filter(t => String(t.subjectId) === String(itemSubjectId));

  const handleAddItem = () => {
    if (!itemTitle.trim()) return;
    const newItem = {
      id: String(Date.now()),
      type: itemType,
      subjectId: itemSubjectId || null,
      topicId: itemTopicId || null,
      title: itemTitle.trim(),
      estimatedMinutes: itemMinutes,
      completed: false,
      completedAt: null,
      notes: null,
      score: null,
      totalMarks: null,
    };

    const items = [...planItems, newItem];
    DataService.saveDailyPlan({
      ...currentPlan,
      id: selectedDate,
      date: selectedDate,
      items,
      createdAt: currentPlan?.createdAt || Date.now(),
    });

    setItemTitle('');
    setItemMinutes(60);
    setItemTopicId('');
    setShowAddItem(false);
    showToast('Plan item added');
  };

  const handleToggleItem = (itemId) => {
    if (!currentPlan) return;
    const updatedItems = currentPlan.items.map(i =>
      i.id === itemId ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : null } : i
    );
    DataService.saveDailyPlan({ ...currentPlan, items: updatedItems });
  };

  const handleDeleteItem = (itemId) => {
    if (!currentPlan) return;
    const updatedItems = currentPlan.items.filter(i => i.id !== itemId);
    DataService.saveDailyPlan({ ...currentPlan, items: updatedItems });
    showToast('Item removed');
  };

  const handleSaveReflection = () => {
    if (!currentPlan) return;
    DataService.saveDailyPlan({
      ...currentPlan,
      reflection: reflectionText.trim() || null,
      rating: reflectionRating,
    });
    setShowReflection(false);
    showToast('Reflection saved');
  };

  const handleCopyPreviousDay = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevISO = prevDate.toISOString().split('T')[0];
    const prevPlan = dailyPlans.find(p => p.date === prevISO);
    if (!prevPlan || !prevPlan.items?.length) {
      showToast('No previous day plan found');
      return;
    }
    const copiedItems = prevPlan.items.map(item => ({
      ...item,
      id: String(Date.now()) + Math.random().toString(36).substr(2, 5),
      completed: false,
      completedAt: null,
    }));
    DataService.saveDailyPlan({
      id: selectedDate,
      date: selectedDate,
      items: copiedItems,
      createdAt: Date.now(),
    });
    showToast('Copied previous day plan');
  };

  const handleApplyTemplate = (template) => {
    const templateItems = {
      standard: [
        { type: 'LECTURE', title: 'Lecture 1 — New Topic', estimatedMinutes: 90 },
        { type: 'LECTURE', title: 'Lecture 2 — New Topic', estimatedMinutes: 90 },
        { type: 'PRACTICE', title: 'Problem Solving Set 1', estimatedMinutes: 60 },
        { type: 'LECTURE', title: 'Lecture 3 — New Topic', estimatedMinutes: 90 },
        { type: 'PRACTICE', title: 'Problem Solving Set 2', estimatedMinutes: 60 },
        { type: 'REVISION', title: 'Revision — Previous Topics', estimatedMinutes: 60 },
        { type: 'TEST', title: 'Topic-wise Test', estimatedMinutes: 45 },
      ],
      heavy: [
        { type: 'LECTURE', title: 'Lecture 1', estimatedMinutes: 90 },
        { type: 'LECTURE', title: 'Lecture 2', estimatedMinutes: 90 },
        { type: 'LECTURE', title: 'Lecture 3', estimatedMinutes: 90 },
        { type: 'PRACTICE', title: 'Practice Problems', estimatedMinutes: 90 },
        { type: 'PRACTICE', title: 'PYQ Practice', estimatedMinutes: 60 },
        { type: 'REVISION', title: 'Revision Block', estimatedMinutes: 60 },
        { type: 'TEST', title: 'Subject Test', estimatedMinutes: 60 },
        { type: 'MOCK_TEST', title: 'Full-Length Mock', estimatedMinutes: 180 },
      ],
      revision: [
        { type: 'REVISION', title: 'Revision Block 1', estimatedMinutes: 90 },
        { type: 'REVISION', title: 'Revision Block 2', estimatedMinutes: 90 },
        { type: 'PRACTICE', title: 'PYQ Practice 1', estimatedMinutes: 60 },
        { type: 'PRACTICE', title: 'PYQ Practice 2', estimatedMinutes: 60 },
        { type: 'MOCK_TEST', title: 'Full-Length Mock Test', estimatedMinutes: 180 },
        { type: 'REVISION', title: 'Weak Area Focus', estimatedMinutes: 60 },
      ],
    };

    const items = (templateItems[template] || []).map(item => ({
      ...item,
      id: String(Date.now()) + Math.random().toString(36).substr(2, 5),
      subjectId: null,
      topicId: null,
      completed: false,
      completedAt: null,
      notes: null,
      score: null,
      totalMarks: null,
    }));

    DataService.saveDailyPlan({
      id: selectedDate,
      date: selectedDate,
      items: [...planItems, ...items],
      createdAt: currentPlan?.createdAt || Date.now(),
    });
    showToast(`${template} template applied`);
  };

  // Date navigation
  const navigateDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Plan calendar (next 30 days)
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = -7; i <= 21; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const plan = dailyPlans.find(p => p.date === iso);
      days.push({ date: iso, hasPlan: !!plan && plan.items?.length > 0, isToday: iso === todayISO() });
    }
    return days;
  }, [dailyPlans]);

  const totalPlannedMinutes = planItems.reduce((a, i) => a + (i.estimatedMinutes || 0), 0);

  return (
    <>
      {/* Date Navigation */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(-1)}>← Prev</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ fontSize: 12, color: isToday ? 'var(--accent-emerald)' : isPast ? 'var(--text-muted)' : 'var(--accent-blue)' }}>
              {isToday ? 'TODAY' : isPast ? 'PAST' : 'UPCOMING'}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(1)}>Next →</button>
        </div>

        {/* Mini Calendar */}
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto', padding: '4px 0' }}>
          {calendarDays.map(day => (
            <div
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              style={{
                width: 32, height: 36, borderRadius: 8, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                background: day.date === selectedDate ? 'var(--accent-blue)' : day.isToday ? 'var(--bg-card-hover)' : 'transparent',
                color: day.date === selectedDate ? '#fff' : 'var(--text-secondary)',
                border: day.isToday && day.date !== selectedDate ? '1px solid var(--accent-blue)' : '1px solid transparent',
                fontSize: 11, fontWeight: day.date === selectedDate ? 700 : 500,
              }}
            >
              <span>{new Date(day.date + 'T00:00:00').getDate()}</span>
              {day.hasPlan && <span style={{ width: 4, height: 4, borderRadius: '50%', background: day.date === selectedDate ? '#fff' : 'var(--accent-emerald)', marginTop: 1 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Plan Items */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>📋 Daily Plan</div>
            {planItems.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {completedItems.length}/{planItems.length} tasks · ~{Math.round(totalPlannedMinutes / 60)}h planned
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(true)}>+ Add Task</button>
          </div>
        </div>

        {planItems.length > 0 && (
          <div className="progress-bar-bg" style={{ marginBottom: 14 }}>
            <div className="progress-bar-fill" style={{
              width: `${(completedItems.length / planItems.length) * 100}%`,
              background: completedItems.length === planItems.length ? 'var(--accent-emerald)' : 'var(--accent-blue)'
            }} />
          </div>
        )}

        {planItems.length === 0 ? (
          <div className="empty">
            No tasks planned for this day.
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(true)}>+ Add Task</button>
              <button className="btn btn-secondary btn-sm" onClick={handleCopyPreviousDay}>📋 Copy Previous Day</button>
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-xs" onClick={() => handleApplyTemplate('standard')}>Standard Day</button>
              <button className="btn btn-secondary btn-xs" onClick={() => handleApplyTemplate('heavy')}>Heavy Day</button>
              <button className="btn btn-secondary btn-xs" onClick={() => handleApplyTemplate('revision')}>Revision Day</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {planItems.map(item => {
              const subj = subjects.find(s => String(s.id) === String(item.subjectId));
              return (
                <div key={item.id} className={`plan-item ${item.completed ? 'completed' : ''}`}>
                  <div className="plan-item-checkbox" onClick={() => handleToggleItem(item.id)}>
                    {item.completed ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span className="plan-type-badge" data-type={item.type}>{TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}</span>
                      {subj && <span className="chip" style={{ border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 10 }}>{subj.name}</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, opacity: item.completed ? 0.5 : 1, textDecoration: item.completed ? 'line-through' : 'none' }}>
                      {item.title}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {item.estimatedMinutes && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.estimatedMinutes}m</span>}
                    <button className="del-btn" onClick={() => handleDeleteItem(item.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        {planItems.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddItem(true)}>+ Add More</button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setReflectionText(currentPlan?.reflection || '');
              setReflectionRating(currentPlan?.rating || 3);
              setShowReflection(true);
            }}>✍️ Reflect</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSessionLogger(true)}>⏱ Log Session</button>
          </div>
        )}
      </div>

      {/* Reflection Card (if exists) */}
      {currentPlan?.reflection && (
        <div className="card reflection-card">
          <div className="card-title">✍️ Day Reflection</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} style={{ fontSize: 16, color: s <= (currentPlan.rating || 0) ? 'var(--accent-gold)' : 'var(--text-muted)' }}>★</span>
            ))}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{currentPlan.reflection}</p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">Add Plan Task</div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Type</label>
              <div className="tag-row">
                {PLAN_ITEM_TYPES.map(t => (
                  <button key={t} className={`tag-chip ${itemType === t ? 'active' : ''}`}
                    onClick={() => setItemType(t)}>
                    {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-2col" style={{ gap: 12, marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="input" value={itemSubjectId} onChange={e => setItemSubjectId(e.target.value)}>
                  <option value="">— none —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {topicsForSubject.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Topic</label>
                  <select className="input" value={itemTopicId} onChange={e => setItemTopicId(e.target.value)}>
                    <option value="">— none —</option>
                    {topicsForSubject.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Task Title *</label>
              <input className="input" value={itemTitle} onChange={e => setItemTitle(e.target.value)}
                placeholder="e.g. Watch Lecture 5 — KMP Algorithm" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
            </div>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Estimated Duration (minutes)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-secondary btn-xs" onClick={() => setItemMinutes(p => Math.max(15, p - 15))}>−15</button>
                <span style={{ fontWeight: 700, minWidth: 50, textAlign: 'center' }}>{itemMinutes}m</span>
                <button className="btn btn-secondary btn-xs" onClick={() => setItemMinutes(p => p + 15)}>+15</button>
                <button className="btn btn-secondary btn-xs" onClick={() => setItemMinutes(p => p + 30)}>+30</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddItem}>Add Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      {showReflection && (
        <div className="modal-overlay" onClick={() => setShowReflection(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">End of Day Reflection</div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>How did today go?</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} className={`star ${star <= reflectionRating ? 'active' : ''}`}
                    onClick={() => setReflectionRating(star)}>★</span>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Reflection Notes</label>
              <textarea className="input-rect" rows="4"
                placeholder="What went well? What needs improvement? What will you change tomorrow?"
                value={reflectionText} onChange={e => setReflectionText(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowReflection(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveReflection}>Save Reflection</button>
            </div>
          </div>
        </div>
      )}

      {/* Session Logger Modal */}
      {showSessionLogger && (
        <SessionLoggerModal
          subjects={subjects}
          onSave={(session) => {
            DataService.saveSession(session);
            showToast('Session logged');
            setShowSessionLogger(false);
          }}
          onClose={() => setShowSessionLogger(false)}
        />
      )}
    </>
  );
}

// ====================================================
// SESSION LOGGER MODAL
// ====================================================

function SessionLoggerModal({ subjects, onSave, onClose }) {
  const [subjectId, setSubjectId] = useState('');
  const [label, setLabel] = useState('Study Session');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [tag, setTag] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const s = subjects.find(x => String(x.id) === String(subjectId));
    if (s) setLabel(s.name);
  }, [subjectId, subjects]);

  const handleSave = () => {
    const now = Date.now();
    onSave({
      label: label || 'Study Session',
      durationMinutes,
      completedDurationSeconds: durationMinutes * 60,
      date: todayISO(),
      startTime: now - durationMinutes * 60 * 1000,
      endTime: now,
      isCompleted: true,
      notes: notes.trim() || null,
      tag: tag || null,
      subjectId: subjectId || null,
      confidenceRating: null,
      focusScore: null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">⏱ Log Study Session</div>

        <div className="grid-2col" style={{ gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="input" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">No subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Session Name</label>
            <input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. OS Lecture 5" />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Duration (minutes)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-xs" onClick={() => setDurationMinutes(p => Math.max(5, p - 15))}>−15</button>
            <button className="btn btn-secondary btn-xs" onClick={() => setDurationMinutes(p => Math.max(5, p - 5))}>−5</button>
            <span style={{ fontWeight: 700, minWidth: 60, textAlign: 'center', fontSize: 18 }}>{durationMinutes}m</span>
            <button className="btn btn-secondary btn-xs" onClick={() => setDurationMinutes(p => p + 5)}>+5</button>
            <button className="btn btn-secondary btn-xs" onClick={() => setDurationMinutes(p => p + 15)}>+15</button>
            <button className="btn btn-secondary btn-xs" onClick={() => setDurationMinutes(p => p + 30)}>+30</button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Tag</label>
          <div className="tag-row">
            {['LECTURE', 'REVISION', 'PRACTICE', 'TEST'].map(t => (
              <button key={t} className={`tag-chip ${tag === t ? 'active' : ''}`}
                onClick={() => setTag(tag === t ? '' : t)}>
                {t.replace('_', ' ').toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Notes (optional)</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you cover?" />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Log Session</button>
        </div>
      </div>
    </div>
  );
}

// ====================================================
// SYLLABUS VIEW
// ====================================================

function SyllabusView({ activeGoal, subjects, topics, showToast, setActiveTab }) {
  const [showAddSubj, setShowAddSubj] = useState(false);
  const [showAddTopicSubjId, setShowAddTopicSubjId] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [colorHex, setColorHex] = useState('#3b82f6');
  const [topicName, setTopicName] = useState('');
  const [expandedSubjId, setExpandedSubjId] = useState(null);
  const [activeAddSubTopicId, setActiveAddSubTopicId] = useState(null);
  const [subTopicName, setSubTopicName] = useState('');

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const handleAddSubject = () => {
    if (!subjectName.trim()) return;
    DataService.saveSubject({ name: subjectName.trim(), examGoalId: activeGoal?.id || 'local-goal', colorHex, sortOrder: subjects.length });
    showToast(`Subject added: ${subjectName}`);
    setSubjectName(''); setShowAddSubj(false);
  };

  const handleAddTopic = () => {
    if (!topicName.trim() || !showAddTopicSubjId) return;
    DataService.saveTopic({ name: topicName.trim(), subjectId: showAddTopicSubjId, status: 'NOT_STARTED', sortOrder: topics.filter(t => t.subjectId === showAddTopicSubjId).length, subTopics: [] });
    showToast(`Topic added: ${topicName}`);
    setTopicName(''); setShowAddTopicSubjId(null);
  };

  const handleCycleStatus = (topic) => {
    const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVISION'];
    DataService.saveTopic({ ...topic, status: statuses[(statuses.indexOf(topic.status) + 1) % statuses.length] });
  };

  const handleAddSubTopic = (topic) => {
    if (!subTopicName.trim()) return;
    DataService.saveTopic({ ...topic, subTopics: [...(topic.subTopics || []), { id: String(Date.now()), name: subTopicName.trim(), status: 'NOT_STARTED' }] });
    setSubTopicName(''); setActiveAddSubTopicId(null);
  };

  const handleDeleteSubTopic = (topic, subTopicId) => {
    if (confirm('Delete this sub-topic?')) {
      DataService.saveTopic({ ...topic, subTopics: (topic.subTopics || []).filter(s => s.id !== subTopicId) });
      showToast('Sub-topic deleted');
    }
  };

  const handleCycleSubTopicStatus = (topic, subTopicId) => {
    const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    DataService.saveTopic({ ...topic, subTopics: (topic.subTopics || []).map(sub => sub.id === subTopicId ? { ...sub, status: statuses[(statuses.indexOf(sub.status) + 1) % statuses.length] } : sub) });
  };

  const statusChipStyle = (status) => {
    const map = {
      NOT_STARTED:    { bg: 'var(--border)', color: 'var(--text-muted)' },
      IN_PROGRESS:    { bg: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' },
      COMPLETED:      { bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' },
      NEEDS_REVISION: { bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-gold)' },
    };
    return map[status] || map.NOT_STARTED;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>📚 Syllabus Tracker</div>
        {activeGoal && <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubj(true)}>+ Add Subject</button>}
      </div>

      {!activeGoal ? (
        <div className="empty">Set an exam goal first<br /><button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setActiveTab('settings')}>Go to Settings →</button></div>
      ) : subjects.length === 0 ? (
        <div className="empty">Syllabus is empty — add a subject to start<br /><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddSubj(true)}>Add Subject</button></div>
      ) : (
        subjects.map(s => {
          const subjTopics = topics.filter(t => String(t.subjectId) === String(s.id));
          const completed = subjTopics.filter(t => t.status === 'COMPLETED').length;
          const rate = subjTopics.length > 0 ? completed / subjTopics.length : 0;
          const isExpanded = expandedSubjId === s.id;
          return (
            <div key={s.id} className="subject">
              <div className="subject-head">
                <div className="subject-title" style={{ cursor: 'pointer' }} onClick={() => setExpandedSubjId(isExpanded ? null : s.id)}>
                  <span className="dot" style={{ backgroundColor: s.colorHex }} />
                  {s.name}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{isExpanded ? ' ▲' : ' ▼'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="progress-mini">{(rate * 100).toFixed(0)}% · {completed}/{subjTopics.length}</span>
                  <button className="del-btn" onClick={() => { if (confirm('Delete subject and all topics?')) { DataService.deleteSubject(s.id); showToast('Subject deleted'); } }}>✕</button>
                </div>
              </div>
              <div className="progress-bar-bg" style={{ marginBottom: 12 }}>
                <div className="progress-bar-fill" style={{ width: `${rate * 100}%`, background: s.colorHex }} />
              </div>
              {isExpanded && (
                <div style={{ marginTop: 8 }}>
                  {subjTopics.length === 0
                    ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 8 }}>No topics yet — add one below!</p>
                    : subjTopics.map(t => {
                        const sc = statusChipStyle(t.status);
                        const statusLabel = t.status.toLowerCase().replace('_', ' ');
                        return (
                          <div key={t.id} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span className="chip" style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.color}`, cursor: 'pointer', fontSize: 11 }}
                                  onClick={() => handleCycleStatus(t)}>{statusLabel}</span>
                                <button className="btn btn-secondary btn-xs" onClick={() => { setActiveAddSubTopicId(activeAddSubTopicId === t.id ? null : t.id); setSubTopicName(''); }}>+ sub</button>
                                <button className="del-btn" onClick={() => { DataService.deleteTopic(t.id); showToast('Topic deleted'); }}>✕</button>
                              </div>
                            </div>
                            {(t.subTopics || []).map(sub => {
                              const ssc = statusChipStyle(sub.status);
                              return (
                                <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, padding: '5px 8px 5px 20px', borderLeft: `2px solid ${s.colorHex}`, marginLeft: 8, marginTop: 6 }}>
                                  <span style={{ fontSize: 13 }}>{sub.name}</span>
                                  <div style={{ display: 'flex', gap: 5 }}>
                                    <span className="chip" style={{ background: ssc.bg, color: ssc.color, border: `1.5px solid ${ssc.color}`, cursor: 'pointer', fontSize: 10, padding: '2px 8px' }}
                                      onClick={() => handleCycleSubTopicStatus(t, sub.id)}>{sub.status.toLowerCase().replace('_', ' ')}</span>
                                    <button className="del-btn" style={{ fontSize: 14 }} onClick={() => handleDeleteSubTopic(t, sub.id)}>✕</button>
                                  </div>
                                </div>
                              );
                            })}
                            {activeAddSubTopicId === t.id && (
                              <div style={{ display: 'flex', gap: 6, marginLeft: 8, marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${s.colorHex}` }}>
                                <input className="input-sm" style={{ flex: 1 }} value={subTopicName} onChange={e => setSubTopicName(e.target.value)} placeholder="Sub-topic name…" onKeyDown={e => e.key === 'Enter' && handleAddSubTopic(t)} autoFocus />
                                <button className="btn btn-secondary btn-xs" onClick={() => handleAddSubTopic(t)}>Add</button>
                                <button className="btn btn-secondary btn-xs" onClick={() => { setActiveAddSubTopicId(null); setSubTopicName(''); }}>✕</button>
                              </div>
                            )}
                          </div>
                        );
                      })
                  }
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddTopicSubjId(s.id)}>+ Add Topic</button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Add Subject Modal */}
      {showAddSubj && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Add Subject</div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Subject Name</label>
              <input className="input" placeholder="e.g. Data Structures, Algorithms…" value={subjectName} onChange={e => setSubjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Choose Color</label>
              <div className="color-picker">
                {colors.map(c => <div key={c} className={`color-option ${colorHex === c ? 'selected' : ''}`} style={{ backgroundColor: c }} onClick={() => setColorHex(c)} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddSubj(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSubject}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showAddTopicSubjId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Add Topic</div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Topic Name</label>
              <input className="input" placeholder="e.g. Minimization using K-Maps…" value={topicName} onChange={e => setTopicName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTopic()} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddTopicSubjId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddTopic}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================
// ANALYTICS VIEW
// ====================================================

function AnalyticsView({ sessions, subjects, topics, activeGoal, mockTests, dailyPlans, onSaveMockTest, onDeleteMockTest, streak, showToast }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const heatmapWrapperRef = useRef(null);

  useEffect(() => {
    if (heatmapWrapperRef.current) {
      heatmapWrapperRef.current.scrollLeft = heatmapWrapperRef.current.scrollWidth;
    }
  }, [sessions]);

  // Plan consistency score (0-100)
  const consistencyScore = useMemo(() => {
    const last30 = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const plan = dailyPlans.find(p => p.date === iso);
      last30.push(plan);
    }

    const daysWithPlans = last30.filter(p => p && p.items?.length > 0).length;
    const planCreationRate = daysWithPlans / 30;

    const completionRates = last30
      .filter(p => p && p.items?.length > 0)
      .map(p => p.items.filter(i => i.completed).length / p.items.length);
    const avgCompletionRate = completionRates.length > 0 ? completionRates.reduce((a, b) => a + b, 0) / completionRates.length : 0;

    const streakBonus = Math.min(streak / 30, 1) * 0.2;

    return Math.round((planCreationRate * 40 + avgCompletionRate * 40 + streakBonus * 100) * 100) / 100;
  }, [dailyPlans, streak]);

  // GATE Readiness
  const gateReadiness = useMemo(() => {
    const totalTopics = topics.length;
    const completedTopics = topics.filter(t => t.status === 'COMPLETED').length;
    const syllabusCompletion = totalTopics > 0 ? completedTopics / totalTopics : 0;

    const goalTests = activeGoal ? mockTests.filter(t => String(t.examGoalId) === String(activeGoal.id)) : [];
    const avgMockScore = goalTests.length > 0 ? goalTests.reduce((a, t) => a + t.scorePercentage, 0) / goalTests.length : 0;

    const readiness = (syllabusCompletion * 30 + (avgMockScore / 100) * 40 + (consistencyScore / 100) * 30);
    let level = 'Not Ready';
    if (readiness >= 80) level = 'GATE Ready';
    else if (readiness >= 60) level = 'Almost There';
    else if (readiness >= 35) level = 'Getting There';

    return { readiness: Math.round(readiness), level, syllabusCompletion, avgMockScore };
  }, [topics, mockTests, activeGoal, consistencyScore]);

  // Coverage gaps (subjects not studied in 7 days)
  const coverageGaps = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return subjects.filter(s => {
      const recentSessions = sessions.filter(se => String(se.subjectId) === String(s.id) && new Date(se.date) >= weekAgo);
      return recentSessions.length === 0;
    });
  }, [subjects, sessions]);

  const wowDelta = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const curStart = new Date(today); curStart.setDate(today.getDate() - 6);
    const prevEnd = new Date(today); prevEnd.setDate(today.getDate() - 7);
    const prevStart = new Date(today); prevStart.setDate(today.getDate() - 13);
    const cur = sessions.filter(s => { const d = new Date(s.date); return d >= curStart && d <= today; });
    const prev = sessions.filter(s => { const d = new Date(s.date); return d >= prevStart && d <= prevEnd; });
    const curH = cur.reduce((a, s) => a + s.completedDurationSeconds, 0) / 3600;
    const prevH = prev.reduce((a, s) => a + s.completedDurationSeconds, 0) / 3600;
    const delta = prevH > 0 ? ((curH - prevH) / prevH) * 100 : 0;
    return { curH, prevH, delta };
  }, [sessions]);

  const weeks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(today.getDate() - 364);
    const sun = new Date(start); sun.setDate(start.getDate() - start.getDay());
    const endSat = new Date(today); endSat.setDate(today.getDate() + (6 - today.getDay()));
    const list = []; let cur = new Date(sun);
    while (cur <= endSat) {
      const week = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      list.push(week);
    }
    return list;
  }, [sessions]);

  const monthLabels = useMemo(() => {
    const labels = []; let last = '';
    weeks.forEach((week, wIdx) => {
      const mn = week[3].toLocaleDateString(undefined, { month: 'short' });
      if (mn !== last) { labels.push({ text: mn, colIndex: wIdx }); last = mn; }
    });
    return labels;
  }, [weeks]);

  const startDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 364); return d; }, []);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const getPieData = () => {
    const tots = {};
    sessions.forEach(s => { if (s.subjectId && s.completedDurationSeconds > 0) tots[s.subjectId] = (tots[s.subjectId] || 0) + s.completedDurationSeconds; });
    return Object.keys(tots).map(id => {
      const s = subjects.find(x => String(x.id) === String(id));
      return { name: s ? s.name : 'Unknown', value: Math.round(tots[id] / 60), color: s ? s.colorHex : '#888' };
    }).filter(x => x.value > 0);
  };
  const pieData = getPieData();

  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const hours = sessions.filter(s => s.date === iso).reduce((a, s) => a + s.completedDurationSeconds, 0) / 3600;
    return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), hours: parseFloat(hours.toFixed(1)) };
  });

  const getDaySessions = (date) => {
    if (!date) return [];
    const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return sessions.filter(s => s.date === iso);
  };

  // Plan completion trend (last 30 days)
  const planTrendData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const plan = dailyPlans.find(p => p.date === iso);
      const items = plan?.items || [];
      const completed = items.filter(it => it.completed).length;
      const rate = items.length > 0 ? Math.round((completed / items.length) * 100) : null;
      data.push({
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        completion: rate,
      });
    }
    return data.filter(d => d.completion !== null);
  }, [dailyPlans]);

  return (
    <>
      {/* GATE Readiness + Consistency Score */}
      <div className="grid-2col">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🎯 GATE Readiness</div>
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: gateReadiness.readiness >= 60 ? 'var(--accent-emerald)' : gateReadiness.readiness >= 35 ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
              {gateReadiness.readiness}%
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{gateReadiness.level}</div>
          </div>
          <div className="progress-bar-bg" style={{ margin: '10px 0 12px' }}>
            <div className="progress-bar-fill" style={{
              width: `${gateReadiness.readiness}%`,
              background: gateReadiness.readiness >= 60 ? 'var(--accent-emerald)' : gateReadiness.readiness >= 35 ? 'var(--accent-gold)' : 'var(--accent-red)'
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Syllabus</span><span>{(gateReadiness.syllabusCompletion * 100).toFixed(0)}%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mock Avg</span><span>{gateReadiness.avgMockScore.toFixed(0)}%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consistency</span><span>{consistencyScore}%</span></div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">📈 Week vs Week</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'This week', value: `${wowDelta.curH.toFixed(1)}h` },
              { label: 'Prev week', value: `${wowDelta.prevH.toFixed(1)}h` },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                <strong>{r.value}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Delta</span>
              <strong style={{ color: wowDelta.delta >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)', fontSize: 18 }}>
                {wowDelta.delta >= 0 ? '▲' : '▼'} {Math.abs(wowDelta.delta).toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Coverage Gaps Warning */}
      {coverageGaps.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--accent-red)', borderWidth: 1 }}>
          <div className="card-title" style={{ color: 'var(--accent-red)' }}>⚠️ Coverage Gaps — Not studied in 7 days</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {coverageGaps.map(s => (
              <span key={s.id} className="chip" style={{ border: `1.5px solid ${s.colorHex}`, color: s.colorHex, background: `${s.colorHex}15` }}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="card">
        <div className="card-title">📊 Study Time — Last 7 Days</div>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `${v}h`} tickLine={false} axisLine={false} />
              <Tooltip formatter={v => [`${v} hours`, 'Studied']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Fredoka, sans-serif', color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(59,130,246,0.1)' }} />
              <Bar dataKey="hours" fill="url(#barGrad)" radius={[6, 6, 0, 0]}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-blue)" /><stop offset="100%" stopColor="var(--accent-purple)" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan Completion Trend */}
      {planTrendData.length > 0 && (
        <div className="card">
          <div className="card-title">📋 Plan Completion Trend — 30 Days</div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={planTrendData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Fredoka, sans-serif', fontSize: 11, color: 'var(--text-primary)' }} />
                <Line type="monotone" dataKey="completion" stroke="var(--accent-emerald)" strokeWidth={2.5} dot={{ fill: 'var(--accent-emerald)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Distribution + Consistency */}
      <div className="grid-2col">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🍩 Subject Split</div>
          {pieData.length > 0 ? (
            <div className="chart-distribution-layout">
              <div className="chart-pie-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v} mins`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Fredoka, sans-serif', color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend-wrapper">
                {pieData.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 4, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{item.value}m</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="empty" style={{ fontSize: 14 }}>No subject sessions yet</div>}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🏆 Consistency Score</div>
          <div style={{ textAlign: 'center', margin: '12px 0' }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: consistencyScore >= 70 ? 'var(--accent-emerald)' : consistencyScore >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
              {consistencyScore}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>out of 100</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center' }}>
            Based on plan creation rate, completion rate, and streak length over 30 days
          </div>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="card">
        <div className="card-title">🗓 Activity Heatmap</div>
        <div className="github-heatmap-wrapper" ref={heatmapWrapperRef}>
          <div className="github-heatmap-inner">
            <div className="github-heatmap-months">
              {monthLabels.map((lbl, i) => <div key={i} className="github-heatmap-month-label" style={{ gridColumn: `${lbl.colIndex + 2} / span 4` }}>{lbl.text}</div>)}
            </div>
            <div className="github-heatmap-grid">
              <span className="github-heatmap-weekday-label" style={{ gridRow: 2, gridColumn: 1 }}>Mon</span>
              <span className="github-heatmap-weekday-label" style={{ gridRow: 4, gridColumn: 1 }}>Wed</span>
              <span className="github-heatmap-weekday-label" style={{ gridRow: 6, gridColumn: 1 }}>Fri</span>
              {weeks.flatMap((week, wIdx) =>
                week.map((day, dIdx) => {
                  if (day < startDate || day > today) return <div key={`${wIdx}-${dIdx}`} className="github-heatmap-cell empty" style={{ gridRow: dIdx + 1, gridColumn: wIdx + 2 }} />;
                  const iso = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
                  const secs = sessions.filter(s => s.date === iso).reduce((a, s) => a + s.completedDurationSeconds, 0);
                  const level = secs === 0 ? 0 : secs < 1800 ? 1 : secs < 3600 ? 2 : secs < 7200 ? 3 : 4;
                  return (
                    <div key={`${wIdx}-${dIdx}`} className={`github-heatmap-cell level-${level}`}
                      style={{ gridRow: dIdx + 1, gridColumn: wIdx + 2 }}
                      title={`${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${(secs / 3600).toFixed(1)}h`}
                      onClick={() => setSelectedDate(day)} />
                  );
                })
              )}
            </div>
          </div>
          <div className="github-heatmap-legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(l => <div key={l} className={`github-heatmap-legend-cell level-${l}`} />)}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Mock tests */}
      <MockTestSection mockTests={mockTests} subjects={subjects} topics={topics} activeGoal={activeGoal} onSave={onSaveMockTest} onDelete={onDeleteMockTest} showToast={showToast} />

      {/* Day drill-down modal */}
      {selectedDate && (() => {
        const ds = getDaySessions(selectedDate);
        const totalH = (ds.reduce((a, s) => a + s.completedDurationSeconds, 0) / 3600).toFixed(1);
        return (
          <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div className="modal-header" style={{ marginBottom: 2 }}>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{totalH}h total</div>
                </div>
                <button className="del-btn" style={{ fontSize: 20 }} onClick={() => setSelectedDate(null)}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {ds.length === 0
                  ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No sessions on this day</p>
                  : ds.map(s => {
                    const timeStr = new Date(s.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
                    return (
                      <div key={s.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 44 }}>{timeStr}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                          {subj && <span className="chip" style={{ marginTop: 3, border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 10 }}>{subj.name}</span>}
                        </div>
                        <div className="session-mins" style={{ fontSize: 14 }}>{Math.round(s.completedDurationSeconds / 60)}m</div>
                      </div>
                    );
                  })
                }
              </div>
              <div style={{ textAlign: 'right', marginTop: 14 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ====================================================
// MOCK TEST SECTION
// ====================================================

function MockTestSection({ mockTests, subjects, topics, activeGoal, onSave, onDelete, showToast }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterSubject, setFilterSubject] = useState(null);
  const [filterTopic, setFilterTopic] = useState(null);
  const [testName, setTestName] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [topicId, setTopicId] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [correctM, setCorrectM] = useState('');
  const [penaltyM, setPenaltyM] = useState('');

  const netMarks = (parseFloat(correctM) || 0) - (parseFloat(penaltyM) || 0);

  useEffect(() => { if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id); }, [subjects]);
  useEffect(() => { setTopicId(''); }, [subjectId]);

  const topicsForSubject = topics?.filter(t => String(t.subjectId) === String(subjectId)) || [];

  if (!activeGoal) return (
    <div className="card">
      <div className="card-title">🏆 Practice Tests</div>
      <div className="empty">Set an active goal to track tests</div>
    </div>
  );

  const goalTests = mockTests.filter(t => String(t.examGoalId) === String(activeGoal.id)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const topicsForFilter = topics?.filter(t => String(t.subjectId) === String(filterSubject)) || [];
  const filteredTests = goalTests.filter(t => {
    if (filterTopic) return String(t.topicId) === String(filterTopic);
    if (filterSubject) return String(t.subjectId) === String(filterSubject);
    return true;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!testName || !subjectId) return;
    const obtained = parseFloat(obtainedMarks) || 0, total = parseFloat(totalMarks) || 100;
    onSave({
      examGoalId: activeGoal.id, subjectId, topicId: topicId || null, testName,
      scorePercentage: total > 0 ? (obtained / total) * 100 : 0,
      obtainedMarks: obtained, totalMarks: total, correctMarks: parseFloat(correctM) || 0,
      penaltyMarks: parseFloat(penaltyM) || 0, netMarks, notes, date, createdAt: Date.now()
    });
    setTestName(''); setObtainedMarks(''); setTotalMarks(''); setNotes('');
    setCorrectM(''); setPenaltyM(''); setTopicId('');
    setShowAddForm(false);
  };

  const chartData = filteredTests.map(t => ({ date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), score: Math.round(t.scorePercentage), name: t.testName }));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>🏆 Practice Tests</div>
        {subjects.length > 0 && !showAddForm && <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>+ Log Result</button>}
      </div>

      {showAddForm ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Test Name *</label>
            <input className="input" value={testName} onChange={e => setTestName(e.target.value)} required placeholder="e.g. PYQ Set — OS 2020-2024" />
          </div>
          <div className="grid-3col" style={{ gap: 10, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="input-sm" value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {topicsForSubject.length > 0 && (
              <div className="form-group">
                <label className="form-label">Topic</label>
                <select className="input-sm" value={topicId} onChange={e => setTopicId(e.target.value)}>
                  <option value="">— none —</option>
                  {topicsForSubject.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="input-sm" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="grid-2col" style={{ gap: 10, marginBottom: 12 }}>
            <div className="form-group"><label className="form-label">Obtained Marks</label><input className="input-sm" type="number" step="any" value={obtainedMarks} onChange={e => setObtainedMarks(e.target.value)} placeholder="72" /></div>
            <div className="form-group"><label className="form-label">Total Marks</label><input className="input-sm" type="number" step="any" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} placeholder="100" /></div>
          </div>
          <div className="grid-3col" style={{ gap: 10, marginBottom: 12 }}>
            <div className="form-group"><label className="form-label">Correct (+)</label><input className="input-sm" type="number" step="any" value={correctM} onChange={e => setCorrectM(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Penalty (−)</label><input className="input-sm" type="number" step="any" value={penaltyM} onChange={e => setPenaltyM(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Net (auto)</label><div className="input-sm" style={{ color: netMarks >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 700, display: 'flex', alignItems: 'center', cursor: 'default' }}>{(correctM || penaltyM) ? netMarks.toFixed(2) : '—'}</div></div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Weak areas, observations…" />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Result</button>
          </div>
        </form>
      ) : (
        <>
          {subjects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <button className={`tag-chip ${!filterSubject ? 'active' : ''}`} onClick={() => { setFilterSubject(null); setFilterTopic(null); }}>All</button>
              {subjects.map(s => (
                <button key={s.id} className={`tag-chip ${filterSubject === s.id ? 'active' : ''}`} style={{ borderColor: s.colorHex, color: filterSubject === s.id ? '#fff' : s.colorHex, background: filterSubject === s.id ? s.colorHex : 'transparent' }}
                  onClick={() => { setFilterSubject(filterSubject === s.id ? null : s.id); setFilterTopic(null); }}>{s.name}</button>
              ))}
            </div>
          )}
          {filterSubject && topicsForFilter.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10, paddingLeft: 8 }}>
              <button className={`tag-chip ${!filterTopic ? 'active' : ''}`} onClick={() => setFilterTopic(null)}>All topics</button>
              {topicsForFilter.map(t => <button key={t.id} className={`tag-chip ${filterTopic === t.id ? 'active' : ''}`} onClick={() => setFilterTopic(filterTopic === t.id ? null : t.id)}>{t.name}</button>)}
            </div>
          )}

          {chartData.length > 0 && (
            <div style={{ height: 100, marginBottom: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Fredoka, sans-serif', fontSize: 11, color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="score" stroke="var(--accent-gold)" strokeWidth={2.5} dot={{ fill: 'var(--accent-gold)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredTests.slice().reverse().map(t => {
              const subj = subjects.find(s => String(s.id) === String(t.subjectId));
              const score = Math.round(t.scorePercentage);
              const scoreColor = score >= 75 ? 'var(--accent-emerald)' : score >= 50 ? 'var(--accent-gold)' : 'var(--accent-red)';
              return (
                <div key={t.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                        {subj && <span className="chip" style={{ border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 11 }}>{subj.name}</span>}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.date}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.testName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{t.obtainedMarks}/{t.totalMarks} marks</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: scoreColor, fontSize: 18 }}>{score}%</span>
                      <button className="del-btn" onClick={() => onDelete(t.id)}>✕</button>
                    </div>
                  </div>
                  {t.notes && <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>📝 {t.notes}</div>}
                </div>
              );
            })}
            {filteredTests.length === 0 && <div className="empty" style={{ fontSize: 14 }}>No tests recorded — tap Log Result to start</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ====================================================
// SETTINGS VIEW (formerly Account)
// ====================================================

function SettingsView({ user, examGoals, lastSyncTime, onSaveGoal, onDeleteGoal, onSetActiveGoal, showToast }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState('GATE 2027 CSE');
  const [goalDate, setGoalDate] = useState(GATE_EXAM_DATE);
  const [targetMins, setTargetMins] = useState(600);

  const handleLogin = async () => {
    if (!auth) { alert('Firebase not configured. Add VITE_FIREBASE_API_KEY env vars to enable cloud sync.'); return; }
    try { await signInWithPopup(auth, googleProvider); showToast('Signed in'); }
    catch (e) { console.error(e); alert('Login failed: ' + e.message); }
  };

  const handleLogout = async () => {
    if (auth) { await signOut(auth); showToast('Signed out'); }
  };

  const handleSaveGoal = () => {
    if (!goalName.trim() || !goalDate) return;
    onSaveGoal({ name: goalName.trim(), examDate: goalDate, dailyTargetMinutes: targetMins, isActive: examGoals.length === 0, createdAt: Date.now() });
    setGoalName('GATE 2027 CSE'); setGoalDate(GATE_EXAM_DATE); setShowAddGoal(false);
  };

  const exportData = () => {
    const keys = ['focusly_exam_goals', 'focusly_subjects', 'focusly_topics', 'focusly_sessions', 'focusly_mock_tests', 'focusly_daily_plans'];
    const data = Object.fromEntries(keys.map(k => [k.replace('focusly_', ''), JSON.parse(localStorage.getItem(k) || '[]')]));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `gate_command_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Export complete');
  };

  const clearData = () => {
    if (confirm('Clear ALL local study data? This cannot be undone!')) {
      localStorage.clear(); showToast('Data cleared, reloading…');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="card">
      <div className="card-title">⚙️ Settings</div>

      {/* Sync status */}
      <div style={{ marginBottom: 18 }}>
        {[
          { key: 'Sync Status', val: user ? 'Connected ✅' : 'Offline (local mode)', color: user ? 'var(--accent-emerald)' : 'var(--accent-gold)' },
          { key: 'Account', val: user ? user.email : 'Local guest' },
          { key: 'Database', val: user ? 'Firestore' : 'localStorage' },
          ...(lastSyncTime ? [{ key: 'Last Sync', val: lastSyncTime }] : []),
        ].map(r => (
          <div key={r.key} className="account-info-row">
            <span className="account-info-key">{r.key}</span>
            <span className="account-info-val" style={r.color ? { color: r.color } : {}}>{r.val}</span>
          </div>
        ))}
      </div>

      {/* Google sign in */}
      <div className="section-sep"><div className="line" /><div className="label">Cloud Sync</div><div className="line" /></div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>Link a Google account to sync across devices</p>
      {user
        ? <button className="btn btn-danger w-full" style={{ justifyContent: 'center', marginBottom: 20 }} onClick={handleLogout}>Sign Out</button>
        : <button className="btn btn-primary w-full" style={{ justifyContent: 'center', marginBottom: 20 }} onClick={handleLogin}>Sign In with Google</button>
      }

      {/* Exam goals */}
      <div className="section-sep"><div className="line" /><div className="label">Exam Goals</div><div className="line" /></div>
      {examGoals.length === 0
        ? <div className="empty" style={{ fontSize: 14, marginBottom: 12 }}>No goals yet</div>
        : <div style={{ marginBottom: 14 }}>
          {examGoals.map(g => (
            <div key={g.id} className={`goal-card ${g.isActive ? 'active' : ''}`}>
              <div>
                <div className="goal-card-name">{g.name} {g.isActive && <span className="chip" style={{ fontSize: 11, background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}>Active</span>}</div>
                <div className="goal-card-meta">{g.examDate} · {(g.dailyTargetMinutes / 60).toFixed(1)}h/day target</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!g.isActive && <button className="btn btn-secondary btn-xs" onClick={() => onSetActiveGoal(g.id)}>Activate</button>}
                <button className="del-btn" onClick={() => onDeleteGoal(g.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      }
      <button className="btn btn-secondary w-full" style={{ justifyContent: 'center', marginBottom: 20 }} onClick={() => setShowAddGoal(true)}>+ Add Exam Goal</button>

      {/* Data management */}
      <div className="section-sep"><div className="line" /><div className="label">Data</div><div className="line" /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={exportData}>Export Backup</button>
        <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={clearData}>Clear Cache</button>
      </div>

      {/* Add goal modal */}
      {showAddGoal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">New Exam Target 🎯</div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Exam Name</label>
              <input className="input" placeholder="e.g. GATE 2027 CSE" value={goalName} onChange={e => setGoalName(e.target.value)} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Target Date</label>
              <input className="input" type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Daily Study Target</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setTargetMins(p => Math.max(60, p - 30))}>−30m</button>
                <span style={{ fontSize: 18, fontWeight: 700, minWidth: 80, textAlign: 'center' }}>{(targetMins / 60).toFixed(1)} hrs</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setTargetMins(p => p + 30)}>+30m</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddGoal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveGoal}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
