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
let mockTests = JSON.parse(localStorage.getItem('focusly_mock_tests') || '[]');
let flashcards = JSON.parse(localStorage.getItem('focusly_flashcards') || '[]');
let mistakes = JSON.parse(localStorage.getItem('focusly_mistakes') || '[]');
let dailyTargets = JSON.parse(localStorage.getItem('focusly_daily_targets') || '[]');
let streakFreezes = JSON.parse(localStorage.getItem('focusly_streak_freezes') || '[]');
let freezeTokens = parseInt(localStorage.getItem('focusly_freeze_tokens') || '1');
let longestStreak = parseInt(localStorage.getItem('focusly_longest_streak') || '0');

const listeners = {
  examGoals: [],
  subjects: [],
  topics: [],
  sessions: [],
  mockTests: [],
  flashcards: [],
  mistakes: [],
  dailyTargets: [],
  streakFreezes: [],
  freezeTokens: [],
  longestStreak: [],
  auth: [],
  lastSyncTime: []
};

const storageKeys = {
  examGoals: 'focusly_exam_goals',
  subjects: 'focusly_subjects',
  topics: 'focusly_topics',
  sessions: 'focusly_sessions',
  mockTests: 'focusly_mock_tests',
  flashcards: 'focusly_flashcards',
  mistakes: 'focusly_mistakes',
  dailyTargets: 'focusly_daily_targets',
  streakFreezes: 'focusly_streak_freezes',
  freezeTokens: 'focusly_freeze_tokens',
  longestStreak: 'focusly_longest_streak'
};

