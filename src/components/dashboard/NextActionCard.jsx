import { useExamStore } from '../../stores/useExamStore';
import { usePlanStore } from '../../stores/usePlanStore';
import { useUIStore } from '../../stores/useUIStore';
import { getNextBestAction } from '../../services/recommendationEngine';
import { todayISO } from '../../utils/dateUtils';
import { generateId } from '../../utils/idGenerator';

export const NextActionCard = () => {
  const { subjects, topics } = useExamStore();
  const { dailyPlans, saveDailyPlan } = usePlanStore();
  const { setActiveTab, showToast } = useUIStore();

  const action = getNextBestAction(subjects, topics);

  const handleStartOrQueue = async () => {
    if (action.type === 'SETUP') {
      setActiveTab('syllabus');
      return;
    }

    const today = todayISO();
    const todayPlan = dailyPlans.find(p => p.date === today) || { id: generateId(), date: today, items: [], reflection: null };
    
    const exists = todayPlan.items.some(i => i.topicId === action.topic?.id);
    if (!exists && action.topic) {
      const newTask = {
        id: generateId(),
        type: action.type === 'PRACTICE' ? 'PRACTICE' : action.type === 'WEAK_REVISION' ? 'REVISION' : 'LECTURE',
        subjectId: action.subject?.id || '',
        topicId: action.topic.id,
        title: `FOCUS: ${action.topic.name}`,
        duration: action.suggestedMinutes || 45,
        completed: false
      };
      await saveDailyPlan({ ...todayPlan, items: [newTask, ...todayPlan.items] });
      showToast(`QUEUED: "${action.topic.name}"`);
    } else {
      showToast(`SESSION_INITIALIZED: ${action.topic?.name || 'TARGET'}`);
    }

    setActiveTab('plan');
  };

  return (
    <div className="card next-action-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <span style={{ 
          fontSize: '0.72rem', 
          fontWeight: 800, 
          letterSpacing: '1px', 
          textTransform: 'uppercase', 
          color: 'var(--text-primary)'
        }}>
          &gt; DISPATCH // NEXT_BEST_ACTION
        </span>
        {action.subject && (
          <span className="chip">
            {action.subject.name}
          </span>
        )}
      </div>

      <div style={{ margin: '8px 0 14px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
          {action.title}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          {action.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div>
            DURATION: <strong style={{ color: 'var(--text-primary)' }}>{action.suggestedMinutes}m</strong>
          </div>
          {action.suggestedQuestions > 0 && (
            <div>
              QUESTIONS: <strong style={{ color: 'var(--text-primary)' }}>{action.suggestedQuestions}q</strong>
            </div>
          )}
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleStartOrQueue}
        >
          {action.type === 'SETUP' ? '[ CONFIGURE SYLLABUS ]' : '[ START SESSION ]'}
        </button>
      </div>
    </div>
  );
};
