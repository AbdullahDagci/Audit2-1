import { create } from 'zustand';
import { api } from '@/lib/api';

interface AuthState {
  user: { id: string; email: string; fullName: string; role: string; phone?: string } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const token = await api.getToken();
      if (token) {
        const user = await api.getMe();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await api.removeToken();
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ error: null, isLoading: true });
    try {
      const { user } = await api.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  signOut: async () => {
    await api.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
