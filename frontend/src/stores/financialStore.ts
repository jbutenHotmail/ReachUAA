import { create } from 'zustand';
import { FinancialSummary, SalesData, FinancialGoal } from '../types';
import { api } from '../api';

interface FinancialState {
  summary: FinancialSummary | null;
  salesHistory: SalesData[];
  goals: FinancialGoal[];
  isLoading: boolean;
  error: string | null;
}

interface FinancialStore extends FinancialState {
  fetchSummary: (userId: string) => Promise<void>;
  fetchSalesHistory: (userId: string, period: string) => Promise<void>;
  fetchGoals: (userId: string) => Promise<void>;
  createGoal: (goal: Omit<FinancialGoal, 'id'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<FinancialGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useFinancialStore = create<FinancialStore>((set) => ({
  summary: null,
  salesHistory: [],
  goals: [],
  isLoading: false,
  error: null,

  fetchSummary: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const summary = await api.get<FinancialSummary>(`/reports/summary/${userId}`);
      console.log(summary);
      set({ summary, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  fetchSalesHistory: async (userId, period) => {
    set({ isLoading: true, error: null });
    try {
      const salesHistory = await api.get<SalesData[]>(`/reports/sales-history/${userId}/${period}`);
      set({ salesHistory, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  fetchGoals: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const goals = await api.get<FinancialGoal[]>(`/reports/goals/${userId}`);
      set({ goals, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  createGoal: async (goal) => {
    set({ isLoading: true, error: null });
    try {
      const newGoal = await api.post<FinancialGoal>('/reports/goals', goal);
      set((state) => ({ 
        goals: [...state.goals, newGoal], 
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateGoal: async (id, goalData) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/reports/goals/${id}`, goalData);
      set((state) => ({
        goals: state.goals.map(g => g.id === id ? { ...g, ...goalData } : g),
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

  deleteGoal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/reports/goals/${id}`);
      set((state) => ({
        goals: state.goals.filter(g => g.id !== id),
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