import { useExamStore } from '../../stores/useExamStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getDaysRemaining, formatDateDisplay } from '../../utils/dateUtils';
import { Calendar, Target } from 'lucide-react';

export const ExamCountdown = ({ onOpenSettings }) => {
  const { getActiveGoal } = useExamStore();
  const { user } = useAuthStore();

  const activeGoal = getActiveGoal();
  const daysRemaining = activeGoal ? getDaysRemaining(activeGoal.examDate) : null;
  const displayName = user?.displayName?.split(' ')[0] || 'Operator';

  if (!activeGoal) {
    return (
      <div className="card" style={{ padding: '28px', textAlign: 'left' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 600 }}>
          Target Status: No Active Goal
        </div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 700 }}>No Target Exam Configured</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '18px', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Configure your target exam name and deadline date in settings to initialize your liquid countdown dashboard.
        </p>
        <button className="btn btn-primary" onClick={onOpenSettings}>
          Configure Target Exam
        </button>
      </div>
    );
  }

  const start = new Date(activeGoal.createdAt || activeGoal.examDate);
  const end = new Date(activeGoal.examDate);
  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const elapsed = totalDays - (daysRemaining || 0);
  const goalProgressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Planner Date Bar with Weekday Indicator Dots */}
      <div className="planner-date-bar">
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--ink-secondary)', textTransform: 'uppercase', marginRight: '8px' }}>
            DATE
          </span>
          <span className="planner-date-title">{formattedDate}</span>
        </div>
        <div className="weekday-dots">
          {weekdays.map((w, idx) => (
            <span key={idx} className={`weekday-dot ${idx === dayOfWeek ? 'active' : ''}`}>
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Countdown Card */}
      <div className="countdown-hero card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--paper-line)', paddingBottom: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="planner-box-header" style={{ margin: 0, padding: '2px 8px', fontSize: '0.68rem' }}>
                MY GAMECHANGER GOAL
              </span>
              <span className="chip chip-mint" style={{ fontSize: '0.68rem', padding: '1px 8px' }}>
                {displayName}
              </span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--ink-primary)', letterSpacing: '-0.02em', marginTop: '4px' }}>
              {activeGoal.name}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span 
              className="chip chip-blue" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 9px'
              }}
            >
              <Calendar size={12} />
              {formatDateDisplay(activeGoal.examDate)}
            </span>
          </div>
        </div>

        {/* Main Days Metric */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div className="days-number">
              {daysRemaining}
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--ink-secondary)', marginTop: '2px' }}>
              Days Remaining
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', marginBottom: '2px', fontWeight: 600 }}>
              Timeline Progress
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0284c7' }}>
              {goalProgressPct}% Elapsed
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${goalProgressPct}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
