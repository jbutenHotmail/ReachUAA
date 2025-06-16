import { create } from 'zustand';
import { FinancialSummary, SalesData } from '../types';
import { api } from '../api';

interface FinancialState {
  summary: FinancialSummary | null;
  salesHistory: SalesData[];
  isLoading: boolean;
  error: string | null;
}

interface FinancialStore extends FinancialState {
  fetchSummary: (userId: string) => Promise<void>;
  fetchSalesHistory: (userId: string, period: string) => Promise<void>;
}

export const useFinancialStore = create<FinancialStore>((set) => ({
  summary: null,
  salesHistory: [],
  isLoading: false,
  error: null,

  fetchSummary: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const summary = await api.get<FinancialSummary>(`/reports/summary/${userId}`);
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
  }
}));