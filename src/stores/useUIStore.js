import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeTab: 'dashboard',
  toastMsg: '',
  isSyncing: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setIsSyncing: (isSyncing) => set({ isSyncing }),

  showToast: (msg) => {
    set({ toastMsg: msg });
    setTimeout(() => {
      set((state) => (state.toastMsg === msg ? { toastMsg: '' } : {}));
    }, 3000);
  }
}));
