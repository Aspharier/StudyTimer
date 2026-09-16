import { create } from 'zustand';
import { DataService } from '../services/dataService';
import { STATUS_CYCLE } from '../utils/constants';

export const useExamStore = create((set, get) => ({
  examGoals: [],
  subjects: [],
  topics: [],

  setExamGoals: (examGoals) => set({ examGoals }),
  setSubjects: (subjects) => set({ subjects }),
  setTopics: (topics) => set({ topics }),

  // Getters
  getActiveGoal: () => {
    const goals = get().examGoals;
    return goals.find(g => g.isActive) || goals[0] || null;
  },

  getGoalSubjects: () => {
    const activeGoal = get().getActiveGoal();
    if (!activeGoal) return [];
    return get().subjects.filter(s => String(s.examGoalId) === String(activeGoal.id));
  },

  getSubjectTopics: (subjectId) => {
    return get().topics.filter(t => t.subjectId === subjectId && !t.parentId);
  },

  getSubtopics: (parentId) => {
    return get().topics.filter(t => t.parentId === parentId);
  },

  getSyllabusProgress: () => {
    const activeGoal = get().getActiveGoal();
    if (!activeGoal) return 0;
    const goalSubjects = get().getGoalSubjects();
    const goalSubjectIds = new Set(goalSubjects.map(s => s.id));
    const goalTopics = get().topics.filter(t => goalSubjectIds.has(t.subjectId));
    if (goalTopics.length === 0) return 0;
    const mastered = goalTopics.filter(t => t.status === 'MASTERED').length;
    return Math.round((mastered / goalTopics.length) * 100);
  },

  // Actions
  saveExamGoal: async (goal) => {
    return await DataService.saveExamGoal(goal);
  },

  deleteExamGoal: async (id) => {
    return await DataService.deleteExamGoal(id);
  },

  setActiveExamGoal: async (id) => {
    return await DataService.setActiveExamGoal(id);
  },

  saveSubject: async (subj) => {
    return await DataService.saveSubject(subj);
  },

  deleteSubject: async (id) => {
    return await DataService.deleteSubject(id);
  },

  saveTopic: async (topic) => {
    return await DataService.saveTopic(topic);
  },

  deleteTopic: async (id) => {
    return await DataService.deleteTopic(id);
  },

  cycleTopicStatus: async (topic) => {
    const current = topic.status || 'NOT_STARTED';
    const nextStatus = STATUS_CYCLE[current] || 'LEARNING';
    
    // Adjust confidenceScore automatically based on new status if not set
    let confidenceDelta = topic.confidenceScore || 0;
    if (nextStatus === 'MASTERED') confidenceDelta = Math.max(85, confidenceDelta);
    else if (nextStatus === 'WEAK') confidenceDelta = Math.min(30, confidenceDelta);
    else if (nextStatus === 'PRACTICING') confidenceDelta = 60;
    else if (nextStatus === 'LEARNING') confidenceDelta = 35;

    const updated = { 
      ...topic, 
      status: nextStatus,
      confidenceScore: confidenceDelta,
      lastStudiedAt: new Date().toISOString()
    };
    await DataService.saveTopic(updated);

    // Auto-complete parent if every sibling subtopic is MASTERED
    if (topic.parentId) {
      const allTopics = get().topics;
      const siblings = allTopics.filter(t => t.parentId === topic.parentId && t.id !== topic.id);
      const allSiblingsDone = siblings.every(t => t.status === 'MASTERED');
      if (allSiblingsDone && nextStatus === 'MASTERED') {
        const parent = allTopics.find(t => t.id === topic.parentId);
        if (parent && parent.status !== 'MASTERED') {
          await DataService.saveTopic({ ...parent, status: 'MASTERED' });
        }
      }
    }
  }
}));
