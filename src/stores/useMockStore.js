import { create } from 'zustand';
import { DataService } from '../services/dataService';

export const useMockStore = create((set, get) => ({
  mockTests: [],

  setMockTests: (mockTests) => set({ mockTests }),

  getGoalMockTests: (goalId) => {
    if (!goalId) return [];
    return get().mockTests.filter(t => String(t.examGoalId) === String(goalId));
  },

  saveMockTest: async (test) => {
    return await DataService.saveMockTest(test);
  },

  deleteMockTest: async (id) => {
    return await DataService.deleteMockTest(id);
  }
}));
