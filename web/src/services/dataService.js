// Focusly Data Service (Offline-First, optional Firebase Sync)
import { auth, db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Memory cache and listeners
let examGoals = JSON.parse(localStorage.getItem('focusly_exam_goals') || '[]');
let subjects = JSON.parse(localStorage.getItem('focusly_subjects') || '[]');
let topics = JSON.parse(localStorage.getItem('focusly_topics') || '[]');
let sessions = JSON.parse(localStorage.getItem('focusly_sessions') || '[]');

const listeners = {
  examGoals: [],
  subjects: [],
  topics: [],
  sessions: [],
  auth: [],
  lastSyncTime: []
};

// Notify listeners of changes
const notify = (key, data) => {
  localStorage.setItem(`focusly_${key}`, JSON.stringify(data));
  listeners[key].forEach(cb => cb(data));
};

const updateLastSyncTime = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timeString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  localStorage.setItem('focusly_last_sync_time', timeString);
  listeners.lastSyncTime.forEach(cb => cb(timeString));
};

// Firestore subscriptions
let firestoreUnsubs = [];

const clearFirestoreSubscriptions = () => {
  firestoreUnsubs.forEach(unsub => unsub());
  firestoreUnsubs = [];
};

// Initialize Firebase Auth & Sync
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (user && db) {
      // User is logged in, set up Firestore listeners to sync real-time
      clearFirestoreSubscriptions();

      // 1. Sync Local Data to Cloud if Cloud is empty (First-time sync)
      await syncLocalToCloud(user.uid);
      updateLastSyncTime();

      // 2. Setup real-time cloud listeners
      const goalsRef = collection(db, 'users', user.uid, 'exam_goals');
      const goalsUnsub = onSnapshot(goalsRef, (snapshot) => {
        const cloudGoals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // If we got items from cloud, merge and update local cache
        if (cloudGoals.length > 0) {
          examGoals = cloudGoals;
          notify('examGoals', examGoals);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(goalsUnsub);

      const subjectsRef = collection(db, 'users', user.uid, 'subjects');
      const subjectsUnsub = onSnapshot(subjectsRef, (snapshot) => {
        const cloudSubjects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cloudSubjects.length > 0) {
          subjects = cloudSubjects;
          notify('subjects', subjects);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(subjectsUnsub);

      const topicsRef = collection(db, 'users', user.uid, 'topics');
      const topicsUnsub = onSnapshot(topicsRef, (snapshot) => {
        const cloudTopics = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cloudTopics.length > 0) {
          topics = cloudTopics;
          notify('topics', topics);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(topicsUnsub);

      const sessionsRef = collection(db, 'users', user.uid, 'sessions');
      const sessionsUnsub = onSnapshot(sessionsRef, (snapshot) => {
        const cloudSessions = snapshot.docs.map(d => {
          const data = d.data();
          // Convert timestamp numbers if needed
          return { id: d.id, ...data };
        });
        if (cloudSessions.length > 0) {
          sessions = cloudSessions;
          notify('sessions', sessions);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(sessionsUnsub);
    } else {
      // Logged out: clean up Firestore, reload from LocalStorage
      clearFirestoreSubscriptions();
      examGoals = JSON.parse(localStorage.getItem('focusly_exam_goals') || '[]');
      subjects = JSON.parse(localStorage.getItem('focusly_subjects') || '[]');
      topics = JSON.parse(localStorage.getItem('focusly_topics') || '[]');
      sessions = JSON.parse(localStorage.getItem('focusly_sessions') || '[]');
      notify('examGoals', examGoals);
      notify('subjects', subjects);
      notify('topics', topics);
      notify('sessions', sessions);
    }
    listeners.auth.forEach(cb => cb(user));
  });
}

// Sync local cache items up to Firestore if they don't exist
const syncLocalToCloud = async (uid) => {
  if (!db) return;
  try {
    // Quick check if cloud already has data. If it does, we don't force local push
    const goalsRef = collection(db, 'users', uid, 'exam_goals');
    const qSnapshot = await getDocs(goalsRef);
    if (!qSnapshot.empty) return; // Cloud already has data, pull from cloud instead

    const batch = writeBatch(db);
    
    examGoals.forEach(g => {
      const ref = doc(db, 'users', uid, 'exam_goals', String(g.id));
      batch.set(ref, { name: g.name, examDate: g.examDate, dailyTargetMinutes: g.dailyTargetMinutes, isActive: g.isActive, createdAt: g.createdAt });
    });

    subjects.forEach(s => {
      const ref = doc(db, 'users', uid, 'subjects', String(s.id));
      batch.set(ref, { name: s.name, examGoalId: s.examGoalId, colorHex: s.colorHex, sortOrder: s.sortOrder });
    });

    topics.forEach(t => {
      const ref = doc(db, 'users', uid, 'topics', String(t.id));
      batch.set(ref, { name: t.name, subjectId: t.subjectId, status: t.status, sortOrder: t.sortOrder });
    });

    sessions.forEach(se => {
      const ref = doc(db, 'users', uid, 'sessions', String(se.id));
      batch.set(ref, { 
        label: se.label, 
        durationMinutes: se.durationMinutes, 
        completedDurationSeconds: se.completedDurationSeconds, 
        date: se.date, 
        startTime: se.startTime, 
        endTime: se.endTime, 
        isCompleted: se.isCompleted,
        notes: se.notes || null,
        tag: se.tag || null,
        subjectId: se.subjectId || null
      });
    });

    await batch.commit();
    console.log("Successfully synced local storage cache to Firestore cloud!");
  } catch (err) {
    console.error("Local to Cloud sync failed: ", err);
  }
};

// API Methods
export const DataService = {
  // Listeners (React binders)
  subscribeToExamGoals: (cb) => {
    listeners.examGoals.push(cb);
    cb(examGoals);
    return () => { listeners.examGoals = listeners.examGoals.filter(x => x !== cb); };
  },

  subscribeToSubjects: (cb) => {
    listeners.subjects.push(cb);
    cb(subjects);
    return () => { listeners.subjects = listeners.subjects.filter(x => x !== cb); };
  },

  subscribeToTopics: (cb) => {
    listeners.topics.push(cb);
    cb(topics);
    return () => { listeners.topics = listeners.topics.filter(x => x !== cb); };
  },

  subscribeToSessions: (cb) => {
    listeners.sessions.push(cb);
    cb(sessions);
    return () => { listeners.sessions = listeners.sessions.filter(x => x !== cb); };
  },

  subscribeToAuth: (cb) => {
    listeners.auth.push(cb);
    cb(auth?.currentUser || null);
    return () => { listeners.auth = listeners.auth.filter(x => x !== cb); };
  },

  subscribeToLastSyncTime: (cb) => {
    listeners.lastSyncTime.push(cb);
    cb(localStorage.getItem('focusly_last_sync_time') || null);
    return () => { listeners.lastSyncTime = listeners.lastSyncTime.filter(x => x !== cb); };
  },

  // Exam Goals CRUD
  saveExamGoal: async (goal) => {
    const id = goal.id || String(Date.now());
    const newGoal = { ...goal, id };
    
    // Update local memory & Storage
    examGoals = examGoals.filter(x => x.id !== id);
    // Deactivate others if this is active
    if (newGoal.isActive) {
      examGoals = examGoals.map(g => ({ ...g, isActive: false }));
    }
    examGoals.push(newGoal);
    notify('examGoals', examGoals);

    // Sync cloud if signed in
    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'exam_goals', id);
      await setDoc(ref, { 
        name: newGoal.name, 
        examDate: newGoal.examDate, 
        dailyTargetMinutes: newGoal.dailyTargetMinutes, 
        isActive: newGoal.isActive, 
        createdAt: newGoal.createdAt || Date.now() 
      });
      // Deactivate others in cloud
      if (newGoal.isActive) {
        for (const g of examGoals.filter(x => x.id !== id)) {
          await setDoc(doc(db, 'users', user.uid, 'exam_goals', String(g.id)), { ...g, isActive: false }, { merge: true });
        }
      }
    }
  },

  deleteExamGoal: async (id) => {
    examGoals = examGoals.filter(x => x.id !== id);
    notify('examGoals', examGoals);

    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'exam_goals', id));
    }
  },

  setActiveExamGoal: async (id) => {
    examGoals = examGoals.map(g => ({ ...g, isActive: g.id === id }));
    notify('examGoals', examGoals);

    const user = auth?.currentUser;
    if (user && db) {
      for (const g of examGoals) {
        await setDoc(doc(db, 'users', user.uid, 'exam_goals', String(g.id)), { isActive: g.id === id }, { merge: true });
      }
    }
  },

  // Subjects CRUD
  saveSubject: async (subj) => {
    const id = subj.id || String(Date.now());
    const newSubj = { ...subj, id };

    subjects = subjects.filter(x => x.id !== id);
    subjects.push(newSubj);
    notify('subjects', subjects);

    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'subjects', id);
      await setDoc(ref, {
        name: newSubj.name,
        examGoalId: newSubj.examGoalId,
        colorHex: newSubj.colorHex,
        sortOrder: newSubj.sortOrder || 0
      });
    }
  },

  deleteSubject: async (id) => {
    subjects = subjects.filter(x => x.id !== id);
    notify('subjects', subjects);

    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'subjects', id));
    }

    // Cascade delete topics locally
    const topicsToDelete = topics.filter(t => t.subjectId === id);
    topics = topics.filter(t => t.subjectId !== id);
    notify('topics', topics);

    if (user && db) {
      for (const t of topicsToDelete) {
        await deleteDoc(doc(db, 'users', user.uid, 'topics', String(t.id)));
      }
    }
  },

  // Topics CRUD
  saveTopic: async (topic) => {
    const id = topic.id || String(Date.now());
    const newTopic = { ...topic, id, status: topic.status || 'NOT_STARTED' };

    topics = topics.filter(x => x.id !== id);
    topics.push(newTopic);
    notify('topics', topics);

    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'topics', id);
      await setDoc(ref, {
        name: newTopic.name,
        subjectId: newTopic.subjectId,
        status: newTopic.status,
        sortOrder: newTopic.sortOrder || 0
      });
    }
  },

  deleteTopic: async (id) => {
    topics = topics.filter(x => x.id !== id);
    notify('topics', topics);

    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'topics', id));
    }
  },

  // Sessions CRUD
  saveSession: async (session) => {
    const id = session.id || String(Date.now());
    const newSession = { ...session, id };

    sessions = sessions.filter(x => x.id !== id);
    sessions.push(newSession);
    notify('sessions', sessions);

    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'sessions', id);
      await setDoc(ref, {
        label: newSession.label,
        durationMinutes: newSession.durationMinutes,
        completedDurationSeconds: newSession.completedDurationSeconds,
        date: newSession.date,
        startTime: newSession.startTime,
        endTime: newSession.endTime,
        isCompleted: newSession.isCompleted,
        notes: newSession.notes || null,
        tag: newSession.tag || null,
        subjectId: newSession.subjectId || null
      });
    }
  },

  deleteSession: async (id) => {
    sessions = sessions.filter(x => x.id !== id);
    notify('sessions', sessions);

    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'sessions', id));
    }
  }
};
