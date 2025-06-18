import { create } from 'zustand';
import { api } from '../api';

interface Expense {
  id: string;
  leaderId: string | null;
  leaderName: string;
  amount: number;
  motivo: string;
  category: string;
  notes?: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  wereExpensesFetched: boolean;
}

interface ExpenseStore extends ExpenseState {
  fetchExpenses: (params?: Record<string, string>) => Promise<void>;
  createExpense: (expense: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => Promise<Expense>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  approveExpense: (id: string) => Promise<Expense>;
  rejectExpense: (id: string) => Promise<Expense>;
}

export const useExpenseStore = create<ExpenseStore>((set) => ({
  expenses: [],
  isLoading: false,
  error: null,
  wereExpensesFetched: false,
  fetchExpenses: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const expenses = await api.get<Expense[]>('/expenses', { params });
      set({ expenses, isLoading: false, wereExpensesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  createExpense: async (expenseData) => {
    set({ isLoading: true, error: null });
    try {
      const newExpense = await api.post<Expense>('/expenses', expenseData);
      set(state => ({
        expenses: [...state.expenses, newExpense],
        isLoading: false,
      }));
      return newExpense;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  updateExpense: async (id, expenseData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedExpense = await api.put<Expense>(`/expenses/${id}`, expenseData);
      set(state => ({
        expenses: state.expenses.map(e => 
          e.id === id 
            ? updatedExpense
            : e
        ),
        isLoading: false,
      }));
      return updatedExpense;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/expenses/${id}`);
      set(state => ({
        expenses: state.expenses.filter(e => e.id !== id),
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

  approveExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedExpense = await api.patch<Expense>(`/expenses/${id}/approve`);
      set(state => ({
        expenses: state.expenses.map(e => 
          Number(e.id) === Number(id) 
            ? updatedExpense
            : e
        ),
        isLoading: false,
      }));
      return updatedExpense;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  rejectExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedExpense = await api.patch<Expense>(`/expenses/${id}/reject`);
      set(state => ({
        expenses: state.expenses.map(e => 
          e.id === id 
            ? updatedExpense
            : e
        ),
        isLoading: false,
      }));
      return updatedExpense;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },
}));