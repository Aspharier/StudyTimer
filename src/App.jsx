import { useEffect, useState } from 'react';
import { DataService } from './services/dataService';
import { useAuthStore } from './stores/useAuthStore';
import { useExamStore } from './stores/useExamStore';
import { usePlanStore } from './stores/usePlanStore';
import { useMockStore } from './stores/useMockStore';
import { useSessionStore } from './stores/useSessionStore';
import { useUIStore } from './stores/useUIStore';

import { AppHeader } from './components/layout/AppHeader';
import { SignInView } from './components/common/SignInView';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { SettingsModal } from './components/settings/SettingsModal';

import { ExamCountdown } from './components/dashboard/ExamCountdown';
import { TodayTaskList } from './components/plan/TodayTaskList';
import { SyllabusPage } from './pages/SyllabusPage';
import { StudyTipsModal } from './components/common/StudyTipsModal';

function App() {
  const { user, authLoading, setUser, setAuthLoading } = useAuthStore();
  const { toastMsg, setIsSyncing } = useUIStore();
  const { setExamGoals, setSubjects, setTopics } = useExamStore();
  const { setDailyPlans } = usePlanStore();
  const { setMockTests } = useMockStore();
  const { setStudySessions } = useSessionStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(null);

  // Set up Firebase / dataService listeners on mount
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
    const unsubSessions = DataService.subscribeToStudySessions(setStudySessions);

    return () => {
      unsubSync();
      unsubAuth();
      unsubGoals();
      unsubSubjects();
      unsubTopics();
      unsubMockTests();
      unsubDailyPlans();
      unsubSessions();
    };
  }, [setIsSyncing, setUser, setAuthLoading, setExamGoals, setSubjects, setTopics, setMockTests, setDailyPlans, setStudySessions]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 's' || e.key === 'S') {
        setShowSettings(prev => !prev);
      } else if (e.key === '?') {
        setShowShortcuts(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowSettings(false);
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <div className="loading-text">Loading Focusly Exam OS...</div>
      </div>
    );
  }

  if (!user) {
    return <SignInView />;
  }

  return (
    <div className="app-container">
      {toastMsg && <div className="toast">{toastMsg}</div>}
      
      <div className="planner-desk">
        <AppHeader onOpenSettings={() => setShowSettings(true)} />

        {/* The Open Digital Planner Notebook Spread */}
        <div className="planner-binder-frame">
          {/* Right Edge Binder Tabs */}
          <div className="binder-tabs-right">
            <div 
              className="binder-tab tab-missions" 
              onClick={() => {
                const el = document.querySelector('.left-page');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              title="Today's Missions"
            >
              MISSIONS
            </div>
            <div 
              className="binder-tab tab-syllabus" 
              onClick={() => {
                const el = document.querySelector('.right-page');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              title="Curriculum & Syllabus"
            >
              SYLLABUS
            </div>
            <div 
              className="binder-tab tab-tips" 
              onClick={() => setShowTipsModal('tip')}
              title="Cognitive Study Tips"
            >
              TIPS
            </div>
            <div 
              className="binder-tab tab-mantra" 
              onClick={() => setShowTipsModal('mantra')}
              title="Daily Focus Mantra"
            >
              MANTRA
            </div>
            <div 
              className="binder-tab tab-settings" 
              onClick={() => setShowSettings(true)}
              title="Open Settings"
            >
              SETTINGS
            </div>
          </div>

          <main className="notebook-book-spread">
            {/* Left Page: Ruled Paper - Date, Focus, Exam Countdown & Today's Missions */}
            <section className="notebook-page left-page">
              <div className="page-inner-content">
                <ExamCountdown onOpenSettings={() => setShowSettings(true)} />
                <TodayTaskList />
              </div>
            </section>

            {/* Notebook Spine / Center Fold Divider */}
            <div className="notebook-spine-crease"></div>

            {/* Right Page: Dot Grid Paper - Space of Infinite Possibility & Syllabus Tree */}
            <section className="notebook-page right-page">
              <div className="page-inner-content">
                <SyllabusPage onOpenSettings={() => setShowSettings(true)} />
              </div>
            </section>
          </main>

          {/* Bottom Planner Ribbon Tabs */}
          <div className="binder-tabs-bottom">
            <div 
              className="bottom-tab" 
              onClick={() => {
                const el = document.querySelector('.left-page');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              title="Jump to Today's Missions"
            >
              🎯 MISSIONS
            </div>
            <div 
              className="bottom-tab" 
              onClick={() => {
                const el = document.querySelector('.right-page');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              title="Jump to Curriculum & Syllabus"
            >
              📚 SYLLABUS
            </div>
            <div 
              className="bottom-tab" 
              onClick={() => setShowTipsModal('tip')}
              title="Explore Cognitive Science Study Tips"
            >
              💡 STUDY TIPS
            </div>
            <div 
              className="bottom-tab" 
              onClick={() => setShowTipsModal('mantra')}
              title="Get Inspired with Focus Mantras"
            >
              ✨ DAILY MANTRA
            </div>
            <div className="bottom-tab-separator"></div>
            <div 
              className="bottom-tab" 
              onClick={() => setShowSettings(true)}
              title="Configure Goals & Settings"
            >
              ⚙️ SETTINGS
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showTipsModal && (
        <StudyTipsModal 
          initialMode={showTipsModal} 
          onClose={() => setShowTipsModal(null)} 
        />
      )}

      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

export default App;
