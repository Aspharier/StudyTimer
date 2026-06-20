import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer as TimerIcon, 
  BookOpen, 
  History as HistoryIcon, 
  BarChart2, 
  User, 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Flame, 
  ChevronLeft,
  ChevronRight, 
  X,
  Calendar,
  AlertCircle,
  Palette,
  Menu
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { DataService } from './services/dataService';
import { signInWithPopup, googleProvider, auth, signOut } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);

  // Database States
  const [examGoals, setExamGoals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('focusly_theme') || 'midnight');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load subscriptions
  useEffect(() => {
    const unsubAuth = DataService.subscribeToAuth(setUser);
    const unsubGoals = DataService.subscribeToExamGoals(setExamGoals);
    const unsubSubjects = DataService.subscribeToSubjects(setSubjects);
    const unsubTopics = DataService.subscribeToTopics(setTopics);
    const unsubSessions = DataService.subscribeToSessions(setSessions);
    const unsubLastSync = DataService.subscribeToLastSyncTime(setLastSyncTime);

    return () => {
      unsubAuth();
      unsubGoals();
      unsubSubjects();
      unsubTopics();
      unsubSessions();
      unsubLastSync();
    };
  }, []);

  useEffect(() => {
    const THEMES = ['midnight', 'ocean', 'forest', 'paper', 'sakura', 'aurora', 'ember', 'lavender', 'mint'];
    THEMES.forEach(t => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('focusly_theme', theme);
  }, [theme]);

  const activeGoal = examGoals.find(g => g.isActive) || null;

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <span className="mobile-logo">Focusly</span>
        <div className="mobile-avatar" onClick={() => { setActiveTab('account'); setIsSidebarOpen(false); }}>
          {user ? (user.photoURL ? <img src={user.photoURL} alt="" /> : user.displayName?.charAt(0)) : 'L'}
        </div>
      </header>

      {/* Sidebar Overlay Backdrop */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="logo">
          Focusly<span>.</span>
        </div>
        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          >
            <BarChart2 size={20} /> Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => { setActiveTab('timer'); setIsSidebarOpen(false); }}
          >
            <TimerIcon size={20} /> Pomodoro Timer
          </button>
          <button 
            className={`nav-item ${activeTab === 'syllabus' ? 'active' : ''}`}
            onClick={() => { setActiveTab('syllabus'); setIsSidebarOpen(false); }}
          >
            <BookOpen size={20} /> Syllabus
          </button>
          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }}
          >
            <HistoryIcon size={20} /> History
          </button>
          <button 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
          >
            <Calendar size={20} /> Analytics
          </button>
          <button 
            className={`nav-item ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => { setActiveTab('account'); setIsSidebarOpen(false); }}
          >
            <User size={20} /> Account Sync
          </button>
        </nav>

        {/* Theme Selector inside sidebar */}
        <div style={{ padding: '0 8px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '8px' }}>
            <Palette size={14} /> Web Theme
          </label>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-variant)',
              color: 'var(--primary-color)',
              border: '1px solid var(--surface-variant)',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="midnight" style={{ backgroundColor: '#0A0A0A', color: '#E8E8E8' }}>Midnight</option>
            <option value="ocean" style={{ backgroundColor: '#0D1B2A', color: '#EAF6FF' }}>Ocean</option>
            <option value="forest" style={{ backgroundColor: '#0E2015', color: '#EAF7ED' }}>Forest</option>
            <option value="paper" style={{ backgroundColor: '#FFF4E6', color: '#1F1A14' }}>Paper</option>
            <option value="sakura" style={{ backgroundColor: '#FFE7EC', color: '#241115' }}>Sakura</option>
            <option value="aurora" style={{ backgroundColor: '#17142F', color: '#F3F0FF' }}>Aurora</option>
            <option value="ember" style={{ backgroundColor: '#24100A', color: '#FFF1E8' }}>Ember</option>
            <option value="lavender" style={{ backgroundColor: '#F1E7FF', color: '#1D1527' }}>Lavender</option>
            <option value="mint" style={{ backgroundColor: '#E4F8F2', color: '#10211E' }}>Mint</option>
          </select>
        </div>

        {/* User Status at bottom of sidebar */}
        <div className="user-profile-section">
          <div className="user-avatar">
            {user ? (user.photoURL ? <img src={user.photoURL} alt="" /> : user.displayName?.charAt(0)) : 'L'}
          </div>
          <div className="user-info">
            <span className="user-name">{user ? user.displayName : 'Local User'}</span>
            <span className="user-status">{user ? 'Cloud Synced' : 'Offline Mode'}</span>
          </div>
        </div>
      </aside>

      {/* Main Contents */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView 
            activeGoal={activeGoal} 
            sessions={sessions} 
            subjects={subjects}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'timer' && (
          <TimerView 
            subjects={subjects} 
            onSaveSession={DataService.saveSession}
          />
        )}
        {activeTab === 'syllabus' && (
          <SyllabusView 
            activeGoal={activeGoal} 
            subjects={subjects} 
            topics={topics}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView 
            sessions={sessions} 
            subjects={subjects} 
            onDeleteSession={DataService.deleteSession}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsView 
            sessions={sessions} 
            subjects={subjects}
          />
        )}
        {activeTab === 'account' && (
          <AccountView 
            user={user} 
            examGoals={examGoals}
            lastSyncTime={lastSyncTime}
            onSaveGoal={DataService.saveExamGoal}
            onDeleteGoal={DataService.deleteExamGoal}
            onSetActiveGoal={DataService.setActiveExamGoal}
          />
        )}
      </main>
    </div>
  );
}

// ----------------------------------------------------
// VIEW COMPONENTS
// ----------------------------------------------------

function DashboardView({ activeGoal, sessions, subjects, setActiveTab }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr);
  const todaySeconds = todaySessions.reduce((acc, s) => acc + s.completedDurationSeconds, 0);
  
  const dailyTargetMinutes = activeGoal ? activeGoal.dailyTargetMinutes : 360;
  const progressPercent = Math.min(todaySeconds / (dailyTargetMinutes * 60), 1);

  // Days left calculation
  const getDaysRemaining = () => {
    if (!activeGoal) return null;
    const diffTime = new Date(activeGoal.examDate) - new Date();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining();

  // Streak Calculation
  const calculateStreak = () => {
    const dates = new Set(sessions.map(s => s.date));
    let streak = 0;
    let d = new Date();
    
    // Check if user did session today, otherwise start yesterday
    const todayISO = d.toISOString().split('T')[0];
    if (!dates.has(todayISO)) {
      d.setDate(d.getDate() - 1);
    }
    
    while (dates.has(d.toISOString().split('T')[0])) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // Top 5 Subjects Progress
  const subjectsWithRates = subjects.map(s => {
    const sTopics = topicsBySubjectId(s.id);
    const completed = sTopics.filter(t => t.status === 'COMPLETED').length;
    const rate = sTopics.length > 0 ? completed / sTopics.length : 0;
    return { ...s, total: sTopics.length, completed, rate };
  }).sort((a, b) => b.rate - a.rate).slice(0, 5);

  function topicsBySubjectId(subjectId) {
    // Fallback: search topics in local storage state
    const cachedTopics = JSON.parse(localStorage.getItem('focusly_topics') || '[]');
    return cachedTopics.filter(t => String(t.subjectId) === String(subjectId));
  }

  return (
    <>
      <div className="flex-row-between">
        <h1>Overview</h1>
        <button className="btn btn-accent" onClick={() => setActiveTab('timer')}>
          <Play size={16} /> Start Focusing
        </button>
      </div>

      <div className="grid-2">
        {/* Exam Countdown Card */}
        <div className="card gradient-border">
          {activeGoal ? (
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="card-title" style={{ justifyContent: 'center' }}>{activeGoal.name}</div>
              <div style={{ fontSize: '72px', fontWeight: '800', color: 'var(--accent-color)' }}>
                {daysRemaining}
              </div>
              <div style={{ color: 'var(--secondary-color)', fontWeight: '600' }}>days remaining</div>
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '20px' }}
                onClick={() => setActiveTab('account')}
              >
                Manage Goals
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div className="card-title" style={{ justifyContent: 'center' }}>No active exam goal set</div>
              <p style={{ color: 'var(--secondary-color)', marginBottom: '24px' }}>Set your exam target date to track countdown days.</p>
              <button className="btn btn-primary" onClick={() => setActiveTab('account')}>Set Exam Goal</button>
            </div>
          )}
        </div>

        {/* Daily Study Progress & Streak */}
        <div className="card">
          <div className="card-title">Daily Progress</div>
          <div className="dashboard-progress-flex">
            <div style={{ width: '140px', height: '140px', position: 'relative' }}>
              <svg className="timer-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="timer-circle-bg" strokeWidth="8" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  className="timer-circle-progress" 
                  strokeWidth="8"
                  style={{
                    strokeDashoffset: 251 - (251 * progressPercent)
                  }}
                />
              </svg>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '20px', fontWeight: '800' }}>
                  {(todaySeconds / 3600).toFixed(1)}h
                </span>
                <span style={{ fontSize: '10px', color: 'var(--secondary-color)' }}>
                  target {(dailyTargetMinutes / 60).toFixed(1)}h
                </span>
              </div>
            </div>

            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Flame size={32} color={currentStreak > 0 ? '#F97316' : 'var(--secondary-color)'} />
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>{currentStreak} Day Streak</div>
                  <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>
                    {currentStreak > 0 ? 'Amazing consistency!' : 'Study today to start streak'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus progress card */}
      <div className="card">
        <div className="card-title">Syllabus Completion</div>
        {subjectsWithRates.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {subjectsWithRates.map(s => (
              <div key={s.id}>
                <div className="flex-row-between" style={{ marginBottom: '6px', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600' }}>{s.name}</span>
                  <span style={{ color: s.colorHex, fontWeight: '700' }}>
                    {(s.rate * 100).toFixed(0)}% ({s.completed}/{s.total} topics)
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${s.rate * 100}%`, backgroundColor: s.colorHex }}
                  />
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setActiveTab('syllabus')}>
                Manage Syllabus <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: 'var(--secondary-color)', marginBottom: '16px' }}>No syllabus subjects found.</p>
            <button className="btn btn-secondary" onClick={() => setActiveTab('syllabus')}>Add Subjects</button>
          </div>
        )}
      </div>
    </>
  );
}

