import { create } from 'zustand';
import { Transaction } from '../types';
import { api } from '../api';
import { getCurrentDate } from '../utils/dateUtils';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

interface TransactionStore extends TransactionState {
  fetchTransactions: (date?: string) => Promise<void>;
  fetchAllTransactions: (status?: string) => Promise<void>;
  createTransaction: (transaction: any) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  approveTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,

  fetchTransactions: async (date) => {
    set({ isLoading: true, error: null });
    try {
      // If no date is provided, use today's date in a consistent format
      const queryDate = date || getCurrentDate();
      console.log('Fetching transactions for date:', queryDate);
      
      const params = queryDate ? { date: queryDate } : undefined;
      const transactions = await api.get<Transaction[]>('/transactions', { 
        params: params as Record<string, string>
      });
      set({ transactions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  fetchAllTransactions: async (status: string) => {
    set({ isLoading: true, error: null });
    try {

      // Fetch all transactions without date filtering
      const transactions = status ? await api.get<Transaction[]>(`/transactions?status=${status}`) : await api.get<Transaction[]>('/transactions');
      set({ transactions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  createTransaction: async (transactionData) => {
    set({ isLoading: true, error: null });
    try {
      const newTransaction = await api.post<Transaction>('/transactions', transactionData);
      set((state) => ({ 
        transactions: [...state.transactions, newTransaction], 
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

  updateTransaction: async (id, transactionData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTransaction = await api.put<Transaction>(`/transactions/${id}`, transactionData);
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? updatedTransaction : t
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

  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/transactions/${id}`);
      set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  approveTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { transaction } = await api.patch<{ message: string; transaction: Transaction }>(`/transactions/${id}/approve`);
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? transaction : t
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  rejectTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { transaction } = await api.patch<{ message: string; transaction: Transaction }>(`/transactions/${id}/reject`);
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? transaction : t
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },
}));