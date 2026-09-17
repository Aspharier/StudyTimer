import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  getDocs, 
  writeBatch,
  where
} from 'firebase/firestore';
import { generateId } from '../utils/idGenerator';

const deepCleanForFirestore = (val) => {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(deepCleanForFirestore);
  }
  const clean = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      clean[k] = deepCleanForFirestore(v);
    }
  }
  return clean;
};

const sanitizeForFirestore = (obj) => deepCleanForFirestore(obj);

// Firestore write batch allows max 500 ops; commit in safe chunks of 200
const commitInBatches = async (database, operations) => {
  const CHUNK_SIZE = 200;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(database);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data, op.options || { merge: true });
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
};

export const migrateTopic = (topic) => {
  if (!topic) return topic;
  let status = topic.status || 'NOT_STARTED';
  if (status === 'IN_PROGRESS') status = 'LEARNING';
  else if (status === 'COMPLETED') status = 'MASTERED';
  else if (status === 'NEEDS_REVISION') status = 'WEAK';

  const defaultConfidence = 
    status === 'MASTERED' ? 85 :
    status === 'PRACTICING' ? 60 :
    status === 'LEARNING' ? 35 :
    status === 'WEAK' ? 25 : 0;

  return {
    ...topic,
    status,
    confidenceScore: typeof topic.confidenceScore === 'number' ? topic.confidenceScore : defaultConfidence,
    accuracy: typeof topic.accuracy === 'number' ? topic.accuracy : 0,
    totalQuestions: topic.totalQuestions || 0,
    correctAnswers: topic.correctAnswers || 0,
    totalStudyMinutes: topic.totalStudyMinutes || 0,
    reviewCount: topic.reviewCount || 0,
    nextReviewDate: topic.nextReviewDate || null,
    lastStudiedAt: topic.lastStudiedAt || null
  };
};

let currentUid = null;
let authResolved = false;
let currentUser = null;
let syncStatusListeners = [];
let isSyncing = false;

const setSyncStatus = (status) => {
  isSyncing = status;
  syncStatusListeners.forEach(cb => {
    try { cb(status); } catch (e) { console.error(e); }
  });
};

const listeners = {
  auth: [],
  examGoals: [],
  subjects: [],
  topics: [],
  mockTests: [],
  dailyPlans: [],
  studySessions: [],
  questions: [],
  mistakes: [],
  reviews: [],
  studyStats: []
};

const unsubs = {
  examGoals: null,
  subjects: null,
  topics: null,
  mockTests: null,
  dailyPlans: null,
  studySessions: null,
  questions: null,
  mistakes: null,
  reviews: null,
  studyStats: null
};

const state = {
  examGoals: [],
  subjects: [],
  topics: [],
  mockTests: [],
  dailyPlans: [],
  studySessions: [],
  questions: [],
  mistakes: [],
  reviews: [],
  studyStats: []
};

const getCacheKey = (uid) => `focusly_cache_${uid}`;