// ----------------------------------------------------
// TIMER VIEW (POMODORO)
// ----------------------------------------------------
function TimerView({ subjects, onSaveSession }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionName, setSessionName] = useState('Study Session');
  const [selectedTag, setSelectedTag] = useState('');
  const [notes, setNotes] = useState('');

  // Configuration
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [totalCycles, setTotalCycles] = useState(4);

  // Runtime Timer States
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [currentPhase, setCurrentPhase] = useState('FOCUS'); // FOCUS, SHORT_BREAK, LONG_BREAK
  const [currentCycle, setCurrentCycle] = useState(1);
  const [accumulatedCompletedSeconds, setAccumulatedCompletedSeconds] = useState(0);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [sessionNotesInput, setSessionNotesInput] = useState('');

  const intervalRef = useRef(null);
  const totalPhaseSeconds = currentPhase === 'FOCUS' ? focusMinutes * 60 : (currentPhase === 'SHORT_BREAK' ? shortBreakMinutes * 60 : longBreakMinutes * 60);
  const progressPercent = Math.min((totalPhaseSeconds - timerSecondsLeft) / totalPhaseSeconds, 1);

  // Sync session name with subject selection
  useEffect(() => {
    const s = subjects.find(x => String(x.id) === String(selectedSubjectId));
    if (s) {
      setSessionName(s.name);
    }
  }, [selectedSubjectId, subjects]);

  const tick = () => {
    setTimerSecondsLeft(prev => {
      if (prev <= 1) {
        // Phase complete
        clearInterval(intervalRef.current);
        handlePhaseEnd();
        return 0;
      }
      return prev - 1;
    });
  };

  const handlePhaseEnd = () => {
    // Play sound or vibration if API existed
    setIsTimerRunning(false);

    if (currentPhase === 'FOCUS') {
      const completedFocusSecs = focusMinutes * 60;
      setAccumulatedCompletedSeconds(prev => prev + completedFocusSecs);
      
      const isLastCycle = currentCycle >= totalCycles;
      if (isLastCycle) {
        // Complete Pomodoro cycle
        handleFinishSession(true);
      } else {
        // Go to Break
        const isLongBreak = currentCycle % 4 === 0;
        setCurrentPhase(isLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK');
        setTimerSecondsLeft(isLongBreak ? longBreakMinutes * 60 : shortBreakMinutes * 60);
      }
    } else {
      // Break over, go back to Focus
      setCurrentPhase('FOCUS');
      setTimerSecondsLeft(focusMinutes * 60);
      setCurrentCycle(prev => prev + 1);
    }
  };

  const startTimer = () => {
    if (isTimerRunning) return;
    setIsTimerRunning(true);
    intervalRef.current = setInterval(tick, 1000);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    clearInterval(intervalRef.current);
  };

  const skipPhase = () => {
    pauseTimer();
    handlePhaseEnd();
  };

  const stopTimer = () => {
    pauseTimer();
    // Calculate studied time so far
    let totalCompleted = accumulatedCompletedSeconds;
    if (currentPhase === 'FOCUS') {
      totalCompleted += (focusMinutes * 60 - timerSecondsLeft);
    }

    if (totalCompleted > 10) {
      // Log session
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
      notes: sessionNotesInput.trim() || notes || null,
      tag: selectedTag || null,
      subjectId: selectedSubjectId || null
    };

    onSaveSession(sessionObj);
    setIsCompletedModalOpen(false);
    resetTimer();
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(focusMinutes * 60);
    setCurrentPhase('FOCUS');
    setCurrentCycle(1);
    setAccumulatedCompletedSeconds(0);
    setSessionNotesInput('');
  };

  // Adjusters
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
      <div className="flex-row-between">
        <h1>Pomodoro Timer</h1>
      </div>

      <div className="timer-view-layout">
        {/* Left column: Timer Display */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', minHeight: '450px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-color)' }}>
            {currentPhase === 'FOCUS' ? 'Focus Session' : (currentPhase === 'SHORT_BREAK' ? 'Short Break' : 'Long Break')}
            {` (Cycle ${currentCycle}/${totalCycles})`}
          </div>

          <div className="timer-ring-container">
            <svg className="timer-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="timer-circle-bg" strokeWidth="6" />
              <circle 
                cx="50" 
                cy="50" 
                r="40" 
                className="timer-circle-progress" 
                strokeWidth="6"
                style={{
                  strokeDashoffset: 251 - (251 * progressPercent),
                  stroke: currentPhase === 'FOCUS' ? 'var(--accent-color)' : '#3B82F6'
                }}
              />
            </svg>
            <div className="timer-display">
              <span className="timer-clock">{formatClock(timerSecondsLeft)}</span>
              <span className="timer-label">{currentPhase}</span>
            </div>
          </div>

          {/* Timer Controls */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {isTimerRunning ? (
              <button className="btn btn-secondary" onClick={pauseTimer}>
                <Pause size={18} /> Pause
              </button>
            ) : (
              <button className="btn btn-accent" onClick={startTimer}>
                <Play size={18} /> Focus
              </button>
            )}
            
            <button className="btn btn-secondary" onClick={skipPhase}>
              <SkipForward size={18} /> Skip
            </button>

            <button className="btn btn-danger" onClick={stopTimer}>
              <Square size={18} /> Stop
            </button>
          </div>
        </div>

        {/* Right column: Config & Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-title">Session Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {subjects.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select 
                    className="input-field" 
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    disabled={isTimerRunning}
                  >
                    <option value="">Custom (No Subject)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Session Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  disabled={isTimerRunning}
                />
              </div>

              {/* Tags Selector */}
              <div className="form-group">
                <label className="form-label">Session Tag</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['NEW_TOPIC', 'REVISION', 'PRACTICE', 'MOCK_TEST'].map(t => {
                    const label = t.replace('_', ' ');
                    const isSelected = selectedTag === t;
                    return (
                      <span 
                        key={t}
                        className="chip"
                        onClick={() => setSelectedTag(isSelected ? '' : t)}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--surface-variant)',
                          color: isSelected ? 'var(--bg-color)' : 'var(--primary-color)'
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Time Config Adjuster */}
          {!isTimerRunning && (
            <div className="card">
              <div className="card-title">Adjust Timing</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex-row-between">
                  <span>Focus duration</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setFocusMinutes(prev => Math.max(5, prev - 5))}>-</button>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{focusMinutes}m</span>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setFocusMinutes(prev => prev + 5)}>+</button>
                  </div>
                </div>
                <div className="flex-row-between">
                  <span>Short break</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setShortBreakMinutes(prev => Math.max(1, prev - 1))}>-</button>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{shortBreakMinutes}m</span>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setShortBreakMinutes(prev => prev + 1)}>+</button>
                  </div>
                </div>
                <div className="flex-row-between">
                  <span>Target cycles</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setTotalCycles(prev => Math.max(1, prev - 1))}>-</button>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{totalCycles}x</span>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setTotalCycles(prev => prev + 1)}>+</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completed session notes prompt modal */}
      {isCompletedModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Session Finished! 🔥</div>
            <p>Write down notes about what you studied during this session:</p>
            <textarea 
              className="input-field" 
              rows="4" 
              placeholder="e.g., Solved Boolean Algebra minimization sheets, solved K-Map exceptions."
              value={sessionNotesInput}
              onChange={(e) => setSessionNotesInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setIsCompletedModalOpen(false); resetTimer(); }}>Discard</button>
              <button className="btn btn-accent" onClick={saveAndExit}>Save & Exit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------
