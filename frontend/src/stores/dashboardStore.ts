import { create } from 'zustand';
import { api } from '../api';
import { getCurrentDate } from '../utils/dateUtils';
import { useProgramStore } from './programStore';
import { PersonalStats } from '../types';

interface DashboardStats {
  today: {
    sales: number;
    books: {
      large: number;
      small: number;
      total: number;
    };
  };
  week: {
    sales: number;
    books: {
      large: number;
      small: number;
      total: number;
    };
  };
  month: {
    sales: number;
    books: {
      large: number;
      small: number;
      total: number;
    };
  };
  program: {
    goal: number;
    achieved: number;
    remaining: number;
    percentageAchieved: number;
  };
  salesChart: Array<{
    date: string;
    amount: number;
  }>;
}

interface DashboardState {
  stats: DashboardStats | null;
  personalStats: PersonalStats | null;
  isLoading: boolean;
  isLoadingPersonalStats: boolean;
  error: string | null;
  personalStatsError: string | null;
  wereStatsFetched: boolean;
  werePersonalStatsFetched: boolean;
  lastFetchTime: number | null;
  lastPersonalStatsFetchTime: number | null;
}

interface DashboardStore extends DashboardState {
  fetchDashboardStats: (forceRefresh?: boolean) => Promise<void>;
  fetchPersonalStats: (userId: string, forceRefresh?: boolean, type?: string) => Promise<void>;
  updateStatsAfterTransaction: (transaction: any) => void;
  resetStore: () => void;
}