const seedDefaultDataIfNeeded = () => {
  if (state.examGoals && state.examGoals.length > 0) return;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const pastDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const futureDateStr = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  state.examGoals = [
    {
      id: 'goal_gate_2026',
      name: 'GATE / CS Technical Examination 2026',
      title: 'GATE / CS Technical Examination 2026',
      examDate: futureDateStr(74),
      targetDate: futureDateStr(74),
      targetHours: 6.0,
      targetScore: 88,
      isActive: true,
      createdAt: pastDateStr(30)
    }
  ];

  state.subjects = [
    { id: 'subj_ds', examGoalId: 'goal_gate_2026', name: 'Data Structures & Algorithms', title: 'Data Structures & Algorithms', color: '#3b82f6', weight: 30 },
    { id: 'subj_os', examGoalId: 'goal_gate_2026', name: 'Operating Systems & Concurrency', title: 'Operating Systems & Concurrency', color: '#10b981', weight: 25 },
    { id: 'subj_db', examGoalId: 'goal_gate_2026', name: 'Database Internals & Storage Engines', title: 'Database Internals & Storage Engines', color: '#f59e0b', weight: 25 },
    { id: 'subj_cn', examGoalId: 'goal_gate_2026', name: 'Computer Networks & Distributed Systems', title: 'Computer Networks & Distributed Systems', color: '#a855f7', weight: 20 }
  ];

  state.topics = [
    { id: 'top_1', examGoalId: 'goal_gate_2026', subjectId: 'subj_ds', name: 'B-Trees, B+ Trees & LSM Storage Internals', title: 'B-Trees, B+ Trees & LSM Storage Internals', status: 'MASTERED', confidenceScore: 92, accuracy: 95, totalQuestions: 60, correctAnswers: 57, totalStudyMinutes: 320, reviewCount: 6, lastStudiedAt: new Date().toISOString() },
    { id: 'top_2', examGoalId: 'goal_gate_2026', subjectId: 'subj_ds', name: 'Dynamic Programming & Memoization DAGs', title: 'Dynamic Programming & Memoization DAGs', status: 'PRACTICING', confidenceScore: 68, accuracy: 72, totalQuestions: 40, correctAnswers: 29, totalStudyMinutes: 240, reviewCount: 4, lastStudiedAt: new Date().toISOString() },
    { id: 'top_3', examGoalId: 'goal_gate_2026', subjectId: 'subj_os', name: 'Virtual Memory & Page Replacement Primitives', title: 'Virtual Memory & Page Replacement Primitives', status: 'MASTERED', confidenceScore: 88, accuracy: 90, totalQuestions: 45, correctAnswers: 41, totalStudyMinutes: 280, reviewCount: 5, lastStudiedAt: new Date().toISOString() },
    { id: 'top_4', examGoalId: 'goal_gate_2026', subjectId: 'subj_os', name: 'Kernel Locks, Mutex Contention & Race Windows', title: 'Kernel Locks, Mutex Contention & Race Windows', status: 'LEARNING', confidenceScore: 45, accuracy: 55, totalQuestions: 20, correctAnswers: 11, totalStudyMinutes: 120, reviewCount: 2, lastStudiedAt: new Date().toISOString() },
    { id: 'top_5', examGoalId: 'goal_gate_2026', subjectId: 'subj_db', name: 'ACID Isolation, 2PL & MVCC Conflict Serialization', title: 'ACID Isolation, 2PL & MVCC Conflict Serialization', status: 'MASTERED', confidenceScore: 90, accuracy: 92, totalQuestions: 50, correctAnswers: 46, totalStudyMinutes: 290, reviewCount: 5, lastStudiedAt: new Date().toISOString() },
    { id: 'top_6', examGoalId: 'goal_gate_2026', subjectId: 'subj_db', name: 'Query Execution & Cost-Based Optimizer Heuristics', title: 'Query Execution & Cost-Based Optimizer Heuristics', status: 'WEAK', confidenceScore: 28, accuracy: 40, totalQuestions: 25, correctAnswers: 10, totalStudyMinutes: 110, reviewCount: 1, lastStudiedAt: new Date().toISOString() },
    { id: 'top_7', examGoalId: 'goal_gate_2026', subjectId: 'subj_cn', name: 'TCP Flow & Congestion Control Mechanics (BBR/Cubic)', title: 'TCP Flow & Congestion Control Mechanics (BBR/Cubic)', status: 'PRACTICING', confidenceScore: 70, accuracy: 76, totalQuestions: 35, correctAnswers: 27, totalStudyMinutes: 190, reviewCount: 3, lastStudiedAt: new Date().toISOString() },
    { id: 'top_8', examGoalId: 'goal_gate_2026', subjectId: 'subj_cn', name: 'DNS Protocol Resolution & TLS 1.3 Handshake', title: 'DNS Protocol Resolution & TLS 1.3 Handshake', status: 'LEARNING', confidenceScore: 50, accuracy: 60, totalQuestions: 20, correctAnswers: 12, totalStudyMinutes: 95, reviewCount: 2, lastStudiedAt: new Date().toISOString() }
  ];

  state.mockTests = [
    { id: 'mock_1', examGoalId: 'goal_gate_2026', title: 'National Diagnostic Simulation 01', date: pastDateStr(14), totalMarks: 100, scoredMarks: 72, scorePercentage: 72, percentile: 90.2 },
    { id: 'mock_2', examGoalId: 'goal_gate_2026', title: 'Systems & Architecture Mock 02', date: pastDateStr(7), totalMarks: 100, scoredMarks: 81, scorePercentage: 81, percentile: 94.8 },
    { id: 'mock_3', examGoalId: 'goal_gate_2026', title: 'Full Length Comprehensive Mock 03', date: pastDateStr(1), totalMarks: 100, scoredMarks: 86, scorePercentage: 86, percentile: 97.4 }
  ];

  state.dailyPlans = [
    {
      id: 'dp_today',
      date: todayStr,
      items: [
        { id: 'tsk_1', title: 'Review MVCC & Write-Ahead Logging anomaly cases', subjectId: 'subj_db', type: 'REVISION', duration: 45, completed: true },
        { id: 'tsk_2', title: 'Solve 15 LeetCode Hard Dynamic Programming problems', subjectId: 'subj_ds', type: 'PRACTICE', duration: 90, completed: true },
        { id: 'tsk_3', title: 'Implement Kernel Mutex vs Spinlock microbenchmark', subjectId: 'subj_os', type: 'LEARNING', duration: 60, completed: false },
        { id: 'tsk_4', title: 'Analyze incorrect questions from Comprehensive Mock 03', subjectId: 'subj_cn', type: 'MOCK_REVIEW', duration: 45, completed: false }
      ]
    },
    {
      id: 'dp_yesterday',
      date: pastDateStr(1),
      items: [
        { id: 'tsk_y1', title: 'Full Length Comprehensive Mock 03 Simulation', subjectId: 'subj_ds', type: 'MOCK_TEST', duration: 180, completed: true },
        { id: 'tsk_y2', title: 'Page Replacement Algorithms deep dive', subjectId: 'subj_os', type: 'REVISION', duration: 60, completed: true }
      ]
    },
    {
      id: 'dp_2d',
      date: pastDateStr(2),
      items: [
        { id: 'tsk_2d1', title: 'Graph traversal & Dijkstra shortest path proof', subjectId: 'subj_ds', type: 'PRACTICE', duration: 90, completed: true },
        { id: 'tsk_2d2', title: 'TCP handshake & slow start state machine', subjectId: 'subj_cn', type: 'LEARNING', duration: 60, completed: true }
      ]
    },
    {
      id: 'dp_3d',
      date: pastDateStr(3),
      items: [
        { id: 'tsk_3d1', title: 'B+ Tree splitting and balancing in C++', subjectId: 'subj_db', type: 'PRACTICE', duration: 120, completed: true },
        { id: 'tsk_3d2', title: 'Virtual memory segment vs paging comparison', subjectId: 'subj_os', type: 'REVISION', duration: 45, completed: true }
      ]
    },
    {
      id: 'dp_4d',
      date: pastDateStr(4),
      items: [
        { id: 'tsk_4d1', title: 'Dynamic programming matrix chain multiplication', subjectId: 'subj_ds', type: 'PRACTICE', duration: 90, completed: true },
        { id: 'tsk_4d2', title: 'Deadlock detection banker algorithm practice', subjectId: 'subj_os', type: 'PRACTICE', duration: 60, completed: true }
      ]
    },
    {
      id: 'dp_5d',
      date: pastDateStr(5),
      items: [
        { id: 'tsk_5d1', title: 'Systems & Architecture Mock 02 analysis', subjectId: 'subj_os', type: 'MOCK_REVIEW', duration: 90, completed: true },
        { id: 'tsk_5d2', title: 'SQL subquery unnesting & index optimization', subjectId: 'subj_db', type: 'PRACTICE', duration: 60, completed: true }
      ]
    }
  ];
};

