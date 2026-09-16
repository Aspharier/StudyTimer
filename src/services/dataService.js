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
    currentUser = user;
    notifyAuthListeners(user);
    if (user) {
      setupFirestoreListeners(user.uid);
    } else {
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
  saveStudyStat: (stat) => saveEntity('study_stats', 'studyStats', stat, 'date')
};
