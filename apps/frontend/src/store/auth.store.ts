import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tenantId: string | null;
  setAuth: (user: User, token: string, tenantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      tenantId: null,
      setAuth: (user, token, tenantId) => set({ user, token, tenantId }),
      logout: () => set({ user: null, token: null, tenantId: null }),
    }),
    {
      name: 'panificapro-auth',
    }
  )
);
