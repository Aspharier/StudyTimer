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

const generateId = () => String(Date.now()) + Math.random().toString(36).substring(2, 7);

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
  dailyPlans: []
};

const unsubs = {
  examGoals: null,
  subjects: null,
  topics: null,
  mockTests: null,
  dailyPlans: null
};

const state = {
  examGoals: [],
  subjects: [],
  topics: [],
  mockTests: [],
  dailyPlans: []
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
    state.topics = safeArray(parsed?.topics) || safeArray(legacyGet('focusly_topics')) || [];
    state.mockTests = safeArray(parsed?.mockTests) || safeArray(legacyGet('focusly_mock_tests')) || [];
    state.dailyPlans = safeArray(parsed?.dailyPlans) || safeArray(legacyGet('focusly_daily_plans')) || [];
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
const syncCollection = async (uid, collName, localItems, idField = 'id') => {
  if (!db || !uid) return localItems;
  const collRef = collection(db, 'users', uid, collName);
  const snap = await getDocs(collRef);
  const cloudDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const cloudMap = new Map(cloudDocs.map(d => [String(d.id), d]));
  const localMap = new Map((localItems || []).map(d => [String(d[idField] || d.id || d.date), d]));
  
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

const reconcileAllCollections = async (uid) => {
  if (!db || !uid) return;
  setSyncStatus(true);
  try {
    const [goals, subjects, topics, tests, plans] = await Promise.all([
      syncCollection(uid, 'exam_goals', state.examGoals),
      syncCollection(uid, 'subjects', state.subjects),
      syncCollection(uid, 'topics', state.topics),
      syncCollection(uid, 'mock_tests', state.mockTests),
      syncCollection(uid, 'daily_plans', state.dailyPlans, 'date')
    ]);

    state.examGoals = goals;
    state.subjects = subjects;
    state.topics = topics;
    state.mockTests = tests;
    state.dailyPlans = plans;

    ['examGoals', 'subjects', 'topics', 'mockTests', 'dailyPlans'].forEach(notifyListeners);
  } catch (err) {
    console.warn("reconcileAllCollections warning:", err);
  } finally {
    setSyncStatus(false);
  }
};

const setupFirestoreListeners = (uid) => {
  currentUid = uid;
  loadCache(uid);
  ['examGoals', 'subjects', 'topics', 'mockTests', 'dailyPlans'].forEach(notifyListeners);

  if (!db) {
    console.error("Firestore database instance is not initialized!");
    return;
  }

  const errHandler = (name) => (err) => {
    console.warn(`Firestore snapshot warning on ${name}:`, err.message);
  };

  try {
    // 1. Exam Goals
    unsubs.examGoals = onSnapshot(
      collection(db, 'users', uid, 'exam_goals'), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (docs.length > 0 || state.examGoals.length === 0) {
          state.examGoals = docs;
          notifyListeners('examGoals');
        }
      },
      errHandler('exam_goals')
    );

    // 2. Subjects
    unsubs.subjects = onSnapshot(
      collection(db, 'users', uid, 'subjects'), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (docs.length > 0 || state.subjects.length === 0) {
          state.subjects = docs;
          notifyListeners('subjects');
        }
      },
      errHandler('subjects')
    );

    // 3. Topics
    unsubs.topics = onSnapshot(
      collection(db, 'users', uid, 'topics'), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (docs.length > 0 || state.topics.length === 0) {
          state.topics = docs;
          notifyListeners('topics');
        }
      },
      errHandler('topics')
    );

    // 4. Mock Tests
    unsubs.mockTests = onSnapshot(
      collection(db, 'users', uid, 'mock_tests'), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (docs.length > 0 || state.mockTests.length === 0) {
          state.mockTests = docs;
          notifyListeners('mockTests');
        }
      },
      errHandler('mock_tests')
    );

    // 5. Daily Plans
    unsubs.dailyPlans = onSnapshot(
      collection(db, 'users', uid, 'daily_plans'), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (docs.length > 0 || state.dailyPlans.length === 0) {
          state.dailyPlans = docs;
          notifyListeners('dailyPlans');
        }
      },
      errHandler('daily_plans')
    );

    // Run two-way reconciliation to ensure any local items are pushed and cloud items pulled
    reconcileAllCollections(uid);
  } catch (err) {
    console.error("Error attaching Firestore snapshot listeners:", err);
  }
};

