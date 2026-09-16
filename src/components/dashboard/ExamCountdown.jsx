import { useExamStore } from '../../stores/useExamStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { getDaysRemaining, formatDateDisplay } from '../../utils/dateUtils';

export const ExamCountdown = () => {
  const { getActiveGoal } = useExamStore();
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();

  const activeGoal = getActiveGoal();
  const daysRemaining = activeGoal ? getDaysRemaining(activeGoal.examDate) : null;
  const targetScore = activeGoal?.targetScore || 80;
  const displayName = user?.displayName?.split(' ')[0]?.toUpperCase() || 'OPERATOR';

  if (!activeGoal) {
    return (
      <div className="card" style={{ padding: '28px', textAlign: 'left' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '8px' }}>
          // SYSTEM STATUS: NO ACTIVE TARGET
        </div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>NO_EXAM_GOAL_CONFIGURED</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>
          Define target exam name and deadline in settings to initialize the telemetry engine.
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('settings')}>
          [ CONFIGURE TARGET ]
        </button>
      </div>
    );
  }

  const start = new Date(activeGoal.createdAt || activeGoal.examDate);
  const end = new Date(activeGoal.examDate);
  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const elapsed = totalDays - (daysRemaining || 0);
  const goalProgressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

  return (
    <div className="countdown-hero card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '1px' }}>
            // OPERATOR: {displayName}
          </span>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '2px', color: 'var(--text-primary)' }}>
            TARGET: {activeGoal.name}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
            BENCHMARK
          </span>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            {targetScore}% SCORE
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-1px' }}>
            {daysRemaining}
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>
              DAYS_REMAINING
            </span>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          EXAM_DATE: {formatDateDisplay(activeGoal.examDate)}
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
          <span>TIMELINE_ELAPSED</span>
          <span>{goalProgressPct}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${goalProgressPct}%` }}></div>
        </div>
      </div>
    </div>
  );
};
