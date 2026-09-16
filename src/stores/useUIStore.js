import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeTab: 'dashboard',
  theme: (() => {
    const saved = localStorage.getItem('focusly_theme');
    if (saved) return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  })(),
  toastMsg: '',
  isSyncing: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setTheme: (updater) => set((state) => {
    const nextTheme = typeof updater === 'function' ? updater(state.theme) : updater;
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('focusly_theme', nextTheme);
    return { theme: nextTheme };
  }),

  setIsSyncing: (isSyncing) => set({ isSyncing }),

  showToast: (msg) => {
    set({ toastMsg: msg });
    setTimeout(() => {
      set((state) => (state.toastMsg === msg ? { toastMsg: '' } : {}));
    }, 3000);
  }
}));
