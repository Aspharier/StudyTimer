export const PLAN_ITEM_TYPES = ['LECTURE', 'PRACTICE', 'TEST', 'REVISION', 'MOCK_TEST'];

export const TYPE_LABELS = {
  LECTURE: 'LECTURE',
  PRACTICE: 'PRACTICE',
  TEST: 'TEST',
  REVISION: 'REVISION',
  MOCK_TEST: 'MOCK_TEST'
};

export const TOPIC_STATUSES = {
  NOT_STARTED: 'NOT_STARTED',
  LEARNING: 'LEARNING',
  PRACTICING: 'PRACTICING',
  WEAK: 'WEAK',
  MASTERED: 'MASTERED'
};

export const STATUS_CYCLE = {
  NOT_STARTED: 'LEARNING',
  LEARNING: 'PRACTICING',
  PRACTICING: 'MASTERED',
  MASTERED: 'WEAK',
  WEAK: 'PRACTICING'
};

export const STATUS_CONFIG = {
  NOT_STARTED: {
    label: 'Not Started',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    nextAction: 'Start'
  },
  LEARNING: {
    label: 'Learning',
    color: '#854d0e',
    bg: '#fef9c3',
    border: '#fde047',
    nextAction: 'Practice'
  },
  PRACTICING: {
    label: 'Practicing',
    color: '#0369a1',
    bg: '#e0f2fe',
    border: '#7dd3fc',
    nextAction: 'Master'
  },
  WEAK: {
    label: 'Needs Work',
    color: '#9f1239',
    bg: '#ffe4e6',
    border: '#fca5a5',
    nextAction: 'Revise'
  },
  MASTERED: {
    label: 'Mastered',
    color: '#166534',
    bg: '#dcfce7',
    border: '#86efac',
    nextAction: 'Review'
  }
};

export const RECALL_RATINGS = {
  COULDNT_RECALL: { value: 1, label: '1 • No Recall' },
  STRUGGLED: { value: 2, label: '2 • Struggled' },
  MOSTLY_KNEW: { value: 3, label: '3 • Partial' },
  COULD_EXPLAIN: { value: 4, label: '4 • Clear' },
  CONFIDENT: { value: 5, label: '5 • Mastered' }
};

export const REVISION_INTERVAL_RATINGS = {
  AGAIN: { label: '[AGAIN +1d]' },
  HARD: { label: '[HARD]' },
  GOOD: { label: '[GOOD]' },
  EASY: { label: '[EASY]' }
};

export const FOCUS_MODES = {
  POMODORO: { id: 'POMODORO', name: 'POMODORO_25_5', focusMins: 25, breakMins: 5 },
  DEEP_FOCUS: { id: 'DEEP_FOCUS', name: 'DEEP_50_10', focusMins: 50, breakMins: 10 },
  FLOW: { id: 'FLOW', name: 'FLOW_UNTIMED', focusMins: 45, breakMins: 0 },
  CUSTOM: { id: 'CUSTOM', name: 'CUSTOM_BLOCK', focusMins: 30, breakMins: 5 }
};
