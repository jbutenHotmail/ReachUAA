import { create } from 'zustand';
import { LeaderPercentage } from '../types';
import { api } from '../api';
import { useProgramStore } from './programStore';

interface LeaderPercentageState {
  leaderPercentages: LeaderPercentage[];
  isLoading: boolean;
  error: string | null;
  werePercentagesFetched: boolean;
}

interface LeaderPercentageStore extends LeaderPercentageState {
  fetchLeaderPercentages: () => Promise<void>;
  createLeaderPercentage: (percentage: Omit<LeaderPercentage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLeaderPercentage: (id: string, percentage: Partial<LeaderPercentage>) => Promise<void>;
  deleteLeaderPercentage: (id: string) => Promise<void>;
  toggleLeaderPercentageStatus: (id: string) => Promise<void>;
  getLeaderPercentage: (leaderId: string) => LeaderPercentage | null;
  resetStore: () => void;
}

export const useLeaderPercentageStore = create<LeaderPercentageStore>((set, get) => ({
  leaderPercentages: [],
  isLoading: false,
  error: null,
  werePercentagesFetched: false,

  fetchLeaderPercentages: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program filter if available
      const params: Record<string, string | number> = {};
      if (programId) {
        params.programId = programId;
      }
      
      const percentages = await api.get<LeaderPercentage[]>('/leaders/percentages', { params });
      set({ leaderPercentages: percentages, isLoading: false, werePercentagesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  createLeaderPercentage: async (percentageData) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to percentage data
      const dataWithProgram = {
        ...percentageData,
        programId: percentageData.programId || programId
      };
      
      const newPercentage = await api.post<LeaderPercentage>('/leaders/percentages', dataWithProgram);
      set(state => ({
        leaderPercentages: [...state.leaderPercentages, newPercentage],
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

  updateLeaderPercentage: async (id, percentageData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPercentage = await api.put<LeaderPercentage>(`/leaders/percentages/${id}`, percentageData);
      set(state => ({
        leaderPercentages: state.leaderPercentages.map(p => 
          p.id === id ? updatedPercentage : p
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

  deleteLeaderPercentage: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/leaders/percentages/${id}`);
      set(state => ({
        leaderPercentages: state.leaderPercentages.filter(p => p.id !== id),
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

  toggleLeaderPercentageStatus: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { is_active } = await api.patch<{ message: string; is_active: boolean }>(`/leaders/percentages/${id}/toggle`);
      set(state => ({
        leaderPercentages: state.leaderPercentages.map(p => 
          p.id === id ? { ...p, isActive: is_active } : p
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

  getLeaderPercentage: (leaderId) => {
    const percentages = get().leaderPercentages;
    return percentages.find(p => p.leaderId === leaderId && p.isActive) || null;
  },

  // Reset store method
  resetStore: () => {
    set({
      leaderPercentages: [],
      isLoading: false,
      error: null,
      werePercentagesFetched: false
    });
  }
}));