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

let currentUid = null;
let authResolved = false;
let currentUser = null;

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
      state.examGoals = parsed.examGoals || [];
      state.subjects = parsed.subjects || [];
      state.topics = parsed.topics || [];
      state.mockTests = parsed.mockTests || [];
      state.dailyPlans = parsed.dailyPlans || [];
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

const setupFirestoreListeners = (uid) => {
  currentUid = uid;
  loadCache(uid);
  ['examGoals', 'subjects', 'topics', 'mockTests', 'dailyPlans'].forEach(notifyListeners);

  if (!db) return;

  const errHandler = (name) => (err) => {
    console.warn(`Firestore snapshot warning on ${name}:`, err.message);
  };

  try {
    unsubs.examGoals = onSnapshot(
      collection(db, `users/${uid}/exam_goals`), 
      (snapshot) => {
        state.examGoals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('examGoals');
      },
      errHandler('exam_goals')
    );

    unsubs.subjects = onSnapshot(
      collection(db, `users/${uid}/subjects`), 
      (snapshot) => {
        state.subjects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('subjects');
      },
      errHandler('subjects')
    );

    unsubs.topics = onSnapshot(
      collection(db, `users/${uid}/topics`), 
      (snapshot) => {
        state.topics = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('topics');
      },
      errHandler('topics')
    );

    unsubs.mockTests = onSnapshot(
      collection(db, `users/${uid}/mock_tests`), 
      (snapshot) => {
        state.mockTests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('mockTests');
      },
      errHandler('mock_tests')
    );

    unsubs.dailyPlans = onSnapshot(
      collection(db, `users/${uid}/daily_plans`), 
      (snapshot) => {
        state.dailyPlans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyListeners('dailyPlans');
      },
      errHandler('daily_plans')
    );
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
  subscribeToAuth: (cb) => {
    listeners.auth.push(cb);
    // Only fire immediately if Firebase has finished checking persistent auth
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
        if (newGoal.isActive) {
          const batch = writeBatch(db);
          state.examGoals.forEach(g => {
            if (g.id !== id && g.isActive) {
              batch.set(doc(db, `users/${uid}/exam_goals`, g.id), { isActive: false }, { merge: true });
            }
          });
          const data = { ...newGoal };
          delete data.id;
          batch.set(doc(db, `users/${uid}/exam_goals`, id), data);
          await batch.commit();
        } else {
          const data = { ...newGoal };
          delete data.id;
          await setDoc(doc(db, `users/${uid}/exam_goals`, id), data);
        }
      } catch (err) {
        console.error("Firestore saveExamGoal failed:", err);
      }
    }
  },

  deleteExamGoal: async (id) => {
    state.examGoals = state.examGoals.filter(g => g.id !== id);
    notifyListeners('examGoals');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        await deleteDoc(doc(db, `users/${uid}/exam_goals`, id));
      } catch (err) {
        console.error("Firestore deleteExamGoal failed:", err);
      }
    }
  },

  setActiveExamGoal: async (id) => {
    state.examGoals = state.examGoals.map(g => ({ ...g, isActive: g.id === id }));
    notifyListeners('examGoals');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        const batch = writeBatch(db);
        state.examGoals.forEach(g => {
          batch.set(doc(db, `users/${uid}/exam_goals`, g.id), { isActive: g.id === id }, { merge: true });
        });
        await batch.commit();
      } catch (err) {
        console.error("Firestore setActiveExamGoal failed:", err);
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
        const data = { ...newSubj };
        delete data.id;
        await setDoc(doc(db, `users/${uid}/subjects`, id), data);
      } catch (err) {
        console.error("Firestore saveSubject failed:", err);
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
        const batch = writeBatch(db);
        batch.delete(doc(db, `users/${uid}/subjects`, id));
        const q = query(collection(db, `users/${uid}/topics`), where("subjectId", "==", id));
        const qs = await getDocs(q);
        qs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.error("Firestore deleteSubject failed:", err);
      }
    }
  },

  saveTopic: async (topic) => {
    const id = topic.id || generateId();
    const newTopic = { ...topic, id };
    state.topics = state.topics.filter(t => t.id !== id);
    state.topics.push(newTopic);
    notifyListeners('topics');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        const data = { ...newTopic };
        delete data.id;
        await setDoc(doc(db, `users/${uid}/topics`, id), data);
      } catch (err) {
        console.error("Firestore saveTopic failed:", err);
      }
    }
  },

  deleteTopic: async (id) => {
    state.topics = state.topics.filter(t => t.id !== id && t.parentId !== id);
    notifyListeners('topics');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, `users/${uid}/topics`, id));
        const q = query(collection(db, `users/${uid}/topics`), where("parentId", "==", id));
        const qs = await getDocs(q);
        qs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.error("Firestore deleteTopic failed:", err);
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
        const data = { ...newTest };
        delete data.id;
        await setDoc(doc(db, `users/${uid}/mock_tests`, id), data);
      } catch (err) {
        console.error("Firestore saveMockTest failed:", err);
      }
    }
  },

  deleteMockTest: async (id) => {
    state.mockTests = state.mockTests.filter(t => t.id !== id);
    notifyListeners('mockTests');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        await deleteDoc(doc(db, `users/${uid}/mock_tests`, id));
      } catch (err) {
        console.error("Firestore deleteMockTest failed:", err);
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
        const data = { ...newPlan };
        delete data.id;
        await setDoc(doc(db, `users/${uid}/daily_plans`, id), data);
      } catch (err) {
        console.error("Firestore saveDailyPlan failed:", err);
      }
    }
  },

  deleteDailyPlan: async (id) => {
    state.dailyPlans = state.dailyPlans.filter(p => p.id !== id);
    notifyListeners('dailyPlans');

    const uid = currentUid || auth?.currentUser?.uid;
    if (uid && db) {
      try {
        await deleteDoc(doc(db, `users/${uid}/daily_plans`, id));
      } catch (err) {
        console.error("Firestore deleteDailyPlan failed:", err);
      }
    }
  }
};
