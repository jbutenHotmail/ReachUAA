// src/stores/transactionStore.ts
import { create } from 'zustand';
import { Transaction } from '../types';
import { api } from '../api';
import { getCurrentDate } from '../utils/dateUtils';
import { useDashboardStore } from './dashboardStore';
import { useFinancialStore } from './financialStore';
import { useInventoryStore } from './inventoryStore';
import { useProgramStore } from './programStore';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  wereTransactionsFetched: boolean;
}

interface TransactionStore extends TransactionState {
  fetchTransactions: (date?: string) => Promise<void>;
  fetchAllTransactions: (status?: string) => Promise<Transaction[]>;
  createTransaction: (transaction: any) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  approveTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string) => Promise<void>;
  resetStore: () => void;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  wereTransactionsFetched: false,

  fetchTransactions: async (date) => {
    set({ isLoading: true, error: null });
    try {
      // If no date is provided, use today's date in a consistent format
      const queryDate = date || getCurrentDate();
      
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      const params: Record<string, string | number> = { date: queryDate };
      if (programId) {
        params.programId = programId;
      }
      
      const transactions = await api.get<Transaction[]>('/transactions', { params });
      set({ transactions, isLoading: false,wereTransactionsFetched: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  fetchAllTransactions: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Fetch all transactions with optional status filtering
      const params: Record<string, string | number> = {};
      if (status) {
        params.status = status;
      }
      if (programId) {
        params.programId = programId;
      }
      
      const transactions = await api.get<Transaction[]>('/transactions', { params });
      set({ transactions, isLoading: false, wereTransactionsFetched: true });
      return transactions;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
      return [];
    }
  },

  createTransaction: async (transactionData) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to transaction data
      const dataWithProgram = {
        ...transactionData,
        programId
      };
      
      const newTransaction = await api.post<Transaction>('/transactions', dataWithProgram);
      
      set((state) => ({ 
        transactions: [...state.transactions, newTransaction], 
        isLoading: false 
      }));

      return newTransaction;
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
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to transaction data if not already present
      const dataWithProgram = {
        ...transactionData,
        programId: transactionData.programId || programId
      };
      
      const updatedTransaction = await api.put<Transaction>(`/transactions/${id}`, dataWithProgram);
      
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? updatedTransaction : t
        ),
        isLoading: false,
      }));

      // If the transaction status is being updated to APPROVED, update the dashboard stats
      if (transactionData.status === 'APPROVED') {
        // Get the dashboard store and update the stats
        const dashboardStore = useDashboardStore.getState();
        dashboardStore.updateStatsAfterTransaction(updatedTransaction);
        
        // Get the financial store and update the summary and sales history
        const financialStore = useFinancialStore.getState();
        financialStore.updateSummaryAfterTransaction(updatedTransaction);
        financialStore.updateSalesHistoryAfterTransaction(updatedTransaction);
        
        // Get the inventory store and update the books
        const inventoryStore = useInventoryStore.getState();
        inventoryStore.updateBooksAfterTransaction(updatedTransaction, true);
      } else if (transactionData.status === 'REJECTED' && updatedTransaction.status === 'REJECTED') {
        // If rejecting a previously approved transaction, update the books
        const inventoryStore = useInventoryStore.getState();
        inventoryStore.updateBooksAfterTransaction(updatedTransaction, false);
      }

      return updatedTransaction;
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

      // Update the dashboard stats
      const dashboardStore = useDashboardStore.getState();
      dashboardStore.updateStatsAfterTransaction(transaction);
      
      // Update the financial summary and sales history
      const financialStore = useFinancialStore.getState();
      financialStore.updateSummaryAfterTransaction(transaction);
      financialStore.updateSalesHistoryAfterTransaction(transaction);
      
      // Update the inventory (books)
      const inventoryStore = useInventoryStore.getState();
      inventoryStore.updateBooksAfterTransaction(transaction, true);

      return transaction;
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
      
      // Check if this was previously approved (we need to update book counts)
      const prevTransaction = get().transactions.find(t => t.id === id);
      const wasApproved = prevTransaction?.status === 'APPROVED';
      
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? transaction : t
        ),
        isLoading: false,
      }));
      
      // If the transaction was previously approved, update the books
      if (wasApproved) {
        const inventoryStore = useInventoryStore.getState();
        inventoryStore.updateBooksAfterTransaction(transaction, false);
      }
      
      return transaction;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  // Reset store method
  resetStore: () => {
    set({
      transactions: [],
      isLoading: false,
      error: null,
      wereTransactionsFetched: false
    });
  }
}));