const loadCache = (uid) => {
  try {
    const raw = localStorage.getItem(getCacheKey(uid));
    let parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e) { console.warn(e); }
    }

    const safeArray = (val) => Array.isArray(val) ? val : null;
    const legacyGet = (k) => {
      try {
        const item = localStorage.getItem(k);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    };

    state.examGoals = safeArray(parsed?.examGoals) || safeArray(legacyGet('focusly_exam_goals')) || [];
    state.subjects = safeArray(parsed?.subjects) || safeArray(legacyGet('focusly_subjects')) || [];
    const loadedTopics = safeArray(parsed?.topics) || safeArray(legacyGet('focusly_topics')) || [];
    state.topics = loadedTopics.map(migrateTopic);
    state.mockTests = safeArray(parsed?.mockTests) || safeArray(legacyGet('focusly_mock_tests')) || [];
    state.dailyPlans = safeArray(parsed?.dailyPlans) || safeArray(legacyGet('focusly_daily_plans')) || [];
    state.studySessions = safeArray(parsed?.studySessions) || safeArray(legacyGet('focusly_study_sessions')) || [];
    state.questions = safeArray(parsed?.questions) || safeArray(legacyGet('focusly_questions')) || [];
    state.mistakes = safeArray(parsed?.mistakes) || safeArray(legacyGet('focusly_mistakes')) || [];
    state.reviews = safeArray(parsed?.reviews) || safeArray(legacyGet('focusly_reviews')) || [];
    state.studyStats = safeArray(parsed?.studyStats) || safeArray(legacyGet('focusly_study_stats')) || [];

    if (state.examGoals.length === 0) {
      seedDefaultDataIfNeeded();
    }
  } catch (e) {
    console.warn("Failed to load local cache:", e);
  }
};

