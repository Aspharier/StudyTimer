import { useState } from 'react';
import { useExamStore } from '../stores/useExamStore';
import { useUIStore } from '../stores/useUIStore';
import { AddSubjectModal } from '../components/syllabus/AddSubjectModal';
import { AddTopicModal } from '../components/syllabus/AddTopicModal';
import { ConfidenceModal } from '../components/syllabus/ConfidenceModal';
import { STATUS_CONFIG } from '../utils/constants';
import { generateId } from '../utils/idGenerator';

export const SyllabusPage = () => {
  const { 
    topics, 
    getActiveGoal, 
    getGoalSubjects, 
    saveSubject, 
    deleteSubject, 
    saveTopic, 
    deleteTopic, 
    cycleTopicStatus 
  } = useExamStore();
  const { showToast, setActiveTab } = useUIStore();

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [ratingTopic, setRatingTopic] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});

  const activeGoal = getActiveGoal();

  if (!activeGoal) {
    return (
      <div className="card" style={{ padding: '28px', textAlign: 'left' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '8px' }}>
          // SYSTEM STATUS: NO ACTIVE TARGET
        </div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>NO_EXAM_GOAL_CONFIGURED</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>
          Initialize an exam goal in settings to construct the syllabus tree.
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('settings')}>
          [ CONFIGURE TARGET ]
        </button>
      </div>
    );
  }

  const goalSubjects = getGoalSubjects();

  const toggleSubject = (id) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCycleStatus = async (topic) => {
    try {
      await cycleTopicStatus(topic);
    } catch {
      showToast('ERROR: Status cycle failed');
    }
  };

  const handleDeleteTopic = async (id) => {
    if (window.confirm("DELETE_TOPIC_CONFIRMATION: Delete topic & subtopics?")) {
      try {
        await deleteTopic(id);
        showToast("TOPIC_DELETED");
      } catch {
        showToast("ERROR: Deletion failed");
      }
    }
  };

  const handleDeleteSubject = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("DELETE_SUBJECT_CONFIRMATION: Delete subject & ALL topics?")) {
      try {
        await deleteSubject(id);
        showToast("SUBJECT_DELETED");
      } catch {
        showToast("ERROR: Deletion failed");
      }
    }
  };

  const handleAddSubtopic = async (parentId, e) => {
    e.stopPropagation();
    const name = window.prompt("ENTER_SUBTOPIC_NAME:");
    if (name && name.trim()) {
      const parent = topics.find(t => t.id === parentId);
      if (parent) {
        await saveTopic({
          id: generateId(),
          examGoalId: activeGoal.id,
          subjectId: parent.subjectId,
          parentId,
          name: name.trim(),
          status: 'NOT_STARTED',
          confidenceScore: 0
        });
        showToast("SUBTOPIC_ADDED");
      }
    }
  };

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              // SYLLABUS_ARCHITECTURE
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>
              TARGET: {activeGoal.name} • 5-STAGE RETRIEVAL LIFECYCLE
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubject(true)}>
            [ + ADD SUBJECT ]
          </button>
        </div>
      </div>

      {goalSubjects.length === 0 ? (
        <div className="empty card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ fontWeight: '700', marginBottom: '6px' }}>NO_SUBJECTS_REGISTERED</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
            Initialize syllabus modules: [Subject] -&gt; [Topic] -&gt; [Subtopics].
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubject(true)}>
            [ + INITIALIZE SUBJECT ]
          </button>
        </div>
      ) : (
        goalSubjects.map(subject => {
          const subjectTopics = topics.filter(t => t.subjectId === subject.id && !t.parentId);
          const masteredCount = subjectTopics.filter(t => t.status === 'MASTERED').length;
          const practicingCount = subjectTopics.filter(t => t.status === 'PRACTICING').length;
          const learningCount = subjectTopics.filter(t => t.status === 'LEARNING').length;
          const weakCount = subjectTopics.filter(t => t.status === 'WEAK').length;
          
          const pct = subjectTopics.length > 0 ? Math.round((masteredCount / subjectTopics.length) * 100) : 0;
          const isExpanded = expandedSubjects[subject.id] !== false;

          return (
            <div key={subject.id} style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginBottom: '16px',
              overflow: 'hidden',
            }}>
              {/* Subject Header */}
              <div
                onClick={() => toggleSubject(subject.id)}
                style={{
                  padding: '14px 18px',
                  background: 'var(--bg-secondary)',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  userSelect: 'none',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>// MODULE:</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      {subject.name}
                    </strong>
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="progress-bar-bg" style={{ flex: 1, height: '4px' }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '36px', textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {masteredCount > 0 && (
                    <span className="chip" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', fontWeight: 800 }}>
                      {masteredCount} MASTERED
                    </span>
                  )}
                  {practicingCount > 0 && (
                    <span className="chip">
                      {practicingCount} PRACTICING
                    </span>
                  )}
                  {learningCount > 0 && (
                    <span className="chip">
                      {learningCount} LEARNING
                    </span>
                  )}
                  {weakCount > 0 && (
                    <span className="chip" style={{ borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}>
                      {weakCount} WEAK
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    [{subjectTopics.length} TOPICS]
                  </span>
                </div>

                <button 
                  className="del-btn" 
                  onClick={(e) => handleDeleteSubject(subject.id, e)} 
                  title="Delete subject"
                >
                  [DEL]
                </button>
                <span style={{
                  color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700,
                  padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)'
                }}>
                  {isExpanded ? '[-] HIDE' : '[+] VIEW'}
                </span>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px' }}>
                  {subjectTopics.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      NO_TOPICS_CONFIGURED_YET
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '10px',
                      marginBottom: '12px',
                    }}>
                      {subjectTopics.map(topic => {
                        const st = topic.status || 'NOT_STARTED';
                        const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.NOT_STARTED;
                        const subtopics = topics.filter(t => t.parentId === topic.id);
                        const subCompleted = subtopics.filter(t => t.status === 'MASTERED').length;
                        const confidence = topic.confidenceScore || 0;

                        return (
                          <div 
                            key={topic.id}
                            className="topic-card"
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span 
                                onClick={() => handleCycleStatus(topic)}
                                title="Click to cycle status"
                                style={{
                                  fontSize: '0.68rem', fontWeight: 800,
                                  padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                                  background: cfg.bg, color: cfg.color,
                                  border: `1px solid ${cfg.border}`,
                                  cursor: 'pointer'
                                }}
                              >
                                {cfg.label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  onClick={() => setRatingTopic(topic)}
                                  title="Calibrate recall confidence"
                                  className="del-btn"
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  [EVAL]
                                </button>
                                <button
                                  className="del-btn"
                                  onClick={() => handleDeleteTopic(topic.id)}
                                  title="Delete topic"
                                >
                                  [X]
                                </button>
                              </div>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.3px', margin: '2px 0' }}>
                              {topic.name}
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                                <span>MASTERY</span>
                                <strong>{confidence}%</strong>
                              </div>
                              <div className="progress-bar-bg" style={{ height: '3px' }}>
                                <div className="progress-bar-fill" style={{ width: `${confidence}%` }} />
                              </div>
                            </div>

                            {subtopics.length > 0 && (
                              <div style={{ marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                                {subtopics.map(sub => {
                                  const subCfg = STATUS_CONFIG[sub.status || 'NOT_STARTED'] || STATUS_CONFIG.NOT_STARTED;
                                  return (
                                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.75rem' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>- {sub.name}</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span
                                          onClick={() => handleCycleStatus(sub)}
                                          style={{ cursor: 'pointer', fontSize: '0.65rem', padding: '1px 4px', border: `1px solid ${subCfg.border}` }}
                                          title="Click to cycle status"
                                        >
                                          {subCfg.label}
                                        </span>
                                        <button 
                                          className="del-btn" 
                                          onClick={() => handleDeleteTopic(sub.id)} 
                                          style={{ fontSize: '0.65rem' }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  [{subCompleted}/{subtopics.length} SUBTOPICS MASTERED]
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: 'auto', paddingTop: '6px' }}>
                              <button
                                onClick={() => handleCycleStatus(topic)}
                                className="btn btn-xs"
                              >
                                {cfg.nextAction}
                              </button>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={(e) => handleAddSubtopic(topic.id, e)}
                              >
                                [+ SUB]
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    className="btn btn-secondary btn-sm w-full"
                    onClick={() => { setSelectedSubjectId(subject.id); setShowAddTopic(true); }}
                  >
                    [ + ADD TOPIC TO {subject.name.toUpperCase()} ]
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {showAddSubject && (
        <AddSubjectModal
          activeGoal={activeGoal}
          onClose={() => setShowAddSubject(false)}
          onAdd={async (s) => { 
            await saveSubject(s); 
            setShowAddSubject(false); 
            showToast("SUBJECT_INITIALIZED");
          }}
        />
      )}

      {showAddTopic && (
        <AddTopicModal
          activeGoal={activeGoal}
          subjectId={selectedSubjectId}
          onClose={() => { setShowAddTopic(false); setSelectedSubjectId(null); }}
          onAdd={async (t) => { 
            await saveTopic(t); 
            setShowAddTopic(false); 
            setSelectedSubjectId(null); 
            showToast("TOPIC_REGISTERED");
          }}
        />
      )}

      {ratingTopic && (
        <ConfidenceModal
          topic={ratingTopic}
          onClose={() => setRatingTopic(null)}
          onSave={async (updatedTopic) => {
            await saveTopic(updatedTopic);
            setRatingTopic(null);
            showToast(`TELEMETRY_UPDATED: ${updatedTopic.name}`);
          }}
        />
      )}
    </>
  );
};
