import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AddMockTestModal } from './AddMockTestModal';

export const MockTestSection = ({ mockTests, subjects, activeGoal, onSave, onDelete, showToast }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState('ALL');

  if (!activeGoal) return null;

  const goalTests = mockTests
    .filter(t => String(t.examGoalId) === String(activeGoal.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
    
  const filteredTests = filterType === 'ALL' ? goalTests : goalTests.filter(t => t.type === filterType);

  const chartData = [...filteredTests].reverse().map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    score: t.scorePercentage
  }));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>MOCK_TEST_LOGS</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          [ + RECORD SCORE ]
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['ALL', 'FULL_MOCK', 'SECTIONAL', 'TOPIC'].map(type => (
          <button 
            key={type} 
            className={`btn btn-xs ${filterType === type ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setFilterType(type)}
          >
            [{type}]
          </button>
        ))}
      </div>

      {chartData.length > 1 && (
        <div style={{ height: '180px', width: '100%', marginBottom: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="var(--text-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--text-primary)' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {filteredTests.length === 0 ? (
        <div className="empty" style={{ padding: '24px', textAlign: 'center' }}>
          NO_TEST_RESULTS_RECORDED_YET
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTests.map(test => {
            const subject = subjects.find(s => s.id === test.subjectId);
            return (
              <div 
                key={test.id} 
                style={{ 
                  padding: '12px 14px', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-sm)', 
                  background: 'var(--bg-secondary)',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 800 }}>{test.title}</span>
                    <span className="chip" style={{ fontSize: '0.65rem' }}>
                      [{test.type}]
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    DATE: {new Date(test.date).toLocaleDateString()} {subject && `// MOD: ${subject.name}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontWeight: 800, 
                      fontSize: '1.1rem', 
                      color: 'var(--text-primary)'
                    }}>
                      {test.scorePercentage}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {test.score} / {test.maxScore} PTS
                    </div>
                  </div>
                  <button 
                    className="del-btn" 
                    onClick={() => { 
                      if(window.confirm('DELETE_TEST_SCORE: Delete this recorded result?')) {
                        onDelete(test.id);
                        showToast("RECORD_DELETED");
                      }
                    }}
                  >
                    [DEL]
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddMockTestModal 
          activeGoal={activeGoal}
          subjects={subjects}
          onClose={() => setShowAdd(false)}
          onSave={async (t) => { 
            await onSave(t); 
            setShowAdd(false); 
            showToast("SCORE_RECORDED");
          }}
        />
      )}
    </div>
  );
};