// Notify listeners of changes
const notify = (key, data) => {
  const storageKey = storageKeys[key] || `focusly_${key}`;
  localStorage.setItem(storageKey, JSON.stringify(data));
  listeners[key]?.forEach(cb => cb(data));
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
          return { id: d.id, ...data };
        });
        if (cloudSessions.length > 0) {
          sessions = cloudSessions;
          notify('sessions', sessions);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(sessionsUnsub);

      const mockTestsRef = collection(db, 'users', user.uid, 'mock_tests');
      const mockTestsUnsub = onSnapshot(mockTestsRef, (snapshot) => {
        const cloudMockTests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cloudMockTests.length > 0) {
          mockTests = cloudMockTests;
          notify('mockTests', mockTests);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(mockTestsUnsub);

      const flashcardsRef = collection(db, 'users', user.uid, 'flashcards');
      const flashcardsUnsub = onSnapshot(flashcardsRef, (snapshot) => {
        const cloudCards = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cloudCards.length > 0) {
          flashcards = cloudCards;
          notify('flashcards', flashcards);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(flashcardsUnsub);

      const mistakesRef = collection(db, 'users', user.uid, 'mistakes');
      const mistakesUnsub = onSnapshot(mistakesRef, (snapshot) => {
        const cloudMistakes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cloudMistakes.length > 0) {
          mistakes = cloudMistakes;
          notify('mistakes', mistakes);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(mistakesUnsub);

      const dailyTargetsRef = collection(db, 'users', user.uid, 'daily_targets');
      const dailyTargetsUnsub = onSnapshot(dailyTargetsRef, (snapshot) => {
        const cloudDailyTargets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cloudDailyTargets.length > 0) {
          dailyTargets = cloudDailyTargets;
          notify('dailyTargets', dailyTargets);
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(dailyTargetsUnsub);

      const streakMetadataRef = doc(db, 'users', user.uid, 'streak_metadata', 'freezes');
      const streakMetadataUnsub = onSnapshot(streakMetadataRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.streakFreezes) {
            streakFreezes = data.streakFreezes;
            notify('streakFreezes', streakFreezes);
          }
          if (data.freezeTokens !== undefined) {
            freezeTokens = data.freezeTokens;
            notify('freezeTokens', freezeTokens);
          }
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(streakMetadataUnsub);

      const streakLongestRef = doc(db, 'users', user.uid, 'streak_metadata', 'longest');
      const streakLongestUnsub = onSnapshot(streakLongestRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.longestStreak !== undefined) {
            longestStreak = data.longestStreak;
            notify('longestStreak', longestStreak);
          }
        }
        updateLastSyncTime();
      });
      firestoreUnsubs.push(streakLongestUnsub);
    } else {
      // Logged out: clean up Firestore and clear local cache
      clearFirestoreSubscriptions();

      // Clear local storage cache
      localStorage.removeItem('focusly_exam_goals');
      localStorage.removeItem('focusly_subjects');
      localStorage.removeItem('focusly_topics');
      localStorage.removeItem('focusly_sessions');
      localStorage.removeItem('focusly_mock_tests');
      localStorage.removeItem('focusly_flashcards');
      localStorage.removeItem('focusly_mistakes');
      localStorage.removeItem('focusly_daily_targets');
      localStorage.removeItem('focusly_streak_freezes');
      localStorage.removeItem('focusly_freeze_tokens');
      localStorage.removeItem('focusly_longest_streak');
      localStorage.removeItem('focusly_last_sync_time');

      // Reset memory cache
      examGoals = [];
      subjects = [];
      topics = [];
      sessions = [];
      mockTests = [];
      flashcards = [];
      mistakes = [];
      dailyTargets = [];
      streakFreezes = [];
      freezeTokens = 1;
      longestStreak = 0;

      notify('examGoals', examGoals);
      notify('subjects', subjects);
      notify('topics', topics);
      notify('sessions', sessions);
      notify('mockTests', mockTests);
      notify('flashcards', flashcards);
      notify('mistakes', mistakes);
      notify('dailyTargets', dailyTargets);
      notify('streakFreezes', streakFreezes);
      notify('freezeTokens', freezeTokens);
      notify('longestStreak', longestStreak);

      // Notify last sync time listeners
      listeners.lastSyncTime.forEach(cb => cb(null));
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
      batch.set(ref, { 
        name: s.name, 
        examGoalId: s.examGoalId, 
        colorHex: s.colorHex, 
        sortOrder: s.sortOrder,
        targetHours: s.targetHours || null,
        priority: s.priority || null
      });
    });

    topics.forEach(t => {
      const ref = doc(db, 'users', uid, 'topics', String(t.id));
      batch.set(ref, { 
        name: t.name, 
        subjectId: t.subjectId, 
        status: t.status, 
        sortOrder: t.sortOrder,
        subTopics: t.subTopics || []
      });
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
        subjectId: se.subjectId || null,
        confidenceRating: se.confidenceRating || null,
        focusScore: se.focusScore !== undefined ? se.focusScore : null
      });
    });

    mockTests.forEach(m => {
      const ref = doc(db, 'users', uid, 'mock_tests', String(m.id));
      batch.set(ref, {
        examGoalId: m.examGoalId,
        subjectId: m.subjectId,
        testName: m.testName,
        scorePercentage: m.scorePercentage,
        totalMarks: m.totalMarks,
        obtainedMarks: m.obtainedMarks,
        notes: m.notes || null,
        date: m.date,
        createdAt: m.createdAt || Date.now()
      });
    });

    flashcards.forEach(c => {
      const ref = doc(db, 'users', uid, 'flashcards', String(c.id));
      batch.set(ref, c);
    });

    mistakes.forEach(m => {
      const ref = doc(db, 'users', uid, 'mistakes', String(m.id));
      batch.set(ref, m);
    });

    dailyTargets.forEach(dt => {
      const ref = doc(db, 'users', uid, 'daily_targets', String(dt.id));
      batch.set(ref, dt);
    });

    batch.set(doc(db, 'users', uid, 'streak_metadata', 'freezes'), { streakFreezes, freezeTokens });
    batch.set(doc(db, 'users', uid, 'streak_metadata', 'longest'), { longestStreak });

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

  subscribeToMockTests: (cb) => {
    listeners.mockTests.push(cb);
    cb(mockTests);
    return () => { listeners.mockTests = listeners.mockTests.filter(x => x !== cb); };
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
        sortOrder: newSubj.sortOrder || 0,
        targetHours: newSubj.targetHours || null,
        priority: newSubj.priority || null
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

    // Cascade delete flashcards
    const cardsToDelete = flashcards.filter(c => String(c.subjectId) === String(id));
    flashcards = flashcards.filter(c => String(c.subjectId) !== String(id));
    notify('flashcards', flashcards);
    if (user && db) {
      for (const c of cardsToDelete) {
        await deleteDoc(doc(db, 'users', user.uid, 'flashcards', String(c.id)));
      }
    }

    // Cascade delete mistakes
    const mistakesToDelete = mistakes.filter(m => String(m.subjectId) === String(id));
    mistakes = mistakes.filter(m => String(m.subjectId) !== String(id));
    notify('mistakes', mistakes);
    if (user && db) {
      for (const m of mistakesToDelete) {
        await deleteDoc(doc(db, 'users', user.uid, 'mistakes', String(m.id)));
      }
    }

    // Cascade delete daily targets
    const targetsToDelete = dailyTargets.filter(dt => String(dt.subjectId) === String(id));
    dailyTargets = dailyTargets.filter(dt => String(dt.subjectId) !== String(id));
    notify('dailyTargets', dailyTargets);
    if (user && db) {
      for (const dt of targetsToDelete) {
        await deleteDoc(doc(db, 'users', user.uid, 'daily_targets', String(dt.id)));
      }
    }
  },

  // Topics CRUD
  saveTopic: async (topic) => {
    const id = topic.id || String(Date.now());
    const newTopic = { 
      ...topic, 
      id, 
      status: topic.status || 'NOT_STARTED',
      subTopics: topic.subTopics || []
    };

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
        sortOrder: newTopic.sortOrder || 0,
        subTopics: newTopic.subTopics
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
        subjectId: newSession.subjectId || null,
        confidenceRating: newSession.confidenceRating || null,
        focusScore: newSession.focusScore !== undefined ? newSession.focusScore : null
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
  },

  // Mock Tests CRUD
  saveMockTest: async (test) => {
    const id = test.id || String(Date.now());
    const newTest = { ...test, id };

    mockTests = mockTests.filter(x => x.id !== id);
    mockTests.push(newTest);
    notify('mockTests', mockTests);

    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'mock_tests', id);
      await setDoc(ref, {
        examGoalId: newTest.examGoalId,
        subjectId: newTest.subjectId,
        testName: newTest.testName,
        scorePercentage: newTest.scorePercentage,
        totalMarks: newTest.totalMarks,
        obtainedMarks: newTest.obtainedMarks,
        notes: newTest.notes || null,
        date: newTest.date,
        createdAt: newTest.createdAt || Date.now()
      });
    }
  },

  deleteMockTest: async (id) => {
    mockTests = mockTests.filter(x => x.id !== id);
    notify('mockTests', mockTests);

    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'mock_tests', id));
    }
  },

  // Flashcards CRUD
  subscribeToFlashcards: (cb) => {
    listeners.flashcards.push(cb);
    cb(flashcards);
    return () => { listeners.flashcards = listeners.flashcards.filter(x => x !== cb); };
  },
  saveFlashcard: async (card) => {
    const id = card.id || String(Date.now());
    const newCard = { ...card, id };
    flashcards = flashcards.filter(x => x.id !== id);
    flashcards.push(newCard);
    notify('flashcards', flashcards);
    
    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'flashcards', id);
      await setDoc(ref, newCard);
    }
  },
  deleteFlashcard: async (id) => {
    flashcards = flashcards.filter(x => x.id !== id);
    notify('flashcards', flashcards);
    
    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'flashcards', id));
    }
  },

  // Mistakes CRUD
  subscribeToMistakes: (cb) => {
    listeners.mistakes.push(cb);
    cb(mistakes);
    return () => { listeners.mistakes = listeners.mistakes.filter(x => x !== cb); };
  },
  saveMistake: async (mistake) => {
    const id = mistake.id || String(Date.now());
    const newMistake = { ...mistake, id };
    mistakes = mistakes.filter(x => x.id !== id);
    mistakes.push(newMistake);
    notify('mistakes', mistakes);
    
    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'mistakes', id);
      await setDoc(ref, newMistake);
    }
  },
  deleteMistake: async (id) => {
    mistakes = mistakes.filter(x => x.id !== id);
    notify('mistakes', mistakes);
    
    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'mistakes', id));
    }
  },

  // Daily Targets CRUD
  subscribeToDailyTargets: (cb) => {
    listeners.dailyTargets.push(cb);
    cb(dailyTargets);
    return () => { listeners.dailyTargets = listeners.dailyTargets.filter(x => x !== cb); };
  },
  saveDailyTarget: async (target) => {
    const id = target.id || String(Date.now());
    const newTarget = { ...target, id };
    dailyTargets = dailyTargets.filter(x => x.id !== id);
    dailyTargets.push(newTarget);
    notify('dailyTargets', dailyTargets);
    
    const user = auth?.currentUser;
    if (user && db) {
      const ref = doc(db, 'users', user.uid, 'daily_targets', id);
      await setDoc(ref, newTarget);
    }
  },
  deleteDailyTarget: async (id) => {
    dailyTargets = dailyTargets.filter(x => x.id !== id);
    notify('dailyTargets', dailyTargets);
    
    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid, 'daily_targets', id));
    }
  },

  // Streak Freezes CRUD
  subscribeToStreakFreezes: (cb) => {
    listeners.streakFreezes.push(cb);
    cb(streakFreezes);
    return () => { listeners.streakFreezes = listeners.streakFreezes.filter(x => x !== cb); };
  },
  subscribeToFreezeTokens: (cb) => {
    listeners.freezeTokens.push(cb);
    cb(freezeTokens);
    return () => { listeners.freezeTokens = listeners.freezeTokens.filter(x => x !== cb); };
  },
  subscribeToLongestStreak: (cb) => {
    listeners.longestStreak.push(cb);
    cb(longestStreak);
    return () => { listeners.longestStreak = listeners.longestStreak.filter(x => x !== cb); };
  },
  useStreakFreeze: async (dateStr) => {
    if (freezeTokens <= 0) return false;
    if (streakFreezes.includes(dateStr)) return false;
    
    streakFreezes.push(dateStr);
    freezeTokens = freezeTokens - 1;
    
    notify('streakFreezes', streakFreezes);
    notify('freezeTokens', freezeTokens);
    
    const user = auth?.currentUser;
    if (user && db) {
      await setDoc(doc(db, 'users', user.uid, 'streak_metadata', 'freezes'), { streakFreezes, freezeTokens });
    }
    return true;
  },
  awardStreakFreeze: async () => {
    freezeTokens = freezeTokens + 1;
    notify('freezeTokens', freezeTokens);
    
    const user = auth?.currentUser;
    if (user && db) {
      await setDoc(doc(db, 'users', user.uid, 'streak_metadata', 'freezes'), { streakFreezes, freezeTokens });
    }
  },
  saveLongestStreak: async (val) => {
    longestStreak = val;
    notify('longestStreak', longestStreak);
    
    const user = auth?.currentUser;
    if (user && db) {
      await setDoc(doc(db, 'users', user.uid, 'streak_metadata', 'longest'), { longestStreak });
    }
  }
};
