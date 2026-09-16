import { create } from 'zustand';
import { auth, signInWithPopup, googleProvider, signOut as fbSignOut } from '../firebase';

export const useAuthStore = create((set) => ({
  user: null,
  authLoading: true,

  setUser: (user) => set({ user, authLoading: false }),
  setAuthLoading: (authLoading) => set({ authLoading }),

  signIn: async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    return await signInWithPopup(auth, googleProvider);
  },

  signOut: async () => {
    if (!auth) return;
    return await fbSignOut(auth);
  }
}));
