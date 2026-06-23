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
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('focusly_theme') || 'midnight');

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
    const unsubAuth = DataService.subscribeToAuth(setUser);
    const unsubGoals = DataService.subscribeToExamGoals(setExamGoals);
    const unsubSubjects = DataService.subscribeToSubjects(setSubjects);
    const unsubTopics = DataService.subscribeToTopics(setTopics);
    const unsubSessions = DataService.subscribeToSessions(setSessions);
    const unsubMockTests = DataService.subscribeToMockTests(setMockTests);
    const unsubLastSync = DataService.subscribeToLastSyncTime(setLastSyncTime);

    return () => {
      unsubAuth();
      unsubGoals();
      unsubSubjects();
      unsubTopics();
      unsubSessions();
      unsubMockTests();
      unsubLastSync();
    };
  }, []);

  // Update theme classes on body
  useEffect(() => {
    const THEMES = ['midnight', 'ocean', 'forest', 'paper', 'sakura', 'aurora', 'ember', 'lavender', 'mint'];
    THEMES.forEach(t => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('focusly_theme', theme);
  }, [theme]);

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
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6) {
        const tabs = ['dashboard', 'timer', 'syllabus', 'history', 'analytics', 'account'];
        setActiveTab(tabs[num - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeGoal = examGoals.find(g => g.isActive) || null;

  // Stats computed for top bar Waybar display
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr);
  const todaySeconds = todaySessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);
  const todayHours = (todaySeconds / 3600).toFixed(1);

  const currentStreak = (() => {
    const dates = new Set(sessions.filter(s => s.completedDurationSeconds > 0).map(s => s.date));
    let streak = 0;
    let d = new Date();
    const todayISO = d.toISOString().split('T')[0];
    if (!dates.has(todayISO)) {
      d.setDate(d.getDate() - 1);
    }
    while (dates.has(d.toISOString().split('T')[0])) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  return (
    <div className="app-container">
      {/* WAYBAR TOP BAR */}
      <div className="waybar">
        <div className="waybar-left">
          <span className="bar-logo">⌘ focusly</span>
          <div className="bar-separator"></div>
          <button className={`ws-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="overview">1</button>
          <button className={`ws-btn ${activeTab === 'timer' ? 'active' : ''}`} onClick={() => setActiveTab('timer')} title="timer">2</button>
          <button className={`ws-btn ${activeTab === 'syllabus' ? 'active' : ''}`} onClick={() => setActiveTab('syllabus')} title="syllabus">3</button>
          <button className={`ws-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} title="history">4</button>
          <button className={`ws-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} title="analytics">5</button>
          <button className={`ws-btn ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')} title="account">6</button>
        </div>
        <div className="waybar-center">
          <div className="bar-module">
            <span className="icon">◉</span>
            <span className="val">{currentStreak} day streak</span>
          </div>
          <div className="bar-module">
            <span className="icon">⏱</span>
            <span className="val">{todayHours}h today</span>
          </div>
        </div>
        <div className="waybar-right">
          <div className="bar-module">
            <span className="icon">⚡</span>
            <span className="val">{clockTime}</span>
          </div>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {toastMsg && <div className="toast show">{toastMsg}</div>}

      {/* COMPOSITOR GRID WRAPPER */}
      <div className="compositor-wrapper" style={{ padding: 'calc(var(--bar-height) + var(--window-gap)) var(--window-gap) var(--window-gap)', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className={`compositor ${
          activeTab === 'dashboard' ? 'layout-overview' :
          activeTab === 'timer' ? 'layout-timer' :
          activeTab === 'analytics' ? 'layout-analytics' :
          'layout-single'
        }`} style={{ position: 'relative', top: 0, left: 0, right: 0, bottom: 0 }}>
          
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
              theme={theme}
            />
          )}

          {activeTab === 'timer' && (
            <TimerView 
              subjects={subjects} 
              sessions={sessions}
              onSaveSession={(session) => {
                DataService.saveSession(session);
                showToast('session saved');
              }}
              prefilledSubjectId={prefilledSubjectId}
              prefilledSessionName={prefilledSessionName}
              clearPrefill={() => {
                setPrefilledSubjectId('');
                setPrefilledSessionName('');
              }}
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

          {activeTab === 'history' && (
            <HistoryView 
              sessions={sessions} 
              subjects={subjects} 
              onDeleteSession={(id) => {
                DataService.deleteSession(id);
                showToast('session deleted');
              }}
              showToast={showToast}
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
                showToast('mock test score saved');
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
                showToast('exam goal saved');
              }}
              onDeleteGoal={(id) => {
                DataService.deleteExamGoal(id);
                showToast('exam goal deleted');
              }}
              onSetActiveGoal={(id) => {
                DataService.setActiveExamGoal(id);
                showToast('active goal updated');
              }}
              showToast={showToast}
              theme={theme}
              setTheme={setTheme}
            />
          )}

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW COMPONENTS
// ----------------------------------------------------

function DashboardView({ activeGoal, sessions, subjects, topics, setActiveTab, onFocusNow, currentStreak, todayHours, showToast, theme }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr);
  const dailyTargetMinutes = activeGoal ? activeGoal.dailyTargetMinutes : 360;
  const progressPercent = Math.min((todayHours * 3600) / (dailyTargetMinutes * 60), 1);

  const getDaysRemaining = () => {
    if (!activeGoal) return null;
    const diffTime = new Date(activeGoal.examDate) - new Date();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining();

  const subjectsWithRates = subjects.map(s => {
    const sTopics = topics.filter(t => String(t.subjectId) === String(s.id));
    const completed = sTopics.filter(t => t.status === 'COMPLETED').length;
    const rate = sTopics.length > 0 ? completed / sTopics.length : 0;
    return { ...s, total: sTopics.length, completed, rate };
  }).sort((a, b) => b.rate - a.rate).slice(0, 5);

  const recentSessionsList = sessions.slice(0, 4);

  return (
    <>
      {/* Window 1: Neofetch Stats */}
      <div className="hypr-window active-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            neofetch <span className="class-name">— stats</span>
          </div>
        </div>
        <div className="win-body">
          <div className="neofetch">
            <div className="neo-logo">{`  ╔═════╗
  ║     ║
  ║  ⌘  ║
  ║     ║
  ╚═════╝
 /     \\`}</div>
            <div className="neo-info">
              <div><span className="key">user</span><span className="sep">@</span><span className="val">focusly</span></div>
              <div><span className="key">streak</span><span className="sep">: </span><span className="val">{currentStreak} days</span></div>
              <div><span className="key">today</span><span className="sep">: </span><span className="val">{todayHours}h</span></div>
              <div><span className="key">goal</span><span className="sep">: </span><span className="val">{(dailyTargetMinutes / 60).toFixed(1)}h</span></div>
              <div><span className="key">sessions</span><span className="sep">: </span><span className="val">{todaySessions.length}</span></div>
              <div><span className="key">theme</span><span className="sep">: </span><span className="val">{theme}</span></div>
              <div><span className="key">shell</span><span className="sep">: </span><span className="val">pomodoro-sh 1.0</span></div>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">exam goal</div>
              <div className="stat-value accent" style={{ fontSize: activeGoal ? '18px' : '28px' }}>
                {activeGoal ? `${daysRemaining} days` : '—'}
              </div>
              <div className="stat-sub">{activeGoal ? activeGoal.name : 'no goal set'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">streak</div>
              <div className="stat-value peach">{currentStreak}</div>
              <div className="stat-sub">days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Window 2: Progress Ring */}
      <div className="hypr-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            progress <span className="class-name">— today</span>
          </div>
        </div>
        <div className="win-body">
          <div className="ring-container">
            <svg className="ring-svg" viewBox="0 0 100 100">
              <circle className="ring-bg" cx="50" cy="50" r="42"/>
              <circle className="ring-fg" cx="50" cy="50" r="42"
                transform="rotate(-90 50 50)"
                style={{ strokeDashoffset: 283 - 283 * progressPercent }}
              />
              <text className="ring-text" x="50" y="46" fontSize="18" fontWeight="700">{todayHours}h</text>
              <text className="ring-text" x="50" y="61" fontSize="9" fill="var(--overlay0)">of {(dailyTargetMinutes / 60).toFixed(1)}h</text>
            </svg>
            <div className="ring-info">
              <h3>today's progress</h3>
              {todayHours > 0 ? (
                <p>Keep up the great work!<br/>You have logged {todayHours} hours today.<br/><br/><span style={{ color: 'var(--green)' }}>❯</span> stay consistent!</p>
              ) : (
                <p>Start a focus session<br/>to track your progress.<br/><br/><span style={{ color: 'var(--green)' }}>❯</span> switch to workspace 2<br/>&nbsp;&nbsp;to begin studying.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Window 3: Quick Actions */}
      <div className="hypr-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            quick_actions <span className="class-name">— sh</span>
          </div>
        </div>
        <div className="win-body">
          <div className="prompt-line">
            <span className="arrow">❯</span>
            <span className="path">~/study</span>
            <span className="cmd cursor-blink">ready</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="hypr-btn primary" onClick={() => setActiveTab('timer')} style={{ width: '100%', justifyContent: 'center' }}>
              start focus session
            </button>
            <button className="hypr-btn" onClick={() => setActiveTab('syllabus')} style={{ width: '100%', justifyContent: 'center' }}>
              manage syllabus
            </button>
            <button className="hypr-btn" onClick={() => setActiveTab('analytics')} style={{ width: '100%', justifyContent: 'center' }}>
              view analytics
            </button>
            <button className="hypr-btn" onClick={() => setActiveTab('account')} style={{ width: '100%', justifyContent: 'center' }}>
              set exam goal
            </button>
          </div>
          <div className="section-head" style={{ marginTop: '16px' }}>
            <div className="line"></div>
            <div className="label">tip</div>
            <div className="line"></div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--overlay0)', lineHeight: '1.6' }}>
            use workspace switcher in the top bar or press <span style={{ color: 'var(--accent)' }}>1-6</span> to navigate between panels.
          </p>
        </div>
      </div>

      {/* Window 4: Syllabus Preview (spans 2 cols) */}
      <div className="hypr-window span-2">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            syllabus <span className="class-name">— preview</span>
          </div>
        </div>
        <div className="win-body">
          {subjectsWithRates.length === 0 ? (
            <div className="empty-state">
              <div className="ascii-icon">{`  ┌──────────┐
  │  ░░░░░░  │
  │  ░░░░░░  │
  │  ░░░░░░  │
  └──────────┘`}</div>
              <p>no subjects in your syllabus yet</p>
              <button className="hypr-btn" onClick={() => setActiveTab('syllabus')}>add subjects →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {subjectsWithRates.map(s => (
                <div key={s.id} style={{ paddingBottom: '8px', borderBottom: '1px solid var(--surface0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.colorHex }} />
                      <span style={{ fontWeight: '600' }}>{s.name}</span>
                    </div>
                    <span className="chip" style={{ fontSize: '9px', padding: '1px 6px', background: `${s.colorHex}22`, color: s.colorHex, border: `1px solid ${s.colorHex}44`, cursor: 'default' }}>
                      {(s.rate * 100).toFixed(0)}% done
                    </span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '3px' }}>
                    <div className="progress-bar-fill" style={{ width: `${s.rate * 100}%`, backgroundColor: s.colorHex }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Window 5: Recent Sessions */}
      <div className="hypr-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            recent <span className="class-name">— sessions</span>
          </div>
        </div>
        <div className="win-body">
          {recentSessionsList.length === 0 ? (
            <div className="empty-state">
              <div className="ascii-icon">{`  ╭────╮
  │ ▸▸ │
  │    │
  ╰────╯`}</div>
              <p>no sessions recorded</p>
              <button className="hypr-btn" onClick={() => setActiveTab('timer')}>start studying →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentSessionsList.map(s => {
                const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
                return (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingBottom: '6px', borderBottom: '1px solid var(--surface0)' }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
                      <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                      <div style={{ color: 'var(--overlay0)', fontSize: '10px' }}>{s.date}</div>
                    </div>
                    {subj && (
                      <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15`, cursor: 'default' }}>
                        {subj.name}
                      </span>
                    )}
                    <span style={{ fontWeight: '700', marginLeft: '6px' }}>{Math.round(s.completedDurationSeconds / 60)}m</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TimerView({ subjects, sessions, onSaveSession, prefilledSubjectId, prefilledSessionName, clearPrefill, showToast }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionName, setSessionName] = useState('Study Session');
  const [selectedTag, setSelectedTag] = useState('');

  // Configuration
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [totalCycles, setTotalCycles] = useState(4);

  // Runtime Timer States
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [currentPhase, setCurrentPhase] = useState('FOCUS'); // FOCUS, SHORT_BREAK, LONG_BREAK
  const [currentCycle, setCurrentCycle] = useState(1);
  const [accumulatedCompletedSeconds, setAccumulatedCompletedSeconds] = useState(0);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [sessionNotesInput, setSessionNotesInput] = useState('');

  const intervalRef = useRef(null);
  const expectedEndTimeRef = useRef(null);

  // Sync Prefill from dashboard quick-focus launch
  useEffect(() => {
    if (prefilledSubjectId) {
      setSelectedSubjectId(prefilledSubjectId);
    }
    if (prefilledSessionName) {
      setSessionName(prefilledSessionName);
    }
    if (prefilledSubjectId || prefilledSessionName) {
      clearPrefill();
    }
  }, [prefilledSubjectId, prefilledSessionName]);

  // Sync session name with subject selection
  useEffect(() => {
    const s = subjects.find(x => String(x.id) === String(selectedSubjectId));
    if (s) {
      setSessionName(s.name);
    }
  }, [selectedSubjectId, subjects]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePhaseEnd = () => {
    if (currentPhase === 'FOCUS') {
      const completedFocusSecs = focusMinutes * 60;
      setAccumulatedCompletedSeconds(prev => prev + completedFocusSecs);
      
      const isLastCycle = currentCycle >= totalCycles;
      if (isLastCycle) {
        setIsTimerRunning(false);
        expectedEndTimeRef.current = null;
        handleFinishSession(true);
        showToast('All focus cycles completed!');
      } else {
        // Go to Break
        const isLongBreak = currentCycle % 4 === 0;
        const breakSeconds = isLongBreak ? longBreakMinutes * 60 : shortBreakMinutes * 60;
        
        setCurrentPhase(isLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK');
        setTimerSecondsLeft(breakSeconds);
        
        // Auto-start break
        expectedEndTimeRef.current = Date.now() + (breakSeconds * 1000);
        showToast('Focus session completed! Time for a break.');
      }
    } else {
      // Break over, go back to Focus
      const nextCycle = currentCycle + 1;
      const focusSeconds = focusMinutes * 60;
      
      setCurrentPhase('FOCUS');
      setTimerSecondsLeft(focusSeconds);
      setCurrentCycle(nextCycle);
      
      // Auto-start next focus
      expectedEndTimeRef.current = Date.now() + (focusSeconds * 1000);
      showToast('Break is over! Time to focus.');
    }
  };

  const startTimer = () => {
    if (isTimerRunning) return;
    setIsTimerRunning(true);
    setIsSessionActive(true);
    expectedEndTimeRef.current = Date.now() + (timerSecondsLeft * 1000);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    expectedEndTimeRef.current = null;
  };

  const skipPhase = () => {
    handlePhaseEnd();
  };

  // Main tick interval manager
  useEffect(() => {
    if (!isTimerRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (!expectedEndTimeRef.current) return;
      const secondsLeft = Math.max(0, Math.round((expectedEndTimeRef.current - Date.now()) / 1000));
      setTimerSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        handlePhaseEnd();
      }
    };

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerRunning, currentPhase, currentCycle, focusMinutes, shortBreakMinutes, longBreakMinutes, totalCycles]);

  const stopTimer = () => {
    pauseTimer();
    let totalCompleted = accumulatedCompletedSeconds;
    if (currentPhase === 'FOCUS') {
      totalCompleted += (focusMinutes * 60 - timerSecondsLeft);
    }

    if (totalCompleted > 10) {
      setAccumulatedCompletedSeconds(totalCompleted);
      handleFinishSession(false);
    } else {
      resetTimer();
    }
  };

  const handleFinishSession = (completed) => {
    setIsCompletedModalOpen(true);
  };

  const saveAndExit = () => {
    const finalDurationMinutes = focusMinutes * totalCycles;
    const completedSeconds = accumulatedCompletedSeconds;
    const sessionObj = {
      label: sessionName || 'Study Session',
      durationMinutes: finalDurationMinutes,
      completedDurationSeconds: completedSeconds,
      date: new Date().toISOString().split('T')[0],
      startTime: Date.now() - (completedSeconds * 1000),
      endTime: Date.now(),
      isCompleted: completedSeconds >= (focusMinutes * totalCycles * 60),
      notes: sessionNotesInput.trim() || null,
      tag: selectedTag || null,
      subjectId: selectedSubjectId || null
    };

    onSaveSession(sessionObj);
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
    expectedEndTimeRef.current = null;
  };

  // Sync with background tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isTimerRunning && expectedEndTimeRef.current) {
        const secondsLeft = Math.max(0, Math.round((expectedEndTimeRef.current - Date.now()) / 1000));
        setTimerSecondsLeft(secondsLeft);
        if (secondsLeft <= 0) {
          handlePhaseEnd();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isTimerRunning, currentPhase, currentCycle, focusMinutes, shortBreakMinutes, longBreakMinutes, totalCycles]);

  // Adjusters sync
  useEffect(() => {
    if (!isTimerRunning) {
      setTimerSecondsLeft(focusMinutes * 60);
    }
  }, [focusMinutes]);

  const formatClock = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Large Pomodoro Window */}
      <div className={`hypr-window active-window span-2 ${isSessionActive ? 'immersive-active' : ''}`} style={{ minHeight: 0 }}>
        {!isSessionActive && (
          <div className="win-titlebar">
            <div className="win-title">
              <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
              pomodoro <span className="class-name">— focus session</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="tag active">{currentPhase.toLowerCase()}</span>
            </div>
          </div>
        )}
        <div className="win-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pomo-display">
            <div className="pomo-phase">
              {currentPhase === 'FOCUS' ? 'focus session' : currentPhase === 'SHORT_BREAK' ? 'short break' : 'long break'}
            </div>
            <div className={`pomo-time ${currentPhase === 'FOCUS' ? 'focus' : 'break'}`}>
              {formatClock(timerSecondsLeft)}
            </div>
            <div className="pomo-cycle">
              cycle {currentCycle} / {totalCycles}
            </div>
          </div>

          <div className="pomo-bar" style={{ display: 'flex', gap: '4px', justifyContent: 'center', margin: '8px 0' }}>
            {Array.from({ length: totalCycles }).map((_, i) => {
              const num = i + 1;
              let clName = 'pomo-pip';
              if (num < currentCycle) clName += ' done';
              else if (num === currentCycle && currentPhase === 'FOCUS') clName += ' current';
              return <div key={i} className={clName} />;
            })}
          </div>

          <div className="pomo-controls">
            {isTimerRunning ? (
              <button className="hypr-btn primary" onClick={pauseTimer}>⏸ pause</button>
            ) : (
              <button className="hypr-btn primary" onClick={startTimer}>▶ start</button>
            )}
            <button className="hypr-btn" onClick={skipPhase}>⏭ skip</button>
            <button className="hypr-btn danger" onClick={stopTimer}>⏹ stop</button>
          </div>

          {!isSessionActive && (
            <>
              <div className="section-head" style={{ width: '100%', marginTop: '24px' }}>
                <div className="line"></div>
                <div className="label">session config</div>
                <div className="line"></div>
              </div>
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <div className="setting-row">
                  <span className="setting-label">focus duration</span>
                  <div className="setting-control">
                    <button className="sm-btn" onClick={() => setFocusMinutes(p => Math.max(5, p - 5))}>−</button>
                    <span className="setting-val">{focusMinutes}m</span>
                    <button className="sm-btn" onClick={() => setFocusMinutes(p => p + 5)}>+</button>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">short break</span>
                  <div className="setting-control">
                    <button className="sm-btn" onClick={() => setShortBreakMinutes(p => Math.max(1, p - 1))}>−</button>
                    <span className="setting-val">{shortBreakMinutes}m</span>
                    <button className="sm-btn" onClick={() => setShortBreakMinutes(p => p + 1)}>+</button>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">long break</span>
                  <div className="setting-control">
                    <button className="sm-btn" onClick={() => setLongBreakMinutes(p => Math.max(5, p - 5))}>−</button>
                    <span className="setting-val">{longBreakMinutes}m</span>
                    <button className="sm-btn" onClick={() => setLongBreakMinutes(p => p + 5)}>+</button>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">target cycles</span>
                  <div className="setting-control">
                    <button className="sm-btn" onClick={() => setTotalCycles(p => Math.max(1, p - 1))}>−</button>
                    <span className="setting-val">{totalCycles}x</span>
                    <button className="sm-btn" onClick={() => setTotalCycles(p => p + 1)}>+</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Session Details Window */}
      <div className="hypr-window" style={{ display: isSessionActive ? 'none' : 'flex' }}>
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            session_details <span className="class-name">— metadata</span>
          </div>
        </div>
        <div className="win-body">
          <div className="prompt-line">
            <span className="arrow">❯</span>
            <span className="path">~/session</span>
            <span className="cmd">tag --set</span>
          </div>
          <label style={{ fontSize: '11px', color: 'var(--overlay0)', display: 'block', marginBottom: '6px' }}>session name</label>
          <input 
            className="hypr-input" 
            value={sessionName} 
            onChange={(e) => setSessionName(e.target.value)} 
            placeholder="e.g. chapter 3 review..." 
            style={{ marginBottom: '12px' }}
            disabled={isTimerRunning}
          />
          <label style={{ fontSize: '11px', color: 'var(--overlay0)', display: 'block', marginBottom: '6px' }}>tag</label>
          <div className="tag-row">
            {['NEW_TOPIC', 'REVISION', 'PRACTICE', 'MOCK_TEST'].map(t => {
              const label = t.replace('_', ' ').toLowerCase();
              const isSelected = selectedTag === t;
              return (
                <button 
                  key={t}
                  className={`tag ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedTag(isSelected ? '' : t)}
                  disabled={isTimerRunning}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="section-head" style={{ marginTop: '16px' }}>
            <div className="line"></div>
            <div className="label">subject</div>
            <div className="line"></div>
          </div>
          <select 
            className="hypr-input" 
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            style={{ cursor: 'pointer' }}
            disabled={isTimerRunning}
          >
            <option value="">no subject selected</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Today's Log Window */}
      <div className="hypr-window" style={{ display: isSessionActive ? 'none' : 'flex' }}>
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            today_log <span className="class-name">— sessions</span>
          </div>
        </div>
        <div className="win-body">
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const todaySess = sessions.filter(s => s.date === todayStr);
            if (todaySess.length === 0) {
              return (
                <div className="empty-state">
                  <p style={{ fontSize: '11px' }}>no sessions completed today</p>
                </div>
              );
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todaySess.map(s => {
                  const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
                  return (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingBottom: '6px', borderBottom: '1px solid var(--surface0)' }}>
                      <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
                        <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                        {s.tag && <div style={{ fontSize: '9px', color: 'var(--accent)' }}>#{s.tag.toLowerCase()}</div>}
                      </div>
                      {subj && (
                        <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15`, cursor: 'default' }}>
                          {subj.name}
                        </span>
                      )}
                      <span style={{ fontWeight: '700', marginLeft: '6px' }}>{Math.round(s.completedDurationSeconds / 60)}m</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Completed session notes prompt modal */}
      {isCompletedModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Session Finished! 🔥</div>
            <p>Write down notes about what you studied during this session:</p>
            <textarea 
              className="hypr-input" 
              rows="4" 
              placeholder="e.g., Solved Boolean Algebra minimization sheets, solved K-Map exceptions."
              value={sessionNotesInput}
              onChange={(e) => setSessionNotesInput(e.target.value)}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="hypr-btn" onClick={() => { setIsCompletedModalOpen(false); resetTimer(); }}>Discard</button>
              <button className="hypr-btn primary" onClick={saveAndExit}>Save & Exit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SyllabusView({ activeGoal, subjects, topics, showToast, setActiveTab }) {
  const [showAddSubj, setShowAddSubj] = useState(false);
  const [showAddTopicSubjId, setShowAddTopicSubjId] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [colorHex, setColorHex] = useState('#4D96FF');
  const [topicName, setTopicName] = useState('');

  const [expandedSubjId, setExpandedSubjId] = useState(null);
  const [activeAddSubTopicId, setActiveAddSubTopicId] = useState(null);
  const [subTopicName, setSubTopicName] = useState('');

  const colors = ["#4D96FF", "#FF6B6B", "#6BCB77", "#FFD93D", "#95CD41", "#F473B9", "#A855F7", "#F97316"];

  const handleAddSubject = () => {
    if (!subjectName.trim()) return;
    DataService.saveSubject({
      name: subjectName.trim(),
      examGoalId: activeGoal?.id || "local-goal",
      colorHex,
      sortOrder: subjects.length
    });
    showToast(`subject added: ${subjectName}`);
    setSubjectName('');
    setShowAddSubj(false);
  };

  const handleAddTopic = () => {
    if (!topicName.trim() || !showAddTopicSubjId) return;
    DataService.saveTopic({
      name: topicName.trim(),
      subjectId: showAddTopicSubjId,
      status: 'NOT_STARTED',
      sortOrder: topics.filter(t => t.subjectId === showAddTopicSubjId).length,
      subTopics: []
    });
    showToast(`topic added: ${topicName}`);
    setTopicName('');
    setShowAddTopicSubjId(null);
  };

  const handleCycleStatus = (topic) => {
    const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVISION'];
    const nextIndex = (statuses.indexOf(topic.status) + 1) % statuses.length;
    DataService.saveTopic({
      ...topic,
      status: statuses[nextIndex]
    });
  };

  const handleAddSubTopic = (topic) => {
    if (!subTopicName.trim()) return;
    const newSub = {
      id: String(Date.now()),
      name: subTopicName.trim(),
      status: 'NOT_STARTED'
    };
    const updatedSubTopics = [...(topic.subTopics || []), newSub];
    DataService.saveTopic({
      ...topic,
      subTopics: updatedSubTopics
    });
    setSubTopicName('');
    setActiveAddSubTopicId(null);
  };

  const handleDeleteSubTopic = (topic, subTopicId) => {
    if (confirm("Delete this sub-topic?")) {
      const updatedSubTopics = (topic.subTopics || []).filter(sub => sub.id !== subTopicId);
      DataService.saveTopic({
        ...topic,
        subTopics: updatedSubTopics
      });
      showToast('sub-topic deleted');
    }
  };

  const handleCycleSubTopicStatus = (topic, subTopicId) => {
    const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    const updatedSubTopics = (topic.subTopics || []).map(sub => {
      if (sub.id === subTopicId) {
        const nextIndex = (statuses.indexOf(sub.status) + 1) % statuses.length;
        return { ...sub, status: statuses[nextIndex] };
      }
      return sub;
    });
    DataService.saveTopic({
      ...topic,
      subTopics: updatedSubTopics
    });
  };

  return (
    <>
      <div className="hypr-window active-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            syllabus <span className="class-name">— subject tracker</span>
          </div>
          {activeGoal && (
            <button className="hypr-btn primary" onClick={() => setShowAddSubj(true)}>
              + add subject
            </button>
          )}
        </div>
        <div className="win-body">
          <div className="prompt-line">
            <span className="arrow">❯</span>
            <span className="path">~/syllabus</span>
            <span className="cmd">ls --subjects</span>
          </div>

          {!activeGoal ? (
            <div className="empty-state">
              <div className="ascii-icon">{`  ╭──────────╮
  │   ⚠️      │
  │          │
  │ set goal │
  │  first   │
  ╰──────────╯`}</div>
              <p>You must configure an active exam goal in the Account Sync tab before tracking your syllabus subjects.</p>
              <button className="hypr-btn" onClick={() => setActiveTab('account')}>configure goal →</button>
            </div>
          ) : subjects.length === 0 ? (
            <div className="empty-state">
              <div className="ascii-icon">{`  ┌──────────────┐
  │  📚 empty    │
  │              │
  │  add subject │
  │  to begin    │
  └──────────────┘`}</div>
              <p>Your syllabus is empty. Get started by adding a subject.</p>
              <button className="hypr-btn primary" onClick={() => setShowAddSubj(true)}>add subject</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {subjects.map(s => {
                const subjTopics = topics.filter(t => String(t.subjectId) === String(s.id));
                const completed = subjTopics.filter(t => t.status === 'COMPLETED').length;
                const rate = subjTopics.length > 0 ? completed / subjTopics.length : 0;
                const isExpanded = expandedSubjId === s.id;

                return (
                  <div key={s.id} style={{ padding: '12px', border: '1px solid var(--surface0)', borderRadius: '8px', background: 'var(--surface1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedSubjId(isExpanded ? null : s.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1, minWidth: 0 }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.colorHex, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--overlay0)', marginTop: '2px' }}>
                            {completed}/{subjTopics.length} topics completed
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontWeight: '700', color: s.colorHex }}>{(rate * 100).toFixed(0)}%</span>
                        <button className="sm-btn" onClick={() => {
                          if (confirm("Delete subject and all its topics?")) {
                            DataService.deleteSubject(s.id);
                            showToast('subject deleted');
                          }
                        }}>
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="progress-bar-bg" style={{ marginTop: '10px', height: '4px' }}>
                      <div className="progress-bar-fill" style={{ width: `${rate * 100}%`, backgroundColor: s.colorHex }} />
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--surface0)', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', background: 'var(--crust)', padding: '10px', borderRadius: '6px', border: '1px solid var(--surface0)' }} onClick={(e) => e.stopPropagation()}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">target hours</label>
                            <input 
                              type="number" 
                              className="hypr-input" 
                              style={{ height: '30px', padding: '4px 8px' }}
                              value={s.targetHours || ''} 
                              onChange={(e) => DataService.saveSubject({ ...s, targetHours: parseInt(e.target.value) || null })}
                              placeholder="e.g. 40"
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">priority</label>
                            <select 
                              className="hypr-input" 
                              style={{ height: '30px', padding: '4px 8px', cursor: 'pointer' }}
                              value={s.priority || 'MEDIUM'} 
                              onChange={(e) => DataService.saveSubject({ ...s, priority: e.target.value })}
                            >
                              <option value="HIGH">HIGH Priority</option>
                              <option value="MEDIUM">MEDIUM Priority</option>
                              <option value="LOW">LOW Priority</option>
                            </select>
                          </div>
                        </div>

                        {subjTopics.length === 0 ? (
                          <p style={{ color: 'var(--overlay0)', fontSize: '11px', textAlign: 'center', padding: '8px' }}>No topics found. Add one below!</p>
                        ) : (
                          subjTopics.map(t => {
                            const confs = {
                              NOT_STARTED: { label: 'not started', color: 'var(--overlay0)' },
                              IN_PROGRESS: { label: 'in progress', color: 'var(--blue)' },
                              COMPLETED: { label: 'completed', color: 'var(--green)' },
                              NEEDS_REVISION: { label: 'needs revision', color: 'var(--peach)' }
                            };
                            const topicConf = confs[t.status] || confs.NOT_STARTED;

                            return (
                              <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--crust)', border: '1px solid var(--surface0)', borderRadius: '6px', padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{t.name}</span>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span 
                                      className="chip"
                                      style={{ borderColor: topicConf.color, color: topicConf.color, fontSize: '9px', padding: '2px 8px' }}
                                      onClick={() => handleCycleStatus(t)}
                                    >
                                      {topicConf.label}
                                    </span>
                                    <button className="chip" style={{ fontSize: '9px', padding: '2px 8px' }} onClick={() => {
                                      setActiveAddSubTopicId(activeAddSubTopicId === t.id ? null : t.id);
                                      setSubTopicName('');
                                    }}>
                                      + sub-topic
                                    </button>
                                    <button className="sm-btn" onClick={() => {
                                      DataService.deleteTopic(t.id);
                                      showToast('topic deleted');
                                    }}>
                                      ×
                                    </button>
                                  </div>
                                </div>

                                {(t.subTopics || []).map(sub => {
                                  const subConfs = {
                                    NOT_STARTED: { label: 'todo', color: 'var(--overlay0)' },
                                    IN_PROGRESS: { label: 'doing', color: 'var(--blue)' },
                                    COMPLETED: { label: 'done', color: 'var(--green)' }
                                  };
                                  const subConf = subConfs[sub.status] || subConfs.NOT_STARTED;

                                  return (
                                    <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px 4px 16px', borderLeft: '1px solid var(--surface2)', marginLeft: '8px', marginTop: '2px' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.8 }}>{sub.name}</span>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span 
                                          className="chip"
                                          style={{ borderColor: subConf.color, color: subConf.color, fontSize: '8px', padding: '1px 6px' }}
                                          onClick={() => handleCycleSubTopicStatus(t, sub.id)}
                                        >
                                          {subConf.label}
                                        </span>
                                        <button className="sm-btn" style={{ width: '20px', height: '20px', fontSize: '10px' }} onClick={() => handleDeleteSubTopic(t, sub.id)}>
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {activeAddSubTopicId === t.id && (
                                  <div style={{ display: 'flex', gap: '6px', marginLeft: '8px', marginTop: '6px', paddingLeft: '8px', borderLeft: '1px solid var(--accent)' }}>
                                    <input 
                                      className="hypr-input"
                                      style={{ height: '26px', fontSize: '11px', padding: '2px 8px', maxWidth: '200px' }}
                                      value={subTopicName}
                                      onChange={(e) => setSubTopicName(e.target.value)}
                                      placeholder="Sub-topic name..."
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubTopic(t); }}
                                      autoFocus
                                    />
                                    <button className="hypr-btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleAddSubTopic(t)}>add</button>
                                    <button className="hypr-btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => { setActiveAddSubTopicId(null); setSubTopicName(''); }}>cancel</button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}

                        <button className="hypr-btn" style={{ alignSelf: 'center', marginTop: '8px' }} onClick={() => setShowAddTopicSubjId(s.id)}>
                          + add topic
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Subject Modal */}
      {showAddSubj && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Add Subject</div>
            <div className="form-group">
              <label className="form-label">Subject Name</label>
              <input 
                className="hypr-input" 
                placeholder="e.g., Digital Logic, Computer Networks"
                value={subjectName} 
                onChange={(e) => setSubjectName(e.target.value)} 
              />
            </div>
            <div>
              <label className="form-label">Choose color:</label>
              <div className="color-picker" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {colors.map(c => (
                  <div 
                    key={c} 
                    className={`color-option ${colorHex === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c, width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', border: colorHex === c ? '2px solid var(--text)' : '2px solid transparent' }}
                    onClick={() => setColorHex(c)}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="hypr-btn" onClick={() => setShowAddSubj(false)}>Cancel</button>
              <button className="hypr-btn primary" onClick={handleAddSubject}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showAddTopicSubjId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Add Topic</div>
            <div className="form-group">
              <label className="form-label">Topic Name</label>
              <input 
                className="hypr-input" 
                placeholder="e.g., Minimization using K-Maps"
                value={topicName} 
                onChange={(e) => setTopicName(e.target.value)} 
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="hypr-btn" onClick={() => setShowAddTopicSubjId(null)}>Cancel</button>
              <button className="hypr-btn primary" onClick={handleAddTopic}>Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HistoryView({ sessions, subjects, onDeleteSession, showToast }) {
  const [filterSubjectId, setFilterSubjectId] = useState('');

  const filteredSessions = filterSubjectId 
    ? sessions.filter(s => String(s.subjectId) === String(filterSubjectId))
    : sessions;

  const sorted = [...filteredSessions].sort((a, b) => b.startTime - a.startTime);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const todaySessions = sorted.filter(s => s.date === todayStr);
  const yesterdaySessions = sorted.filter(s => s.date === yesterdayStr);
  const earlierSessions = sorted.filter(s => s.date !== todayStr && s.date !== yesterdayStr);

  const renderSessionCard = (s) => {
    const dateObj = new Date(s.startTime);
    const dateLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeLabel = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const durationMins = Math.round(s.completedDurationSeconds / 60);
    const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));

    return (
      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--surface0)', borderRadius: '8px', background: 'var(--surface1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1, marginRight: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
          <div style={{ fontSize: '11px', color: 'var(--overlay0)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>{dateLabel} at {timeLabel}</span>
            {s.tag && <span style={{ color: 'var(--accent)' }}>#{s.tag.toLowerCase()}</span>}
            {subj && (
              <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15`, cursor: 'default' }}>
                {subj.name}
              </span>
            )}
          </div>
          {s.notes && (
            <div style={{ fontSize: '11px', color: 'var(--text)', opacity: 0.8, background: 'var(--crust)', padding: '6px 10px', borderRadius: '4px', marginTop: '4px' }}>
              {s.notes}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent)' }}>{durationMins}m</span>
          <button className="sm-btn" onClick={() => {
            if (confirm("Delete this session record?")) {
              onDeleteSession(s.id);
            }
          }}>
            ×
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="hypr-window active-window">
      <div className="win-titlebar">
        <div className="win-title">
          <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
          history <span className="class-name">— session log</span>
        </div>
        {subjects.length > 0 && (
          <select 
            className="hypr-input" 
            style={{ width: '180px', height: '28px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
          >
            <option value="">filter subject (all)</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="win-body">
        <div className="prompt-line">
          <span className="arrow">❯</span>
          <span className="path">~/history</span>
          <span className="cmd">cat sessions.log</span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <div className="ascii-icon">{`  ╭──────────────╮
  │  no data     │
  │              │
  │  complete a  │
  │  session to  │
  │  see logs    │
  ╰──────────────╯`}</div>
            <p>no study sessions recorded yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {todaySessions.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '8px', color: 'var(--accent)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Today</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todaySessions.map(renderSessionCard)}
                </div>
              </div>
            )}
            
            {yesterdaySessions.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '8px', color: 'var(--overlay0)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Yesterday</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {yesterdaySessions.map(renderSessionCard)}
                </div>
              </div>
            )}

            {earlierSessions.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '8px', color: 'var(--overlay0)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Earlier</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {earlierSessions.map(renderSessionCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsView({ sessions, subjects, topics, activeGoal, mockTests, onSaveMockTest, onDeleteMockTest, streak, showToast }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const weeks = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    const startSunday = new Date(startDate);
    startSunday.setDate(startDate.getDate() - startDate.getDay());

    const endSaturday = new Date(today);
    endSaturday.setDate(today.getDate() + (6 - today.getDay()));

    const weeksList = [];
    let currentDay = new Date(startSunday);
    
    while (currentDay <= endSaturday) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
      weeksList.push(week);
    }
    return weeksList;
  }, [sessions]);

  const monthLabels = React.useMemo(() => {
    const labels = [];
    let lastMonthName = '';
    weeks.forEach((week, wIdx) => {
      const midWeekDay = week[3];
      const monthName = midWeekDay.toLocaleDateString(undefined, { month: 'short' });
      if (monthName !== lastMonthName) {
        labels.push({ text: monthName, colIndex: wIdx });
        lastMonthName = monthName;
      }
    });
    return labels;
  }, [weeks]);

  const trackingSinceStr = React.useMemo(() => {
    if (sessions.length === 0) {
      const today = new Date();
      return `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    }
    const dates = sessions.map(s => new Date(s.date).getTime());
    const minDate = new Date(Math.min(...dates));
    return `${minDate.getMonth() + 1}/${minDate.getDate()}/${minDate.getFullYear()}`;
  }, [sessions]);

  const sessionsInPastYear = React.useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    return sessions.filter(s => new Date(s.date) >= oneYearAgo && s.completedDurationSeconds > 0).length;
  }, [sessions]);

  const startDate = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(today);
    d.setDate(today.getDate() - 364);
    return d;
  }, []);

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getDaySessions = (date) => {
    if (!date) return [];
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return sessions.filter(s => s.date === dateStr);
  };

  const getPieData = () => {
    const totalsBySubj = {};
    sessions.forEach(s => {
      if (s.subjectId && s.completedDurationSeconds > 0) {
        totalsBySubj[s.subjectId] = (totalsBySubj[s.subjectId] || 0) + s.completedDurationSeconds;
      }
    });

    return Object.keys(totalsBySubj).map(id => {
      const s = subjects.find(x => String(x.id) === String(id));
      return {
        name: s ? s.name : 'Unknown',
        value: Math.round(totalsBySubj[id] / 60),
        color: s ? s.colorHex : '#888888'
      };
    }).filter(x => x.value > 0);
  };

  const pieData = getPieData();

  const getBarData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.date === isoStr);
      const hours = daySessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0) / 3600;
      data.push({
        day: d.toLocaleDateString(undefined, { weekday: 'short' }),
        hours: parseFloat(hours.toFixed(1))
      });
    }
    return data;
  };

  const barData = getBarData();

  return (
    <>
      {/* Window 1: Study Time Last 7 Days */}
      <div className="hypr-window active-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            study_time <span className="class-name">— last 7 days</span>
          </div>
        </div>
        <div className="win-body" style={{ minHeight: '220px' }}>
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                <XAxis dataKey="day" stroke="var(--overlay0)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--overlay0)" fontSize={10} tickFormatter={(v) => `${v}h`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v} hours`, 'Hours Studied']} cursor={{ fill: 'var(--surface2)' }} />
                <Bar dataKey="hours" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Window 2: Activity Heatmap */}
      <div className="hypr-window span-2">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            activity <span className="class-name">— contribution graph</span>
          </div>
        </div>
        <div className="win-body">
          <div className="github-heatmap-wrapper">
            <div className="github-heatmap-inner">
              <div className="github-heatmap-months">
                {monthLabels.map((lbl, idx) => (
                  <div
                    key={idx}
                    className="github-heatmap-month-label"
                    style={{ gridColumn: `${lbl.colIndex + 2} / span 4` }}
                  >
                    {lbl.text}
                  </div>
                ))}
              </div>

              <div className="github-heatmap-grid">
                <span className="github-heatmap-weekday-label" style={{ gridRow: 2, gridColumn: 1 }}>Mon</span>
                <span className="github-heatmap-weekday-label" style={{ gridRow: 4, gridColumn: 1 }}>Wed</span>
                <span className="github-heatmap-weekday-label" style={{ gridRow: 6, gridColumn: 1 }}>Fri</span>

                {weeks.flatMap((week, wIdx) => 
                  week.map((day, dIdx) => {
                    const isOutOfRange = day < startDate || day > today;
                    if (isOutOfRange) {
                      return (
                        <div
                          key={`cell-${wIdx}-${dIdx}`}
                          className="github-heatmap-cell empty"
                          style={{ gridRow: dIdx + 1, gridColumn: wIdx + 2 }}
                        />
                      );
                    }

                    const pad = (n) => String(n).padStart(2, '0');
                    const dateStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
                    const daySessions = sessions.filter(s => s.date === dateStr);
                    const seconds = daySessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);
                    const hours = seconds / 3600;

                    let level = 0;
                    if (seconds > 0) {
                      if (seconds < 30 * 60) level = 1;
                      else if (seconds < 60 * 60) level = 2;
                      else if (seconds < 120 * 60) level = 3;
                      else level = 4;
                    }

                    return (
                      <div
                        key={`cell-${wIdx}-${dIdx}`}
                        className={`github-heatmap-cell level-${level}`}
                        style={{ gridRow: dIdx + 1, gridColumn: wIdx + 2 }}
                        title={`${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${hours.toFixed(1)}h studied`}
                        onClick={() => setSelectedDate(day)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="github-heatmap-legend">
            <span>Less</span>
            <div className="github-heatmap-legend-cell level-0" />
            <div className="github-heatmap-legend-cell level-1" />
            <div className="github-heatmap-legend-cell level-2" />
            <div className="github-heatmap-legend-cell level-3" />
            <div className="github-heatmap-legend-cell level-4" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Window 3: Subject Distribution */}
      <div className="hypr-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            distribution <span className="class-name">— by subject</span>
          </div>
        </div>
        <div className="win-body">
          {pieData.length > 0 ? (
            <div className="chart-distribution-layout">
              <div className="chart-pie-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} mins`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend-wrapper">
                {pieData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', paddingBottom: '3px', borderBottom: '1px solid var(--surface0)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                    <span style={{ color: 'var(--overlay0)', flexShrink: 0 }}>{item.value}m</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p style={{ fontSize: '11px' }}>no subject sessions logged yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Window 4: Mock Tests performance */}
      <MockTestSection 
        mockTests={mockTests} 
        subjects={subjects} 
        activeGoal={activeGoal} 
        onSave={onSaveMockTest} 
        onDelete={onDeleteMockTest} 
        showToast={showToast}
      />

      {/* Selected day sessions Modal */}
      {selectedDate && (() => {
        const daySessions = getDaySessions(selectedDate);
        const totalSeconds = daySessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);
        const totalHours = totalSeconds / 3600;
        
        return (
          <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface0)', paddingBottom: '8px', marginBottom: '12px' }}>
                <div>
                  <div className="modal-header">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                  <div style={{ fontSize: '11px', color: 'var(--overlay0)', marginTop: '2px' }}>{totalHours.toFixed(1)} hours study recorded</div>
                </div>
                <button className="sm-btn" onClick={() => setSelectedDate(null)}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {daySessions.length === 0 ? (
                  <p style={{ color: 'var(--overlay0)', textAlign: 'center', margin: '24px 0', fontSize: '12px' }}>No sessions logged for this day.</p>
                ) : (
                  daySessions.map(s => {
                    const timeStr = new Date(s.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    const mins = Math.round(s.completedDurationSeconds / 60);
                    const subj = subjects.find(sub => String(sub.id) === String(s.subjectId));
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--surface1)', border: '1px solid var(--surface0)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--overlay0)', minWidth: '45px', textAlign: 'center' }}>
                          {timeStr}
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'var(--surface0)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                          {s.tag && <div style={{ fontSize: '9px', color: 'var(--accent)' }}>#{s.tag.toLowerCase()}</div>}
                        </div>
                        {subj && (
                          <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15`, cursor: 'default' }}>
                            {subj.name}
                          </span>
                        )}
                        <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--accent)' }}>
                          {mins}m
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="hypr-btn" onClick={() => setSelectedDate(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function MockTestSection({ mockTests, subjects, activeGoal, onSave, onDelete, showToast }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [testName, setTestName] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects]);

  if (!activeGoal) {
    return (
      <div className="hypr-window span-2">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            mock_tests <span className="class-name">— performance</span>
          </div>
        </div>
        <div className="win-body">
          <div className="empty-state">
            <p>set active goal to view tests</p>
          </div>
        </div>
      </div>
    );
  }

  const goalTests = mockTests
    .filter(t => String(t.examGoalId) === String(activeGoal.id))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!testName || !obtainedMarks || !totalMarks || !subjectId) return;

    const obtained = parseFloat(obtainedMarks);
    const total = parseFloat(totalMarks);
    const scorePercentage = total > 0 ? (obtained / total) * 100 : 0;

    onSave({
      examGoalId: activeGoal.id,
      subjectId: subjectId,
      testName,
      scorePercentage,
      obtainedMarks: obtained,
      totalMarks: total,
      notes,
      date,
      createdAt: Date.now()
    });

    setTestName('');
    setObtainedMarks('');
    setTotalMarks('');
    setNotes('');
    setShowAddForm(false);
  };

  const chartData = goalTests.map(t => {
    const subj = subjects.find(s => String(s.id) === String(t.subjectId));
    return {
      date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: Math.round(t.scorePercentage),
      name: t.testName,
      subject: subj?.name || 'Subject'
    };
  });

  return (
    <div className="hypr-window span-2">
      <div className="win-titlebar">
        <div className="win-title">
          <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
          mock_tests <span className="class-name">— performance</span>
        </div>
        {subjects.length > 0 && !showAddForm && (
          <button className="hypr-btn" style={{ padding: '3px 8px', fontSize: '10px' }} onClick={() => setShowAddForm(true)}>
            + log score
          </button>
        )}
      </div>
      <div className="win-body">
        {showAddForm ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">test name</label>
              <input className="hypr-input" value={testName} onChange={e => setTestName(e.target.value)} required placeholder="e.g. Midterm 1" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">obtained</label>
                <input className="hypr-input" type="number" step="any" value={obtainedMarks} onChange={e => setObtainedMarks(e.target.value)} required placeholder="85" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">total</label>
                <input className="hypr-input" type="number" step="any" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} required placeholder="100" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">subject</label>
                <select className="hypr-input" value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">date</label>
                <input className="hypr-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">notes (optional)</label>
              <input className="hypr-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Weaknesses, etc." />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" className="hypr-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="hypr-btn primary">Save</button>
            </div>
          </form>
        ) : (
          <>
            {chartData.length > 0 && (
              <div style={{ height: '110px', width: '100%', marginBottom: '12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="var(--overlay0)" fontSize={9} tickLine={false} />
                    <YAxis stroke="var(--overlay0)" fontSize={9} tickLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {goalTests.slice().reverse().map(t => {
                const subj = subjects.find(s => String(s.id) === String(t.subjectId));
                const score = Math.round(t.scorePercentage);
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--crust)', border: '1px solid var(--surface0)', borderRadius: '6px', fontSize: '11px' }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
                      <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.testName}</div>
                      <div style={{ color: 'var(--overlay0)', fontSize: '10px', marginTop: '2px' }}>
                        {t.date} · {t.obtainedMarks}/{t.totalMarks}
                      </div>
                    </div>
                    {subj && (
                      <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15`, marginRight: '6px', cursor: 'default' }}>
                        {subj.name}
                      </span>
                    )}
                    <span style={{ fontWeight: '800', color: score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)', marginRight: '8px' }}>
                      {score}%
                    </span>
                    <button className="sm-btn" style={{ width: '20px', height: '20px', fontSize: '10px' }} onClick={() => onDelete(t.id)}>
                      ×
                    </button>
                  </div>
                );
              })}

              {goalTests.length === 0 && (
                <p style={{ color: 'var(--overlay0)', textAlign: 'center', fontSize: '11px', margin: '12px 0' }}>No tests recorded yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AccountView({ user, examGoals, lastSyncTime, onSaveGoal, onDeleteGoal, onSetActiveGoal, showToast, theme, setTheme }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [targetMins, setTargetMins] = useState(360);

  const handleLogin = async () => {
    if (!auth) {
      alert("Firebase Config not supplied yet. Define VITE_FIREBASE_API_KEY environment variables to compile Firebase Cloud sync.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('signed in successfully');
    } catch (e) {
      console.error("Auth failed:", e);
      alert("Login failed: " + e.message);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      showToast('signed out');
    }
  };

  const handleSaveGoal = () => {
    if (!goalName.trim() || !goalDate) return;
    onSaveGoal({
      name: goalName.trim(),
      examDate: goalDate,
      dailyTargetMinutes: targetMins,
      isActive: examGoals.length === 0,
      createdAt: Date.now()
    });
    setGoalName('');
    setGoalDate('');
    setShowAddGoal(false);
  };

  const exportData = () => {
    const data = {
      examGoals: JSON.parse(localStorage.getItem('focusly_exam_goals') || '[]'),
      subjects: JSON.parse(localStorage.getItem('focusly_subjects') || '[]'),
      topics: JSON.parse(localStorage.getItem('focusly_topics') || '[]'),
      sessions: JSON.parse(localStorage.getItem('focusly_sessions') || '[]'),
      mockTests: JSON.parse(localStorage.getItem('focusly_mock_tests') || '[]')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusly_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('export complete');
  };

  const clearData = () => {
    if (confirm("Are you absolutely sure you want to clear all your local study data? This cannot be undone!")) {
      localStorage.clear();
      showToast('data cleared, reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="hypr-window active-window">
      <div className="win-titlebar">
        <div className="win-title">
          <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
          account <span className="class-name">— sync & config</span>
        </div>
      </div>
      <div className="win-body" style={{ maxWidth: '560px', margin: '0 auto', width: '100%' }}>
        <div className="prompt-line">
          <span className="arrow">❯</span>
          <span className="path">~/account</span>
          <span className="cmd">status</span>
        </div>

        <div className="neofetch" style={{ marginBottom: '16px' }}>
          <div className="neo-info" style={{ width: '100%' }}>
            <div><span className="key">sync_status</span><span className="sep">: </span>
              <span className="val" style={{ color: user ? 'var(--green)' : 'var(--peach)' }}>
                {user ? 'connected & running' : 'offline (local mode)'}
              </span>
            </div>
            <div><span className="key">account</span><span className="sep">: </span><span class="val">{user ? user.email : 'local guest'}</span></div>
            <div><span className="key">database</span><span className="sep">: </span><span class="val">{user ? 'firestore' : 'localStorage'}</span></div>
            {lastSyncTime && <div><span className="key">last_sync</span><span class="sep">: </span><span class="val">{lastSyncTime}</span></div>}
          </div>
        </div>

        <div className="section-head">
          <div className="line"></div>
          <div className="label">cloud integration</div>
          <div className="line"></div>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--overlay0)', marginBottom: '10px', lineHeight: '1.6' }}>
          link a google account to sync study data across devices. data is stored locally until then.
        </p>
        {user ? (
          <button className="hypr-btn danger" style={{ width: '100%', justifyContent: 'center', marginBottom: '18px' }} onClick={handleLogout}>
            sign out account
          </button>
        ) : (
          <button className="hypr-btn primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '18px' }} onClick={handleLogin}>
            sign in with google
          </button>
        )}

        <div className="section-head">
          <div className="line"></div>
          <div className="label">active theme select</div>
          <div className="line"></div>
        </div>
        <select 
          value={theme} 
          onChange={(e) => setTheme(e.target.value)}
          className="hypr-input"
          style={{ marginBottom: '18px', cursor: 'pointer' }}
        >
          <option value="midnight">🌑 Midnight</option>
          <option value="ocean">🌊 Ocean</option>
          <option value="forest">🌿 Forest</option>
          <option value="paper">📄 Paper</option>
          <option value="sakura">🌸 Sakura</option>
          <option value="aurora">🌌 Aurora</option>
          <option value="ember">🔥 Ember</option>
          <option value="lavender">💜 Lavender</option>
          <option value="mint">🌱 Mint</option>
        </select>

        <div className="section-head">
          <div className="line"></div>
          <div className="label">exam goals manager</div>
          <div className="line"></div>
        </div>
        
        {examGoals.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px', background: 'var(--crust)', border: '1px solid var(--surface0)', borderRadius: '8px', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', margin: 0 }}>no targets configured yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {examGoals.map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--crust)', border: g.isActive ? '1px solid var(--accent)' : '1px solid var(--surface0)', borderRadius: '8px', fontSize: '11px' }}>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--text)' }}>{g.name}</div>
                  <div style={{ color: 'var(--overlay0)', fontSize: '10px', marginTop: '2px' }}>
                    exam date: {g.examDate} · target: {(g.dailyTargetMinutes / 60).toFixed(1)}h/day
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!g.isActive && (
                    <button className="hypr-btn" style={{ padding: '3px 8px', fontSize: '10px' }} onClick={() => onSetActiveGoal(g.id)}>
                      activate
                    </button>
                  )}
                  <button className="sm-btn" onClick={() => onDeleteGoal(g.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="hypr-btn" style={{ width: '100%', justifyContent: 'center', marginBottom: '20px' }} onClick={() => setShowAddGoal(true)}>
          + add new exam goal
        </button>

        <div className="section-head">
          <div className="line"></div>
          <div className="label">data management</div>
          <div className="line"></div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="hypr-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={exportData}>export backup</button>
          <button className="hypr-btn danger" style={{ flex: 1, justifyContent: 'center' }} onClick={clearData}>clear cache</button>
        </div>
      </div>

      {/* Add Exam Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">New Exam Target</div>
            <div className="form-group">
              <label className="form-label">exam name</label>
              <input className="hypr-input" placeholder="e.g. GATE 2027 CSE, JEE Advanced" value={goalName} onChange={(e) => setGoalName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">target date</label>
              <input className="hypr-input" type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">daily study target</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
                <button className="hypr-btn" onClick={() => setTargetMins(prev => Math.max(60, prev - 30))}>-30m</button>
                <span style={{ fontSize: '14px', fontWeight: '700', minWidth: '80px', textAlign: 'center' }}>{(targetMins / 60).toFixed(1)} hrs</span>
                <button className="hypr-btn" onClick={() => setTargetMins(prev => prev + 30)}>+30m</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="hypr-btn" onClick={() => setShowAddGoal(false)}>Cancel</button>
              <button className="hypr-btn primary" onClick={handleSaveGoal}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
