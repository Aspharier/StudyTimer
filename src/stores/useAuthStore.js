import { create } from 'zustand';
import { auth, signInWithPopup, googleProvider, signOut as fbSignOut } from '../firebase';
import { DataService } from '../services/dataService';

export const useAuthStore = create((set) => ({
  user: null,
  authLoading: true,

  setUser: (user) => set({ user, authLoading: false }),
  setAuthLoading: (authLoading) => set({ authLoading }),

  signIn: async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    return await signInWithPopup(auth, googleProvider);
  },

  loginAsGuest: () => {
    const guestUser = DataService.loginAsGuest();
    set({ user: guestUser, authLoading: false });
  },

  signOut: async () => {
    if (auth) {
      await fbSignOut(auth).catch(() => {});
    }
    DataService.clearSession();
    set({ user: null });
  }
}));
