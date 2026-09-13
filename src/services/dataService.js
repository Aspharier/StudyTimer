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

const generateId = () => String(Date.now()) + Math.random().toString(36).substr(2, 5);

let currentUid = null;

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

const notifyListeners = (key) => {
  listeners[key].forEach(cb => cb(state[key]));
};

const notifyAuthListeners = (user) => {
  listeners.auth.forEach(cb => cb(user));
};

const setupFirestoreListeners = (uid) => {
  currentUid = uid;
  
  unsubs.examGoals = onSnapshot(collection(db, `users/${uid}/exam_goals`), (snapshot) => {
    state.examGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    notifyListeners('examGoals');
  });

  unsubs.subjects = onSnapshot(collection(db, `users/${uid}/subjects`), (snapshot) => {
    state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    notifyListeners('subjects');
  });

  unsubs.topics = onSnapshot(collection(db, `users/${uid}/topics`), (snapshot) => {
    state.topics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    notifyListeners('topics');
  });

  unsubs.mockTests = onSnapshot(collection(db, `users/${uid}/mock_tests`), (snapshot) => {
    state.mockTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    notifyListeners('mockTests');
  });

  unsubs.dailyPlans = onSnapshot(collection(db, `users/${uid}/daily_plans`), (snapshot) => {
    state.dailyPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    notifyListeners('dailyPlans');
  });
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
    cb(auth?.currentUser || null);
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
    if (!currentUid) return;
    const id = goal.id || generateId();
    const data = { ...goal };
    delete data.id;

    if (goal.isActive) {
      const batch = writeBatch(db);
      state.examGoals.forEach(g => {
        if (g.id !== id && g.isActive) {
          batch.set(doc(db, `users/${currentUid}/exam_goals`, g.id), { isActive: false }, { merge: true });
        }
      });
      batch.set(doc(db, `users/${currentUid}/exam_goals`, id), data);
      await batch.commit();
    } else {
      await setDoc(doc(db, `users/${currentUid}/exam_goals`, id), data);
    }
  },
  deleteExamGoal: async (id) => {
    if (!currentUid) return;
    await deleteDoc(doc(db, `users/${currentUid}/exam_goals`, id));
  },
  setActiveExamGoal: async (id) => {
    if (!currentUid) return;
    const batch = writeBatch(db);
    state.examGoals.forEach(g => {
      batch.set(doc(db, `users/${currentUid}/exam_goals`, g.id), { isActive: g.id === id }, { merge: true });
    });
    await batch.commit();
  },

  saveSubject: async (subj) => {
    if (!currentUid) return;
    const id = subj.id || generateId();
    const data = { ...subj };
    delete data.id;
    await setDoc(doc(db, `users/${currentUid}/subjects`, id), data);
  },
  deleteSubject: async (id) => {
    if (!currentUid) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, `users/${currentUid}/subjects`, id));
    
    const q = query(collection(db, `users/${currentUid}/topics`), where("subjectId", "==", id));
    const qs = await getDocs(q);
    qs.forEach(d => {
      batch.delete(d.ref);
    });
    
    await batch.commit();
  },

  saveTopic: async (topic) => {
    if (!currentUid) return;
    const id = topic.id || generateId();
    const data = { ...topic };
    delete data.id;
    await setDoc(doc(db, `users/${currentUid}/topics`, id), data);
  },
  deleteTopic: async (id) => {
    if (!currentUid) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, `users/${currentUid}/topics`, id));
    
    const q = query(collection(db, `users/${currentUid}/topics`), where("parentId", "==", id));
    const qs = await getDocs(q);
    qs.forEach(d => {
      batch.delete(d.ref);
    });
    
    await batch.commit();
  },

  saveMockTest: async (test) => {
    if (!currentUid) return;
    const id = test.id || generateId();
    const data = { ...test };
    delete data.id;
    await setDoc(doc(db, `users/${currentUid}/mock_tests`, id), data);
  },
  deleteMockTest: async (id) => {
    if (!currentUid) return;
    await deleteDoc(doc(db, `users/${currentUid}/mock_tests`, id));
  },

  saveDailyPlan: async (plan) => {
    if (!currentUid) return;
    const id = plan.id || plan.date || generateId();
    const data = { ...plan };
    delete data.id;
    await setDoc(doc(db, `users/${currentUid}/daily_plans`, id), data);
  },
  deleteDailyPlan: async (id) => {
    if (!currentUid) return;
    await deleteDoc(doc(db, `users/${currentUid}/daily_plans`, id));
  }
};
