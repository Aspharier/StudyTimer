import { useState } from 'react';
import { X, Sparkles, BookOpen, RefreshCw } from 'lucide-react';

const COGNITIVE_TIPS = [
  {
    title: 'Active Recall > Re-reading',
    category: 'Memory Science',
    desc: 'Closing your notes and testing your memory creates 2x stronger synaptic connections than passively re-reading or highlighting textbooks.'
  },
  {
    title: 'Spaced Retrieval Schedule',
    category: 'Retention',
    desc: 'Review concepts right at the verge of forgetting (Day 1, Day 3, Day 7, Day 21) to reset Ebbinghaus’s forgetting curve and convert knowledge into permanent long-term storage.'
  },
  {
    title: 'The Feynman Technique',
    category: 'Mastery',
    desc: 'If you cannot explain a topic in plain terms to a 10-year-old without jargon, you do not truly understand it yet. Break it down to first principles.'
  },
  {
    title: 'Interleaving Practice',
    category: 'Problem Solving',
    desc: 'Alternate between 2 different topics in a single study block rather than grinding one subject for 6 hours. This forces your brain to categorize problem types dynamically.'
  },
  {
    title: 'Dopamine Detox Work Blocks',
    category: 'Focus Velocity',
    desc: 'Turn off notifications, keep phone out of sight, and work in 50-minute uninterrupted sprints. Even 5 seconds of social media distraction costs 15 minutes of re-focusing.'
  }
];

const MANTRAS = [
  {
    quote: 'Small daily disciplines compound into massive lifelong triumphs.',
    author: 'Robin Sharma'
  },
  {
    quote: 'Focus is not saying yes to what you want; it is saying no to a hundred other good ideas.',
    author: 'Steve Jobs'
  },
  {
    quote: 'Consistency beats intensity every single day.',
    author: 'Cognitive Science Axiom'
  },
  {
    quote: 'Your future self will thank you for the disciplined hours you invest right now.',
    author: 'Study Mindset'
  },
  {
    quote: 'Action creates motivation, never wait for motivation to take action.',
    author: 'James Clear'
  }
];

export const StudyTipsModal = ({ initialMode = 'tip', onClose }) => {
  const [mode, setMode] = useState(initialMode);
  const [tipIndex, setTipIndex] = useState(0);
  const [mantraIndex, setMantraIndex] = useState(0);

  const currentTip = COGNITIVE_TIPS[tipIndex];
  const currentMantra = MANTRAS[mantraIndex];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % COGNITIVE_TIPS.length);
  };

  const handleNextMantra = () => {
    setMantraIndex((prev) => (prev + 1) % MANTRAS.length);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setMode('tip')}
              className={`btn btn-xs ${mode === 'tip' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-pill)', padding: '4px 12px' }}
            >
              <BookOpen size={13} /> Study Tips
            </button>
            <button
              onClick={() => setMode('mantra')}
              className={`btn btn-xs ${mode === 'mantra' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-pill)', padding: '4px 12px' }}
            >
              <Sparkles size={13} /> Daily Mantra
            </button>
          </div>
          <button className="del-btn" onClick={onClose} title="Close" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {mode === 'tip' ? (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="chip chip-blue" style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800 }}>
                {currentTip.category}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                Tip {tipIndex + 1} of {COGNITIVE_TIPS.length}
              </span>
            </div>

            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid var(--paper-border)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px',
              margin: '8px 0 16px 0'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--ink-primary)', fontWeight: 800 }}>
                💡 {currentTip.title}
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                {currentTip.desc}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleNextTip} 
                style={{ flex: 1, padding: '10px' }}
              >
                <RefreshCw size={14} /> Next Study Tip
              </button>
              <button 
                className="btn btn-primary" 
                onClick={onClose} 
                style={{ padding: '10px 20px' }}
              >
                Got It
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="chip chip-yellow" style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800 }}>
                Focus Mindset
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                Mantra {mantraIndex + 1} of {MANTRAS.length}
              </span>
            </div>

            <div style={{ 
              background: 'var(--pastel-yellow-light)', 
              border: '1px solid #fde047', 
              borderRadius: 'var(--radius-md)', 
              padding: '18px',
              margin: '8px 0 16px 0',
              fontStyle: 'italic'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '1.02rem', lineHeight: 1.5, color: '#713f12', fontWeight: 600 }}>
                "{currentMantra.quote}"
              </p>
              <span style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 700, fontStyle: 'normal' }}>
                — {currentMantra.author}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleNextMantra} 
                style={{ flex: 1, padding: '10px' }}
              >
                <Sparkles size={14} /> Next Mantra
              </button>
              <button 
                className="btn btn-primary" 
                onClick={onClose} 
                style={{ padding: '10px 20px' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
