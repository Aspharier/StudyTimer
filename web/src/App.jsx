import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { DataService } from './services/dataService';
import { signInWithPopup, googleProvider, auth, signOut } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);

  // Prefill states for starting session from recommendations
  const [prefilledSubjectId, setPrefilledSubjectId] = useState('');
  const [prefilledSessionName, setPrefilledSessionName] = useState('');

  // Database States
  const [examGoals, setExamGoals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [mockTests, setMockTests] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSessionActiveGlobally, setIsSessionActiveGlobally] = useState(false);

  const [clockTime, setClockTime] = useState('--:--');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleFocusNow = (subjectId, topicName) => {
    setPrefilledSubjectId(subjectId);
    setPrefilledSessionName(topicName);
    setActiveTab('timer');
  };

  // Load subscriptions
  useEffect(() => {
    const unsubAuth      = DataService.subscribeToAuth(setUser);
    const unsubGoals     = DataService.subscribeToExamGoals(setExamGoals);
    const unsubSubjects  = DataService.subscribeToSubjects(setSubjects);
    const unsubTopics    = DataService.subscribeToTopics(setTopics);
    const unsubSessions  = DataService.subscribeToSessions(setSessions);
    const unsubMockTests = DataService.subscribeToMockTests(setMockTests);
    const unsubMistakes  = DataService.subscribeToMistakes(setMistakes);
    const unsubLastSync  = DataService.subscribeToLastSyncTime(setLastSyncTime);

    return () => {
      unsubAuth(); unsubGoals(); unsubSubjects(); unsubTopics();
      unsubSessions(); unsubMockTests(); unsubMistakes(); unsubLastSync();
    };
  }, []);

  // Clock tick
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setClockTime(`${h}:${m}`);
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (isSessionActiveGlobally) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const key = e.key;
      if (key === '1') setActiveTab('dashboard');
      else if (key === '2') setActiveTab('timer');
      else if (key === '3') setActiveTab('syllabus');
      else if (key === '4') setActiveTab('analytics');
      else if (key === '5') setActiveTab('account');
      else if (key === '6') setActiveTab('mistakes');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActiveGlobally]);

  const activeGoal = examGoals.find(g => g.isActive) || null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr);
  const todaySeconds = todaySessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);
  const todayHours = (todaySeconds / 3600).toFixed(1);

  const getDaysRemaining = () => {
    if (!activeGoal) return null;
    const diffTime = new Date(activeGoal.examDate) - new Date();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };
  const daysRemaining = getDaysRemaining();

  const currentStreak = (() => {
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
  })();

  const TABS = [
    { id: 'dashboard', label: '🏠 home'    },
    { id: 'timer',     label: '⏱ timer'   },
    { id: 'syllabus',  label: '📚 syllabus'},
    { id: 'analytics', label: '📊 analytics'},
    { id: 'account',   label: '☁️ account' },
    { id: 'mistakes',  label: '✍️ mistakes' },
  ];

  return (
    <div className="app-container">
      {/* Floating stickers */}
      <div className="sticker s1">✿</div>
      <div className="sticker s2">⭐</div>
      <div className="sticker s3">🎀</div>
      <div className="sticker s4">✨</div>
      <div className="sticker s5">☁️</div>
      <div className="sticker s6">🌸</div>
      <div className="sticker s7">🍬</div>
      <div className="sticker s8">🌷</div>

      {/* NOTIFICATION TOAST */}
      {toastMsg && <div className="toast">{toastMsg}</div>}

      {!isSessionActiveGlobally && (
        <div className="wrap">
          {/* HEADER */}
          <header className="app-header">
            <div className="logo">
              <span className="logo-icon">✿</span>
              focusly
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
          {activeTab === 'dashboard' && (
            <DashboardView
              activeGoal={activeGoal}
              sessions={sessions}
              subjects={subjects}
              topics={topics}
              setActiveTab={setActiveTab}
              onFocusNow={handleFocusNow}
              currentStreak={currentStreak}
              todayHours={todayHours}
              showToast={showToast}
              daysRemaining={daysRemaining}
            />
          )}

          {activeTab === 'timer' && (
            <TimerView
              subjects={subjects}
              sessions={sessions}
              onSaveSession={(session) => {
                DataService.saveSession(session);
                showToast('session saved ✨');
              }}
              prefilledSubjectId={prefilledSubjectId}
              prefilledSessionName={prefilledSessionName}
              clearPrefill={() => {
                setPrefilledSubjectId('');
                setPrefilledSessionName('');
              }}
              showToast={showToast}
              onSessionActiveChange={setIsSessionActiveGlobally}
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
              onSaveMockTest={(test) => {
                DataService.saveMockTest(test);
                showToast('mock test score saved 🌸');
              }}
              onDeleteMockTest={(id) => {
                DataService.deleteMockTest(id);
                showToast('mock test deleted');
              }}
              streak={currentStreak}
              showToast={showToast}
            />
          )}

          {activeTab === 'account' && (
            <AccountView
              user={user}
              examGoals={examGoals}
              lastSyncTime={lastSyncTime}
              onSaveGoal={(goal) => {
                DataService.saveExamGoal(goal);
                showToast('exam goal saved 🎀');
              }}
              onDeleteGoal={(id) => {
                DataService.deleteExamGoal(id);
                showToast('exam goal deleted');
              }}
              onSetActiveGoal={(id) => {
                DataService.setActiveExamGoal(id);
                showToast('active goal updated ✿');
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'mistakes' && (
            <MistakesView
              subjects={subjects}
              mistakes={mistakes}
              onSaveMistake={(m) => {
                DataService.saveMistake(m);
                showToast('mistake logged ✍️');
              }}
              onDeleteMistake={(id) => {
                DataService.deleteMistake(id);
                showToast('mistake deleted');
              }}
              showToast={showToast}
            />
          )}
        </div>
      )}

      {/* Immersive timer (full screen) */}
      {isSessionActiveGlobally && (
        <div className="wrap">
          <TimerView
            subjects={subjects}
            sessions={sessions}
            onSaveSession={(session) => {
              DataService.saveSession(session);
              showToast('session saved ✨');
            }}
            prefilledSubjectId={prefilledSubjectId}
            prefilledSessionName={prefilledSessionName}
            clearPrefill={() => {
              setPrefilledSubjectId('');
              setPrefilledSessionName('');
            }}
            showToast={showToast}
            onSessionActiveChange={setIsSessionActiveGlobally}
          />
        </div>
      )}
    </div>
  );
}

// ====================================================
// DASHBOARD VIEW
// ====================================================

function DashboardView({ activeGoal, sessions, subjects, topics, setActiveTab, onFocusNow, currentStreak, todayHours, showToast, daysRemaining }) {
  const safeSubjects = subjects || [];
  const safeTopics   = topics   || [];
  const safeSessions = sessions || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = safeSessions.filter(s => s.date === todayStr);
  const dailyTargetMinutes = activeGoal ? activeGoal.dailyTargetMinutes : 360;

  const adaptiveTargetMinutes = dailyTargetMinutes;

  const studiedSeconds = parseFloat(todayHours) * 3600;
  const dailyTargetSeconds = adaptiveTargetMinutes * 60;
  const progressPercent = dailyTargetSeconds > 0 ? Math.min(studiedSeconds / dailyTargetSeconds, 1) : 0;

  const recentSessionsList = safeSessions.slice(0, 5);

  const subjectsWithRates = safeSubjects.map(s => {
    const sTopics = safeTopics.filter(t => String(t.subjectId) === String(s.id));
    const completed = sTopics.filter(t => t.status === 'COMPLETED').length;
    const rate = sTopics.length > 0 ? completed / sTopics.length : 0;
    return { ...s, total: sTopics.length, completed, rate };
  }).sort((a, b) => b.rate - a.rate);

  // SVG ring constants
  const CIRCUM = 2 * Math.PI * 46;

  return (
    <>
      {/* ── Stats Row ── */}
      <div className="card">
        <div className="card-title">✨ today's snapshot</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">🔥 streak</div>
            <div className="stat-value pink">{currentStreak}</div>
            <div className="stat-sub">days</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">⏱ studied</div>
            <div className="stat-value lilac">{todayHours}h</div>
            <div className="stat-sub">today</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">📅 exam in</div>
            <div className="stat-value sun">{activeGoal ? daysRemaining : '—'}</div>
            <div className="stat-sub">{activeGoal ? activeGoal.name : 'no goal set'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">📚 sessions</div>
            <div className="stat-value mint">{todaySessions.length}</div>
            <div className="stat-sub">today</div>
          </div>
        </div>
      </div>

      {/* ── Progress Ring + Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', marginBottom: '22px' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🌸 progress</div>
          <div className="ring-container" style={{ flexDirection: 'column' }}>
            <svg viewBox="0 0 100 100" style={{ width: 130, height: 130 }}>
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#ff7ab6"/>
                  <stop offset="100%" stopColor="#a67aff"/>
                </linearGradient>
              </defs>
              <circle className="ring-bg" cx="50" cy="50" r="46" />
              <circle className="ring-fg" cx="50" cy="50" r="46"
                transform="rotate(-90 50 50)"
                style={{
                  strokeDasharray: CIRCUM,
                  strokeDashoffset: CIRCUM - CIRCUM * progressPercent,
                }}
              />
              <text x="50" y="48" fontSize="14" fontWeight="700" fill="#4a2d5e" style={{ textAnchor: 'middle' }}>{todayHours}h</text>
              <text x="50" y="62" fontSize="7"  fill="#7a5c8f"              style={{ textAnchor: 'middle' }}>of {(adaptiveTargetMinutes/60).toFixed(1)}h goal</text>
            </svg>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              {parseFloat(todayHours) > 0
                ? <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>keep it up! 🎀</p>
                : <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>start studying ✿</p>
              }
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🚀 quick start</div>
          <div className="quick-actions">
            <button className="btn btn-primary quick-action-btn" onClick={() => setActiveTab('timer')}>
              ▶ start focus session
            </button>
            <button className="btn btn-secondary quick-action-btn" onClick={() => setActiveTab('syllabus')}>
              📚 manage syllabus
            </button>
            <button className="btn btn-secondary quick-action-btn" onClick={() => setActiveTab('analytics')}>
              📊 view analytics
            </button>
            <button className="btn btn-secondary quick-action-btn" onClick={() => setActiveTab('account')}>
              🎯 set exam goal
            </button>
          </div>
        </div>
      </div>

      {/* ── Syllabus Overview ── */}
      <div className="card">
        <div className="card-title">📖 syllabus overview</div>
        {subjectsWithRates.length === 0 ? (
          <div className="empty">nothing here yet — add a subject to get started ✿</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {subjectsWithRates.map(s => (
              <div key={s.id} style={{ paddingBottom: 12, borderBottom: '1.5px dashed var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: s.colorHex, display: 'inline-block', border: '1.5px solid var(--ink)' }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</span>
                  </div>
                  <span className="chip chip-lilac" style={{ border: `1.5px solid ${s.colorHex}`, color: s.colorHex, background: `${s.colorHex}20` }}>
                    {(s.rate * 100).toFixed(0)}% · {s.completed}/{s.total}
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${s.rate * 100}%`, background: s.colorHex }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Sessions ── */}
      <div className="card">
        <div className="card-title">🕐 recent sessions</div>
        {recentSessionsList.length === 0 ? (
          <div className="empty">no sessions yet — start studying! ✨</div>
        ) : (
          <div>
            {recentSessionsList.map(s => {
              const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
              return (
                <div key={s.id} className="session-card">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="session-title">{s.label}</div>
                    <div className="session-meta">
                      {s.date}
                      {subj && <span className="chip chip-pink" style={{ marginLeft: 8, border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20` }}>{subj.name}</span>}
                    </div>
                  </div>
                  <div className="session-mins">{Math.round(s.completedDurationSeconds / 60)}m</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ====================================================
// TIMER VIEW
// ====================================================

function TimerView({ subjects, sessions, onSaveSession, prefilledSubjectId, prefilledSessionName, clearPrefill, showToast, onSessionActiveChange }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionName, setSessionName] = useState('Study Session');
  const [selectedTag, setSelectedTag] = useState('');
  const activeSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));

  const [presetMode, setPresetMode] = useState('STANDARD');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [totalCycles, setTotalCycles] = useState(4);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [currentPhase, setCurrentPhase] = useState('FOCUS');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [accumulatedCompletedSeconds, setAccumulatedCompletedSeconds] = useState(0);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [sessionNotesInput, setSessionNotesInput] = useState('');
  const [pausesCount, setPausesCount] = useState(0);
  const [showSimWarning, setShowSimWarning] = useState(false);
  const [simApproved, setSimApproved] = useState(false);
  const [sessionConfidence, setSessionConfidence] = useState(3);

  useEffect(() => {
    if (onSessionActiveChange) onSessionActiveChange(isSessionActive);
  }, [isSessionActive, onSessionActiveChange]);

  const intervalRef = useRef(null);
  const expectedEndTimeRef = useRef(null);

  useEffect(() => {
    if (prefilledSubjectId) setSelectedSubjectId(prefilledSubjectId);
    if (prefilledSessionName) setSessionName(prefilledSessionName);
    if (prefilledSubjectId || prefilledSessionName) clearPrefill();
  }, [prefilledSubjectId, prefilledSessionName]);

  useEffect(() => {
    const s = subjects.find(x => String(x.id) === String(selectedSubjectId));
    if (s) setSessionName(s.name);
  }, [selectedSubjectId, subjects]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  useEffect(() => {
    if (isTimerRunning && presetMode === 'EXAM_SIM') {
      const handler = (e) => {
        e.preventDefault();
        e.returnValue = 'Leaving now will fail the exam simulation.';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [isTimerRunning, presetMode]);

  const handlePresetChange = (preset) => {
    setPresetMode(preset);
    setSimApproved(false);
    const map = {
      STANDARD:    { f: 25,  sb: 5,  lb: 15, c: 4 },
      ULTRADIAN:   { f: 52,  sb: 17, lb: 17, c: 3 },
      COMPETITIVE: { f: 50,  sb: 10, lb: 15, c: 4 },
      EXAM_SIM:    { f: 180, sb: 0,  lb: 0,  c: 1 },
    };
    const v = map[preset];
    setFocusMinutes(v.f); setShortBreakMinutes(v.sb);
    setLongBreakMinutes(v.lb); setTotalCycles(v.c);
    setTimerSecondsLeft(v.f * 60);
  };

  const handlePhaseEnd = () => {
    if (currentPhase === 'FOCUS') {
      setAccumulatedCompletedSeconds(prev => prev + focusMinutes * 60);
      if (currentCycle >= totalCycles) {
        setIsTimerRunning(false);
        expectedEndTimeRef.current = null;
        setIsCompletedModalOpen(true);
        showToast('all cycles done! great work 🌸');
      } else {
        const isLong = currentCycle % 4 === 0;
        const breakSecs = isLong ? longBreakMinutes * 60 : shortBreakMinutes * 60;
        setCurrentPhase(isLong ? 'LONG_BREAK' : 'SHORT_BREAK');
        setTimerSecondsLeft(breakSecs);
        expectedEndTimeRef.current = Date.now() + breakSecs * 1000;
        showToast('focus done! take a break 🎀');
      }
    } else {
      const focusSecs = focusMinutes * 60;
      setCurrentPhase('FOCUS');
      setTimerSecondsLeft(focusSecs);
      setCurrentCycle(prev => prev + 1);
      expectedEndTimeRef.current = Date.now() + focusSecs * 1000;
      showToast('break over! back to focus ✿');
    }
  };

  const startTimer = () => {
    if (isTimerRunning) return;
    if (presetMode === 'EXAM_SIM' && !simApproved) { setShowSimWarning(true); return; }
    setIsTimerRunning(true);
    setIsSessionActive(true);
    expectedEndTimeRef.current = Date.now() + timerSecondsLeft * 1000;
  };

  const pauseTimer = () => {
    if (presetMode === 'EXAM_SIM') return;
    setIsTimerRunning(false);
    expectedEndTimeRef.current = null;
    setPausesCount(p => p + 1);
  };

  const skipPhase = () => { if (presetMode !== 'EXAM_SIM') handlePhaseEnd(); };

  useEffect(() => {
    if (!isTimerRunning) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    const tick = () => {
      if (!expectedEndTimeRef.current) return;
      const secsLeft = Math.max(0, Math.round((expectedEndTimeRef.current - Date.now()) / 1000));
      setTimerSecondsLeft(secsLeft);
      if (secsLeft <= 0) handlePhaseEnd();
    };
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isTimerRunning, currentPhase, currentCycle, focusMinutes, shortBreakMinutes, longBreakMinutes, totalCycles]);

  const stopTimer = () => {
    if (presetMode === 'EXAM_SIM') {
      if (confirm('Stopping will fail the exam simulation. Continue?')) {
        pauseTimer();
        setAccumulatedCompletedSeconds(focusMinutes * 60 - timerSecondsLeft);
        setIsCompletedModalOpen(true);
      }
      return;
    }
    pauseTimer();
    let total = accumulatedCompletedSeconds;
    if (currentPhase === 'FOCUS') total += (focusMinutes * 60 - timerSecondsLeft);
    if (total > 10) { setAccumulatedCompletedSeconds(total); setIsCompletedModalOpen(true); }
    else resetTimer();
  };

  const saveAndExit = () => {
    const completedSeconds = accumulatedCompletedSeconds;
    let focusScore = Math.max(0, 100 - pausesCount * 15);
    if (presetMode === 'EXAM_SIM' && completedSeconds < focusMinutes * 60) focusScore = 0;

    onSaveSession({
      label: sessionName || 'Study Session',
      durationMinutes: focusMinutes * totalCycles,
      completedDurationSeconds: completedSeconds,
      date: new Date().toISOString().split('T')[0],
      startTime: Date.now() - completedSeconds * 1000,
      endTime: Date.now(),
      isCompleted: completedSeconds >= focusMinutes * totalCycles * 60,
      notes: sessionNotesInput.trim() || null,
      tag: selectedTag || null,
      subjectId: selectedSubjectId || null,
      confidenceRating: sessionConfidence,
      focusScore
    });

    setIsCompletedModalOpen(false);
    resetTimer();
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setIsSessionActive(false);
    setTimerSecondsLeft(focusMinutes * 60);
    setCurrentPhase('FOCUS');
    setCurrentCycle(1);
    setAccumulatedCompletedSeconds(0);
    setSessionNotesInput('');
    setPausesCount(0);
    setSessionConfidence(3);
    setSimApproved(false);
    expectedEndTimeRef.current = null;
  };

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && isTimerRunning && expectedEndTimeRef.current) {
        const s = Math.max(0, Math.round((expectedEndTimeRef.current - Date.now()) / 1000));
        setTimerSecondsLeft(s);
        if (s <= 0) handlePhaseEnd();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isTimerRunning, currentPhase, currentCycle, focusMinutes, shortBreakMinutes, longBreakMinutes, totalCycles]);

  useEffect(() => { if (!isTimerRunning) setTimerSecondsLeft(focusMinutes * 60); }, [focusMinutes]);

  const formatClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const CIRCUM = 2 * Math.PI * 88;
  const totalSecs = focusMinutes * 60;
  const ringOffset = CIRCUM * (currentPhase === 'FOCUS' ? 1 - timerSecondsLeft / totalSecs : 1);

  return (
    <>
      {/* Main timer card */}
      <div className={`card timer-wrap ${isSessionActive ? 'immersive-active' : ''}`}>

        {/* Immersive floating details badge */}
        {isSessionActive && (
          <div className="floating-details-window">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {activeSubject && <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: activeSubject.colorHex, display: 'inline-block' }} />}
              <span style={{ fontWeight: 700, fontSize: 13, color: activeSubject?.colorHex || 'var(--ink)' }}>{activeSubject?.name || 'no subject'}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sessionName}</div>
            {selectedTag && <div style={{ fontSize: 11, color: 'var(--lilac-deep)', marginTop: 2 }}>#{selectedTag.toLowerCase()}</div>}
          </div>
        )}

        {/* Phase + time display */}
        <div className="pomo-display">
          <div className="pomo-phase">
            {currentPhase === 'FOCUS'
              ? (presetMode === 'EXAM_SIM' ? '📝 exam simulation' : '🎯 focus session')
              : currentPhase === 'SHORT_BREAK' ? '☕ short break' : '🌙 long break'}
          </div>
          <div className={`pomo-time ${currentPhase === 'FOCUS' ? 'focus' : 'break'}`}>
            {formatClock(timerSecondsLeft)}
          </div>
          <div className="pomo-cycle">cycle {currentCycle} / {totalCycles}</div>
        </div>

        {/* Cycle pips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '10px 0' }}>
          {Array.from({ length: totalCycles }).map((_, i) => (
            <div key={i} className={`pomo-pip${i + 1 < currentCycle ? ' done' : i + 1 === currentCycle && currentPhase === 'FOCUS' ? ' current' : ''}`} />
          ))}
        </div>

        {/* Controls */}
        <div className="pomo-controls">
          {isTimerRunning
            ? <button className="btn btn-mint" onClick={pauseTimer} disabled={presetMode === 'EXAM_SIM'}>⏸ pause</button>
            : <button className="btn btn-primary" onClick={startTimer}>▶ start ✨</button>
          }
          {isSessionActive && <>
            <button className="btn btn-secondary btn-sm" onClick={skipPhase} disabled={presetMode === 'EXAM_SIM'}>⏭ skip</button>
            <button className="btn btn-danger btn-sm" onClick={stopTimer}>⏹ stop</button>
          </>}
        </div>

        {/* Session info (when active) */}
        {isSessionActive && (
          <div className="session-info">
            <span>pauses: <b>{pausesCount}</b></span>
            <span>accumulated: <b>{Math.round(accumulatedCompletedSeconds / 60)}m</b></span>
          </div>
        )}

        {/* Config (pre-session only) */}
        {!isSessionActive && (
          <>
            <div className="section-sep" style={{ marginTop: 24 }}>
              <div className="line" /><div className="label">session config</div><div className="line" />
            </div>

            <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
              {/* Subject & session name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">subject</label>
                  <select className="input" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} style={{ borderRadius: 999 }}>
                    <option value="">no subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">session name</label>
                  <input className="input" value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="e.g. chapter 3…" />
                </div>
              </div>

              {/* Tag pills */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">tag</label>
                <div className="tag-row">
                  {['NEW_TOPIC', 'REVISION', 'PRACTICE', 'MOCK_TEST'].map(t => (
                    <button key={t} className={`tag-chip ${selectedTag === t ? 'active' : ''}`}
                      onClick={() => setSelectedTag(selectedTag === t ? '' : t)}>
                      {t.replace('_', ' ').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset mode */}
              <div className="setting-row">
                <span className="setting-label">preset mode</span>
                <select className="input-sm" style={{ width: 190, borderRadius: 999 }} value={presetMode} onChange={e => handlePresetChange(e.target.value)}>
                  <option value="STANDARD">Standard (25/5)</option>
                  <option value="ULTRADIAN">Ultradian (52/17)</option>
                  <option value="COMPETITIVE">Prep Mode (50/10)</option>
                  <option value="EXAM_SIM">Exam Simulation (3h)</option>
                </select>
              </div>

              {presetMode !== 'EXAM_SIM' && (<>
                <div className="setting-row">
                  <span className="setting-label">focus duration</span>
                  <div className="setting-control">
                    <button className="btn btn-secondary btn-xs" onClick={() => setFocusMinutes(p => Math.max(5, p - 5))}>−</button>
                    <span className="setting-val">{focusMinutes}m</span>
                    <button className="btn btn-secondary btn-xs" onClick={() => setFocusMinutes(p => p + 5)}>+</button>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">short break</span>
                  <div className="setting-control">
                    <button className="btn btn-secondary btn-xs" onClick={() => setShortBreakMinutes(p => Math.max(1, p - 1))}>−</button>
                    <span className="setting-val">{shortBreakMinutes}m</span>
                    <button className="btn btn-secondary btn-xs" onClick={() => setShortBreakMinutes(p => p + 1)}>+</button>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">long break</span>
                  <div className="setting-control">
                    <button className="btn btn-secondary btn-xs" onClick={() => setLongBreakMinutes(p => Math.max(5, p - 5))}>−</button>
                    <span className="setting-val">{longBreakMinutes}m</span>
                    <button className="btn btn-secondary btn-xs" onClick={() => setLongBreakMinutes(p => p + 5)}>+</button>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">target cycles</span>
                  <div className="setting-control">
                    <button className="btn btn-secondary btn-xs" onClick={() => setTotalCycles(p => Math.max(1, p - 1))}>−</button>
                    <span className="setting-val">{totalCycles}x</span>
                    <button className="btn btn-secondary btn-xs" onClick={() => setTotalCycles(p => p + 1)}>+</button>
                  </div>
                </div>
              </>)}
            </div>

            {/* Today's log */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const todaySess = sessions.filter(s => s.date === todayStr);
              if (todaySess.length === 0) return null;
              return (
                <>
                  <div className="section-sep" style={{ marginTop: 22 }}>
                    <div className="line" /><div className="label">today's sessions</div><div className="line" />
                  </div>
                  {todaySess.map(s => {
                    const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
                    return (
                      <div key={s.id} className="session-card">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="session-title">{s.label}</div>
                          {s.tag && <div className="session-meta">#{s.tag.toLowerCase()}</div>}
                        </div>
                        {subj && <span className="chip" style={{ border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, marginRight: 8 }}>{subj.name}</span>}
                        <div className="session-mins">{Math.round(s.completedDurationSeconds / 60)}m</div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Session complete modal */}
      {isCompletedModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">session finished! 🌸</div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>how did it feel? (confidence)</label>
              <div className="star-rating">
                {[1,2,3,4,5].map(star => (
                  <span key={star} className={`star ${star <= sessionConfidence ? 'active' : ''}`}
                    onClick={() => setSessionConfidence(star)}>★</span>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">study journal notes</label>
              <textarea className="input-rect" rows="3"
                placeholder="e.g. Revised Boolean algebra, completed K-Map practice sets…"
                value={sessionNotesInput} onChange={e => setSessionNotesInput(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setIsCompletedModalOpen(false); resetTimer(); }}>discard</button>
              <button className="btn btn-primary" onClick={saveAndExit}>save & exit ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* Exam simulation warning modal */}
      {showSimWarning && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div className="modal-header" style={{ color: '#c0392b' }}>⚠️ exam simulation lock</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: '12px 0', color: 'var(--ink-soft)' }}>
              Exam simulation mode locks the screen for <strong>3 hours</strong> without breaks.
              <br /><br />
              <strong>Pause and Skip are disabled.</strong> Leaving or stopping records a 0% focus score.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowSimWarning(false)}>cancel</button>
              <button className="btn btn-danger" onClick={() => {
                setSimApproved(true); setShowSimWarning(false);
                setIsTimerRunning(true); setIsSessionActive(true);
                expectedEndTimeRef.current = Date.now() + 180 * 60 * 1000;
              }}>confirm & lock</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ====================================================
// SYLLABUS VIEW
// ====================================================

function SyllabusView({ activeGoal, subjects, topics, showToast, setActiveTab }) {
  const [showAddSubj, setShowAddSubj] = useState(false);
  const [showAddTopicSubjId, setShowAddTopicSubjId] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [colorHex, setColorHex] = useState('#4D96FF');
  const [topicName, setTopicName] = useState('');
  const [expandedSubjId, setExpandedSubjId] = useState(null);
  const [activeAddSubTopicId, setActiveAddSubTopicId] = useState(null);
  const [subTopicName, setSubTopicName] = useState('');

  const colors = ['#4D96FF', '#FF6B6B', '#6BCB77', '#FFD93D', '#95CD41', '#F473B9', '#A855F7', '#F97316'];

  const handleAddSubject = () => {
    if (!subjectName.trim()) return;
    DataService.saveSubject({ name: subjectName.trim(), examGoalId: activeGoal?.id || 'local-goal', colorHex, sortOrder: subjects.length });
    showToast(`subject added: ${subjectName} ✿`);
    setSubjectName(''); setShowAddSubj(false);
  };

  const handleAddTopic = () => {
    if (!topicName.trim() || !showAddTopicSubjId) return;
    DataService.saveTopic({ name: topicName.trim(), subjectId: showAddTopicSubjId, status: 'NOT_STARTED', sortOrder: topics.filter(t => t.subjectId === showAddTopicSubjId).length, subTopics: [] });
    showToast(`topic added: ${topicName} ✿`);
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
      showToast('sub-topic deleted');
    }
  };

  const handleCycleSubTopicStatus = (topic, subTopicId) => {
    const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    DataService.saveTopic({ ...topic, subTopics: (topic.subTopics || []).map(sub => sub.id === subTopicId ? { ...sub, status: statuses[(statuses.indexOf(sub.status) + 1) % statuses.length] } : sub) });
  };

  const statusChipStyle = (status) => {
    const map = {
      NOT_STARTED:    { bg: 'var(--line)', color: 'var(--ink-soft)' },
      IN_PROGRESS:    { bg: 'var(--lilac-2)', color: 'var(--lilac-deep)' },
      COMPLETED:      { bg: '#d1fae5', color: '#059669' },
      NEEDS_REVISION: { bg: '#fef3c7', color: '#d97706' },
    };
    return map[status] || map.NOT_STARTED;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>📚 syllabus</div>
        {activeGoal && <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubj(true)}>+ add subject</button>}
      </div>

      {!activeGoal ? (
        <div className="empty">set an exam goal first ✿<br /><button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setActiveTab('account')}>go to account →</button></div>
      ) : subjects.length === 0 ? (
        <div className="empty">syllabus is empty — add a subject 🌸<br /><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddSubj(true)}>add subject</button></div>
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
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>{isExpanded ? ' ▲' : ' ▼'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="progress-mini">{(rate * 100).toFixed(0)}% · {completed}/{subjTopics.length}</span>
                  <button className="del-btn" onClick={() => { if (confirm('Delete subject and all topics?')) { DataService.deleteSubject(s.id); showToast('subject deleted'); } }}>✕</button>
                </div>
              </div>
              <div className="progress-bar-bg" style={{ marginBottom: 12 }}>
                <div className="progress-bar-fill" style={{ width: `${rate * 100}%`, background: s.colorHex }} />
              </div>
              {isExpanded && (
                <div style={{ marginTop: 8 }}>
                  {subjTopics.length === 0
                    ? <p style={{ color: 'var(--ink-soft)', fontSize: 13, textAlign: 'center', padding: 8 }}>no topics yet — add one below!</p>
                    : subjTopics.map(t => {
                        const sc = statusChipStyle(t.status);
                        const statusLabel = t.status.toLowerCase().replace('_', ' ');
                        return (
                          <div key={t.id} style={{ padding: '10px 14px', background: '#fff', border: '2px solid var(--line)', borderRadius: 16, marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span className="chip" style={{ background: sc.bg, color: sc.color, border: `1.5px solid ${sc.color}`, cursor: 'pointer', fontSize: 11 }}
                                  onClick={() => handleCycleStatus(t)}>{statusLabel}</span>
                                <button className="btn btn-secondary btn-xs" onClick={() => { setActiveAddSubTopicId(activeAddSubTopicId === t.id ? null : t.id); setSubTopicName(''); }}>+ sub</button>
                                <button className="del-btn" onClick={() => { DataService.deleteTopic(t.id); showToast('topic deleted'); }}>✕</button>
                              </div>
                            </div>
                            {(t.subTopics || []).map(sub => {
                              const ssc = statusChipStyle(sub.status);
                              return (
                                <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px 5px 20px', borderLeft: `2px solid ${s.colorHex}`, marginLeft: 8, marginTop: 6 }}>
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
                                <input className="input-sm" style={{ flex: 1 }} value={subTopicName} onChange={e => setSubTopicName(e.target.value)} placeholder="sub-topic name…" onKeyDown={e => e.key === 'Enter' && handleAddSubTopic(t)} autoFocus />
                                <button className="btn btn-secondary btn-xs" onClick={() => handleAddSubTopic(t)}>add</button>
                                <button className="btn btn-secondary btn-xs" onClick={() => { setActiveAddSubTopicId(null); setSubTopicName(''); }}>✕</button>
                              </div>
                            )}
                          </div>
                        );
                      })
                  }
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddTopicSubjId(s.id)}>+ add topic</button>
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
            <div className="modal-header">add subject ✨</div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">subject name</label>
              <input className="input" placeholder="e.g. Digital Logic, Maths…" value={subjectName} onChange={e => setSubjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">choose color</label>
              <div className="color-picker">
                {colors.map(c => <div key={c} className={`color-option ${colorHex === c ? 'selected' : ''}`} style={{ backgroundColor: c }} onClick={() => setColorHex(c)} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddSubj(false)}>cancel</button>
              <button className="btn btn-primary" onClick={handleAddSubject}>add ✿</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showAddTopicSubjId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">add topic 📖</div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">topic name</label>
              <input className="input" placeholder="e.g. Minimization using K-Maps…" value={topicName} onChange={e => setTopicName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTopic()} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddTopicSubjId(null)}>cancel</button>
              <button className="btn btn-primary" onClick={handleAddTopic}>add ✿</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================
// HISTORY VIEW
// ====================================================

function HistoryView({ sessions, subjects, onDeleteSession, showToast }) {
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(s => {
    const matchSub = filterSubjectId ? String(s.subjectId) === String(filterSubjectId) : true;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchSub;
    return matchSub && ((s.label || '').toLowerCase().includes(q) || (s.notes || '').toLowerCase().includes(q) || (s.tag || '').toLowerCase().includes(q));
  });

  const sorted = [...filteredSessions].sort((a, b) => b.startTime - a.startTime);
  const todayStr = new Date().toISOString().split('T')[0];
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const yesterdayStr = yest.toISOString().split('T')[0];

  const groups = [
    { label: 'today 🌸',    items: sorted.filter(s => s.date === todayStr) },
    { label: 'yesterday ✨', items: sorted.filter(s => s.date === yesterdayStr) },
    { label: 'earlier ☁️',  items: sorted.filter(s => s.date !== todayStr && s.date !== yesterdayStr) },
  ].filter(g => g.items.length > 0);

  const renderCard = (s) => {
    const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
    const timeStr = new Date(s.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const mins = Math.round(s.completedDurationSeconds / 60);
    return (
      <div key={s.id} className="session-card">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            <div className="session-title" style={{ flex: '0 0 auto' }}>{s.label}</div>
            {s.confidenceRating && <span style={{ fontSize: 12, color: 'var(--sun-deep)' }}>{'★'.repeat(s.confidenceRating)}{'☆'.repeat(5 - s.confidenceRating)}</span>}
          </div>
          <div className="session-meta">
            {timeStr}
            {s.tag && <span style={{ color: 'var(--lilac-deep)', marginLeft: 8 }}>#{s.tag.toLowerCase()}</span>}
            {subj && <span className="chip" style={{ marginLeft: 8, border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 11 }}>{subj.name}</span>}
            {s.focusScore !== undefined && <span className="chip chip-lilac" style={{ marginLeft: 8, fontSize: 10 }}>focus {s.focusScore}%</span>}
          </div>
          {s.notes && <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--cream)', padding: '5px 10px', borderRadius: 10, marginTop: 6, border: '1px solid var(--line)' }}>{s.notes}</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <div className="session-mins">{mins}m</div>
          <button className="del-btn" onClick={() => { if (confirm('Delete this session?')) onDeleteSession(s.id); }}>✕</button>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>📋 history</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input-sm" style={{ width: 160 }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="search…" />
          {subjects.length > 0 && (
            <select className="input-sm" style={{ width: 140 }} value={filterSubjectId} onChange={e => setFilterSubjectId(e.target.value)}>
              <option value="">all subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {filteredSessions.length === 0
        ? <div className="empty">no sessions recorded yet ✿<br />complete a session to see it here!</div>
        : groups.map(g => (
            <div key={g.label} style={{ marginBottom: 18 }}>
              <div className="history-section-label">{g.label}</div>
              {g.items.map(renderCard)}
            </div>
          ))
      }
    </div>
  );
}

// ====================================================
// ANALYTICS VIEW
// ====================================================

function AnalyticsView({ sessions, subjects, topics, activeGoal, mockTests, onSaveMockTest, onDeleteMockTest, streak, showToast }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const wowDelta = React.useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const curStart = new Date(today); curStart.setDate(today.getDate() - 6);
    const prevEnd  = new Date(today); prevEnd.setDate(today.getDate() - 7);
    const prevStart= new Date(today); prevStart.setDate(today.getDate() - 13);
    const cur  = sessions.filter(s => { const d = new Date(s.date); return d >= curStart && d <= today; });
    const prev = sessions.filter(s => { const d = new Date(s.date); return d >= prevStart && d <= prevEnd; });
    const curH  = cur.reduce((a,s) => a + s.completedDurationSeconds, 0) / 3600;
    const prevH = prev.reduce((a,s) => a + s.completedDurationSeconds, 0) / 3600;
    const delta = prevH > 0 ? ((curH - prevH) / prevH) * 100 : 0;
    return { curH, prevH, delta };
  }, [sessions]);

  const weaknessStats = React.useMemo(() => {
    const stats = {};
    subjects.forEach(s => { stats[s.id] = { subject: s, totalSeconds: 0, ratings: [], hardCount: 0 }; });
    sessions.forEach(s => {
      if (s.subjectId && stats[s.subjectId]) {
        stats[s.subjectId].totalSeconds += s.completedDurationSeconds;
        if (s.confidenceRating) {
          stats[s.subjectId].ratings.push(s.confidenceRating);
          if (s.confidenceRating <= 2) stats[s.subjectId].hardCount++;
        }
      }
    });
    const list = Object.values(stats).map(o => ({
      subject: o.subject,
      hours: o.totalSeconds / 3600,
      avgConfidence: o.ratings.length > 0 ? o.ratings.reduce((a,b) => a+b,0) / o.ratings.length : null,
      hardCount: o.hardCount,
      ratingsCount: o.ratings.length
    })).filter(i => i.hours > 0 || i.ratingsCount > 0);

    const weakSpots = [...list].filter(x => x.hours > 0 && x.avgConfidence !== null)
      .sort((a,b) => (b.hours/(b.avgConfidence||1)) - (a.hours/(a.avgConfidence||1)));
    const priorityQueue = [...list].filter(x => x.hardCount > 0)
      .sort((a,b) => (b.hardCount/(b.hours||.1)) - (a.hardCount/(a.hours||.1)));
    return { weakSpots, priorityQueue };
  }, [sessions, subjects]);

  const weeks = React.useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
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

  const monthLabels = React.useMemo(() => {
    const labels = []; let last = '';
    weeks.forEach((week, wIdx) => {
      const mn = week[3].toLocaleDateString(undefined, { month: 'short' });
      if (mn !== last) { labels.push({ text: mn, colIndex: wIdx }); last = mn; }
    });
    return labels;
  }, [weeks]);

  const startDate = React.useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-364); return d; }, []);
  const today     = React.useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const pad = (n) => String(n).padStart(2, '0');

  const getPieData = () => {
    const tots = {};
    sessions.forEach(s => { if (s.subjectId && s.completedDurationSeconds > 0) tots[s.subjectId] = (tots[s.subjectId]||0) + s.completedDurationSeconds; });
    return Object.keys(tots).map(id => {
      const s = subjects.find(x => String(x.id) === String(id));
      return { name: s ? s.name : 'Unknown', value: Math.round(tots[id]/60), color: s ? s.colorHex : '#888' };
    }).filter(x => x.value > 0);
  };
  const pieData = getPieData();

  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const hours = sessions.filter(s => s.date === iso).reduce((a,s) => a + s.completedDurationSeconds, 0) / 3600;
    return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), hours: parseFloat(hours.toFixed(1)) };
  });

  const getDaySessions = (date) => {
    if (!date) return [];
    const iso = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
    return sessions.filter(s => s.date === iso);
  };

  return (
    <>
      {/* Bar chart */}
      <div className="card">
        <div className="card-title">📊 study time — last 7 days</div>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="day" stroke="var(--ink-soft)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--ink-soft)" fontSize={11} tickFormatter={v => `${v}h`} tickLine={false} axisLine={false} />
              <Tooltip formatter={v => [`${v} hours`, 'Studied']} contentStyle={{ background: '#fff', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '3px 3px 0 var(--ink)', fontFamily: 'Fredoka, sans-serif', color: 'var(--ink)' }} cursor={{ fill: 'var(--pink-2)' }} />
              <Bar dataKey="hours" fill="url(#barGrad)" radius={[8,8,0,0]}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff9ecf" /><stop offset="100%" stopColor="#c8a8ff" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution + WoW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🍩 subject split</div>
          {pieData.length > 0 ? (
            <div className="chart-distribution-layout">
              <div className="chart-pie-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                      {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v} mins`} contentStyle={{ background: '#fff', border: '2px solid var(--ink)', borderRadius: 12, fontFamily: 'Fredoka, sans-serif' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend-wrapper">
                {pieData.map((item,i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 4, borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                    <span style={{ color: 'var(--ink-soft)', flexShrink: 0 }}>{item.value}m</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="empty" style={{ fontSize: 15 }}>no subject sessions yet ✿</div>}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">📈 week vs week</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'this week', value: `${wowDelta.curH.toFixed(1)}h` },
              { label: 'prev week', value: `${wowDelta.prevH.toFixed(1)}h` },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1.5px dashed var(--line)', fontSize: 14 }}>
                <span style={{ color: 'var(--ink-soft)' }}>{r.label}</span>
                <strong>{r.value}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, fontSize: 14 }}>
              <span style={{ color: 'var(--ink-soft)' }}>delta</span>
              <strong style={{ color: wowDelta.delta >= 0 ? '#059669' : '#c0392b', fontSize: 18 }}>
                {wowDelta.delta >= 0 ? '▲' : '▼'} {Math.abs(wowDelta.delta).toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="card">
        <div className="card-title">🗓 activity heatmap</div>
        <div className="github-heatmap-wrapper">
          <div className="github-heatmap-inner">
            <div className="github-heatmap-months">
              {monthLabels.map((lbl,i) => <div key={i} className="github-heatmap-month-label" style={{ gridColumn: `${lbl.colIndex + 2} / span 4` }}>{lbl.text}</div>)}
            </div>
            <div className="github-heatmap-grid">
              <span className="github-heatmap-weekday-label" style={{ gridRow: 2, gridColumn: 1 }}>Mon</span>
              <span className="github-heatmap-weekday-label" style={{ gridRow: 4, gridColumn: 1 }}>Wed</span>
              <span className="github-heatmap-weekday-label" style={{ gridRow: 6, gridColumn: 1 }}>Fri</span>
              {weeks.flatMap((week, wIdx) =>
                week.map((day, dIdx) => {
                  if (day < startDate || day > today) return <div key={`${wIdx}-${dIdx}`} className="github-heatmap-cell empty" style={{ gridRow: dIdx+1, gridColumn: wIdx+2 }} />;
                  const iso = `${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}`;
                  const secs = sessions.filter(s => s.date === iso).reduce((a,s) => a + s.completedDurationSeconds, 0);
                  const level = secs === 0 ? 0 : secs < 1800 ? 1 : secs < 3600 ? 2 : secs < 7200 ? 3 : 4;
                  return (
                    <div key={`${wIdx}-${dIdx}`} className={`github-heatmap-cell level-${level}`}
                      style={{ gridRow: dIdx+1, gridColumn: wIdx+2 }}
                      title={`${day.toLocaleDateString(undefined,{month:'short',day:'numeric'})}: ${(secs/3600).toFixed(1)}h`}
                      onClick={() => setSelectedDate(day)} />
                  );
                })
              )}
            </div>
          </div>
          <div className="github-heatmap-legend">
            <span>Less</span>
            {[0,1,2,3,4].map(l => <div key={l} className={`github-heatmap-legend-cell level-${l}`} />)}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Mock tests */}
      <MockTestSection mockTests={mockTests} subjects={subjects} topics={topics} activeGoal={activeGoal} onSave={onSaveMockTest} onDelete={onDeleteMockTest} showToast={showToast} />

      {/* Weakness */}
      <div className="card">
        <div className="card-title">⚠️ weak spots</div>
        {weaknessStats.weakSpots.length === 0
          ? <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>log sessions with confidence ratings to unlock weakness analysis ✿</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontWeight: 600, color: 'var(--red)', fontSize: 13 }}>studied often but rated hard:</p>
              {weaknessStats.weakSpots.slice(0,3).map(ws => (
                <div key={ws.subject.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#fff', border: '2px solid var(--line)', borderRadius: 14, fontSize: 13 }}>
                  <span style={{ color: ws.subject.colorHex, fontWeight: 700 }}>{ws.subject.name}</span>
                  <span style={{ color: 'var(--ink-soft)' }}>{ws.hours.toFixed(1)}h · {ws.avgConfidence?.toFixed(1)}★ avg</span>
                </div>
              ))}
              {weaknessStats.priorityQueue.length > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--lilac-2)', border: '2px solid var(--lilac-deep)', borderRadius: 14, fontSize: 13, marginTop: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--lilac-deep)' }}>💡 priority: </span>
                  {weaknessStats.priorityQueue[0].subject.name} was rated hard {weaknessStats.priorityQueue[0].hardCount}× — dedicate more sessions here!
                </div>
              )}
            </div>
          )
        }
      </div>

      {/* Day drill-down modal */}
      {selectedDate && (() => {
        const ds = getDaySessions(selectedDate);
        const totalH = (ds.reduce((a,s) => a + s.completedDurationSeconds, 0) / 3600).toFixed(1);
        return (
          <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div className="modal-header" style={{ marginBottom: 2 }}>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{totalH}h total</div>
                </div>
                <button className="del-btn" style={{ fontSize: 20 }} onClick={() => setSelectedDate(null)}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {ds.length === 0
                  ? <p style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '20px 0' }}>no sessions on this day ✿</p>
                  : ds.map(s => {
                      const timeStr = new Date(s.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                      const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
                      return (
                        <div key={s.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#fff', border: '2px solid var(--line)', borderRadius: 14 }}>
                          <span style={{ fontSize: 12, color: 'var(--ink-soft)', minWidth: 44 }}>{timeStr}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                            {subj && <span className="chip" style={{ marginTop: 3, border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 10 }}>{subj.name}</span>}
                          </div>
                          <div className="session-mins" style={{ fontSize: 14 }}>{Math.round(s.completedDurationSeconds/60)}m</div>
                        </div>
                      );
                    })
                }
              </div>
              <div style={{ textAlign: 'right', marginTop: 14 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(null)}>close</button>
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
  const [expandedId, setExpandedId] = useState(null);
  const [filterSubject, setFilterSubject] = useState(null);
  const [filterTopic, setFilterTopic] = useState(null);
  const [testName, setTestName] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [topicId, setTopicId] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [totalQ, setTotalQ] = useState('');
  const [att1, setAtt1] = useState('');
  const [att2, setAtt2] = useState('');
  const [notAtt, setNotAtt] = useState('');
  const [correctM, setCorrectM] = useState('');
  const [penaltyM, setPenaltyM] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [timeTaken, setTimeTaken] = useState('');

  const netMarks = (parseFloat(correctM)||0) - (parseFloat(penaltyM)||0);

  useEffect(() => { if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id); }, [subjects]);
  useEffect(() => { setTopicId(''); }, [subjectId]);

  const topicsForSubject = topics?.filter(t => String(t.subjectId) === String(subjectId)) || [];

  if (!activeGoal) return (
    <div className="card">
      <div className="card-title">🏆 practice tests</div>
      <div className="empty">set an active goal to track tests ✿</div>
    </div>
  );

  const goalTests = mockTests.filter(t => String(t.examGoalId) === String(activeGoal.id)).sort((a,b) => new Date(a.date) - new Date(b.date));
  const topicsForFilter = topics?.filter(t => String(t.subjectId) === String(filterSubject)) || [];
  const filteredTests = goalTests.filter(t => {
    if (filterTopic) return String(t.topicId) === String(filterTopic);
    if (filterSubject) return String(t.subjectId) === String(filterSubject);
    return true;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!testName || !subjectId) return;
    const obtained = parseFloat(obtainedMarks)||0, total = parseFloat(totalMarks)||100;
    onSave({ examGoalId: activeGoal.id, subjectId, topicId: topicId||null, testName, scorePercentage: total>0?(obtained/total)*100:0,
      obtainedMarks: obtained, totalMarks: total, correctMarks: parseFloat(correctM)||0, penaltyMarks: parseFloat(penaltyM)||0,
      netMarks, totalQuestions: parseInt(totalQ)||0, attempted1Mark: parseInt(att1)||0, attempted2Mark: parseInt(att2)||0,
      notAttempted: parseInt(notAtt)||0, totalTimeMinutes: parseInt(totalTime)||0, timeTakenMinutes: parseInt(timeTaken)||0, notes, date, createdAt: Date.now() });
    setTestName(''); setObtainedMarks(''); setTotalMarks(''); setNotes('');
    setTotalQ(''); setAtt1(''); setAtt2(''); setNotAtt('');
    setCorrectM(''); setPenaltyM(''); setTotalTime(''); setTimeTaken(''); setTopicId('');
    setShowAddForm(false);
  };

  const chartData = filteredTests.map(t => ({ date: new Date(t.date).toLocaleDateString(undefined,{month:'short',day:'numeric'}), score: Math.round(t.scorePercentage), name: t.testName }));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>🏆 practice tests</div>
        {subjects.length > 0 && !showAddForm && <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>+ log result</button>}
      </div>

      {showAddForm ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">test name *</label>
            <input className="input" value={testName} onChange={e => setTestName(e.target.value)} required placeholder="e.g. Number Series Mock #3" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">subject</label>
              <select className="input-sm" style={{ borderRadius: 999 }} value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {topicsForSubject.length > 0 && (
              <div className="form-group">
                <label className="form-label">topic</label>
                <select className="input-sm" style={{ borderRadius: 999 }} value={topicId} onChange={e => setTopicId(e.target.value)}>
                  <option value="">— none —</option>
                  {topicsForSubject.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">date</label>
              <input className="input-sm" type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ borderRadius: 999 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">obtained marks</label><input className="input-sm" style={{ borderRadius: 999 }} type="number" step="any" value={obtainedMarks} onChange={e => setObtainedMarks(e.target.value)} placeholder="72" /></div>
            <div className="form-group"><label className="form-label">total marks</label><input className="input-sm" style={{ borderRadius: 999 }} type="number" step="any" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} placeholder="100" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">correct (+)</label><input className="input-sm" style={{ borderRadius: 999 }} type="number" step="any" value={correctM} onChange={e => setCorrectM(e.target.value)} placeholder="2.0" /></div>
            <div className="form-group"><label className="form-label">penalty (−)</label><input className="input-sm" style={{ borderRadius: 999 }} type="number" step="any" value={penaltyM} onChange={e => setPenaltyM(e.target.value)} placeholder="0.5" /></div>
            <div className="form-group"><label className="form-label">net (auto)</label><div className="input-sm" style={{ borderRadius: 999, color: netMarks >= 0 ? '#059669' : '#c0392b', fontWeight: 700, display: 'flex', alignItems: 'center', cursor: 'default' }}>{(correctM||penaltyM) ? netMarks.toFixed(2) : '—'}</div></div>
          </div>
          <div className="form-group">
            <label className="form-label">notes</label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="weak areas, observations…" />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>cancel</button>
            <button type="submit" className="btn btn-primary">save result 🌸</button>
          </div>
        </form>
      ) : (
        <>
          {/* Subject filter */}
          {subjects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <button className={`tag-chip ${!filterSubject ? 'active' : ''}`} onClick={() => { setFilterSubject(null); setFilterTopic(null); }}>all</button>
              {subjects.map(s => (
                <button key={s.id} className={`tag-chip ${filterSubject === s.id ? 'active' : ''}`} style={{ borderColor: s.colorHex, color: filterSubject === s.id ? '#fff' : s.colorHex, background: filterSubject === s.id ? s.colorHex : 'transparent' }}
                  onClick={() => { setFilterSubject(filterSubject === s.id ? null : s.id); setFilterTopic(null); }}>{s.name}</button>
              ))}
            </div>
          )}
          {filterSubject && topicsForFilter.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10, paddingLeft: 8 }}>
              <button className={`tag-chip ${!filterTopic ? 'active' : ''}`} onClick={() => setFilterTopic(null)}>all topics</button>
              {topicsForFilter.map(t => <button key={t.id} className={`tag-chip ${filterTopic === t.id ? 'active' : ''}`} onClick={() => setFilterTopic(filterTopic === t.id ? null : t.id)}>{t.name}</button>)}
            </div>
          )}

          {/* Score trend */}
          {chartData.length > 0 && (
            <div style={{ height: 100, marginBottom: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="var(--ink-soft)" fontSize={9} tickLine={false} />
                  <YAxis stroke="var(--ink-soft)" fontSize={9} tickLine={false} domain={[0,100]} unit="%" />
                  <Tooltip contentStyle={{ background: '#fff', border: '2px solid var(--ink)', borderRadius: 12, fontFamily: 'Fredoka, sans-serif', fontSize: 11 }} />
                  <Line type="monotone" dataKey="score" stroke="var(--pink-deep)" strokeWidth={2.5} dot={{ fill: 'var(--pink-deep)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Test cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredTests.slice().reverse().map(t => {
              const subj = subjects.find(s => String(s.id) === String(t.subjectId));
              const score = Math.round(t.scorePercentage);
              const scoreColor = score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#c0392b';
              return (
                <div key={t.id} style={{ background: '#fff', border: '2px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                        {subj && <span className="chip" style={{ border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 11 }}>{subj.name}</span>}
                        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t.date}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.testName}</div>
                      <div style={{ color: 'var(--ink-soft)', fontSize: 12, marginTop: 2 }}>{t.obtainedMarks}/{t.totalMarks} marks</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: scoreColor, fontSize: 18 }}>{score}%</span>
                      <button className="del-btn" onClick={() => onDelete(t.id)}>✕</button>
                    </div>
                  </div>
                  {t.notes && <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>📝 {t.notes}</div>}
                </div>
              );
            })}
            {filteredTests.length === 0 && <div className="empty" style={{ fontSize: 15 }}>no tests recorded — tap log result to start ✿</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ====================================================
// ACCOUNT VIEW
// ====================================================

function AccountView({ user, examGoals, lastSyncTime, onSaveGoal, onDeleteGoal, onSetActiveGoal, showToast }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [targetMins, setTargetMins] = useState(360);

  const handleLogin = async () => {
    if (!auth) { alert('Firebase not configured. Add VITE_FIREBASE_API_KEY env vars to enable cloud sync.'); return; }
    try { await signInWithPopup(auth, googleProvider); showToast('signed in ✨'); }
    catch (e) { console.error(e); alert('Login failed: ' + e.message); }
  };

  const handleLogout = async () => {
    if (auth) { await signOut(auth); showToast('signed out'); }
  };

  const handleSaveGoal = () => {
    if (!goalName.trim() || !goalDate) return;
    onSaveGoal({ name: goalName.trim(), examDate: goalDate, dailyTargetMinutes: targetMins, isActive: examGoals.length === 0, createdAt: Date.now() });
    setGoalName(''); setGoalDate(''); setShowAddGoal(false);
  };

  const exportData = () => {
    const keys = ['focusly_exam_goals','focusly_subjects','focusly_topics','focusly_sessions','focusly_mock_tests'];
    const data = Object.fromEntries(keys.map(k => [k.replace('focusly_',''), JSON.parse(localStorage.getItem(k)||'[]')]));
    const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `focusly_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('export complete ✨');
  };

  const clearData = () => {
    if (confirm('Clear ALL local study data? This cannot be undone!')) {
      localStorage.clear(); showToast('data cleared, reloading…');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="card">
      <div className="card-title">☁️ account & settings</div>

      {/* Sync status */}
      <div style={{ marginBottom: 18 }}>
        {[
          { key: 'sync status', val: user ? 'connected ✅' : 'offline (local mode) 📦', color: user ? '#059669' : '#d97706' },
          { key: 'account',    val: user ? user.email : 'local guest' },
          { key: 'database',   val: user ? 'firestore' : 'localStorage' },
          ...(lastSyncTime ? [{ key: 'last sync', val: lastSyncTime }] : []),
        ].map(r => (
          <div key={r.key} className="account-info-row">
            <span className="account-info-key">{r.key}</span>
            <span className="account-info-val" style={r.color ? { color: r.color } : {}}>{r.val}</span>
          </div>
        ))}
      </div>

      {/* Google sign in */}
      <div className="section-sep"><div className="line"/><div className="label">cloud sync</div><div className="line"/></div>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.6 }}>link a google account to sync across devices ✿</p>
      {user
        ? <button className="btn btn-danger w-full" style={{ justifyContent: 'center', marginBottom: 20 }} onClick={handleLogout}>sign out</button>
        : <button className="btn btn-primary w-full" style={{ justifyContent: 'center', marginBottom: 20 }} onClick={handleLogin}>sign in with google ✨</button>
      }

      {/* Exam goals */}
      <div className="section-sep"><div className="line"/><div className="label">exam goals</div><div className="line"/></div>
      {examGoals.length === 0
        ? <div className="empty" style={{ fontSize: 16, marginBottom: 12 }}>no goals yet ✿</div>
        : <div style={{ marginBottom: 14 }}>
            {examGoals.map(g => (
              <div key={g.id} className={`goal-card ${g.isActive ? 'active' : ''}`}>
                <div>
                  <div className="goal-card-name">{g.name} {g.isActive && <span className="chip chip-lilac" style={{ fontSize: 11 }}>active</span>}</div>
                  <div className="goal-card-meta">{g.examDate} · {(g.dailyTargetMinutes/60).toFixed(1)}h/day goal</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!g.isActive && <button className="btn btn-secondary btn-xs" onClick={() => onSetActiveGoal(g.id)}>activate</button>}
                  <button className="del-btn" onClick={() => onDeleteGoal(g.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
      }
      <button className="btn btn-secondary w-full" style={{ justifyContent: 'center', marginBottom: 20 }} onClick={() => setShowAddGoal(true)}>+ add exam goal</button>

      {/* Data management */}
      <div className="section-sep"><div className="line"/><div className="label">data</div><div className="line"/></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={exportData}>export backup ✨</button>
        <button className="btn btn-danger btn-sm"    style={{ flex: 1, justifyContent: 'center' }} onClick={clearData}>clear cache</button>
      </div>

      {/* Add goal modal */}
      {showAddGoal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">new exam target 🎯</div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">exam name</label>
              <input className="input" placeholder="e.g. GATE 2027 CSE" value={goalName} onChange={e => setGoalName(e.target.value)} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">target date</label>
              <input className="input" type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">daily study target</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setTargetMins(p => Math.max(60, p-30))}>−30m</button>
                <span style={{ fontSize: 18, fontWeight: 700, minWidth: 80, textAlign: 'center' }}>{(targetMins/60).toFixed(1)} hrs</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setTargetMins(p => p+30)}>+30m</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddGoal(false)}>cancel</button>
              <button className="btn btn-primary" onClick={handleSaveGoal}>create 🎀</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================
// MISTAKES VIEW
// ====================================================

function MistakesView({ subjects, mistakes, onSaveMistake, onDeleteMistake, showToast }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [topicName, setTopicName] = useState('');
  const [whatWentWrong, setWhatWentWrong] = useState('');
  const [correctApproach, setCorrectApproach] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id); }, [subjects]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subjectId || !topicName.trim() || !whatWentWrong.trim() || !correctApproach.trim()) return;
    onSaveMistake({ subjectId, topicName: topicName.trim(), whatWentWrong: whatWentWrong.trim(), correctApproach: correctApproach.trim(), date: new Date().toISOString().split('T')[0], createdAt: Date.now() });
    setTopicName(''); setWhatWentWrong(''); setCorrectApproach('');
  };

  const filtered = mistakes.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const subj = subjects.find(s => String(s.id) === String(m.subjectId));
    return (m.topicName||'').toLowerCase().includes(q) || (m.whatWentWrong||'').toLowerCase().includes(q) || (m.correctApproach||'').toLowerCase().includes(q) || (subj?.name||'').toLowerCase().includes(q);
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>✍️ mistake log</div>
        <input className="input-sm" style={{ width: 200 }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="search mistakes…" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 22 }}>
        {/* Form */}
        <div style={{ borderRight: '1.5px dashed var(--line)', paddingRight: 20 }}>
          <div className="card-title" style={{ fontSize: 16, marginBottom: 14 }}>log new mistake ✍️</div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">subject</label>
              <select className="input-sm" style={{ borderRadius: 999 }} value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">topic / context</label>
              <input className="input-sm" style={{ borderRadius: 999 }} placeholder="e.g. Optics — Snell's Law" value={topicName} onChange={e => setTopicName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">what went wrong?</label>
              <textarea className="input-rect" rows="3" placeholder="describe the error…" value={whatWentWrong} onChange={e => setWhatWentWrong(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">correct approach</label>
              <textarea className="input-rect" rows="3" placeholder="what is the right way?" value={correctApproach} onChange={e => setCorrectApproach(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }}>save log ✨</button>
          </form>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', maxHeight: 580 }}>
          {filtered.length === 0
            ? <div className="empty">no mistakes logged yet ✿<br />keep learning!</div>
            : filtered.map(m => {
                const subj = subjects.find(s => String(s.id) === String(m.subjectId));
                return (
                  <div key={m.id} className="mistake-card">
                    <div className="mistake-header">
                      <div>
                        {subj && <span className="chip" style={{ border: `1.5px solid ${subj.colorHex}`, color: subj.colorHex, background: `${subj.colorHex}20`, fontSize: 11, marginBottom: 4, display: 'inline-flex' }}>{subj.name}</span>}
                        <div className="mistake-label">{m.topicName}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 1 }}>{m.date}</div>
                      </div>
                      <button className="del-btn" onClick={() => onDeleteMistake(m.id)}>✕</button>
                    </div>
                    <div className="mistake-block mistake-wrong">
                      <strong style={{ color: 'var(--red)', display: 'block', marginBottom: 3 }}>✗ mistake</strong>
                      {m.whatWentWrong}
                    </div>
                    <div className="mistake-block mistake-fix">
                      <strong style={{ color: '#059669', display: 'block', marginBottom: 3 }}>✓ fix / solution</strong>
                      {m.correctApproach}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
