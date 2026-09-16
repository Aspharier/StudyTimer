import { useEffect, useState } from 'react';
import { DataService } from './services/dataService';
import { useAuthStore } from './stores/useAuthStore';
import { useExamStore } from './stores/useExamStore';
import { usePlanStore } from './stores/usePlanStore';
import { useMockStore } from './stores/useMockStore';
import { useSessionStore } from './stores/useSessionStore';
import { useUIStore } from './stores/useUIStore';

import { AppHeader } from './components/layout/AppHeader';
import { NavigationTabs } from './components/layout/NavigationTabs';
import { SignInView } from './components/common/SignInView';
import { ShortcutsModal } from './components/common/ShortcutsModal';

import { DashboardPage } from './pages/DashboardPage';
import { PlanPage } from './pages/PlanPage';
import { SyllabusPage } from './pages/SyllabusPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const { user, authLoading, setUser, setAuthLoading } = useAuthStore();
  const { activeTab, setActiveTab, toastMsg, setIsSyncing } = useUIStore();
  const { setExamGoals, setSubjects, setTopics } = useExamStore();
  const { setDailyPlans } = usePlanStore();
  const { setMockTests } = useMockStore();
  const { setStudySessions } = useSessionStore();

  const [showShortcuts, setShowShortcuts] = useState(false);

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
      if (e.key === '1') setActiveTab('dashboard');
      else if (e.key === '2') setActiveTab('plan');
      else if (e.key === '3') setActiveTab('syllabus');
      else if (e.key === '4') setActiveTab('settings');
      else if (e.key === '?') setShowShortcuts(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

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
      
      <div className="wrap">
        <AppHeader />
        <NavigationTabs />

        <main style={{ paddingBottom: '40px' }}>
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'plan' && <PlanPage />}
          {activeTab === 'syllabus' && <SyllabusPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

export default App;
