import { useState } from 'react';
import { Trash2, ChevronLeft, ChevronRight, Layers, List, Plus } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState('shelf'); // 'shelf' (horizontal) or 'rows' (compact)
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

  // If no subject selected yet, default to first subject
  const currentSubjectId = selectedSubjectId === null && goalSubjects.length > 0 
    ? goalSubjects[0].id 
    : selectedSubjectId;

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
    if (e) e.stopPropagation();
    if (window.confirm("Delete subject module and all its topics?")) {
      try {
        await deleteSubject(id);
        if (currentSubjectId === id) {
          setSelectedSubjectId(goalSubjects.find(s => s.id !== id)?.id || 'all');
        }
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

  const toggleSubtopics = (topicId) => {
    setExpandedSubtopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const scrollShelf = (shelfId, direction) => {
    const el = document.getElementById(shelfId);
    if (el) {
      el.scrollBy({ left: direction * 280, behavior: 'smooth' });
    }
  };

  // Render a horizontal topic card
  const renderTopicCard = (topic) => {
    const st = topic.status || 'NOT_STARTED';
    const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.NOT_STARTED;
    const subtopics = topics.filter(t => t.parentId === topic.id);
    const subCompleted = subtopics.filter(t => t.status === 'MASTERED').length;
    const confidence = topic.confidenceScore || 0;
    const isSubsOpen = !!expandedSubtopics[topic.id];

    return (
      <div 
        key={topic.id}
        className="topic-card-horizontal"
      >
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span 
            onClick={() => handleCycleStatus(topic)}
            title="Click to cycle status"
            style={{
              fontSize: '0.68rem', 
              fontWeight: 700,
              padding: '2px 8px', 
              borderRadius: 'var(--radius-pill)',
              background: cfg.bg, 
              color: cfg.color,
              border: `1px solid ${cfg.border}`,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {cfg.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setRatingTopic(topic)}
              title="Calibrate confidence"
              className="btn btn-secondary btn-xs"
              style={{ padding: '2px 7px', fontSize: '0.68rem' }}
            >
              Eval
            </button>
            <button
              className="del-btn"
              onClick={() => handleDeleteTopic(topic.id)}
              title="Delete topic"
              aria-label="Delete topic"
              style={{ width: '20px', height: '20px' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* Topic Title */}
        <div 
          title={topic.name}
          style={{ 
            fontWeight: 700, 
            fontSize: '0.88rem', 
            color: 'var(--ink-primary)', 
            margin: '2px 0',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.4em'
          }}
        >
          {topic.name}
        </div>

        {/* Mastery Index */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--ink-muted)', marginBottom: '4px', fontWeight: 600 }}>
            <span>Mastery Index</span>
            <strong>{confidence}%</strong>
          </div>
          <div className="progress-bar-bg" style={{ height: '5px' }}>
            <div className="progress-bar-fill" style={{ width: `${confidence}%` }} />
          </div>
        </div>

        {/* Subtopics dropdown if exists */}
        {subtopics.length > 0 && (
          <div style={{ borderTop: '1px solid var(--paper-line)', paddingTop: '6px', marginTop: '2px' }}>
            <div 
              onClick={() => toggleSubtopics(topic.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--ink-secondary)', fontWeight: 600 }}
            >
              <span>{subCompleted}/{subtopics.length} Subtopics</span>
              <span style={{ fontSize: '0.65rem' }}>{isSubsOpen ? '▲' : '▼'}</span>
            </div>
            {isSubsOpen && (
              <div style={{ maxHeight: '80px', overflowY: 'auto', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {subtopics.map(sub => {
                  const subCfg = STATUS_CONFIG[sub.status || 'NOT_STARTED'] || STATUS_CONFIG.NOT_STARTED;
                  return (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', background: '#f8fafc', padding: '2px 5px', borderRadius: '4px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px', color: 'var(--ink-secondary)' }}>• {sub.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span onClick={() => handleCycleStatus(sub)} style={{ cursor: 'pointer', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 'var(--radius-pill)', border: `1px solid ${subCfg.border}`, color: subCfg.color }}>
                          {subCfg.label}
                        </span>
                        <button className="del-btn" onClick={() => handleDeleteTopic(sub.id)} style={{ width: '18px', height: '18px' }}>
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--paper-line)', marginTop: 'auto' }}>
          <button
            onClick={() => handleCycleStatus(topic)}
            className="btn btn-secondary btn-xs"
            style={{ fontSize: '0.68rem', padding: '3px 8px' }}
          >
            {cfg.nextAction} →
          </button>
          <button
            className="btn btn-secondary btn-xs"
            onClick={(e) => handleAddSubtopic(topic, e)}
            style={{ fontSize: '0.68rem', padding: '3px 8px' }}
          >
            + Subtopic
          </button>
        </div>
      </div>
    );
  };

  // Render a compact horizontal topic row
  const renderTopicRow = (topic) => {
    const st = topic.status || 'NOT_STARTED';
    const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.NOT_STARTED;
    const subtopics = topics.filter(t => t.parentId === topic.id);
    const subCompleted = subtopics.filter(t => t.status === 'MASTERED').length;
    const confidence = topic.confidenceScore || 0;
    const isSubsOpen = !!expandedSubtopics[topic.id];

    return (
      <div key={topic.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px' }}>
        <div className="topic-row-compact">
          <span 
            onClick={() => handleCycleStatus(topic)}
            title="Click to cycle status"
            style={{
              fontSize: '0.68rem', 
              fontWeight: 700,
              padding: '2px 8px', 
              borderRadius: 'var(--radius-pill)',
              background: cfg.bg, 
              color: cfg.color,
              border: `1px solid ${cfg.border}`,
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0
            }}
          >
            {cfg.label}
          </span>

          <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--ink-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {topic.name}
          </span>

          {/* Mini Mastery Index */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div className="progress-bar-bg" style={{ width: '50px', height: '5px' }}>
              <div className="progress-bar-fill" style={{ width: `${confidence}%` }} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', minWidth: '28px' }}>
              {confidence}%
            </span>
          </div>

          {subtopics.length > 0 && (
            <span 
              onClick={() => toggleSubtopics(topic.id)}
              className="chip"
              style={{ fontSize: '0.68rem', padding: '2px 7px', cursor: 'pointer', flexShrink: 0 }}
            >
              {subCompleted}/{subtopics.length} subs {isSubsOpen ? '▲' : '▼'}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => setRatingTopic(topic)}
              title="Calibrate confidence"
              className="btn btn-secondary btn-xs"
              style={{ padding: '2px 7px', fontSize: '0.68rem' }}
            >
              Eval
            </button>
            <button
              onClick={() => handleCycleStatus(topic)}
              className="btn btn-secondary btn-xs"
              style={{ padding: '2px 7px', fontSize: '0.68rem' }}
            >
              {cfg.nextAction} →
            </button>
            <button
              className="btn btn-secondary btn-xs"
              onClick={(e) => handleAddSubtopic(topic, e)}
              style={{ padding: '2px 7px', fontSize: '0.68rem' }}
            >
              + Sub
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

        {/* Subtopics indented list */}
        {subtopics.length > 0 && isSubsOpen && (
          <div style={{ marginLeft: '24px', paddingLeft: '8px', borderLeft: '2px solid var(--paper-border)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {subtopics.map(sub => {
              const subCfg = STATUS_CONFIG[sub.status || 'NOT_STARTED'] || STATUS_CONFIG.NOT_STARTED;
              return (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', background: '#f8fafc', borderRadius: '4px', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--ink-secondary)' }}>• {sub.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span onClick={() => handleCycleStatus(sub)} style={{ cursor: 'pointer', fontSize: '0.64rem', padding: '1px 6px', borderRadius: 'var(--radius-pill)', border: `1px solid ${subCfg.border}`, color: subCfg.color }}>
                      {subCfg.label}
                    </span>
                    <button className="del-btn" onClick={() => handleDeleteTopic(sub.id)} style={{ width: '18px', height: '18px' }}>
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
  };

  const subjectsToRender = currentSubjectId === 'all' 
    ? goalSubjects 
    : goalSubjects.filter(s => s.id === currentSubjectId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: '10px' }}>
      {/* Top Header Bar */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span className="planner-box-header" style={{ margin: 0, padding: '2px 8px', fontSize: '0.65rem' }}>
                SPACE OF INFINITE POSSIBILITY®
              </span>
              <span className="chip chip-blue" style={{ fontSize: '0.65rem', padding: '1px 8px' }}>
                {activeGoal.name}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
              Curriculum & Syllabus
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* View Mode Toggle: Horizontal Shelf vs Compact Rows */}
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 'var(--radius-pill)', padding: '2px', gap: '2px' }}>
              <button 
                onClick={() => setViewMode('shelf')}
                title="Horizontal Carousel View"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: viewMode === 'shelf' ? '#1e293b' : 'transparent',
                  color: viewMode === 'shelf' ? '#ffffff' : 'var(--ink-secondary)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Layers size={11} /> Shelf
              </button>
              <button 
                onClick={() => setViewMode('rows')}
                title="Compact Rows View"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: viewMode === 'rows' ? '#1e293b' : 'transparent',
                  color: viewMode === 'rows' ? '#ffffff' : 'var(--ink-secondary)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <List size={11} /> Rows
              </button>
            </div>

            <button className="btn btn-primary btn-xs" onClick={() => setShowAddSubject(true)}>
              + Module
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Modules Bar (Tabs) */}
      {goalSubjects.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <div className="module-tab-strip">
            <button
              className={`module-tab ${currentSubjectId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedSubjectId('all')}
            >
              <span>All Modules</span>
              <span className="badge-pct">{goalSubjects.length}</span>
            </button>

            {goalSubjects.map(subject => {
              const subTopics = topics.filter(t => t.subjectId === subject.id && !t.parentId);
              const mastered = subTopics.filter(t => t.status === 'MASTERED').length;
              const pct = subTopics.length > 0 ? Math.round((mastered / subTopics.length) * 100) : 0;
              const isActive = currentSubjectId === subject.id;

              return (
                <button
                  key={subject.id}
                  className={`module-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedSubjectId(subject.id)}
                  title={`${subject.name} (${pct}% mastered)`}
                >
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {subject.name}
                  </span>
                  <span className="badge-pct">{pct}%</span>
                  {isActive && (
                    <span 
                      onClick={(e) => handleDeleteSubject(subject.id, e)}
                      title="Delete module"
                      style={{ opacity: 0.6, display: 'flex', alignItems: 'center', marginLeft: '2px' }}
                    >
                      <Trash2 size={10} />
                    </span>
                  )}
                </button>
              );
            })}

            <button
              className="module-tab"
              onClick={() => setShowAddSubject(true)}
              style={{ borderStyle: 'dashed', color: 'var(--ink-muted)' }}
              title="Add new module"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      )}

      {/* Main Syllabus Content Area (Scrolls internally without expanding the notebook) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '2px' }}>
        {goalSubjects.length === 0 ? (
          <div className="empty card" style={{ padding: '32px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📚</div>
            <p style={{ fontWeight: '700', fontSize: '0.96rem', marginBottom: '6px' }}>No Syllabus Modules Added</p>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Organize your curriculum hierarchy: Module → Topics → Subtopics.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubject(true)}>
              + Add First Module
            </button>
          </div>
        ) : (
          subjectsToRender.map(subject => {
            const subjectTopics = topics.filter(t => t.subjectId === subject.id && !t.parentId);
            const masteredCount = subjectTopics.filter(t => t.status === 'MASTERED').length;
            const practicingCount = subjectTopics.filter(t => t.status === 'PRACTICING').length;
            const learningCount = subjectTopics.filter(t => t.status === 'LEARNING').length;
            const weakCount = subjectTopics.filter(t => t.status === 'WEAK').length;
            const pct = subjectTopics.length > 0 ? Math.round((masteredCount / subjectTopics.length) * 100) : 0;
            const shelfId = `shelf-${subject.id}`;

            return (
              <div 
                key={subject.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--paper-border)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Module Header Strip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
                    <strong style={{ fontSize: '0.96rem', color: 'var(--ink-primary)', letterSpacing: '-0.01em' }}>
                      {subject.name}
                    </strong>
                    <span className="badge-pct" style={{ fontSize: '0.72rem' }}>{pct}%</span>
                    <div className="progress-bar-bg" style={{ width: '80px', height: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Chips & Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {masteredCount > 0 && (
                        <span className="chip chip-mint" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          {masteredCount} Mastered
                        </span>
                      )}
                      {practicingCount > 0 && (
                        <span className="chip chip-blue" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          {practicingCount} Practicing
                        </span>
                      )}
                      {weakCount > 0 && (
                        <span className="chip chip-coral" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          {weakCount} Needs Work
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                        {subjectTopics.length} Topics
                      </span>
                    </div>

                    {/* Scroll buttons for horizontal shelf */}
                    {viewMode === 'shelf' && subjectTopics.length > 2 && (
                      <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                        <button 
                          className="del-btn" 
                          onClick={() => scrollShelf(shelfId, -1)}
                          title="Scroll left"
                          style={{ width: '22px', height: '22px' }}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button 
                          className="del-btn" 
                          onClick={() => scrollShelf(shelfId, 1)}
                          title="Scroll right"
                          style={{ width: '22px', height: '22px' }}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}

                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => { setSelectedSubjectId(subject.id); setShowAddTopic(true); }}
                      style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                    >
                      + Topic
                    </button>
                  </div>
                </div>

                {/* Topics Container: Horizontal Shelf vs Compact Rows */}
                {subjectTopics.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.82rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                    No topics configured yet in this module.
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => { setSelectedSubjectId(subject.id); setShowAddTopic(true); }}
                      style={{ marginLeft: '8px', fontSize: '0.7rem' }}
                    >
                      + Add First Topic
                    </button>
                  </div>
                ) : viewMode === 'shelf' ? (
                  <div id={shelfId} className="topics-horizontal-shelf">
                    {subjectTopics.map(topic => renderTopicCard(topic))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {subjectTopics.map(topic => renderTopicRow(topic))}
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
            setSelectedSubjectId(s.id);
            showToast("Subject module added");
          }}
        />
      )}

      {showAddTopic && (
        <AddTopicModal
          activeGoal={activeGoal}
          subjectId={currentSubjectId === 'all' ? (goalSubjects[0]?.id || null) : currentSubjectId}
          onClose={() => { setShowAddTopic(false); }}
          onAdd={async (t) => { 
            await saveTopic(t); 
            setShowAddTopic(false); 
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
