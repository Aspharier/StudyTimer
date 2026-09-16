import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useExamStore } from '../stores/useExamStore';
import { useMockStore } from '../stores/useMockStore';
import { usePlanStore } from '../stores/usePlanStore';
import { useUIStore } from '../stores/useUIStore';
import { DataService } from '../services/dataService';
import { AddGoalModal } from '../components/settings/AddGoalModal';
import { MockTestSection } from '../components/settings/MockTestSection';

export const SettingsPage = () => {
  const { user, signOut } = useAuthStore();
  const { examGoals, subjects, topics, getActiveGoal, saveExamGoal, deleteExamGoal, setActiveExamGoal } = useExamStore();
  const { mockTests, saveMockTest, deleteMockTest } = useMockStore();
  const { dailyPlans } = usePlanStore();
  const { theme, setTheme, isSyncing, showToast } = useUIStore();

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);

  const activeGoal = getActiveGoal();

  const handleManualSync = async () => {
    try {
      setManualSyncing(true);
      const res = await DataService.syncAllData();
      showToast(`SYNC_COMPLETE: ${res.goals}G/${res.subjects}S/${res.topics}T/${res.plans}P`);
    } catch (err) {
      showToast("SYNC_ERROR: " + err.message);
    } finally {
      setManualSyncing(false);
    }
  };

  const handleSetActiveGoal = async (id) => {
    try {
      await setActiveExamGoal(id);
      showToast("ACTIVE_TARGET_SWITCHED");
    } catch {
      showToast("ERROR: Switch failed");
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">ENVIRONMENT_CONFIG</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800 }}>TERMINAL_THEME</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              CURRENT_MODE: [{theme.toUpperCase()}_PALETTE]
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '[SWITCH TO LIGHT]' : '[SWITCH TO DARK]'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">CLOUD_TELEMETRY_SYNC</h3>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>CONNECTION_STATUS</span>
            <span className="chip">
              {isSyncing || manualSyncing ? '[SYNC_IN_PROGRESS]' : '[REALTIME_CONNECTED]'}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
            AUTHENTICATED_AS: {user?.email || 'OFFLINE_OPERATOR'}. Remote datastore synchronizes changes automatically.
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '16px' }}>
            LOCAL_RECORDS: {examGoals.length} GOALS, {subjects.length} MODULES, {topics.length} TOPICS, {dailyPlans?.length || 0} PLANS
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleManualSync}
            disabled={manualSyncing || isSyncing}
          >
            {manualSyncing || isSyncing ? '[SYNCING...]' : '[FORCE_SYNC_NOW]'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">OPERATOR_IDENTITY</h3>
        {user ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ 
                width: '40px', height: '40px', 
                border: '1px solid var(--border-light)', 
                background: 'var(--bg-secondary)', 
                color: 'var(--text-primary)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: 800, fontSize: '1rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                {user.email?.[0]?.toUpperCase() || 'O'}
              </div>
              <div>
                <div style={{ fontWeight: 800 }}>{user.displayName || 'OPERATOR'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.email}</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={signOut}>
              [ DISCONNECT_SESSION ]
            </button>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            UNAUTHENTICATED // Running in local filesystem storage mode.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>TARGET_EXAM_GOALS</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddGoal(true)}>
            [ + CONFIGURE TARGET ]
          </button>
        </div>
        
        {examGoals.length === 0 ? (
          <div className="empty" style={{ padding: '18px', textAlign: 'center' }}>
            NO_EXAM_TARGETS_REGISTERED
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {examGoals.map(goal => (
              <div 
                key={goal.id} 
                style={{ 
                  padding: '12px 14px', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-sm)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  backgroundColor: goal.isActive ? 'var(--bg-secondary)' : 'transparent', 
                  borderColor: goal.isActive ? 'var(--text-primary)' : 'var(--border)' 
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 800 }}>{goal.name}</span>
                    {goal.isActive && (
                      <span className="chip" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                        [PRIMARY_TARGET]
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    DEADLINE: {new Date(goal.examDate).toLocaleDateString()} // TARGET_SCORE: {goal.targetScore || 80}%
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!goal.isActive && (
                    <button className="btn btn-secondary btn-xs" onClick={() => handleSetActiveGoal(goal.id)}>
                      [ACTIVATE]
                    </button>
                  )}
                  <button 
                    className="del-btn" 
                    onClick={() => { 
                      if(window.confirm('CONFIRM_DELETE_GOAL: Delete this goal?')) {
                        deleteExamGoal(goal.id);
                        showToast("GOAL_DELETED");
                      }
                    }}
                  >
                    [DEL]
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MockTestSection 
        mockTests={mockTests} 
        subjects={subjects} 
        topics={topics} 
        activeGoal={activeGoal} 
        onSave={saveMockTest} 
        onDelete={deleteMockTest} 
        showToast={showToast} 
      />

      {showAddGoal && (
        <AddGoalModal 
          onClose={() => setShowAddGoal(false)} 
          onSave={async (g) => { 
            try {
              await saveExamGoal(g);
              setShowAddGoal(false);
              showToast("GOAL_INITIALIZED");
            } catch (err) {
              showToast("SAVED_LOCALLY: " + err.message);
            }
          }} 
          isFirst={examGoals.length === 0} 
        />
      )}
    </>
  );
};
