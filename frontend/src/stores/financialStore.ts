import { create } from 'zustand';
import { FinancialSummary, SalesData } from '../types';
import { api } from '../api';

interface FinancialState {
  summary: FinancialSummary | null;
  salesHistory: SalesData[];
  isLoading: boolean;
  error: string | null;
  wasSummaryFetched: boolean;
  wasSalesHistoryFetched: boolean;
}

interface FinancialStore extends FinancialState {
  fetchSummary: (userId: string) => Promise<void>;
  fetchSalesHistory: (userId: string, period: string) => Promise<void>;
  updateSummaryAfterTransaction: (transaction: any) => void;
  updateSalesHistoryAfterTransaction: (transaction: any) => void;
}

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  summary: null,
  salesHistory: [],
  isLoading: false,
  error: null,
  wasSummaryFetched: false,
  wasSalesHistoryFetched: false,

  fetchSummary: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const summary = await api.get<FinancialSummary>(`/reports/summary/${userId}`);
      set({ summary, isLoading: false, wasSummaryFetched: true });
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
      set({ salesHistory, isLoading: false, wasSalesHistoryFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      });
    }
  },

  // New method to update summary after a transaction is approved
  updateSummaryAfterTransaction: (transaction) => {
    // Only update if the transaction is APPROVED
    if (transaction.status !== 'APPROVED') return;

    const currentSummary = get().summary;
    if (!currentSummary) return;

    // Get transaction amount
    const transactionAmount = transaction.total;

    // Create a copy of the current summary
    const updatedSummary = { ...currentSummary };

    // Update the summary values
    updatedSummary.totalSales += transactionAmount;
    
    // Check if transaction is from today
    const today = new Date().toISOString().split('T')[0];
    if (transaction.date === today) {
      updatedSummary.dailySales += transactionAmount;
    }

    // Check if transaction is within the current week
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay()); // Start of week (Sunday)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6); // End of week (Saturday)
    
    const transactionDate = new Date(transaction.date);
    if (transactionDate >= weekStartDate && transactionDate <= weekEndDate) {
      updatedSummary.weeklySales += transactionAmount;
    }

    // Check if transaction is within the current month
    const monthStartDate = new Date();
    monthStartDate.setDate(1); // Start of month
    const monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0); // End of month
    
    if (transactionDate >= monthStartDate && transactionDate <= monthEndDate) {
      updatedSummary.monthlySales += transactionAmount;
    }

    // Update the state with the new summary
    set({ summary: updatedSummary });
  },

  // New method to update sales history after a transaction is approved
  updateSalesHistoryAfterTransaction: (transaction) => {
    // Only update if the transaction is APPROVED
    if (transaction.status !== 'APPROVED') return;

    const currentSalesHistory = get().salesHistory;
    if (!currentSalesHistory || currentSalesHistory.length === 0) return;

    // Get transaction date and amount
    const transactionDate = transaction.date;
    const transactionAmount = transaction.total;

    // Create a copy of the current sales history
    const updatedSalesHistory = [...currentSalesHistory];

    // Find if the transaction date already exists in the sales history
    const dateIndex = updatedSalesHistory.findIndex(item => item.date === transactionDate);

    if (dateIndex >= 0) {
      // Update existing date
      updatedSalesHistory[dateIndex] = {
        ...updatedSalesHistory[dateIndex],
        amount: updatedSalesHistory[dateIndex].amount + transactionAmount
      };
    } else {
      // Add new date
      updatedSalesHistory.push({
        date: transactionDate,
        amount: transactionAmount
      });
      // Sort by date
      updatedSalesHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Update the state with the new sales history
    set({ salesHistory: updatedSalesHistory });
  }
}));