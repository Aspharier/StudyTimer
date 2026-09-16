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
    label: '[NOT_STARTED]',
    color: 'var(--text-muted)',
    bg: 'transparent',
    border: 'var(--border)',
    nextAction: '[START]'
  },
  LEARNING: {
    label: '[LEARNING]',
    color: 'var(--text-secondary)',
    bg: 'var(--bg-card)',
    border: 'var(--border-accent)',
    nextAction: '[PRACTICE]'
  },
  PRACTICING: {
    label: '[PRACTICING]',
    color: 'var(--text-primary)',
    bg: 'var(--bg-card)',
    border: 'var(--border-light)',
    nextAction: '[MASTER]'
  },
  WEAK: {
    label: '[NEEDS_WORK]',
    color: 'var(--text-primary)',
    bg: 'var(--bg-secondary)',
    border: 'var(--border-light)',
    nextAction: '[REVISE]'
  },
  MASTERED: {
    label: '[MASTERED]',
    color: 'var(--bg-primary)',
    bg: 'var(--text-primary)',
    border: 'var(--text-primary)',
    nextAction: '[REVIEW]'
  }
};

export const RECALL_RATINGS = {
  COULDNT_RECALL: { value: 1, label: '01 // NO_RECALL' },
  STRUGGLED: { value: 2, label: '02 // STRUGGLED' },
  MOSTLY_KNEW: { value: 3, label: '03 // PARTIAL' },
  COULD_EXPLAIN: { value: 4, label: '04 // CLEAR' },
  CONFIDENT: { value: 5, label: '05 // MASTERED' }
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