const saveCache = (uid) => {
  if (!uid) return;
  try {
    localStorage.setItem(getCacheKey(uid), JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save local cache:", e);
  }
};

const notifyListeners = (key) => {
  if (listeners[key]) {
    listeners[key].forEach(cb => {
      try {
        cb(state[key]);
      } catch (err) {
        console.error(`Error notifying listener for ${key}:`, err);
      }
    });
  }
  if (currentUid) {
    saveCache(currentUid);
  }
};

const notifyAuthListeners = (user) => {
  listeners.auth.forEach(cb => {
    try {
      cb(user);
    } catch (err) {
      console.error("Error in auth listener:", err);
    }
  });
};

// Reconcile collection between cloud and local
const syncCollection = async (uid, collName, localItems, idField = 'id', transformItem = item => item) => {
  if (!db || !uid) return localItems;
  const collRef = collection(db, 'users', uid, collName);
  const snap = await getDocs(collRef);
  const cloudDocs = snap.docs.map(d => transformItem({ id: d.id, ...d.data() }));
  const cloudMap = new Map(cloudDocs.map(d => [String(d.id), d]));
  const localMap = new Map((localItems || []).map(d => [String(d[idField] || d.id || d.date), transformItem(d)]));
  
  const ops = [];
  
  // Upload local items not yet in cloud
  for (const [id, localItem] of localMap.entries()) {
    if (!cloudMap.has(id)) {
      const data = sanitizeForFirestore({ ...localItem });
      delete data.id;
      ops.push({
        type: 'set',
        ref: doc(db, 'users', uid, collName, id),
        data,
        options: { merge: true }
      });
      cloudMap.set(id, { ...localItem, id });
    }
  }
  
  if (ops.length > 0) {
    await commitInBatches(db, ops);
  }
  
  return Array.from(cloudMap.values());
};

const ALL_KEYS = [
  'examGoals', 'subjects', 'topics', 'mockTests', 'dailyPlans',
  'studySessions', 'questions', 'mistakes', 'reviews', 'studyStats'
];

const reconcileAllCollections = async (uid) => {
  if (!db || !uid) return;
  setSyncStatus(true);
  try {
    const [goals, subjects, topics, tests, plans, sessions, questions, mistakes, reviews, stats] = await Promise.all([
      syncCollection(uid, 'exam_goals', state.examGoals),
      syncCollection(uid, 'subjects', state.subjects),
      syncCollection(uid, 'topics', state.topics, 'id', migrateTopic),
      syncCollection(uid, 'mock_tests', state.mockTests),
      syncCollection(uid, 'daily_plans', state.dailyPlans, 'date'),
      syncCollection(uid, 'study_sessions', state.studySessions),
      syncCollection(uid, 'questions', state.questions),
      syncCollection(uid, 'mistakes', state.mistakes),
      syncCollection(uid, 'reviews', state.reviews),
      syncCollection(uid, 'study_stats', state.studyStats, 'date')
    ]);

    state.examGoals = goals;
    state.subjects = subjects;
    state.topics = topics;
    state.mockTests = tests;
    state.dailyPlans = plans;
    state.studySessions = sessions;
    state.questions = questions;
    state.mistakes = mistakes;
    state.reviews = reviews;
    state.studyStats = stats;

    ALL_KEYS.forEach(notifyListeners);
  } catch (err) {
    console.warn("reconcileAllCollections warning:", err);
  } finally {
    setSyncStatus(false);
  }
};

const setupFirestoreListeners = (uid) => {
  currentUid = uid;
  loadCache(uid);
  ALL_KEYS.forEach(notifyListeners);

  if (!db) {
    console.error("Firestore database instance is not initialized!");
    return;
  }

  const errHandler = (name) => (err) => {
    console.warn(`Firestore snapshot warning on ${name}:`, err.message);
  };

  const bindCollection = (collName, stateKey, transformItem = item => item) => {
    try {
      unsubs[stateKey] = onSnapshot(
        collection(db, 'users', uid, collName),
        (snapshot) => {
          const docs = snapshot.docs.map(d => transformItem({ id: d.id, ...d.data() }));
          if (docs.length > 0 || state[stateKey].length === 0) {
            state[stateKey] = docs;
            notifyListeners(stateKey);
          }
        },
        errHandler(collName)
      );
    } catch (err) {
      console.error(`Error attaching listener for ${collName}:`, err);
    }
  };

  try {
    bindCollection('exam_goals', 'examGoals');
    bindCollection('subjects', 'subjects');
    bindCollection('topics', 'topics', migrateTopic);
    bindCollection('mock_tests', 'mockTests');
    bindCollection('daily_plans', 'dailyPlans');
    bindCollection('study_sessions', 'studySessions');
    bindCollection('questions', 'questions');
    bindCollection('mistakes', 'mistakes');
    bindCollection('reviews', 'reviews');
    bindCollection('study_stats', 'studyStats');

    reconcileAllCollections(uid);
  } catch (err) {
    console.error("Error setting up listeners:", err);
  }
};

const clearFirestoreListeners = () => {
  Object.values(unsubs).forEach(unsub => unsub && unsub());
  currentUid = null;
  ALL_KEYS.forEach(key => {
    state[key] = [];
    notifyListeners(key);
  });
};

if (auth) {
  onAuthStateChanged(auth, (user) => {
    authResolved = true;
    if (user) {
      currentUser = user;
      notifyAuthListeners(user);
      setupFirestoreListeners(user.uid);
    } else if (currentUid !== 'local_guest') {
      currentUser = null;
      notifyAuthListeners(null);
      clearFirestoreListeners();
    }
  });
}

// Generic entity persistence helper
const saveEntity = async (collName, stateKey, entity, idField = 'id') => {
  const id = entity[idField] || entity.id || generateId();
  const newEntity = { ...entity, id };
  const existingIdx = state[stateKey].findIndex(item => (item[idField] || item.id) === id);
  if (existingIdx !== -1) {
    state[stateKey] = state[stateKey].map(item => (item[idField] || item.id) === id ? newEntity : item);
  } else {
    state[stateKey].push(newEntity);
  }
  notifyListeners(stateKey);

  const uid = currentUid || auth?.currentUser?.uid;
  if (uid && db) {
    try {
      setSyncStatus(true);
      const data = sanitizeForFirestore({ ...newEntity });
      delete data.id;
      await setDoc(doc(db, 'users', uid, collName, String(id)), data, { merge: true });
    } catch (err) {
      console.error(`Firestore save ${collName} failed:`, err);
      throw err;
    } finally {
      setSyncStatus(false);
    }
  }
  return newEntity;
};

const deleteEntity = async (collName, stateKey, id, idField = 'id') => {
  state[stateKey] = state[stateKey].filter(item => (item[idField] || item.id) !== id);
  notifyListeners(stateKey);

  const uid = currentUid || auth?.currentUser?.uid;
  if (uid && db) {
    try {
      setSyncStatus(true);
      await deleteDoc(doc(db, 'users', uid, collName, String(id)));
    } catch (err) {
      console.error(`Firestore delete ${collName} failed:`, err);
    } finally {
      setSyncStatus(false);
    }
  }
};

export const DataService = {
  syncAllData: async () => {
    const uid = currentUid || auth?.currentUser?.uid;
    if (!uid || !db) throw new Error("Please sign in to sync with cloud.");
    await reconcileAllCollections(uid);
    return {
      goals: state.examGoals.length,
      subjects: state.subjects.length,
      topics: state.topics.length,
      tests: state.mockTests.length,
      plans: state.dailyPlans.length,
      sessions: state.studySessions.length,
      questions: state.questions.length,
      mistakes: state.mistakes.length,
      reviews: state.reviews.length
    };
  },
  subscribeToSyncStatus: (cb) => {
    syncStatusListeners.push(cb);
    cb(isSyncing);
    return () => {
      syncStatusListeners = syncStatusListeners.filter(l => l !== cb);
    };
  },
  subscribeToAuth: (cb) => {
    listeners.auth.push(cb);
    if (authResolved) cb(currentUser);
    return () => {
      listeners.auth = listeners.auth.filter(l => l !== cb);
    };
  },

  // Subscriptions
  subscribeToExamGoals: (cb) => {
    listeners.examGoals.push(cb);
    cb(state.examGoals);
    return () => { listeners.examGoals = listeners.examGoals.filter(l => l !== cb); };
  },
  subscribeToSubjects: (cb) => {
    listeners.subjects.push(cb);
    cb(state.subjects);
    return () => { listeners.subjects = listeners.subjects.filter(l => l !== cb); };
  },
  subscribeToTopics: (cb) => {
    listeners.topics.push(cb);
    cb(state.topics);
    return () => { listeners.topics = listeners.topics.filter(l => l !== cb); };
  },
  subscribeToMockTests: (cb) => {
    listeners.mockTests.push(cb);
    cb(state.mockTests);
    return () => { listeners.mockTests = listeners.mockTests.filter(l => l !== cb); };
  },
  subscribeToDailyPlans: (cb) => {
    listeners.dailyPlans.push(cb);
    cb(state.dailyPlans);
    return () => { listeners.dailyPlans = listeners.dailyPlans.filter(l => l !== cb); };
  },
  subscribeToStudySessions: (cb) => {
    listeners.studySessions.push(cb);
    cb(state.studySessions);
    return () => { listeners.studySessions = listeners.studySessions.filter(l => l !== cb); };
  },
  subscribeToQuestions: (cb) => {
    listeners.questions.push(cb);
    cb(state.questions);
    return () => { listeners.questions = listeners.questions.filter(l => l !== cb); };
  },
  subscribeToMistakes: (cb) => {
    listeners.mistakes.push(cb);
    cb(state.mistakes);
    return () => { listeners.mistakes = listeners.mistakes.filter(l => l !== cb); };
  },
  subscribeToReviews: (cb) => {
    listeners.reviews.push(cb);
    cb(state.reviews);
    return () => { listeners.reviews = listeners.reviews.filter(l => l !== cb); };
  },
  subscribeToStudyStats: (cb) => {
    listeners.studyStats.push(cb);
    cb(state.studyStats);
    return () => { listeners.studyStats = listeners.studyStats.filter(l => l !== cb); };
  },

  // Exam Goals
  saveExamGoal: async (goal) => {
    const id = goal.id || generateId();
    const newGoal = { ...goal, id };
    if (newGoal.isActive) {
      state.examGoals = state.examGoals.map(g => ({ ...g, isActive: false }));
    }
    state.examGoals = state.examGoals.filter(g => g.id !== id);
    state.examGoals.push(newGoal);
    notifyListeners('examGoals');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const batch = writeBatch(db);
        if (newGoal.isActive) {
          state.examGoals.forEach(g => {
            if (g.id !== id) {
              const ref = doc(db, 'users', uid, 'exam_goals', String(g.id));
              batch.set(ref, sanitizeForFirestore({ ...g, isActive: false }), { merge: true });
            }
          });
        }
        const data = sanitizeForFirestore({ ...newGoal });
        delete data.id;
        batch.set(doc(db, 'users', uid, 'exam_goals', String(id)), data, { merge: true });
        await batch.commit();
      } catch (err) {
        console.error("Firestore saveExamGoal failed:", err);
        throw err;
      } finally {
        setSyncStatus(false);
      }
    }
  },
  deleteExamGoal: (id) => deleteEntity('exam_goals', 'examGoals', id),
  setActiveExamGoal: async (id) => {
    state.examGoals = state.examGoals.map(g => ({ ...g, isActive: g.id === id }));
    notifyListeners('examGoals');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const batch = writeBatch(db);
        state.examGoals.forEach(g => {
          const ref = doc(db, 'users', uid, 'exam_goals', String(g.id));
          batch.set(ref, { isActive: g.id === id }, { merge: true });
        });
        await batch.commit();
      } catch (err) {
        console.error("Firestore setActiveExamGoal failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

  // Subjects
  saveSubject: (subj) => saveEntity('subjects', 'subjects', subj),
  deleteSubject: async (id) => {
    state.subjects = state.subjects.filter(s => s.id !== id);
    state.topics = state.topics.filter(t => t.subjectId !== id);
    notifyListeners('subjects');
    notifyListeners('topics');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'users', uid, 'subjects', String(id)));
        const q = query(collection(db, 'users', uid, 'topics'), where("subjectId", "==", id));
        const qs = await getDocs(q);
        qs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.error("Firestore deleteSubject failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

  // Topics
  saveTopic: (topic) => saveEntity('topics', 'topics', migrateTopic(topic)),
  deleteTopic: async (id) => {
    state.topics = state.topics.filter(t => t.id !== id && t.parentId !== id);
    notifyListeners('topics');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'users', uid, 'topics', String(id)));
        const q = query(collection(db, 'users', uid, 'topics'), where("parentId", "==", id));
        const qs = await getDocs(q);
        qs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.error("Firestore deleteTopic failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

  // Mock Tests
  saveMockTest: (test) => saveEntity('mock_tests', 'mockTests', test),
  deleteMockTest: (id) => deleteEntity('mock_tests', 'mockTests', id),

  // Daily Plans
  saveDailyPlan: (plan) => saveEntity('daily_plans', 'dailyPlans', plan, 'date'),
  deleteDailyPlan: (id) => deleteEntity('daily_plans', 'dailyPlans', id, 'date'),

  // Focus & Study Sessions
  saveStudySession: (session) => saveEntity('study_sessions', 'studySessions', session),
  deleteStudySession: (id) => deleteEntity('study_sessions', 'studySessions', id),

  // Questions
  saveQuestion: (question) => saveEntity('questions', 'questions', question),
  deleteQuestion: (id) => deleteEntity('questions', 'questions', id),

  // Mistakes
  saveMistake: (mistake) => saveEntity('mistakes', 'mistakes', mistake),
  deleteMistake: (id) => deleteEntity('mistakes', 'mistakes', id),

  // Reviews
  saveReview: (review) => saveEntity('reviews', 'reviews', review),
  deleteReview: (id) => deleteEntity('reviews', 'reviews', id),

  // Study Stats
  saveStudyStat: (stat) => saveEntity('study_stats', 'studyStats', stat, 'date'),

  // Guest / Offline Mode
  loginAsGuest: () => {
    const guestUser = {
      uid: 'local_guest',
      displayName: 'Operator (Local)',
      email: 'scholar@focusly.terminal'
    };
    currentUid = 'local_guest';
    currentUser = guestUser;
    authResolved = true;
    loadCache('local_guest');
    saveCache('local_guest');
    ALL_KEYS.forEach(notifyListeners);
    notifyAuthListeners(guestUser);
    return guestUser;
  },

  clearSession: () => {
    clearFirestoreListeners();
    currentUser = null;
    currentUid = null;
    notifyAuthListeners(null);
  }
};