// SYLLABUS VIEW
// ----------------------------------------------------
function SyllabusView({ activeGoal, subjects, topics }) {
  const [showAddSubj, setShowAddSubj] = useState(false);
  const [showAddTopicSubjId, setShowAddTopicSubjId] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [colorHex, setColorHex] = useState('#4D96FF');
  const [topicName, setTopicName] = useState('');

  const [expandedSubjId, setExpandedSubjId] = useState(null);

  const colors = ["#4D96FF", "#FF6B6B", "#6BCB77", "#FFD93D", "#95CD41", "#F473B9", "#A855F7", "#F97316"];

  const handleAddSubject = () => {
    if (!subjectName.trim()) return;
    DataService.saveSubject({
      name: subjectName.trim(),
      examGoalId: activeGoal?.id || "local-goal",
      colorHex,
      sortOrder: subjects.length
    });
    setSubjectName('');
    setShowAddSubj(false);
  };

  const handleAddTopic = () => {
    if (!topicName.trim() || !showAddTopicSubjId) return;
    DataService.saveTopic({
      name: topicName.trim(),
      subjectId: showAddTopicSubjId,
      status: 'NOT_STARTED',
      sortOrder: topics.filter(t => t.subjectId === showAddTopicSubjId).length
    });
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

  return (
    <>
      <div className="flex-row-between">
        <div>
          <h1>Syllabus</h1>
          <p style={{ color: 'var(--secondary-color)', fontSize: '14px' }}>Track and check off subjects and preparation topics.</p>
        </div>
        {activeGoal && (
          <button className="btn btn-accent" onClick={() => setShowAddSubj(true)}>
            <Plus size={16} /> Add Subject
          </button>
        )}
      </div>

      {!activeGoal ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} color="var(--error-color)" style={{ margin: '0 auto 16px' }} />
          <div className="card-title" style={{ justifyContent: 'center' }}>Set an active exam goal first</div>
          <p style={{ color: 'var(--secondary-color)' }}>You must configure an active exam goal in the Account Sync tab before tracking your syllabus subjects.</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--secondary-color)', marginBottom: '16px' }}>Your syllabus is empty. Get started by adding a subject.</p>
          <button className="btn btn-primary" onClick={() => setShowAddSubj(true)}>Add Your First Subject</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {subjects.map(s => {
            const subjTopics = topics.filter(t => String(t.subjectId) === String(s.id));
            const completed = subjTopics.filter(t => t.status === 'COMPLETED').length;
            const rate = subjTopics.length > 0 ? completed / subjTopics.length : 0;
            const isExpanded = expandedSubjId === s.id;

            return (
              <div key={s.id} className="card" style={{ padding: '20px' }}>
                <div className="flex-row-between" style={{ cursor: 'pointer' }} onClick={() => setExpandedSubjId(isExpanded ? null : s.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1 }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: s.colorHex }} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '18px' }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>
                        {completed}/{subjTopics.length} topics completed
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontWeight: '700', color: s.colorHex }}>{(rate * 100).toFixed(0)}%</span>
                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete subject and all its topics?")) {
                        DataService.deleteSubject(s.id);
                      }
                    }}>
                      <Trash2 size={16} color="var(--error-color)" />
                    </button>
                  </div>
                </div>

                <div className="progress-bar-bg" style={{ marginTop: '12px', height: '6px' }}>
                  <div className="progress-bar-fill" style={{ width: `${rate * 100}%`, backgroundColor: s.colorHex }} />
                </div>

                {/* Expanded Topics List */}
                {isExpanded && (
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--surface-variant)', paddingTop: '16px' }}>
                    {subjTopics.length === 0 ? (
                      <p style={{ color: 'var(--secondary-color)', fontSize: '13px', textAlign: 'center', padding: '8px' }}>No topics found. Add one below!</p>
                    ) : (
                      subjTopics.map(t => {
                        const statusColors = {
                          NOT_STARTED: { bg: 'var(--surface-variant)', text: 'var(--secondary-color)', label: 'Not Started' },
                          IN_PROGRESS: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', label: 'In Progress' },
                          COMPLETED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Completed' },
                          NEEDS_REVISION: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', label: 'Revision' }
                        };
                        const conf = statusColors[t.status] || statusColors.NOT_STARTED;

                        return (
                          <div key={t.id} className="flex-row-between" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{t.name}</span>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span 
                                className="chip"
                                style={{ backgroundColor: conf.bg, color: conf.text }}
                                onClick={() => handleCycleStatus(t)}
                              >
                                {conf.label}
                              </span>
                              <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => DataService.deleteTopic(t.id)}>
                                <Trash2 size={14} color="rgba(255, 107, 107, 0.6)" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <button 
                      className="btn btn-secondary" 
                      style={{ alignSelf: 'center', marginTop: '12px' }}
                      onClick={() => setShowAddTopicSubjId(s.id)}
                    >
                      <Plus size={16} /> Add Topic
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubj && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Add Subject</div>
            <div className="form-group">
              <label className="form-label">Subject Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g., Digital Logic, Computer Networks"
                value={subjectName} 
                onChange={(e) => setSubjectName(e.target.value)} 
              />
            </div>
            <div>
              <label className="form-label">Choose color:</label>
              <div className="color-picker">
                {colors.map(c => (
                  <div 
                    key={c} 
                    className={`color-option ${colorHex === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColorHex(c)}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddSubj(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleAddSubject}>Add</button>
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
                type="text" 
                className="input-field" 
                placeholder="e.g., Minimization using K-Maps, Boolean Identities"
                value={topicName} 
                onChange={(e) => setTopicName(e.target.value)} 
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddTopicSubjId(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleAddTopic}>Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------
// HISTORY VIEW
// ----------------------------------------------------
function HistoryView({ sessions, subjects, onDeleteSession }) {
  const [filterSubjectId, setFilterSubjectId] = useState('');

  const filteredSessions = filterSubjectId 
    ? sessions.filter(s => String(s.subjectId) === String(filterSubjectId))
    : sessions;

  return (
    <>
      <div className="flex-row-between">
        <div>
          <h1>Session History</h1>
          <p style={{ color: 'var(--secondary-color)', fontSize: '14px' }}>Overview of your logged study sessions.</p>
        </div>
        {subjects.length > 0 && (
          <select 
            className="input-field" 
            style={{ width: '220px' }}
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
          >
            <option value="">Filter by Subject (All)</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--secondary-color)' }}>No study sessions recorded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredSessions.sort((a,b) => b.startTime - a.startTime).map(s => {
            const dateObj = new Date(s.startTime);
            const dateLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeLabel = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const durationMins = Math.round(s.completedDurationSeconds / 60);

            return (
              <div key={s.id} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontWeight: '700', fontSize: '16px' }}>{s.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--secondary-color)', display: 'flex', gap: '12px' }}>
                    <span>{dateLabel} at {timeLabel}</span>
                    {s.tag && <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>#{s.tag}</span>}
                  </div>
                  {s.notes && (
                    <div style={{ fontSize: '13px', color: 'var(--primary-color)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '4px', marginTop: '6px' }}>
                      {s.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-color)' }}>{durationMins}m</span>
                  <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => {
                    if (confirm("Delete this session record?")) {
                      onDeleteSession(s.id);
                    }
                  }}>
                    <Trash2 size={16} color="var(--error-color)" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------
// ANALYTICS VIEW
// ----------------------------------------------------
function AnalyticsView({ sessions, subjects }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // 1. Data mapping for Recharts Pie (Subjects study share)
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
        value: Math.round(totalsBySubj[id] / 60), // minutes
        color: s ? s.colorHex : '#888888'
      };
    }).filter(x => x.value > 0);
  };

  const pieData = getPieData();

  // 2. Data mapping for Recharts Bar (Last 7 days study hours)
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

  // Streak & stats helper
  const getStreak = () => {
    const dates = new Set(sessions.filter(s => s.completedDurationSeconds > 0).map(s => s.date));
    let streak = 0;
    const checkDate = new Date();
    
    let todayStr = checkDate.toISOString().split('T')[0];
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
      return 0;
    }
    
    let startDate = dates.has(todayStr) ? checkDate : yesterday;
    while (true) {
      const dateStr = startDate.toISOString().split('T')[0];
      if (dates.has(dateStr)) {
        streak++;
        startDate.setDate(startDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = getStreak();
  const sessionCount = sessions.filter(s => s.completedDurationSeconds > 0).length;

  // Month navigation helpers
  const handlePrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getMonthCells = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday = 0
    
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  };

  const monthCells = getMonthCells();

  return (
    <>
      <div className="flex-row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>Study Analytics</h1>
          <p style={{ color: 'var(--secondary-color)', fontSize: '14px' }}>
            {sessionCount} sessions logged - Current streak: {streak} days
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '24px' }}>
        {/* Pie Chart: Subject Distribution */}
        <div className="card chart-card">
          <div className="card-title">Subject Distribution (mins)</div>
          {pieData.length > 0 ? (
            <div className="chart-distribution-layout">
              <div className="chart-pie-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
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
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                    <span style={{ color: 'var(--secondary-color)', fontSize: '11px', flexShrink: 0 }}>{item.value}m</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--secondary-color)', fontSize: '14px' }}>
              No subject sessions logged yet.
            </div>
          )}
        </div>

        {/* Bar Chart: Last 7 Days */}
        <div className="card chart-card">
          <div className="card-title">Study Time (last 7 days)</div>
          <div style={{ width: '100%', flexGrow: 1, height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="var(--secondary-color)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--secondary-color)" fontSize={11} tickFormatter={(v) => `${v}h`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => `${v} hours`} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="hours" fill="var(--accent-color)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap Grid (Navigable Calendar Month) */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="flex-row-between" style={{ alignItems: 'center', marginBottom: '20px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={handlePrevMonth}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--primary-color)' }}>
            {selectedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={handleNextMonth}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ maxWidth: '340px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid var(--surface-variant)', paddingBottom: '8px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: 'var(--secondary-color)', fontWeight: '600' }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {monthCells.map((cell, idx) => {
              if (cell === null) {
                return <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />;
              }
              const pad = (n) => String(n).padStart(2, '0');
              const dateStr = `${cell.getFullYear()}-${pad(cell.getMonth() + 1)}-${pad(cell.getDate())}`;
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
                  key={`day-${cell.getDate()}`}
                  className={`heatmap-day level-${level}`}
                  style={{ borderRadius: '3px', aspectRatio: '1' }}
                  title={`${cell.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${hours.toFixed(1)}h studied`}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', fontSize: '11px', color: 'var(--secondary-color)', alignItems: 'center' }}>
            <span>Less</span>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px' }} className="level-0" />
            <div style={{ width: '12px', height: '12px', borderRadius: '2px' }} className="level-1" />
            <div style={{ width: '12px', height: '12px', borderRadius: '2px' }} className="level-2" />
            <div style={{ width: '12px', height: '12px', borderRadius: '2px' }} className="level-3" />
            <div style={{ width: '12px', height: '12px', borderRadius: '2px' }} className="level-4" />
            <span>More</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ----------------------------------------------------
// ACCOUNT / GOALS SYNC VIEW
// ----------------------------------------------------
function AccountView({ user, examGoals, lastSyncTime, onSaveGoal, onDeleteGoal, onSetActiveGoal }) {
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
    } catch (e) {
      console.error("Auth failed:", e);
      alert("Login failed: " + e.message);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const handleSaveGoal = () => {
    if (!goalName.trim() || !goalDate) return;
    onSaveGoal({
      name: goalName.trim(),
      examDate: goalDate,
      dailyTargetMinutes: targetMins,
      isActive: examGoals.length === 0, // set active if first
      createdAt: Date.now()
    });
    setGoalName('');
    setGoalDate('');
    setShowAddGoal(false);
  };

  return (
    <>
      <div className="flex-row-between">
        <div>
          <h1>Account & Sync</h1>
          <p style={{ color: 'var(--secondary-color)', fontSize: '14px' }}>Link a Google Account to synchronize study data across laptop and phone.</p>
        </div>
        {user ? (
          <button className="btn btn-secondary" onClick={handleLogout}>
            Sign Out
          </button>
        ) : (
          <button className="btn btn-accent" onClick={handleLogin}>
            Sign In with Google
          </button>
        )}
      </div>

      <div className="grid-2">
        {/* Connection status card */}
        <div className="card">
          <div className="card-title">Cloud Sync Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                backgroundColor: user ? 'var(--accent-color)' : 'var(--error-color)'
              }} />
              <span style={{ fontWeight: '700' }}>
                {user ? 'Connected and Synced' : 'Running Offline'}
              </span>
            </div>
            <p style={{ color: 'var(--secondary-color)', fontSize: '14px' }}>
              {user 
                ? `You are signed in as ${user.email}. All sessions, syllabus subjects, and targets are backed up and synced automatically to the cloud.`
                : "You are currently running in Local Mode. Data is kept in your browser cache only. Log in to backing up and syncing with your phone app."
              }
            </p>
            {user && lastSyncTime && (
              <div style={{ fontSize: '12px', color: 'var(--secondary-color)', marginTop: '-8px' }}>
                Last Synced: {lastSyncTime}
              </div>
            )}
          </div>
        </div>

        {/* Goal Manager Panel */}
        <div className="card">
          <div className="flex-row-between" style={{ marginBottom: '16px' }}>
            <div className="card-title" style={{ margin: 0 }}>Exam Target Goals</div>
            <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setShowAddGoal(true)}>
              <Plus size={16} /> New Goal
            </button>
          </div>

          {examGoals.length === 0 ? (
            <p style={{ color: 'var(--secondary-color)', fontSize: '14px', textAlign: 'center', padding: '24px' }}>No targets configured yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {examGoals.map(g => (
                <div key={g.id} className="flex-row-between" style={{ padding: '12px 16px', background: g.isActive ? 'var(--accent-dim)' : 'var(--surface-variant)', borderRadius: 'var(--radius-sm)', border: g.isActive ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{g.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Date: {g.examDate} | target {(g.dailyTargetMinutes / 60).toFixed(1)}h</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!g.isActive && (
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => onSetActiveGoal(g.id)}>
                        Set Active
                      </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => onDeleteGoal(g.id)}>
                      <Trash2 size={16} color="var(--error-color)" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Exam Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">New Exam Target</div>
            <div className="form-group">
              <label className="form-label">Exam Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g., GATE 2027 CSE, Tech Placements"
                value={goalName} 
                onChange={(e) => setGoalName(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={goalDate} 
                onChange={(e) => setGoalDate(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Study Target</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setTargetMins(prev => Math.max(60, prev - 30))}>-30m</button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: '700' }}>{(targetMins / 60).toFixed(1)} hours</span>
                <button className="btn btn-secondary" onClick={() => setTargetMins(prev => prev + 30)}>+30m</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddGoal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleSaveGoal}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
