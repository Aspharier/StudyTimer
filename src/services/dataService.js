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

const sanitizeForFirestore = (obj) => {
  const clean = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean;
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
    if (raw) {
      const parsed = JSON.parse(raw);
      state.examGoals = Array.isArray(parsed.examGoals) ? parsed.examGoals : [];
      state.subjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];
      state.topics = Array.isArray(parsed.topics) ? parsed.topics : [];
      state.mockTests = Array.isArray(parsed.mockTests) ? parsed.mockTests : [];
      state.dailyPlans = Array.isArray(parsed.dailyPlans) ? parsed.dailyPlans : [];
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

// If local cache has items that aren't yet in Firestore, upload them
const syncLocalToCloudIfEmpty = async (uid) => {
  if (!db || !uid) return;
  try {
    setSyncStatus(true);
    const goalsRef = collection(db, 'users', uid, 'exam_goals');
    const goalsSnap = await getDocs(goalsRef);

    if (goalsSnap.empty && state.examGoals.length > 0) {
      console.log("Cloud is empty. Uploading local exam goals to Firestore...");
      const batch = writeBatch(db);
      state.examGoals.forEach(g => {
        const data = sanitizeForFirestore({ ...g });
        delete data.id;
        batch.set(doc(db, 'users', uid, 'exam_goals', String(g.id)), data);
      });
      state.subjects.forEach(s => {
        const data = sanitizeForFirestore({ ...s });
        delete data.id;
        batch.set(doc(db, 'users', uid, 'subjects', String(s.id)), data);
      });
      state.topics.forEach(t => {
        const data = sanitizeForFirestore({ ...t });
        delete data.id;
        batch.set(doc(db, 'users', uid, 'topics', String(t.id)), data);
      });
      state.mockTests.forEach(m => {
        const data = sanitizeForFirestore({ ...m });
        delete data.id;
        batch.set(doc(db, 'users', uid, 'mock_tests', String(m.id)), data);
      });
      state.dailyPlans.forEach(p => {
        const data = sanitizeForFirestore({ ...p });
        delete data.id;
        batch.set(doc(db, 'users', uid, 'daily_plans', String(p.id || p.date)), data);
      });
      await batch.commit();
      console.log("Successfully uploaded local cache to Firestore cloud!");
    }
  } catch (err) {
    console.warn("syncLocalToCloudIfEmpty warning:", err);
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
        state.examGoals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('examGoals');
      },
      errHandler('exam_goals')
    );

    // 2. Subjects
    unsubs.subjects = onSnapshot(
      collection(db, 'users', uid, 'subjects'), 
      (snapshot) => {
        state.subjects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('subjects');
      },
      errHandler('subjects')
    );

    // 3. Topics
    unsubs.topics = onSnapshot(
      collection(db, 'users', uid, 'topics'), 
      (snapshot) => {
        state.topics = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('topics');
      },
      errHandler('topics')
    );

    // 4. Mock Tests
    unsubs.mockTests = onSnapshot(
      collection(db, 'users', uid, 'mock_tests'), 
      (snapshot) => {
        state.mockTests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('mockTests');
      },
      errHandler('mock_tests')
    );

    // 5. Daily Plans
    unsubs.dailyPlans = onSnapshot(
      collection(db, 'users', uid, 'daily_plans'), 
      (snapshot) => {
        state.dailyPlans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('dailyPlans');
      },
      errHandler('daily_plans')
    );

    // Run reconciliation upload if local has data but cloud is brand new
    syncLocalToCloudIfEmpty(uid);
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