// Cache timeout in milliseconds (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  stats: null,
  personalStats: null,
  isLoading: false,
  isLoadingPersonalStats: false,
  error: null,
  personalStatsError: null,
  wereStatsFetched: false,
  werePersonalStatsFetched: false,
  lastFetchTime: null,
  lastPersonalStatsFetchTime: null,

  fetchDashboardStats: async (forceRefresh = false) => {
    // Check if we already have stats and they're not too old
    const currentState = get();
    const now = Date.now();
    
    if (
      !forceRefresh && 
      currentState.stats && 
      currentState.lastFetchTime && 
      now - currentState.lastFetchTime < CACHE_TIMEOUT
    ) {
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      // Get today's date in a consistent format
      const today = getCurrentDate();
      
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      // Prepare params
      const params: Record<string, string | number> = { date: today };
      if (programId) {
        params.programId = programId;
      }
      
      // Make the actual API call to get dashboard stats with the date parameter
      const stats = await api.get<DashboardStats>('/dashboard/stats', { params });
      
      // Ensure all required properties exist
      if (stats) {
        // Make sure all required nested properties exist
        const validatedStats: DashboardStats = {
          today: {
            sales: stats.today?.sales || 0,
            books: {
              large: stats.today?.books?.large || 0,
              small: stats.today?.books?.small || 0,
              total: stats.today?.books?.total || 0
            }
          },
          week: {
            sales: stats.week?.sales || 0,
            books: {
              large: stats.week?.books?.large || 0,
              small: stats.week?.books?.small || 0,
              total: stats.week?.books?.total || 0
            }
          },
          month: {
            sales: stats.month?.sales || 0,
            books: {
              large: stats.month?.books?.large || 0,
              small: stats.month?.books?.small || 0,
              total: stats.month?.books?.total || 0
            }
          },
          program: {
            goal: stats.program?.goal || 0,
            achieved: stats.program?.achieved || 0,
            remaining: stats.program?.remaining || 0,
            percentageAchieved: stats.program?.percentageAchieved || 0
          },
          salesChart: stats.salesChart || []
        };
        set({ 
          stats: validatedStats, 
          isLoading: false, 
          wereStatsFetched: true,
          lastFetchTime: now
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  fetchPersonalStats: async (userId: string, forceRefresh = false, type: string | undefined) => {
    // Check if we already have personal stats and they're not too old
    const currentState = get();
    const now = Date.now();
    
    if (
      !forceRefresh && 
      currentState.personalStats && 
      currentState.lastPersonalStatsFetchTime && 
      now - currentState.lastPersonalStatsFetchTime < CACHE_TIMEOUT
    ) {
      return;
    }
    
    set({ isLoadingPersonalStats: true, personalStatsError: null });
    try {
      // Get program dates from the program store
      const { program } = useProgramStore.getState();
      
      let startDateStr: string;
      let endDateStr: string;
      
      if (program) {
        // Use program start and end dates (complete program period)
        startDateStr = program.start_date;
        endDateStr = program.end_date;
      } else {
        // Fallback to current year if no program is available
        const today = new Date();
        const startDate = new Date(today.getFullYear(), 0, 1); // Start of year
        const endDate = new Date(today.getFullYear(), 11, 31); // End of year
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      }
      
      // Fetch personal earnings report - ONLY APPROVED TRANSACTIONS
      const personalStats = await api.get<PersonalStats>(`/reports/earnings/${userId}`, {
        params: {
          startDate: startDateStr,
          endDate: endDateStr,
          status: 'APPROVED',
          type
        }
      });
      set({ 
        personalStats, 
        isLoadingPersonalStats: false, 
        werePersonalStatsFetched: true,
        lastPersonalStatsFetchTime: now
      });
      
    } catch (error) {
      console.error('Error fetching personal stats:', error);
      set({ 
        personalStatsError: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoadingPersonalStats: false 
      });
      throw error;
    }
  },

  // New method to update stats after a transaction is approved
  updateStatsAfterTransaction: (transaction) => {
    // Only update if the transaction is APPROVED
    if (transaction.status !== 'APPROVED') return;

    // Get transaction date and amount
    const transactionDate = transaction.date;
    const transactionAmount = transaction.total;
    const today = getCurrentDate();

    // Create a copy of the current stats
    const currentStats = get().stats;
    if (!currentStats) return;
    
    const updatedStats = { ...currentStats };

    // Update today's sales if the transaction is from today
    if (transactionDate === today) {
      updatedStats.today.sales += transactionAmount;

      // Update today's books
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach(book => {
          if (book.size === 'LARGE') {
            updatedStats.today.books.large += book.quantity;
          } else {
            updatedStats.today.books.small += book.quantity;
          }
        });
        updatedStats.today.books.total = updatedStats.today.books.large + updatedStats.today.books.small;
      }
    }

    // Check if transaction is within the current week
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay()); // Start of week (Sunday)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6); // End of week (Saturday)
    
    const transactionDateObj = new Date(transactionDate);
    if (transactionDateObj >= weekStartDate && transactionDateObj <= weekEndDate) {
      updatedStats.week.sales += transactionAmount;

      // Update weekly books
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach(book => {
          if (book.size === 'LARGE') {
            updatedStats.week.books.large += book.quantity;
          } else {
            updatedStats.week.books.small += book.quantity;
          }
        });
        updatedStats.week.books.total = updatedStats.week.books.large + updatedStats.week.books.small;
      }
    }

    // Check if transaction is within the current month
    const monthStartDate = new Date();
    monthStartDate.setDate(1); // Start of month
    const monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0); // End of month
    
    if (transactionDateObj >= monthStartDate && transactionDateObj <= monthEndDate) {
      updatedStats.month.sales += transactionAmount;

      // Update monthly books
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach(book => {
          if (book.size === 'LARGE') {
            updatedStats.month.books.large += book.quantity;
          } else {
            updatedStats.month.books.small += book.quantity;
          }
        });
        updatedStats.month.books.total = updatedStats.month.books.large + updatedStats.month.books.small;
      }
    }

    // Update program achieved amount
    updatedStats.program.achieved += transactionAmount;
    updatedStats.program.remaining = updatedStats.program.goal - updatedStats.program.achieved;
    updatedStats.program.percentageAchieved = (updatedStats.program.achieved / updatedStats.program.goal) * 100;

    // Update sales chart
    const chartDateIndex = updatedStats.salesChart.findIndex(item => item.date === transactionDate);
    if (chartDateIndex >= 0) {
      updatedStats.salesChart[chartDateIndex].amount += transactionAmount;
    } else {
      // If the date doesn't exist in the chart, add it
      updatedStats.salesChart.push({
        date: transactionDate,
        amount: transactionAmount
      });
      // Sort the chart by date
      updatedStats.salesChart.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Update the state with the new stats
    set({ stats: updatedStats });
  },

  resetStore: () => {
    set({
      stats: null,
      personalStats: null,
      isLoading: false,
      isLoadingPersonalStats: false,
      error: null,
      personalStatsError: null,
      wereStatsFetched: false,
      werePersonalStatsFetched: false,
      lastFetchTime: null,
      lastPersonalStatsFetchTime: null
    });
  }
}));
