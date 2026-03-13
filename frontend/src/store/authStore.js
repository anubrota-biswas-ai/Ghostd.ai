import { create } from 'zustand';
import { api } from '@/lib/api';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),

  checkAuth: async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      set({ loading: false });
      return;
    }
    try {
      const user = await api.getMe();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    try { await api.logout(); } catch {}
    set({ user: null });
    window.location.href = '/login';
  },
}));

export default useAuthStore;
