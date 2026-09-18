import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useExamStore } from '../../stores/useExamStore';
import { usePlanStore } from '../../stores/usePlanStore';
import { useUIStore } from '../../stores/useUIStore';
import { DataService } from '../../services/dataService';
import { AddGoalModal } from './AddGoalModal';
import { X, Trash2, Cloud, Target, User } from 'lucide-react';

export const SettingsModal = ({ onClose }) => {
  const { user, signOut } = useAuthStore();
  const { examGoals, subjects, topics, saveExamGoal, deleteExamGoal, setActiveExamGoal } = useExamStore();
  const { dailyPlans } = usePlanStore();
  const { isSyncing, showToast } = useUIStore();

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);

  const handleManualSync = async () => {
    try {
      setManualSyncing(true);
      const res = await DataService.syncAllData();
      showToast(`Cloud Sync Complete: ${res.goals} Goals • ${res.subjects} Modules • ${res.topics} Topics`);
    } catch (err) {
      showToast("Sync Error: " + err.message);
    } finally {
      setManualSyncing(false);
    }
  };

  const handleSetActiveGoal = async (id) => {
    try {
      await setActiveExamGoal(id);
      showToast("Active target switched");
    } catch {
      showToast("Error: Switch failed");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div 
          className="modal-content" 
          onClick={e => e.stopPropagation()} 
          style={{ maxWidth: '520px' }}
        >
          <div className="modal-header">
            <h3 style={{ margin: 0 }}>Planner Settings</h3>
            <button className="del-btn" onClick={onClose} title="Close Settings">
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Operator Account Section */}
            <div style={{ padding: '14px 16px', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}>
              <div style={{ color: 'var(--ink-secondary)', fontSize: '0.72rem', letterSpacing: '0.6px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                Account &amp; Sync Identity
              </div>
              {user ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', 
                      background: 'var(--pastel-blue)', 
                      color: 'var(--pastel-blue-dark)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontWeight: 800, fontSize: '1rem',
                      borderRadius: '50%'
                    }}>
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink-primary)' }}>{user.displayName || 'Google Account User'}</div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '0.76rem' }}>{user.email}</div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-xs" onClick={signOut}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', margin: 0 }}>
                  Offline Guest Mode • Local Storage Cache
                </p>
              )}
            </div>

            {/* Cloud Sync Telemetry */}
            <div style={{ padding: '14px 16px', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: 'var(--ink-secondary)', fontSize: '0.72rem', letterSpacing: '0.6px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Google Cloud Persistence
                </span>
                <span className="chip chip-mint" style={{ fontSize: '0.68rem', padding: '1px 8px' }}>
                  {isSyncing || manualSyncing ? 'Syncing...' : 'Realtime Connected'}
                </span>
              </div>
              <div style={{ color: 'var(--ink-secondary)', fontSize: '0.78rem', marginBottom: '10px' }}>
                {examGoals.length} Goals • {subjects.length} Modules • {topics.length} Topics • {dailyPlans?.length || 0} Daily Plans
              </div>
              <button 
                className="btn btn-secondary btn-xs" 
                onClick={handleManualSync}
                disabled={manualSyncing || isSyncing}
              >
                {manualSyncing || isSyncing ? 'Syncing...' : 'Force Sync to Cloud'}
              </button>
            </div>

            {/* Exam Goals Configuration */}
            <div style={{ padding: '14px 16px', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--ink-secondary)', fontSize: '0.72rem', letterSpacing: '0.6px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Target Exam Goals
                </span>
                <button className="btn btn-primary btn-xs" onClick={() => setShowAddGoal(true)}>
                  + Add Goal
                </button>
              </div>

              {examGoals.length === 0 ? (
                <div style={{ padding: '14px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
                  No target exam goals configured yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {examGoals.map(goal => (
                    <div 
                      key={goal.id} 
                      style={{ 
                        padding: '9px 12px', 
                        border: '1px solid var(--paper-border)', 
                        borderRadius: 'var(--radius-sm)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        backgroundColor: goal.isActive ? '#ffffff' : 'transparent',
                        boxShadow: goal.isActive ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink-primary)' }}>{goal.name}</span>
                          {goal.isActive && (
                            <span className="chip chip-yellow" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                              Active Target
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--ink-muted)', fontSize: '0.74rem', marginTop: '2px' }}>
                          Exam Date: {new Date(goal.examDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {!goal.isActive && (
                          <button className="btn btn-secondary btn-xs" onClick={() => handleSetActiveGoal(goal.id)}>
                            Activate
                          </button>
                        )}
                        <button 
                          className="del-btn" 
                          onClick={() => { 
                            if (window.confirm('Delete this exam target goal?')) {
                              deleteExamGoal(goal.id);
                              showToast("Goal deleted");
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddGoal && (
        <AddGoalModal 
          onClose={() => setShowAddGoal(false)} 
          onSave={async (g) => { 
            try {
              await saveExamGoal(g);
              setShowAddGoal(false);
              showToast("Goal saved");
            } catch (err) {
              showToast("Saved locally: " + err.message);
            }
          }} 
          isFirst={examGoals.length === 0} 
        />
      )}
    </>
  );
};
