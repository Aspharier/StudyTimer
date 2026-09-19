import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useExamStore } from '../stores/useExamStore';
import { useUIStore } from '../stores/useUIStore';
import { AddSubjectModal } from '../components/syllabus/AddSubjectModal';
import { AddTopicModal } from '../components/syllabus/AddTopicModal';
import { AddSubtopicModal } from '../components/syllabus/AddSubtopicModal';
import { ConfidenceModal } from '../components/syllabus/ConfidenceModal';
import { STATUS_CONFIG } from '../utils/constants';
import { generateId } from '../utils/idGenerator';

export const SyllabusPage = ({ onOpenSettings }) => {
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
  const { showToast } = useUIStore();

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [ratingTopic, setRatingTopic] = useState(null);
  const [subtopicParent, setSubtopicParent] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedSubtopics, setExpandedSubtopics] = useState({});

  const activeGoal = getActiveGoal();

  if (!activeGoal) {
    return (
      <div className="card" style={{ padding: '28px', textAlign: 'left' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 600 }}>
          No Active Target Exam
        </div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 700 }}>No Target Exam Configured</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '18px', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Initialize an exam goal in settings to construct the interactive syllabus tree.
        </p>
        <button className="btn btn-primary" onClick={onOpenSettings}>
          Configure Target Exam
        </button>
      </div>
    );
  }

  const goalSubjects = getGoalSubjects();

  const toggleSubject = (id) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubtopics = (topicId) => {
    setExpandedSubtopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const handleCycleStatus = async (topic) => {
    try {
      await cycleTopicStatus(topic);
    } catch {
      showToast('Error: Status cycle failed');
    }
  };

  const handleDeleteTopic = async (id) => {
    if (window.confirm("Delete topic and its subtopics?")) {
      try {
        await deleteTopic(id);
        showToast("Topic deleted");
      } catch {
        showToast("Error: Deletion failed");
      }
    }
  };

  const handleDeleteSubject = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Delete subject module and all its topics?")) {
      try {
        await deleteSubject(id);
        showToast("Subject deleted");
      } catch {
        showToast("Error: Deletion failed");
      }
    }
  };

  const handleAddSubtopic = (topic, e) => {
    if (e) e.stopPropagation();
    setSubtopicParent(topic);
  };

  const handleSaveSubtopic = async (name) => {
    if (!subtopicParent) return;
    try {
      await saveTopic({
        id: generateId(),
        examGoalId: activeGoal.id,
        subjectId: subtopicParent.subjectId,
        parentId: subtopicParent.id,
        name: name.trim(),
        status: 'NOT_STARTED',
        confidenceScore: 0
      });
      showToast("Subtopic added");
      setSubtopicParent(null);
    } catch {
      showToast("Error: Failed to add subtopic");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: '12px' }}>
      {/* Top Header */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="planner-box-header" style={{ margin: 0, padding: '2px 8px', fontSize: '0.68rem' }}>
                SPACE OF INFINITE POSSIBILITY®
              </span>
              <span className="chip chip-blue" style={{ fontSize: '0.68rem', padding: '1px 8px' }}>
                {activeGoal.name}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
              Curriculum & Syllabus
            </h2>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubject(true)}>
            + Add Module
          </button>
        </div>
      </div>

      {/* Subjects Accordion List (Scrolls smoothly inside right page without expanding scrapbook) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
        {goalSubjects.length === 0 ? (
          <div className="empty card" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📚</div>
            <p style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '6px' }}>No Syllabus Modules Added</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '18px' }}>
              Organize your syllabus hierarchy: Module / Subject → Topic → Subtopics.
            </p>
            <button className="btn btn-primary" onClick={() => setShowAddSubject(true)}>
              + Add First Module
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
            const isExpanded = !!expandedSubjects[subject.id];

            return (
              <div 
                key={subject.id} 
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--paper-border)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  marginBottom: '10px',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Subject Accordion Header */}
                <div
                  onClick={() => toggleSubject(subject.id)}
                  style={{
                    padding: '12px 16px',
                    background: isExpanded ? '#f8fafc' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid var(--paper-border)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    userSelect: 'none',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--ink-primary)', letterSpacing: '-0.01em' }}>
                        {subject.name}
                      </strong>
                    </div>
                    <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="progress-bar-bg" style={{ flex: 1, height: '6px' }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, minWidth: '34px', textAlign: 'right', color: '#0284c7' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {masteredCount > 0 && (
                      <span className="chip chip-mint" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                        {masteredCount} Mastered
                      </span>
                    )}
                    {practicingCount > 0 && (
                      <span className="chip chip-blue" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                        {practicingCount} Practicing
                      </span>
                    )}
                    {learningCount > 0 && (
                      <span className="chip chip-yellow" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                        {learningCount} Learning
                      </span>
                    )}
                    {weakCount > 0 && (
                      <span className="chip chip-coral" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                        {weakCount} Needs Work
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginLeft: '2px', fontWeight: 600 }}>
                      {subjectTopics.length} Topics
                    </span>
                  </div>

                  <button 
                    className="del-btn" 
                    onClick={(e) => handleDeleteSubject(subject.id, e)} 
                    title="Delete subject module"
                    aria-label="Delete subject"
                  >
                    <Trash2 size={13} />
                  </button>
                  <span 
                    className="chip"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 9px',
                      background: isExpanded ? '#e2e8f0' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isExpanded ? (
                      <>Collapse <ChevronUp size={12} /></>
                    ) : (
                      <>Expand <ChevronDown size={12} /></>
                    )}
                  </span>
                </div>

                {/* Expanded Module Content: Horizontal Bar Cards for Topics */}
                {isExpanded && (
                  <div style={{ padding: '14px 16px', background: '#fafbfc' }}>
                    {subjectTopics.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.86rem' }}>
                        No topics configured yet in this module.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {subjectTopics.map(topic => {
                          const st = topic.status || 'NOT_STARTED';
                          const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.NOT_STARTED;
                          const subtopics = topics.filter(t => t.parentId === topic.id);
                          const subCompleted = subtopics.filter(t => t.status === 'MASTERED').length;
                          const confidence = topic.confidenceScore || 0;
                          const isSubsOpen = !!expandedSubtopics[topic.id];

                          return (
                            <div 
                              key={topic.id}
                              className="topic-bar-card"
                              style={{
                                background: '#ffffff',
                                border: '1px solid var(--paper-border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '10px 14px',
                                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {/* Main Horizontal Bar Content */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                                {/* Left: Status Pill + Topic Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
                                  <span 
                                    onClick={() => handleCycleStatus(topic)}
                                    title="Click to cycle status"
                                    style={{
                                      fontSize: '0.7rem', 
                                      fontWeight: 700,
                                      padding: '3px 9px', 
                                      borderRadius: 'var(--radius-pill)',
                                      background: cfg.bg, 
                                      color: cfg.color,
                                      border: `1px solid ${cfg.border}`,
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      flexShrink: 0,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {cfg.label}
                                  </span>
                                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink-primary)', letterSpacing: '-0.01em' }}>
                                    {topic.name}
                                  </strong>
                                </div>

                                {/* Middle: Mastery Index Progress Bar & Subtopics Badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                                      Mastery
                                    </span>
                                    <div className="progress-bar-bg" style={{ width: '65px', height: '6px' }}>
                                      <div className="progress-bar-fill" style={{ width: `${confidence}%` }} />
                                    </div>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 800, minWidth: '32px', textAlign: 'right', color: '#0284c7' }}>
                                      {confidence}%
                                    </span>
                                  </div>

                                  {subtopics.length > 0 && (
                                    <span 
                                      onClick={() => toggleSubtopics(topic.id)}
                                      className="chip"
                                      style={{ 
                                        fontSize: '0.68rem', 
                                        padding: '2px 8px', 
                                        cursor: 'pointer', 
                                        userSelect: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title="Click to view subtopics"
                                    >
                                      {subCompleted}/{subtopics.length} Subs {isSubsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                    </span>
                                  )}
                                </div>

                                {/* Right: Action Buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                  <button
                                    onClick={() => setRatingTopic(topic)}
                                    title="Calibrate confidence"
                                    className="btn btn-secondary btn-xs"
                                    style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                                  >
                                    Eval
                                  </button>
                                  <button
                                    onClick={() => handleCycleStatus(topic)}
                                    className="btn btn-secondary btn-xs"
                                    style={{ padding: '3px 9px', fontSize: '0.7rem' }}
                                  >
                                    {cfg.nextAction} →
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-xs"
                                    onClick={(e) => handleAddSubtopic(topic, e)}
                                    style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                                  >
                                    + Subtopic
                                  </button>
                                  <button
                                    className="del-btn"
                                    onClick={() => handleDeleteTopic(topic.id)}
                                    title="Delete topic"
                                    aria-label="Delete topic"
                                    style={{ width: '22px', height: '22px' }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Indented Subtopics when expanded */}
                              {subtopics.length > 0 && isSubsOpen && (
                                <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--paper-line)', paddingLeft: '12px', borderLeft: '2px solid var(--paper-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {subtopics.map(sub => {
                                    const subCfg = STATUS_CONFIG[sub.status || 'NOT_STARTED'] || STATUS_CONFIG.NOT_STARTED;
                                    return (
                                      <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', background: '#f8fafc', borderRadius: '4px', fontSize: '0.76rem' }}>
                                        <span style={{ color: 'var(--ink-secondary)' }}>• {sub.name}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span
                                            onClick={() => handleCycleStatus(sub)}
                                            style={{ cursor: 'pointer', fontSize: '0.66rem', padding: '1px 6px', borderRadius: 'var(--radius-pill)', border: `1px solid ${subCfg.border}`, color: subCfg.color }}
                                            title="Click to cycle status"
                                          >
                                            {subCfg.label}
                                          </span>
                                          <button 
                                            className="del-btn" 
                                            onClick={() => handleDeleteTopic(sub.id)} 
                                            style={{ width: '20px', height: '20px' }}
                                            title="Delete subtopic"
                                            aria-label="Delete subtopic"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      className="btn btn-secondary btn-sm w-full"
                      onClick={() => { setSelectedSubjectId(subject.id); setShowAddTopic(true); }}
                    >
                      + Add Topic to {subject.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showAddSubject && (
        <AddSubjectModal
          activeGoal={activeGoal}
          onClose={() => setShowAddSubject(false)}
          onAdd={async (s) => { 
            await saveSubject(s); 
            setShowAddSubject(false); 
            showToast("Subject module added");
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
            showToast("Topic added");
          }}
        />
      )}

      {subtopicParent && (
        <AddSubtopicModal
          parentTopic={subtopicParent}
          onClose={() => setSubtopicParent(null)}
          onAdd={handleSaveSubtopic}
        />
      )}

      {ratingTopic && (
        <ConfidenceModal
          topic={ratingTopic}
          onClose={() => setRatingTopic(null)}
          onSave={async (updatedTopic) => {
            await saveTopic(updatedTopic);
            setRatingTopic(null);
            showToast(`Confidence updated: ${updatedTopic.name}`);
          }}
        />
      )}
    </div>
  );
};
