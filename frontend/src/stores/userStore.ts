import { create } from 'zustand';
import { User, UserRole, Person } from '../types';
import { api } from '../api';

interface UserState {
  users: User[];
  people: Person[];
  isLoading: boolean;
  error: string | null;
}

interface UserStore extends UserState {
  fetchUsers: () => Promise<void>;
  fetchPeople: () => Promise<void>;
  getLeaders: () => Person[];
  getColporters: () => Person[];
  createUser: (userData: any) => Promise<void>;
  updateUser: (id: string, userData: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getRolePermissions: () => Promise<any[]>;
  updateRolePermissions: (permissions: any[]) => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  people: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.get<User[]>('/users');
      set({ users, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  fetchPeople: async () => {
    set({ isLoading: true, error: null });
    try {
      const people = await api.get<Person[]>('/people');
      set({ people, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  getLeaders: () => {
    return get().people.filter(person => person.personType === 'LEADER');
  },

  getColporters: () => {
    return get().people.filter(person => person.personType === 'COLPORTER');
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const newUser = await api.post<User>('/users', userData);
      set(state => ({
        users: [...state.users, newUser],
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  updateUser: async (id, userData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await api.put<User>(`/users/${id}`, userData);
      set(state => ({
        users: state.users.map(user => 
          user.id === id 
            ? updatedUser
            : user
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/users/${id}`);
      set(state => ({
        users: state.users.filter(user => user.id !== id),
        isLoading: false,
      }));
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

  getRolePermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const permissions = await api.get<any[]>('/users/roles/permissions');
      set({ isLoading: false });
      return permissions;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  updateRolePermissions: async (permissions) => {
    set({ isLoading: true, error: null });
    try {
      await api.put('/users/roles/permissions', { permissions });
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  }
}));