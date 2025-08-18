import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User } from '../types';
import { api, refreshAccessToken } from '../api';

interface LoginResponse {
  user: User;
  accessToken: string;
}

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  getUserProfile: () => Promise<User>;
  updateProfile: (user: Partial<User>) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  setCurrentProgram: (programId: number) => void;
  checkStorageAndLogout: () => boolean; // Función para verificar el almacenamiento
}

// Helper function to get current user from localStorage
const getCurrentUser = (): User | null => {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: getCurrentUser(),
      token: localStorage.getItem('accessToken'),
      isAuthenticated: !!localStorage.getItem('accessToken'),
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          // The backend will set the refresh token as an HttpOnly cookie
          const response = await api.post<LoginResponse>('/auth/login', { email, password });
          
          // Store only the access token in localStorage
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          set({ 
            user: response.user, 
            token: response.accessToken, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          // Call logout endpoint to invalidate token on server and clear the HttpOnly cookie
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear ALL localStorage items
          localStorage.clear();
          
          // Reset all state
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      refreshToken: async () => {
        set({ isLoading: true });
        try {
          const response = await refreshAccessToken();
          
          // Update user if needed (in case it was cleared)
          const currentUser = getCurrentUser();
          
          set({ 
            token: response.accessToken, 
            user: response.user || currentUser,
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          // Clear everything on refresh failure
          localStorage.clear();
          
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to refresh token'
          });
          
          throw error;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          // In a real app, this would call the register API
          await api.post('/auth/register', { name, email, password });
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/forgot-password', { email });
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      resetPassword: async (token, password) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/reset-password', { token, password });
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      getUserProfile: async () => {
        // This function is no longer needed since login and refresh token
        // endpoints now return complete user data
        const currentUser = get().user;
        if (currentUser) {
          return currentUser;
        } else {
          throw new Error('No user found');
        }
      },

      updateProfile: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          // Call the API to update the profile
          const updatedUser = await api.put<User>('/users/profile', userData);
          
          // Update the user in localStorage and state
          const currentUser = get().user;
          if (currentUser) {
            const mergedUser = { ...currentUser, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(mergedUser));
            set({ user: mergedUser, isLoading: false });
            return mergedUser;
          } else {
            throw new Error('No user found');
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/users/change-password', { currentPassword, newPassword });
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      setCurrentProgram: (programId) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, currentProgramId: programId };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          set({ user: updatedUser });
        }
      },
      
      // Función para verificar el almacenamiento y desloguear si es necesario
      checkStorageAndLogout: () => {
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) {
          // Si no existe el auth-storage, desloguear al usuario
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          return true; // Indica que se ha deslogueado
        }
        return false; // No se ha deslogueado
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);