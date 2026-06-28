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
  const [flashcards, setFlashcards] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [dailyTargets, setDailyTargets] = useState([]);
  const [streakFreezes, setStreakFreezes] = useState([]);
  const [freezeTokens, setFreezeTokens] = useState(1);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('focusly_theme') || 'midnight');
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
    const unsubAuth = DataService.subscribeToAuth(setUser);
    const unsubGoals = DataService.subscribeToExamGoals(setExamGoals);
    const unsubSubjects = DataService.subscribeToSubjects(setSubjects);
    const unsubTopics = DataService.subscribeToTopics(setTopics);
    const unsubSessions = DataService.subscribeToSessions(setSessions);
    const unsubMockTests = DataService.subscribeToMockTests(setMockTests);
    const unsubFlashcards = DataService.subscribeToFlashcards(setFlashcards);
    const unsubMistakes = DataService.subscribeToMistakes(setMistakes);
    const unsubDailyTargets = DataService.subscribeToDailyTargets(setDailyTargets);
    const unsubStreakFreezes = DataService.subscribeToStreakFreezes(setStreakFreezes);
    const unsubFreezeTokens = DataService.subscribeToFreezeTokens(setFreezeTokens);
    const unsubLongestStreak = DataService.subscribeToLongestStreak(setLongestStreak);
    const unsubLastSync = DataService.subscribeToLastSyncTime(setLastSyncTime);

    return () => {
      unsubAuth();
      unsubGoals();
      unsubSubjects();
      unsubTopics();
      unsubSessions();
      unsubMockTests();
      unsubFlashcards();
      unsubMistakes();
      unsubDailyTargets();
      unsubStreakFreezes();
      unsubFreezeTokens();
      unsubLongestStreak();
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
    if (isSessionActiveGlobally) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const key = e.key;
      if (key === '1') setActiveTab('dashboard');
      else if (key === '2') setActiveTab('timer');
      else if (key === '3') setActiveTab('syllabus');
      else if (key === '4') setActiveTab('history');
      else if (key === '5') setActiveTab('analytics');
      else if (key === '6') setActiveTab('account');
      else if (key === '7') setActiveTab('mistakes');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActiveGlobally]);

  const activeGoal = examGoals.find(g => g.isActive) || null;

  // Stats computed for top bar Waybar display
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
    const freezes = new Set(streakFreezes);
    let streak = 0;
    let d = new Date();
    let checkDateStr = d.toISOString().split('T')[0];
    
    // If today is not studied and not frozen, check yesterday to continue a previous streak
    if (!dates.has(checkDateStr) && !freezes.has(checkDateStr)) {
      d.setDate(d.getDate() - 1);
      checkDateStr = d.toISOString().split('T')[0];
    }
    
    while (dates.has(checkDateStr) || freezes.has(checkDateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
      checkDateStr = d.toISOString().split('T')[0];
    }
    return streak;
  })();

  // Sync longest streak
  useEffect(() => {
    if (currentStreak > longestStreak) {
      DataService.saveLongestStreak(currentStreak);
    }
  }, [currentStreak, longestStreak]);

  // Award streak freeze tokens on multiples of 7
  useEffect(() => {
    if (currentStreak > 0 && currentStreak % 7 === 0) {
      const lastAwardedMilestone = parseInt(localStorage.getItem('focusly_last_awarded_milestone') || '0');
      if (currentStreak > lastAwardedMilestone) {
        localStorage.setItem('focusly_last_awarded_milestone', String(currentStreak));
        DataService.awardStreakFreeze();
        showToast(`Congratulations! You earned a Streak Freeze token for reaching a ${currentStreak}-day streak! ❄️`);
      }
    }
  }, [currentStreak]);

  const weeklyStreakDays = (() => {
    const dates = new Set(sessions.filter(s => s.completedDurationSeconds > 0).map(s => s.date));
    let studiedDays = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const dateStr = d.toISOString().split('T')[0];
      if (dates.has(dateStr)) {
        studiedDays++;
      }
      d.setDate(d.getDate() - 1);
    }
    return studiedDays;
  })();

  return (
    <div className="app-container">
      {/* WAYBAR TOP BAR */}
      {!isSessionActiveGlobally && (
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
            <button className={`ws-btn ${activeTab === 'mistakes' ? 'active' : ''}`} onClick={() => setActiveTab('mistakes')} title="mistake log">7</button>
          </div>
          <div className="waybar-center">
            <div className="bar-module">
              <span className="icon">◉</span>
              <span className="val">{currentStreak} day streak</span>
            </div>
            {activeGoal && daysRemaining !== null && (
              <div className="bar-module">
                <span className="icon">📅</span>
                <span className="val">{daysRemaining}d to exam</span>
              </div>
            )}
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
      )}

      {/* NOTIFICATION TOAST */}
      {toastMsg && <div className="toast show">{toastMsg}</div>}

      {/* COMPOSITOR GRID WRAPPER */}
      <div className="compositor-wrapper" style={{ 
        padding: isSessionActiveGlobally 
          ? 'var(--window-gap)' 
          : 'calc(var(--bar-height) + var(--window-gap)) var(--window-gap) var(--window-gap)', 
        minHeight: '100vh', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
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
              flashcards={flashcards}
              dailyTargets={dailyTargets}
              freezeTokens={freezeTokens}
              streakFreezes={streakFreezes}
              longestStreak={longestStreak}
              weeklyStreakDays={weeklyStreakDays}
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

          {activeTab === 'mistakes' && (
            <MistakesView 
              subjects={subjects}
              mistakes={mistakes}
              onSaveMistake={(m) => {
                DataService.saveMistake(m);
                showToast('mistake logged');
              }}
              onDeleteMistake={(id) => {
                DataService.deleteMistake(id);
                showToast('mistake deleted');
              }}
              showToast={showToast}
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

function DashboardView({ activeGoal, sessions, subjects, topics, setActiveTab, onFocusNow, currentStreak, todayHours, showToast, theme, flashcards, dailyTargets, freezeTokens, streakFreezes, longestStreak, weeklyStreakDays }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr);
  const dailyTargetMinutes = activeGoal ? activeGoal.dailyTargetMinutes : 360;
  const progressPercent = Math.min((todayHours * 3600) / (dailyTargetMinutes * 60), 1);

  // Active Recall deck reviewer state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentReviewCardIndex, setCurrentReviewCardIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);

  // Daily target planner state
  const [dailySubjectId, setDailySubjectId] = useState(subjects[0]?.id || '');
  const [dailyTargetMins, setDailyTargetMins] = useState(60);

  useEffect(() => {
    if (subjects.length > 0 && !dailySubjectId) {
      setDailySubjectId(subjects[0].id);
    }
  }, [subjects]);

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
  }).sort((a, b) => b.rate - a.rate);

  const recentSessionsList = sessions.slice(0, 4);

  // Calculate due cards count
  const todayISO = new Date().toISOString().split('T')[0];
  const dueCards = flashcards.filter(c => !c.nextReviewDate || c.nextReviewDate <= todayISO);

  // Handle flashcard grading using SM-2
  const handleGradeCard = (card, q) => {
    let { easeFactor, intervalDays, repetitions } = card;
    easeFactor = easeFactor || 2.5;
    intervalDays = intervalDays !== undefined ? intervalDays : 0;
    repetitions = repetitions !== undefined ? repetitions : 0;

    if (q >= 3) {
      if (repetitions === 0) {
        intervalDays = 1;
      } else if (repetitions === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      repetitions++;
    } else {
      repetitions = 0;
      intervalDays = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalDays);

    const updatedCard = {
      ...card,
      easeFactor,
      intervalDays,
      repetitions,
      nextReviewDate: nextDate.toISOString().split('T')[0]
    };

    DataService.saveFlashcard(updatedCard);
    showToast('flashcard graded');

    setRevealAnswer(false);
    if (currentReviewCardIndex + 1 < dueCards.length) {
      setCurrentReviewCardIndex(prev => prev + 1);
    } else {
      setIsReviewModalOpen(false);
      setCurrentReviewCardIndex(0);
    }
  };

  // Streak rescue computations
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const datesStudied = new Set(sessions.filter(s => s.completedDurationSeconds > 0).map(s => s.date));
  const yesterdayFrozen = streakFreezes.includes(yesterdayStr);
  const yesterdayStudied = datesStudied.has(yesterdayStr);
  const canRescueStreak = !yesterdayStudied && !yesterdayFrozen && freezeTokens > 0 && currentStreak > 0;

  // Daily target helpers
  const todayTargets = dailyTargets.filter(t => t.date === todayStr);

  const handleAddDailyTarget = () => {
    if (!dailySubjectId) return;
    DataService.saveDailyTarget({
      subjectId: dailySubjectId,
      targetMinutes: parseInt(dailyTargetMins) || 30,
      date: todayStr
    });
    showToast('Daily target added!');
  };

  const handleDeleteDailyTarget = (id) => {
    DataService.deleteDailyTarget(id);
    showToast('Daily target removed!');
  };

  const totalPlannedMins = todayTargets.reduce((acc, t) => acc + t.targetMinutes, 0);
  const totalAchievedMins = todayTargets.reduce((acc, t) => {
    const tSessions = todaySessions.filter(s => String(s.subjectId) === String(t.subjectId));
    const tSecs = tSessions.reduce((sum, s) => sum + s.completedDurationSeconds, 0);
    return acc + Math.min(t.targetMinutes, Math.round(tSecs / 60));
  }, 0);
  const dailyPercentage = totalPlannedMins > 0 ? Math.round((totalAchievedMins / totalPlannedMins) * 100) : 0;

  return (
    <>
      {/* Streak Rescue Banner */}
      {canRescueStreak && (
        <div className="span-3" style={{ gridColumn: 'span 3', width: '100%' }}>
          <div className="streak-rescue-banner" style={{ background: 'rgba(243, 139, 168, 0.15)', border: '1px solid var(--red)', borderRadius: '8px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--red)', fontWeight: '600' }}>
              ❄️ Streak Rescue: You missed studying yesterday! Protect your {currentStreak} day streak using a freeze token?
            </div>
            <button className="hypr-btn danger" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={async () => {
              const success = await DataService.useStreakFreeze(yesterdayStr);
              if (success) showToast('Streak rescued with a Freeze Token! ❄️');
            }}>
              Use Streak Freeze ({freezeTokens} left)
            </button>
          </div>
        </div>
      )}

      {/* Window 1: Neofetch Stats */}
      <div className="hypr-window">
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
          <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <div className="stat-card">
              <div className="stat-label">exam goal</div>
              <div className="stat-value accent" style={{ fontSize: activeGoal ? '14px' : '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeGoal ? `${daysRemaining} days` : '—'}
              </div>
              <div className="stat-sub" style={{ fontSize: '9px' }}>{activeGoal ? activeGoal.name : 'no goal set'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">streak</div>
              <div className="stat-value peach">{currentStreak}</div>
              <div className="stat-sub">days</div>
            </div>
            <div className="stat-card" onClick={() => dueCards.length > 0 && setIsReviewModalOpen(true)} style={{ cursor: dueCards.length > 0 ? 'pointer' : 'default' }}>
              <div className="stat-label">recall cards</div>
              <div className={`stat-value ${dueCards.length > 0 ? 'red' : 'green'}`}>{dueCards.length}</div>
              <div className="stat-sub">due review</div>
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
            use workspace switcher in the top bar or press <span style={{ color: 'var(--accent)' }}>1-7</span> to navigate between panels.
          </p>
        </div>
      </div>

      {/* Window 4: Syllabus Preview (spans 2 cols) */}
      <div className="hypr-window span-2">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            syllabus <span className="class-name">— overall subject progress</span>
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
                      {(s.rate * 100).toFixed(0)}% topics done ({s.completed}/{s.total})
                    </span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '5px', borderRadius: '3px' }}>
                    <div className="progress-bar-fill" style={{ width: `${s.rate * 100}%`, backgroundColor: s.colorHex, borderRadius: '3px' }} />
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

      {/* Window 6: Daily Planner Checklist (spans 2 cols) */}
      <div className="hypr-window span-2">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            daily_planner <span className="class-name">— target checklist</span>
          </div>
        </div>
        <div className="win-body">
          {subjects.length === 0 ? (
            <div className="empty-state">
              <p>Add subjects in the syllabus tab to configure daily targets.</p>
            </div>
          ) : (
            <div>
              {/* Form to add target */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', background: 'var(--crust)', padding: '8px', borderRadius: '6px', border: '1px solid var(--surface0)' }}>
                <select className="hypr-input" style={{ flex: 2, height: '28px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }} value={dailySubjectId} onChange={e => setDailySubjectId(e.target.value)}>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input type="number" className="hypr-input" style={{ flex: 1, height: '28px', padding: '2px 8px', fontSize: '11px' }} placeholder="Minutes" value={dailyTargetMins} onChange={e => setDailyTargetMins(e.target.value)} />
                <button className="hypr-btn primary" style={{ padding: '2px 10px', fontSize: '10px' }} onClick={handleAddDailyTarget}>+ add target</button>
              </div>

              {/* Targets Checklist */}
              {todayTargets.length === 0 ? (
                <p style={{ color: 'var(--overlay0)', fontSize: '11px', textAlign: 'center', margin: '12px 0' }}>No daily study targets planned for today yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayTargets.map(t => {
                    const subj = subjects.find(s => String(s.id) === String(t.subjectId));
                    const matchingSessions = todaySessions.filter(s => String(s.subjectId) === String(t.subjectId));
                    const completedMins = Math.round(matchingSessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0) / 60);
                    const isDone = completedMins >= t.targetMinutes;
                    return (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: isDone ? 'rgba(166, 227, 161, 0.05)' : 'var(--crust)', border: isDone ? '1px solid var(--green)' : '1px solid var(--surface0)', borderRadius: '6px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: isDone ? 'var(--green)' : 'var(--overlay0)', fontWeight: '700' }}>
                            {isDone ? '✓ [DONE]' : '☐ [TODO]'}
                          </span>
                          <span style={{ fontWeight: '600', color: subj?.colorHex }}>{subj?.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: 'var(--overlay0)' }}>
                            {completedMins}m / {t.targetMinutes}m completed
                          </span>
                          <button className="sm-btn" style={{ width: '18px', height: '18px', fontSize: '9px' }} onClick={() => handleDeleteDailyTarget(t.id)}>×</button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: '1px dashed var(--surface0)', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--overlay0)' }}>
                    <span>Daily Completion: {dailyPercentage}%</span>
                    <span>{dailyPercentage >= 100 ? '🔥 Daily goal fully achieved!' : 'Keep pushing!'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Window 7: Streaks & Recall Stats (1 col) */}
      <div className="hypr-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            gamification <span className="class-name">— recovery</span>
          </div>
        </div>
        <div className="win-body" style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--surface0)' }}>
              <span style={{ color: 'var(--overlay0)' }}>Freeze Tokens:</span>
              <strong style={{ color: 'var(--blue)' }}>{freezeTokens} available</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--surface0)' }}>
              <span style={{ color: 'var(--overlay0)' }}>Longest Streak:</span>
              <strong style={{ color: 'var(--peach)' }}>{longestStreak} days</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--surface0)' }}>
              <span style={{ color: 'var(--overlay0)' }}>Weekly studied:</span>
              <strong style={{ color: 'var(--green)' }}>{weeklyStreakDays} / 7 days</strong>
            </div>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--overlay0)', marginTop: '8px', lineHeight: '1.4' }}>
            * earn 1 streak freeze token automatically for every 7 days studied. freezes protect your streak when you miss a day.
          </p>
        </div>
      </div>

      {/* Active Recall reviewer Modal overlay */}
      {isReviewModalOpen && dueCards.length > 0 && (() => {
        const card = dueCards[currentReviewCardIndex];
        const subj = subjects.find(s => String(s.id) === String(card.subjectId));
        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '480px', width: '92%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface0)', paddingBottom: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="modal-header">Active Recall Reviewer</div>
                  {subj && <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15` }}>{subj.name}</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--overlay0)' }}>
                  Card {currentReviewCardIndex + 1} of {dueCards.length}
                </div>
              </div>

              <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--crust)', border: '1px solid var(--surface0)', borderRadius: '6px', padding: '16px', margin: '8px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--overlay0)', textTransform: 'uppercase', marginBottom: '8px' }}>Question</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{card.question}</div>
                
                {revealAnswer && (
                  <div style={{ marginTop: '16px', borderTop: '1px dashed var(--surface0)', paddingTop: '16px', width: '100%' }}>
                    <div style={{ fontSize: '11px', color: 'var(--overlay0)', textTransform: 'uppercase', marginBottom: '8px' }}>Answer</div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--green)', whiteSpace: 'pre-wrap' }}>{card.answer}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                {!revealAnswer ? (
                  <>
                    <button className="hypr-btn" onClick={() => setIsReviewModalOpen(false)}>Close</button>
                    <button className="hypr-btn primary" onClick={() => setRevealAnswer(true)}>Reveal Answer</button>
                  </>
                ) : (
                  <>
                    <button className="hypr-btn danger" style={{ padding: '6px 12px' }} onClick={() => handleGradeCard(card, 1)}>Again (Hard)</button>
                    <button className="hypr-btn primary" style={{ padding: '6px 12px' }} onClick={() => handleGradeCard(card, 3)}>Good (Ok)</button>
                    <button className="hypr-btn success" style={{ padding: '6px 12px', background: 'var(--green)', color: 'var(--bg-color)' }} onClick={() => handleGradeCard(card, 5)}>Easy (Simple)</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function MistakesView({ subjects, mistakes, onSaveMistake, onDeleteMistake, showToast }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [topicName, setTopicName] = useState('');
  const [whatWentWrong, setWhatWentWrong] = useState('');
  const [correctApproach, setCorrectApproach] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subjectId || !topicName.trim() || !whatWentWrong.trim() || !correctApproach.trim()) return;
    
    onSaveMistake({
      subjectId,
      topicName: topicName.trim(),
      whatWentWrong: whatWentWrong.trim(),
      correctApproach: correctApproach.trim(),
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now()
    });

    setTopicName('');
    setWhatWentWrong('');
    setCorrectApproach('');
  };

  const filteredMistakes = mistakes.filter(m => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const subj = subjects.find(s => String(s.id) === String(m.subjectId));
    return (m.topicName || '').toLowerCase().includes(query) ||
           (m.whatWentWrong || '').toLowerCase().includes(query) ||
           (m.correctApproach || '').toLowerCase().includes(query) ||
           (subj?.name || '').toLowerCase().includes(query);
  });

  return (
    <div className="hypr-window">
      <div className="win-titlebar">
        <div className="win-title">
          <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
          mistake_log <span className="class-name">— error book</span>
        </div>
        <input 
          type="text" 
          className="hypr-input" 
          style={{ width: '200px', height: '28px', padding: '2px 8px', fontSize: '11px' }}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search errors, topics..."
        />
      </div>
      <div className="win-body" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
        {/* Left Column: Form */}
        <div style={{ borderRight: '1px solid var(--surface0)', paddingRight: '16px' }}>
          <div className="prompt-line">
            <span className="arrow">❯</span>
            <span className="path">~/mistakes</span>
            <span className="cmd">log --new</span>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="hypr-input" value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topic / Test Context</label>
              <input className="hypr-input" placeholder="e.g. Optics - Snell's Law" value={topicName} onChange={e => setTopicName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">What Went Wrong?</label>
              <textarea className="hypr-input" rows="3" placeholder="Describe the error, misconception, or mistake..." value={whatWentWrong} onChange={e => setWhatWentWrong(e.target.value)} required style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Correct Approach / Concept</label>
              <textarea className="hypr-input" rows="3" placeholder="What is the correct way, formula, or concept to remember?" value={correctApproach} onChange={e => setCorrectApproach(e.target.value)} required style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="hypr-btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>Save Log</button>
          </form>
        </div>

        {/* Right Column: Mistakes List */}
        <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
          <div className="prompt-line">
            <span className="arrow">❯</span>
            <span className="path">~/mistakes</span>
            <span className="cmd">cat log.json</span>
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: '11px' }}>No mistakes logged yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMistakes.map(m => {
                const subj = subjects.find(s => String(s.id) === String(m.subjectId));
                return (
                  <div key={m.id} style={{ border: '1px solid var(--surface0)', borderRadius: '8px', padding: '12px', background: 'var(--surface1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface0)', paddingBottom: '6px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {subj && <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15` }}>{subj.name}</span>}
                        <strong style={{ fontSize: '12px', color: 'var(--text)' }}>{m.topicName}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--overlay0)' }}>{m.date}</span>
                        <button className="sm-btn" onClick={() => onDeleteMistake(m.id)}>×</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                      <div>
                        <span style={{ color: 'var(--red)', fontWeight: '600' }}>✗ Mistake:</span>
                        <div style={{ padding: '6px', background: 'var(--crust)', borderRadius: '4px', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{m.whatWentWrong}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--green)', fontWeight: '600' }}>✓ Solution / Fix:</span>
                        <div style={{ padding: '6px', background: 'var(--crust)', borderRadius: '4px', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{m.correctApproach}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimerView({ subjects, sessions, onSaveSession, prefilledSubjectId, prefilledSessionName, clearPrefill, showToast, onSessionActiveChange }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionName, setSessionName] = useState('Study Session');
  const [selectedTag, setSelectedTag] = useState('');
  const activeSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));

  // Configuration
  const [presetMode, setPresetMode] = useState('STANDARD');
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

  // New Upgrades State
  const [pausesCount, setPausesCount] = useState(0);

  const [showSimWarning, setShowSimWarning] = useState(false);
  const [simApproved, setSimApproved] = useState(false);
  const [sessionConfidence, setSessionConfidence] = useState(3);
  const [addFlashcardChecked, setAddFlashcardChecked] = useState(false);
  const [flashcardQuestion, setFlashcardQuestion] = useState('');
  const [flashcardAnswer, setFlashcardAnswer] = useState('');



  // Notify parent of isSessionActive state
  useEffect(() => {
    if (onSessionActiveChange) {
      onSessionActiveChange(isSessionActive);
    }
  }, [isSessionActive, onSessionActiveChange]);

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



  // Before unload handler for exam simulation
  useEffect(() => {
    if (isTimerRunning && presetMode === 'EXAM_SIM') {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Leaving now will fail the exam simulation. Are you sure?';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isTimerRunning, presetMode]);

  const handlePresetChange = (preset) => {
    setPresetMode(preset);
    setSimApproved(false);
    if (preset === 'STANDARD') {
      setFocusMinutes(25);
      setShortBreakMinutes(5);
      setLongBreakMinutes(15);
      setTotalCycles(4);
      setTimerSecondsLeft(25 * 60);
    } else if (preset === 'ULTRADIAN') {
      setFocusMinutes(52);
      setShortBreakMinutes(17);
      setLongBreakMinutes(17);
      setTotalCycles(3);
      setTimerSecondsLeft(52 * 60);
    } else if (preset === 'COMPETITIVE') {
      setFocusMinutes(50);
      setShortBreakMinutes(10);
      setLongBreakMinutes(15);
      setTotalCycles(4);
      setTimerSecondsLeft(50 * 60);
    } else if (preset === 'EXAM_SIM') {
      setFocusMinutes(180);
      setShortBreakMinutes(0);
      setLongBreakMinutes(0);
      setTotalCycles(1);
      setTimerSecondsLeft(180 * 60);
    }
  };

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
    if (presetMode === 'EXAM_SIM' && !simApproved) {
      setShowSimWarning(true);
      return;
    }
    setIsTimerRunning(true);
    setIsSessionActive(true);
    expectedEndTimeRef.current = Date.now() + (timerSecondsLeft * 1000);
  };

  const pauseTimer = () => {
    if (presetMode === 'EXAM_SIM') return; // Cannot pause in simulation
    setIsTimerRunning(false);
    expectedEndTimeRef.current = null;
    setPausesCount(p => p + 1);
  };

  const skipPhase = () => {
    if (presetMode === 'EXAM_SIM') return; // Cannot skip in simulation
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
    if (presetMode === 'EXAM_SIM') {
      if (confirm('Stopping now will fail the exam simulation. Are you sure you want to exit?')) {
        pauseTimer();
        let elapsed = focusMinutes * 60 - timerSecondsLeft;
        setAccumulatedCompletedSeconds(elapsed);
        handleFinishSession(false);
      }
      return;
    }
    
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
    
    // Calculate focus quality score
    let focusScore = Math.max(0, 100 - (pausesCount * 15));
    if (presetMode === 'EXAM_SIM' && completedSeconds < (focusMinutes * 60)) {
      focusScore = 0; // Failed simulation
    }

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
      subjectId: selectedSubjectId || null,
      confidenceRating: sessionConfidence,
      focusScore
    };

    onSaveSession(sessionObj);

    // Save flashcard if checked
    if (addFlashcardChecked && flashcardQuestion.trim() && flashcardAnswer.trim() && selectedSubjectId) {
      DataService.saveFlashcard({
        subjectId: selectedSubjectId,
        question: flashcardQuestion.trim(),
        answer: flashcardAnswer.trim(),
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewDate: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
      });
    }

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
    setAddFlashcardChecked(false);
    setFlashcardQuestion('');
    setFlashcardAnswer('');
    setSimApproved(false);
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
      <div className={`hypr-window span-2 ${isSessionActive ? 'immersive-active' : ''}`} style={{ minHeight: 0 }}>
        {isSessionActive && (
          <div className="floating-details-window">
            <div className="win-titlebar" style={{ padding: '4px 10px', minHeight: '24px' }}>
              <div className="win-title" style={{ fontSize: '10px' }}>
                <div className="win-dots" style={{ gap: '3px' }}>
                  <div className="win-dot close" style={{ width: '6px', height: '6px' }}></div>
                  <div className="win-dot min" style={{ width: '6px', height: '6px' }}></div>
                  <div className="win-dot max" style={{ width: '6px', height: '6px' }}></div>
                </div>
                focus_metadata
              </div>
            </div>
            <div className="win-body" style={{ padding: '10px', fontSize: '11px', minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: activeSubject?.colorHex || 'var(--overlay0)' }} />
                <span style={{ fontWeight: '700', color: activeSubject?.colorHex || 'var(--text)' }}>
                  {activeSubject?.name || 'no subject'}
                </span>
              </div>
              <div style={{ fontWeight: '500', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={sessionName || 'Study Session'}>
                {sessionName || 'Study Session'}
              </div>
              {selectedTag && (
                <span style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: '600' }}>
                  #{selectedTag.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        )}
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
              {currentPhase === 'FOCUS' ? (presetMode === 'EXAM_SIM' ? 'exam simulation' : 'focus session') : currentPhase === 'SHORT_BREAK' ? 'short break' : 'long break'}
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
              <button className="hypr-btn primary" onClick={pauseTimer} disabled={presetMode === 'EXAM_SIM'}>⏸ pause</button>
            ) : (
              <button className="hypr-btn primary" onClick={startTimer}>▶ start</button>
            )}
            <button className="hypr-btn" onClick={skipPhase} disabled={presetMode === 'EXAM_SIM'}>⏭ skip</button>
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
                  <span className="setting-label">Preset Mode</span>
                  <select 
                    value={presetMode} 
                    onChange={e => handlePresetChange(e.target.value)}
                    className="hypr-input" 
                    style={{ width: '180px', height: '28px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    <option value="STANDARD">Standard (25/5)</option>
                    <option value="ULTRADIAN">Ultradian (52/17)</option>
                    <option value="COMPETITIVE">Prep Mode (50/10)</option>
                    <option value="EXAM_SIM">Exam Simulation (3h)</option>
                  </select>
                </div>
                {presetMode !== 'EXAM_SIM' && (
                  <>
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
                  </>
                )}
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
          <div className="modal-content" style={{ maxWidth: '440px', width: '92%' }}>
            <div className="modal-header">Session Finished! 🔥</div>
            
            <div style={{ margin: '12px 0' }}>
              <label className="form-label" style={{ marginBottom: '6px' }}>How did this session feel? (Confidence Rating)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    style={{ cursor: 'pointer', fontSize: '20px', color: star <= sessionConfidence ? 'var(--yellow)' : 'var(--surface2)', transition: 'color 0.2s' }}
                    onClick={() => setSessionConfidence(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Study Journal Notes</label>
              <textarea 
                className="hypr-input" 
                rows="3" 
                placeholder="e.g., Solved Boolean Algebra minimization sheets, solved K-Map exceptions."
                value={sessionNotesInput}
                onChange={(e) => setSessionNotesInput(e.target.value)}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
            </div>

            {selectedSubjectId && (
              <div style={{ borderTop: '1px dashed var(--surface0)', paddingTop: '10px', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: 'var(--text)' }}>
                  <input 
                    type="checkbox" 
                    checked={addFlashcardChecked} 
                    onChange={e => setAddFlashcardChecked(e.target.checked)} 
                  />
                  Create a review flashcard for this subject?
                </label>
                
                {addFlashcardChecked && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', paddingLeft: '14px', borderLeft: '2px solid var(--accent)' }}>
                    <div className="form-group">
                      <label className="form-label">Question</label>
                      <input className="hypr-input" placeholder="e.g. What are the 3 conditions for K-Map grouping?" value={flashcardQuestion} onChange={e => setFlashcardQuestion(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Answer</label>
                      <input className="hypr-input" placeholder="e.g. Must be powers of 2, adjacent cells, wrap-around allowed." value={flashcardAnswer} onChange={e => setFlashcardAnswer(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button className="hypr-btn" onClick={() => { setIsCompletedModalOpen(false); resetTimer(); }}>Discard</button>
              <button className="hypr-btn primary" onClick={saveAndExit}>Save & Exit</button>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Warn Popup */}
      {showSimWarning && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', width: '90%', textAlign: 'center' }}>
            <div className="modal-header" style={{ color: 'var(--red)' }}>⚠️ Exam Simulation Lock</div>
            <p style={{ fontSize: '12px', lineHeight: '1.5', margin: '12px 0' }}>
              Exam simulation mode mimics real conditions. It locks the screen for <strong>3 hours (180 mins)</strong> without breaks.
              <br /><br />
              <strong>Pause and Skip are disabled.</strong> Leaving the page or stopping will record a 0% focus score.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="hypr-btn" onClick={() => setShowSimWarning(false)}>Cancel</button>
              <button className="hypr-btn primary danger" onClick={() => {
                setSimApproved(true);
                setShowSimWarning(false);
                setIsTimerRunning(true);
                setIsSessionActive(true);
                expectedEndTimeRef.current = Date.now() + (180 * 60 * 1000);
              }}>
                Confirm & Lock
              </button>
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
      <div className="hypr-window">
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(s => {
    const matchesSubject = filterSubjectId ? String(s.subjectId) === String(filterSubjectId) : true;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesSubject;
    const matchesQuery = (s.label || '').toLowerCase().includes(query) ||
                         (s.notes || '').toLowerCase().includes(query) ||
                         (s.tag || '').toLowerCase().includes(query);
    return matchesSubject && matchesQuery;
  });

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
            {s.confidenceRating && (
              <span style={{ fontSize: '10px', color: 'var(--yellow)' }}>
                {'★'.repeat(s.confidenceRating)}{'☆'.repeat(5 - s.confidenceRating)}
              </span>
            )}
            {s.focusScore !== undefined && (
              <span className="chip" style={{ fontSize: '8px', borderColor: 'var(--blue)', color: 'var(--blue)', background: 'rgba(137, 180, 250, 0.05)', padding: '1px 4px', cursor: 'default' }}>
                focus: {s.focusScore}%
              </span>
            )}
          </div>
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
    <div className="hypr-window">
      <div className="win-titlebar">
        <div className="win-title">
          <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
          history <span className="class-name">— session log</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <input 
            type="text" 
            className="hypr-input" 
            style={{ width: '180px', height: '28px', padding: '2px 8px', fontSize: '11px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes, labels..."
          />
          {subjects.length > 0 && (
            <select 
              className="hypr-input" 
              style={{ width: '150px', height: '28px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
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
            <p>no study study sessions recorded yet</p>
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

  // Week-over-week deltas calculation
  const wowDelta = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current Week (rolling last 7 days: day 0 to day 6 ago)
    const curWeekStart = new Date(today);
    curWeekStart.setDate(today.getDate() - 6);
    
    // Previous Week (days 7 to 13 ago)
    const prevWeekStart = new Date(today);
    prevWeekStart.setDate(today.getDate() - 13);
    const prevWeekEnd = new Date(today);
    prevWeekEnd.setDate(today.getDate() - 7);

    const curWeekSessions = sessions.filter(s => {
      const d = new Date(s.date);
      return d >= curWeekStart && d <= today;
    });
    
    const prevWeekSessions = sessions.filter(s => {
      const d = new Date(s.date);
      return d >= prevWeekStart && d <= prevWeekEnd;
    });

    const curSeconds = curWeekSessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);
    const prevSeconds = prevWeekSessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);

    const curHours = curSeconds / 3600;
    const prevHours = prevSeconds / 3600;

    const curSubjs = new Set(curWeekSessions.filter(s => s.completedDurationSeconds > 0).map(s => s.subjectId)).size;
    const prevSubjs = new Set(prevWeekSessions.filter(s => s.completedDurationSeconds > 0).map(s => s.subjectId)).size;

    const deltaPercent = prevHours > 0 ? ((curHours - prevHours) / prevHours) * 100 : 0;

    return {
      curHours,
      prevHours,
      curSubjs,
      prevSubjs,
      deltaPercent
    };
  }, [sessions]);

  // Weakness Identification
  const weaknessStats = React.useMemo(() => {
    const stats = {};
    subjects.forEach(s => {
      stats[s.id] = { subject: s, totalSeconds: 0, ratings: [], hardCount: 0 };
    });

    sessions.forEach(s => {
      if (s.subjectId && stats[s.subjectId]) {
        stats[s.subjectId].totalSeconds += s.completedDurationSeconds;
        if (s.confidenceRating) {
          stats[s.subjectId].ratings.push(s.confidenceRating);
          if (s.confidenceRating <= 2) {
            stats[s.subjectId].hardCount++;
          }
        }
      }
    });

    const list = Object.values(stats).map(obj => {
      const avgConfidence = obj.ratings.length > 0 
        ? obj.ratings.reduce((a, b) => a + b, 0) / obj.ratings.length
        : null;
      const hours = obj.totalSeconds / 3600;
      return {
        subject: obj.subject,
        hours,
        avgConfidence,
        hardCount: obj.hardCount,
        ratingsCount: obj.ratings.length
      };
    }).filter(item => item.hours > 0 || item.ratingsCount > 0);

    // Sort by: lowest confidence first, then highest hours
    // (We want to find subjects studied a lot but with low confidence = weak spots)
    const weakSpots = [...list]
      .filter(x => x.hours > 0 && x.avgConfidence !== null)
      .sort((a, b) => {
        // High hours + low confidence = high weakness
        const scoreA = a.hours / (a.avgConfidence || 1);
        const scoreB = b.hours / (b.avgConfidence || 1);
        return scoreB - scoreA;
      });

    // Priority recommendations: rated hard but studied little
    const priorityQueue = [...list]
      .filter(x => x.hardCount > 0)
      .sort((a, b) => {
        // ratio of hard count to hours studied (higher means it was hard many times but studied very little)
        const ratioA = a.hardCount / (a.hours || 0.1);
        const ratioB = b.hardCount / (b.hours || 0.1);
        return ratioB - ratioA;
      });

    return {
      weakSpots,
      priorityQueue
    };
  }, [sessions, subjects]);

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
      <div className="hypr-window">
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

      {/* Window 4: Mock Tests performance */}
      <MockTestSection 
        mockTests={mockTests} 
        subjects={subjects}
        topics={topics}
        activeGoal={activeGoal} 
        onSave={onSaveMockTest} 
        onDelete={onDeleteMockTest} 
        showToast={showToast}
      />

      {/* Window 5: Week-over-Week Deltas */}
      <div className="hypr-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            comparison <span className="class-name">— week over week</span>
          </div>
        </div>
        <div className="win-body" style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--surface0)' }}>
              <span>This Week (rolling):</span>
              <strong>{wowDelta.curHours.toFixed(1)}h studied across {wowDelta.curSubjs} subjects</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--surface0)' }}>
              <span>Previous Week:</span>
              <strong>{wowDelta.prevHours.toFixed(1)}h studied across {wowDelta.prevSubjs} subjects</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span>Performance delta:</span>
              <strong style={{ 
                fontSize: '14px', 
                color: wowDelta.deltaPercent >= 0 ? 'var(--green)' : 'var(--red)' 
              }}>
                {wowDelta.deltaPercent >= 0 ? '▲' : '▼'} {Math.abs(wowDelta.deltaPercent).toFixed(1)}% {wowDelta.deltaPercent >= 0 ? 'improvement' : 'decline'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Window 6: Weakness Identification */}
      <div className="hypr-window">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            weakness_logs <span className="class-name">— spots & recommendations</span>
          </div>
        </div>
        <div className="win-body" style={{ fontSize: '11px', lineHeight: '1.4' }}>
          {weaknessStats.weakSpots.length === 0 ? (
            <p style={{ color: 'var(--overlay0)', fontSize: '11px', textAlign: 'center', margin: '24px 0' }}>Log sessions with confidence ratings to analyze weaknesses.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: '700', color: 'var(--red)', display: 'block', marginBottom: '4px' }}>⚠️ Detected Weak Spots (Studied but Hard):</span>
                {weaknessStats.weakSpots.slice(0, 2).map(ws => (
                  <div key={ws.subject.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--crust)', borderRadius: '4px', marginBottom: '4px' }}>
                    <span style={{ color: ws.subject.colorHex }}>{ws.subject.name}</span>
                    <span>{ws.hours.toFixed(1)}h studied · {ws.avgConfidence ? ws.avgConfidence.toFixed(1) : '—'}★ avg</span>
                  </div>
                ))}
              </div>
              
              {weaknessStats.priorityQueue.length > 0 && (
                <div style={{ marginTop: '6px', borderTop: '1px dashed var(--surface0)', paddingTop: '6px' }}>
                  <span style={{ fontWeight: '700', color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>💡 Priority Queue Recommendation:</span>
                  <div style={{ padding: '6px', background: 'var(--crust)', borderRadius: '4px', fontStyle: 'italic' }}>
                    "You rated {weaknessStats.priorityQueue[0].subject.name} as hard {weaknessStats.priorityQueue[0].hardCount} times but only studied it for {weaknessStats.priorityQueue[0].hours.toFixed(1)}h — consider dedicating more focus sessions here."
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

function MockTestSection({ mockTests, subjects, topics, activeGoal, onSave, onDelete, showToast }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterSubject, setFilterSubject] = useState(null);
  const [filterTopic, setFilterTopic] = useState(null);

  // Form state
  const [testName, setTestName] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [topicId, setTopicId] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  // Questions
  const [totalQ, setTotalQ] = useState('');
  const [att1, setAtt1] = useState('');
  const [att2, setAtt2] = useState('');
  const [notAtt, setNotAtt] = useState('');
  // Marks
  const [correctM, setCorrectM] = useState('');
  const [penaltyM, setPenaltyM] = useState('');
  // Time
  const [totalTime, setTotalTime] = useState('');
  const [timeTaken, setTimeTaken] = useState('');

  const netMarks = (parseFloat(correctM) || 0) - (parseFloat(penaltyM) || 0);

  useEffect(() => {
    if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id);
  }, [subjects]);

  // Reset topic when subject changes
  useEffect(() => { setTopicId(''); }, [subjectId]);

  const topicsForSubject = topics?.filter(t => String(t.subjectId) === String(subjectId)) || [];

  if (!activeGoal) {
    return (
      <div className="hypr-window span-2">
        <div className="win-titlebar">
          <div className="win-title">
            <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
            practice_tests <span className="class-name">— performance</span>
          </div>
        </div>
        <div className="win-body">
          <div className="empty-state"><p>set active goal to view tests</p></div>
        </div>
      </div>
    );
  }

  const goalTests = mockTests
    .filter(t => String(t.examGoalId) === String(activeGoal.id))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const filteredTests = goalTests.filter(t => {
    if (filterTopic) return String(t.topicId) === String(filterTopic);
    if (filterSubject) return String(t.subjectId) === String(filterSubject);
    return true;
  });

  const topicsForFilterSubject = topics?.filter(t => String(t.subjectId) === String(filterSubject)) || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!testName || !subjectId) return;
    const obtained = parseFloat(obtainedMarks) || 0;
    const total = parseFloat(totalMarks) || 100;
    const correct = parseFloat(correctM) || 0;
    const penalty = parseFloat(penaltyM) || 0;
    const scorePercentage = total > 0 ? (obtained / total) * 100 : 0;
    onSave({
      examGoalId: activeGoal.id,
      subjectId,
      topicId: topicId || null,
      testName,
      scorePercentage,
      obtainedMarks: obtained,
      totalMarks: total,
      correctMarks: correct,
      penaltyMarks: penalty,
      netMarks: correct - penalty,
      totalQuestions: parseInt(totalQ) || 0,
      attempted1Mark: parseInt(att1) || 0,
      attempted2Mark: parseInt(att2) || 0,
      notAttempted: parseInt(notAtt) || 0,
      totalTimeMinutes: parseInt(totalTime) || 0,
      timeTakenMinutes: parseInt(timeTaken) || 0,
      notes,
      date,
      createdAt: Date.now()
    });
    setTestName(''); setObtainedMarks(''); setTotalMarks(''); setNotes('');
    setTotalQ(''); setAtt1(''); setAtt2(''); setNotAtt('');
    setCorrectM(''); setPenaltyM(''); setTotalTime(''); setTimeTaken('');
    setTopicId('');
    setShowAddForm(false);
  };

  const chartData = filteredTests.map(t => ({
    date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: Math.round(t.scorePercentage),
    name: t.testName
  }));

  return (
    <div className="hypr-window span-2">
      <div className="win-titlebar">
        <div className="win-title">
          <div className="win-dots"><div className="win-dot close"></div><div className="win-dot min"></div><div className="win-dot max"></div></div>
          practice_tests <span className="class-name">— performance</span>
        </div>
        {subjects.length > 0 && !showAddForm && (
          <button className="hypr-btn" style={{ padding: '3px 8px', fontSize: '10px' }} onClick={() => setShowAddForm(true)}>
            + log result
          </button>
        )}
      </div>
      <div className="win-body">
        {showAddForm ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Section: Test Info */}
            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--surface0)', paddingBottom: '4px' }}>📝 Test Details</div>
            <div className="form-group">
              <label className="form-label">test name *</label>
              <input className="hypr-input" value={testName} onChange={e => setTestName(e.target.value)} required placeholder="e.g. Number Series Mock #3" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">subject</label>
                <select className="hypr-input" value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {topicsForSubject.length > 0 && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">topic (optional)</label>
                  <select className="hypr-input" value={topicId} onChange={e => setTopicId(e.target.value)}>
                    <option value="">— none —</option>
                    {topicsForSubject.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">date</label>
                <input className="hypr-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>

            {/* Section: Questions */}
            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--surface0)', paddingBottom: '4px' }}>❓ Questions Breakdown</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">total Qs</label>
                <input className="hypr-input" type="number" min="0" value={totalQ} onChange={e => setTotalQ(e.target.value)} placeholder="30" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">1-mark att.</label>
                <input className="hypr-input" type="number" min="0" value={att1} onChange={e => setAtt1(e.target.value)} placeholder="10" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">2-mark att.</label>
                <input className="hypr-input" type="number" min="0" value={att2} onChange={e => setAtt2(e.target.value)} placeholder="8" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">skipped</label>
                <input className="hypr-input" type="number" min="0" value={notAtt} onChange={e => setNotAtt(e.target.value)} placeholder="2" />
              </div>
            </div>

            {/* Section: Marks */}
            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--surface0)', paddingBottom: '4px' }}>🎯 Marks Breakdown</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">total marks</label>
                <input className="hypr-input" type="number" step="any" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} placeholder="100" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">obtained</label>
                <input className="hypr-input" type="number" step="any" value={obtainedMarks} onChange={e => setObtainedMarks(e.target.value)} placeholder="72" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">correct (+)</label>
                <input className="hypr-input" type="number" step="any" value={correctM} onChange={e => setCorrectM(e.target.value)} placeholder="2.00" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">penalty (−)</label>
                <input className="hypr-input" type="number" step="any" value={penaltyM} onChange={e => setPenaltyM(e.target.value)} placeholder="0.50" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">net (auto)</label>
                <div className="hypr-input" style={{ color: netMarks >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: '700', cursor: 'default', display: 'flex', alignItems: 'center' }}>
                  {(correctM || penaltyM) ? netMarks.toFixed(2) : '—'}
                </div>
              </div>
            </div>

            {/* Section: Time */}
            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--surface0)', paddingBottom: '4px' }}>⏱ Time (minutes)</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">allowed</label>
                <input className="hypr-input" type="number" min="0" value={totalTime} onChange={e => setTotalTime(e.target.value)} placeholder="60" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">taken</label>
                <input className="hypr-input" type="number" min="0" value={timeTaken} onChange={e => setTimeTaken(e.target.value)} placeholder="45" />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">notes (optional)</label>
              <input className="hypr-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Weak areas, observations…" />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" className="hypr-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="hypr-btn primary">Save Result</button>
            </div>
          </form>
        ) : (
          <>
            {/* Subject filter chips */}
            {subjects.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                <button
                  className="chip"
                  style={{ cursor: 'pointer', fontSize: '9px', padding: '2px 7px', background: !filterSubject ? 'var(--accent)' : 'transparent', color: !filterSubject ? 'var(--base)' : 'var(--text)', border: '1px solid var(--accent)' }}
                  onClick={() => { setFilterSubject(null); setFilterTopic(null); }}
                >All</button>
                {subjects.map(s => (
                  <button key={s.id} className="chip"
                    style={{ cursor: 'pointer', fontSize: '9px', padding: '2px 7px', background: filterSubject === s.id ? `${s.colorHex}33` : 'transparent', color: s.colorHex, border: `1px solid ${s.colorHex}88` }}
                    onClick={() => { setFilterSubject(filterSubject === s.id ? null : s.id); setFilterTopic(null); }}
                  >{s.name}</button>
                ))}
              </div>
            )}

            {/* Topic filter chips */}
            {filterSubject && topicsForFilterSubject.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px', paddingLeft: '6px' }}>
                <span style={{ fontSize: '9px', color: 'var(--overlay0)', alignSelf: 'center', marginRight: '4px' }}>topic:</span>
                <button className="chip"
                  style={{ cursor: 'pointer', fontSize: '9px', padding: '2px 6px', background: !filterTopic ? 'var(--surface1)' : 'transparent', color: 'var(--text)', border: '1px solid var(--surface1)' }}
                  onClick={() => setFilterTopic(null)}>All</button>
                {topicsForFilterSubject.map(t => (
                  <button key={t.id} className="chip"
                    style={{ cursor: 'pointer', fontSize: '9px', padding: '2px 6px', background: filterTopic === t.id ? 'var(--surface1)' : 'transparent', color: 'var(--subtext0)', border: '1px solid var(--surface0)' }}
                    onClick={() => setFilterTopic(filterTopic === t.id ? null : t.id)}>{t.name}</button>
                ))}
              </div>
            )}

            {/* Trend chart */}
            {chartData.length > 0 && (
              <div style={{ height: '100px', width: '100%', marginBottom: '12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="var(--overlay0)" fontSize={9} tickLine={false} />
                    <YAxis stroke="var(--overlay0)" fontSize={9} tickLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: 'var(--mantle)', border: '1px solid var(--surface0)', borderRadius: '6px', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* History cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTests.slice().reverse().map(t => {
                const subj = subjects.find(s => String(s.id) === String(t.subjectId));
                const topic = topics?.find(tp => String(tp.id) === String(t.topicId));
                const score = Math.round(t.scorePercentage);
                const isExpanded = expandedId === t.id;
                const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
                const hasStats = t.totalQuestions > 0 || t.correctMarks > 0 || t.totalTimeMinutes > 0;

                // Mini bar helper
                const MiniBar = ({ value, max, color, label }) => {
                  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                      <div style={{ width: '100%', height: '36px', background: 'var(--surface0)', borderRadius: '3px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: `${pct}%`, background: color, borderRadius: '3px', transition: 'height 0.4s ease', minHeight: pct > 0 ? '2px' : '0' }} />
                      </div>
                      <span style={{ fontSize: '8px', color: 'var(--overlay0)' }}>{label}</span>
                    </div>
                  );
                };

                return (
                  <div key={t.id} style={{ background: 'var(--crust)', border: '1px solid var(--surface0)', borderRadius: '8px', fontSize: '11px', overflow: 'hidden' }}>
                    {/* Card header — always visible */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', cursor: hasStats ? 'pointer' : 'default' }}
                      onClick={() => hasStats && setExpandedId(isExpanded ? null : t.id)}>
                      <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '3px' }}>
                          {subj && <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: `1px solid ${subj.colorHex}55`, color: subj.colorHex, background: `${subj.colorHex}15`, cursor: 'default' }}>{subj.name}</span>}
                          {topic && <span className="chip" style={{ fontSize: '8px', padding: '1px 5px', border: '1px solid var(--surface1)', color: 'var(--subtext0)', background: 'var(--surface0)', cursor: 'default' }}>{topic.name}</span>}
                          <span style={{ color: 'var(--overlay0)', fontSize: '9px', alignSelf: 'center' }}>{t.date}</span>
                        </div>
                        <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.testName}</div>
                        <div style={{ color: 'var(--overlay0)', fontSize: '10px', marginTop: '2px' }}>{t.obtainedMarks}/{t.totalMarks} marks</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontWeight: '800', color: scoreColor, fontSize: '13px' }}>{score}%</span>
                        {hasStats && <span style={{ color: 'var(--overlay0)', fontSize: '10px' }}>{isExpanded ? '▲' : '▼'}</span>}
                        <button className="sm-btn" style={{ width: '20px', height: '20px', fontSize: '10px' }} onClick={e => { e.stopPropagation(); onDelete(t.id); }}>×</button>
                      </div>
                    </div>

                    {/* Expanded stats */}
                    {isExpanded && hasStats && (
                      <div style={{ padding: '0 10px 10px', borderTop: '1px solid var(--surface0)' }}>
                        {/* 3-panel bar charts */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          {/* Questions panel */}
                          {t.totalQuestions > 0 && (
                            <div style={{ flex: 1, background: 'var(--base)', borderRadius: '6px', padding: '8px', border: '1px solid var(--surface0)' }}>
                              <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', marginBottom: '6px' }}>Questions</div>
                              <div style={{ display: 'flex', gap: '4px', height: '50px' }}>
                                <MiniBar value={t.attempted1Mark || 0} max={t.totalQuestions} color="#7B61FF" label="1M" />
                                <MiniBar value={t.attempted2Mark || 0} max={t.totalQuestions} color="#9B8DFF" label="2M" />
                                <MiniBar value={t.notAttempted || 0} max={t.totalQuestions} color="#888" label="Skip" />
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {[['1-mark', '#7B61FF', t.attempted1Mark], ['2-mark', '#9B8DFF', t.attempted2Mark], ['skipped', '#888', t.notAttempted]].map(([lbl, clr, val]) => (
                                  <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', color: 'var(--subtext0)' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: clr, display: 'inline-block' }} />{lbl}: {val || 0}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Marks panel */}
                          {(t.correctMarks > 0 || t.penaltyMarks > 0) && (
                            <div style={{ flex: 1, background: 'var(--base)', borderRadius: '6px', padding: '8px', border: '1px solid var(--surface0)' }}>
                              <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', marginBottom: '6px' }}>Marks</div>
                              <div style={{ display: 'flex', gap: '4px', height: '50px' }}>
                                <MiniBar value={t.correctMarks || 0} max={t.totalMarks || 1} color="#22C55E" label="✓" />
                                <MiniBar value={t.penaltyMarks || 0} max={t.totalMarks || 1} color="#EF4444" label="−" />
                                <MiniBar value={Math.max(0, t.netMarks || 0)} max={t.totalMarks || 1} color="#4D96FF" label="Net" />
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {[['Positive', '#22C55E', t.correctMarks], ['Negative', '#EF4444', t.penaltyMarks], ['Net', '#4D96FF', t.netMarks]].map(([lbl, clr, val]) => (
                                  <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', color: 'var(--subtext0)' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: clr, display: 'inline-block' }} />{lbl}: {(val || 0).toFixed(1)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Time panel */}
                          {t.totalTimeMinutes > 0 && (
                            <div style={{ flex: 1, background: 'var(--base)', borderRadius: '6px', padding: '8px', border: '1px solid var(--surface0)' }}>
                              <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', marginBottom: '6px' }}>Time</div>
                              <div style={{ display: 'flex', gap: '4px', height: '50px' }}>
                                <MiniBar value={t.totalTimeMinutes} max={t.totalTimeMinutes} color="#7B61FF" label="Tot" />
                                <MiniBar value={t.timeTakenMinutes || 0} max={t.totalTimeMinutes} color="#FB923C" label="Taken" />
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {[['Total', '#7B61FF', t.totalTimeMinutes + 'm'], ['Taken', '#FB923C', (t.timeTakenMinutes || 0) + 'm']].map(([lbl, clr, val]) => (
                                  <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', color: 'var(--subtext0)' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: clr, display: 'inline-block' }} />{lbl}: {val}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {t.notes && <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--subtext0)', fontStyle: 'italic' }}>📝 {t.notes}</div>}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredTests.length === 0 && (
                <p style={{ color: 'var(--overlay0)', textAlign: 'center', fontSize: '11px', margin: '16px 0' }}>No tests recorded yet. Tap "log result" to start tracking.</p>
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
    <div className="hypr-window">
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
