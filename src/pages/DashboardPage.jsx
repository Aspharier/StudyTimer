import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useExamStore } from '../stores/useExamStore';
import { usePlanStore } from '../stores/usePlanStore';
import { useMockStore } from '../stores/useMockStore';
import { useUIStore } from '../stores/useUIStore';
import { ExamCountdown } from '../components/dashboard/ExamCountdown';
import { NextActionCard } from '../components/dashboard/NextActionCard';
import { todayISO } from '../utils/dateUtils';
import { TYPE_LABELS } from '../utils/constants';

export const DashboardPage = () => {
  const { subjects, topics, getActiveGoal, getSyllabusProgress } = useExamStore();
  const { dailyPlans, toggleTask } = usePlanStore();
  const { mockTests } = useMockStore();
  const { setActiveTab } = useUIStore();

  const activeGoal = getActiveGoal();
  const todayStr = todayISO();
  const todayPlan = dailyPlans.find(p => p.date === todayStr);
  const todayItems = todayPlan?.items || [];
  const completedItems = todayItems.filter(i => i.completed);
  const planProgress = todayItems.length > 0 ? completedItems.length / todayItems.length : 0;

  const syllabusProgressPct = getSyllabusProgress();

  const currentStreak = useMemo(() => {
    let streak = 0;
    let d = new Date();
    while (true) {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const p = dailyPlans.find(plan => plan.date === dStr);
      if (!p || !p.items || p.items.length === 0) break;
      const comp = p.items.filter(i => i.completed).length;
      if (comp / p.items.length >= 0.8) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [dailyPlans]);

  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const p = dailyPlans.find(plan => plan.date === dStr);
      let completion = 0;
      let completedCount = 0;
      let totalCount = 0;
      if (p && p.items && p.items.length > 0) {
        totalCount = p.items.length;
        completedCount = p.items.filter(item => item.completed).length;
        completion = completedCount / totalCount;
      }
      days.push({
        date: dStr,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        completion,
        completedCount,
        totalCount,
        hasPlan: !!p && !!p.items && p.items.length > 0
      });
    }
    return days;
  }, [dailyPlans]);

  const avgCompletion = useMemo(() => {
    const plansCount = last7Days.filter(d => d.hasPlan).length;
    if (plansCount === 0) return 0;
    return last7Days.reduce((sum, d) => sum + d.completion, 0) / plansCount;
  }, [last7Days]);

  const readinessInfo = useMemo(() => {
    const goalTests = activeGoal ? mockTests.filter(t => String(t.examGoalId) === String(activeGoal.id)) : [];
    const avgMockScore = goalTests.length > 0 
      ? goalTests.reduce((a, t) => a + (t.scorePercentage || 0), 0) / goalTests.length 
      : 0;

    const last30Plans = dailyPlans.filter(p => {
      const pDate = new Date(p.date);
      const diff = new Date() - pDate;
      return diff <= 30 * 24 * 60 * 60 * 1000 && diff >= 0;
    });
    const creationRate = last30Plans.length / 30;
    const avgComp30 = last30Plans.length > 0 ? last30Plans.reduce((a, p) => {
      const c = p.items ? p.items.filter(i => i.completed).length : 0;
      return a + (p.items?.length > 0 ? c / p.items.length : 0);
    }, 0) / last30Plans.length : 0;
    const streakBonus = Math.min(currentStreak / 30, 1);

    const consistencyScore = (creationRate * 40) + (avgComp30 * 40) + (streakBonus * 20);
    const readiness = (syllabusProgressPct * 0.35) + ((avgMockScore / 100) * 0.40 * 100) + ((consistencyScore / 100) * 0.25 * 100);

    let levelText = 'NOT_READY';
    if (readiness >= 80) levelText = 'READY_FOR_EXAM';
    else if (readiness >= 60) levelText = 'STRONG_PROGRESS';
    else if (readiness >= 35) levelText = 'DEVELOPING';

    return {
      readiness: Math.round(readiness),
      levelText,
      syllabusProgress: syllabusProgressPct,
      avgMockScore: Math.round(avgMockScore),
      consistencyScore: Math.round(consistencyScore)
    };
  }, [activeGoal, mockTests, dailyPlans, syllabusProgressPct, currentStreak]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const p = dailyPlans.find(plan => plan.date === dStr);
      if (p && p.items && p.items.length > 0) {
        const comp = (p.items.filter(item => item.completed).length / p.items.length) * 100;
        data.push({ date: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), completion: comp });
      }
    }
    return data;
  }, [dailyPlans]);

  const weakTopicsCount = useMemo(() => {
    return topics.filter(t => !t.parentId && (t.status === 'WEAK' || (t.confidenceScore && t.confidenceScore < 40))).length;
  }, [topics]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ExamCountdown />

      <NextActionCard />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">// PLAN_STREAK</div>
          <div className="stat-value">{currentStreak}</div>
          <div className="stat-sub">DAYS (&gt;=80% COMPLETED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">// 7D_COMPLETION</div>
          <div className="stat-value">{Math.round(avgCompletion * 100)}%</div>
          <div className="stat-sub">EXECUTION RATE</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">// SYLLABUS_MASTERY</div>
          <div className="stat-value">{syllabusProgressPct}%</div>
          <div className="stat-sub">{topics.filter(t => !t.parentId && t.status === 'MASTERED').length} TOPICS MASTERED</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">// WEAK_FLAGGED</div>
          <div className="stat-value">
            {weakTopicsCount}
          </div>
          <div className="stat-sub">NEEDS REVISION</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="card-title">TODAY_MISSIONS</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            [{completedItems.length} / {todayItems.length} COMPLETED]
          </span>
        </div>
        {todayItems.length > 0 ? (
          <>
            <div className="progress-bar-bg" style={{ marginBottom: '16px' }}>
              <div className="progress-bar-fill" style={{ width: `${planProgress * 100}%` }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {todayItems.map(item => {
                const subject = subjects.find(s => s.id === item.subjectId);
                const duration = item.duration || item.estimatedMinutes || 60;
                return (
                  <div key={item.id} className="plan-item" style={{ opacity: item.completed ? 0.5 : 1 }}>
                    <input 
                      type="checkbox" 
                      className="plan-item-checkbox" 
                      checked={!!item.completed} 
                      onChange={() => toggleTask(todayStr, item.id)} 
                    />
                    <span className="chip" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    {subject && (
                      <span className="chip" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                        {subject.name}
                      </span>
                    )}
                    <span style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none' }}>
                      {item.title}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {duration}m
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty" style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>NO_MISSIONS_REGISTERED_FOR_TODAY</p>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('plan')}>
              [ CREATE MISSIONS ]
            </button>
          </div>
        )}
      </div>

      <div className="grid-2col">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>7D_CONSISTENCY</h3>
          <div className="consistency-grid">
            {last7Days.map((day, idx) => {
              const isSolid = day.hasPlan && day.completion >= 0.8;
              const isPartial = day.hasPlan && day.completion >= 0.5;
              return (
                <div key={idx} className="consistency-day">
                  <div className="consistency-day-label">{day.label}</div>
                  <div 
                    className="consistency-day-value" 
                    style={{ 
                      backgroundColor: isSolid ? 'var(--text-primary)' : isPartial ? 'var(--bg-card)' : 'transparent',
                      color: isSolid ? 'var(--bg-primary)' : 'inherit',
                      borderColor: day.hasPlan ? 'var(--border-light)' : 'var(--border)',
                      padding: '8px 2px', 
                      margin: '4px 0', 
                      fontSize: '0.82rem', 
                      fontWeight: 800 
                    }}
                  >
                    {day.hasPlan ? `${Math.round(day.completion * 100)}%` : '-'}
                  </div>
                  <div className="consistency-day-sub">
                    {day.hasPlan ? `${day.completedCount}/${day.totalCount}` : 'N/A'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>READINESS_INDEX</h3>
          <div style={{ textAlign: 'left', padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1 }}>
                {readinessInfo.readiness}%
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                [{readinessInfo.levelText}]
              </div>
            </div>
            
            <div className="progress-bar-bg" style={{ margin: '14px 0 16px' }}>
              <div className="progress-bar-fill" style={{ width: `${readinessInfo.readiness}%` }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div>SYLLABUS: {readinessInfo.syllabusProgress}%</div>
              <div>MOCKS: {readinessInfo.avgMockScore}%</div>
              <div>CONSISTENCY: {readinessInfo.consistencyScore}%</div>
            </div>
          </div>
        </div>
      </div>

      {trendData.length > 1 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>TELEMETRY: 30D_EXECUTION_TREND</h3>
          <div style={{ height: '180px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="completion" stroke="var(--text-primary)" strokeWidth={2} dot={{ r: 2, fill: 'var(--text-primary)' }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