const clearFirestoreListeners = () => {
  Object.values(unsubs).forEach(unsub => unsub && unsub());
  currentUid = null;
  state.examGoals = [];
  state.subjects = [];
  state.topics = [];
  state.mockTests = [];
  state.dailyPlans = [];
  ['examGoals', 'subjects', 'topics', 'mockTests', 'dailyPlans'].forEach(notifyListeners);
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
      plans: state.dailyPlans.length
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
    if (authResolved) {
      cb(currentUser);
    }
    return () => {
      listeners.auth = listeners.auth.filter(l => l !== cb);
    };
  },
  subscribeToExamGoals: (cb) => {
    listeners.examGoals.push(cb);
    cb(state.examGoals);
    return () => {
      listeners.examGoals = listeners.examGoals.filter(l => l !== cb);
    };
  },
  subscribeToSubjects: (cb) => {
    listeners.subjects.push(cb);
    cb(state.subjects);
    return () => {
      listeners.subjects = listeners.subjects.filter(l => l !== cb);
    };
  },
  subscribeToTopics: (cb) => {
    listeners.topics.push(cb);
    cb(state.topics);
    return () => {
      listeners.topics = listeners.topics.filter(l => l !== cb);
    };
  },
  subscribeToMockTests: (cb) => {
    listeners.mockTests.push(cb);
    cb(state.mockTests);
    return () => {
      listeners.mockTests = listeners.mockTests.filter(l => l !== cb);
    };
  },
  subscribeToDailyPlans: (cb) => {
    listeners.dailyPlans.push(cb);
    cb(state.dailyPlans);
    return () => {
      listeners.dailyPlans = listeners.dailyPlans.filter(l => l !== cb);
    };
  },

  saveExamGoal: async (goal) => {
    const id = goal.id || generateId();
    const newGoal = { ...goal, id };
    
    // 1. Optimistic instant UI update
    if (newGoal.isActive) {
      state.examGoals = state.examGoals.map(g => ({ ...g, isActive: false }));
    }
    state.examGoals = state.examGoals.filter(g => g.id !== id);
    state.examGoals.push(newGoal);
    notifyListeners('examGoals');

    // 2. Cloud Firestore sync
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
        console.log("Exam goal saved to cloud Firestore:", id);
      } catch (err) {
        console.error("Firestore saveExamGoal failed:", err);
        throw err;
      } finally {
        setSyncStatus(false);
      }
    }
  },

  deleteExamGoal: async (id) => {
    state.examGoals = state.examGoals.filter(g => g.id !== id);
    notifyListeners('examGoals');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        await deleteDoc(doc(db, 'users', uid, 'exam_goals', String(id)));
      } catch (err) {
        console.error("Firestore deleteExamGoal failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

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

  saveSubject: async (subj) => {
    const id = subj.id || generateId();
    const newSubj = { ...subj, id };
    state.subjects = state.subjects.filter(s => s.id !== id);
    state.subjects.push(newSubj);
    notifyListeners('subjects');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const data = sanitizeForFirestore({ ...newSubj });
        delete data.id;
        await setDoc(doc(db, 'users', uid, 'subjects', String(id)), data, { merge: true });
      } catch (err) {
        console.error("Firestore saveSubject failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

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

  saveTopic: async (topic) => {
    const id = topic.id || generateId();
    const newTopic = { ...topic, id };
    const existingIdx = state.topics.findIndex(t => t.id === id);
    if (existingIdx !== -1) {
      // Replace in-place to preserve original ordering
      state.topics = state.topics.map(t => t.id === id ? newTopic : t);
    } else {
      state.topics.push(newTopic);
    }
    notifyListeners('topics');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const data = sanitizeForFirestore({ ...newTopic });
        delete data.id;
        await setDoc(doc(db, 'users', uid, 'topics', String(id)), data, { merge: true });
      } catch (err) {
        console.error("Firestore saveTopic failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

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

  saveMockTest: async (test) => {
    const id = test.id || generateId();
    const newTest = { ...test, id };
    state.mockTests = state.mockTests.filter(t => t.id !== id);
    state.mockTests.push(newTest);
    notifyListeners('mockTests');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const data = sanitizeForFirestore({ ...newTest });
        delete data.id;
        await setDoc(doc(db, 'users', uid, 'mock_tests', String(id)), data, { merge: true });
      } catch (err) {
        console.error("Firestore saveMockTest failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

  deleteMockTest: async (id) => {
    state.mockTests = state.mockTests.filter(t => t.id !== id);
    notifyListeners('mockTests');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        await deleteDoc(doc(db, 'users', uid, 'mock_tests', String(id)));
      } catch (err) {
        console.error("Firestore deleteMockTest failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

  saveDailyPlan: async (plan) => {
    const id = plan.id || plan.date || generateId();
    const newPlan = { ...plan, id };
    state.dailyPlans = state.dailyPlans.filter(p => p.id !== id && p.date !== newPlan.date);
    state.dailyPlans.push(newPlan);
    notifyListeners('dailyPlans');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        const data = sanitizeForFirestore({ ...newPlan });
        delete data.id;
        await setDoc(doc(db, 'users', uid, 'daily_plans', String(id)), data, { merge: true });
      } catch (err) {
        console.error("Firestore saveDailyPlan failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  },

  deleteDailyPlan: async (id) => {
    state.dailyPlans = state.dailyPlans.filter(p => p.id !== id);
    notifyListeners('dailyPlans');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        setSyncStatus(true);
        await deleteDoc(doc(db, 'users', uid, 'daily_plans', String(id)));
      } catch (err) {
        console.error("Firestore deleteDailyPlan failed:", err);
      } finally {
        setSyncStatus(false);
      }
    }
  }
};
