import { create } from 'zustand';
import { Leader } from '../types';
import { api } from '../api';

interface LeaderState {
  leaders: Leader[];
  isLoading: boolean;
  error: string | null;
}

interface LeaderStore extends LeaderState {
  fetchLeaders: () => Promise<void>;
  createLeader: (leader: Omit<Leader, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'hasUser'>) => Promise<void>;
  updateLeader: (id: string, leader: Partial<Leader>) => Promise<void>;
  deleteLeader: (id: string) => Promise<void>;
}

export const useLeaderStore = create<LeaderStore>((set) => ({
  leaders: [],
  isLoading: false,
  error: null,

  fetchLeaders: async () => {
    set({ isLoading: true, error: null });
    try {
      const leaders = await api.get<Leader[]>('/people/leaders');
      set({ leaders, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  createLeader: async (leaderData) => {
    set({ isLoading: true, error: null });
    try {
      const newLeader = await api.post<Leader>('/people/leaders', leaderData);
      set(state => ({
        leaders: [...state.leaders, newLeader],
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

  updateLeader: async (id, leaderData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedLeader = await api.put<Leader>(`/people/leaders/${id}`, leaderData);
      set(state => ({
        leaders: state.leaders.map(l => 
          l.id === id 
            ? updatedLeader
            : l
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

  deleteLeader: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/people/leaders/${id}`);
      set(state => ({
        leaders: state.leaders.filter(l => l.id !== id),
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