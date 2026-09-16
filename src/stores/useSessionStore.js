import { create } from 'zustand';
import { DataService } from '../services/dataService';

export const useSessionStore = create((set) => ({
  studySessions: [],
  activeSession: null,

  setStudySessions: (studySessions) => set({ studySessions }),
  setActiveSession: (activeSession) => set({ activeSession }),

  saveStudySession: async (session) => {
    return await DataService.saveStudySession(session);
  },

  deleteStudySession: async (id) => {
    return await DataService.deleteStudySession(id);
  }
}));
