import { create } from 'zustand';
import { auth, signInWithPopup, googleProvider, signOut as fbSignOut } from '../firebase';
import { DataService } from '../services/dataService';

const initialUser = DataService.getCurrentUser();

export const useAuthStore = create((set) => ({
  user: initialUser,
  authLoading: !initialUser,

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
