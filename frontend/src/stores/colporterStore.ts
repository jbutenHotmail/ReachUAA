import { create } from 'zustand';
import { Colporter } from '../types';
import { api } from '../api';

interface ColporterState {
  colporters: Colporter[];
  isLoading: boolean;
  error: string | null;
}

interface ColporterStore extends ColporterState {
  fetchColporters: () => Promise<void>;
  createColporter: (colporter: Omit<Colporter, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'hasUser'>) => Promise<void>;
  updateColporter: (id: string, colporter: Partial<Colporter>) => Promise<void>;
  deleteColporter: (id: string) => Promise<void>;
}

export const useColporterStore = create<ColporterStore>((set) => ({
  colporters: [],
  isLoading: false,
  error: null,

  fetchColporters: async () => {
    set({ isLoading: true, error: null });
    try {
      const colporters = await api.get<Colporter[]>('/people/colporters');
      set({ colporters, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  createColporter: async (colporterData) => {
    set({ isLoading: true, error: null });
    try {
      const newColporter = await api.post<Colporter>('/people/colporters', colporterData);
      set(state => ({
        colporters: [...state.colporters, newColporter],
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

  updateColporter: async (id, colporterData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedColporter = await api.put<Colporter>(`/people/colporters/${id}`, colporterData);
      set(state => ({
        colporters: state.colporters.map(c => 
          c.id === id 
            ? updatedColporter
            : c
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

  deleteColporter: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/people/colporters/${id}`);
      set(state => ({
        colporters: state.colporters.filter(c => c.id !== id),
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
}));