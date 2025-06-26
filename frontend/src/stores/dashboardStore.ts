import { create } from 'zustand';
import { api } from '../api';
import { getCurrentDate, addDays } from '../utils/dateUtils';
import { useProgramStore } from './programStore';

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
  isLoading: boolean;
  error: string | null;
  wereStatsFetched: boolean;
  lastFetchTime: number | null;
}

interface DashboardStore extends DashboardState {
  fetchDashboardStats: (forceRefresh?: boolean) => Promise<void>;
  updateStatsAfterTransaction: (transaction: any) => void;
  resetStore: () => void;
}

// Cache timeout in milliseconds (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,
  wereStatsFetched: false,
  lastFetchTime: null,

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
      console.log('Using cached dashboard stats');
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
      } else {
        // If API fails or returns invalid data, generate mock data for development
        const salesChart = Array.from({ length: 30 }, (_, i) => {
          const date = addDays(today, -29 + i);
          return {
            date,
            amount: Math.floor(Math.random() * 500) + 200,
          };
        });
        
        const totalSales = salesChart.reduce((sum, day) => sum + day.amount, 0);
        
        const mockStats: DashboardStats = {
          today: {
            sales: salesChart[salesChart.length - 1].amount,
            books: {
              large: Math.floor(Math.random() * 10) + 5,
              small: Math.floor(Math.random() * 15) + 10,
              total: 0, // Will be calculated
            }
          },
          week: {
            sales: salesChart.slice(-7).reduce((sum, day) => sum + day.amount, 0),
            books: {
              large: Math.floor(Math.random() * 50) + 20,
              small: Math.floor(Math.random() * 70) + 30,
              total: 0, // Will be calculated
            }
          },
          month: {
            sales: totalSales,
            books: {
              large: Math.floor(Math.random() * 200) + 100,
              small: Math.floor(Math.random() * 300) + 150,
              total: 0, // Will be calculated
            }
          },
          program: {
            goal: 100000,
            achieved: totalSales,
            remaining: 0, // Will be calculated
            percentageAchieved: 0, // Will be calculated
          },
          salesChart,
        };
        
        // Calculate totals and remaining values
        mockStats.today.books.total = mockStats.today.books.large + mockStats.today.books.small;
        mockStats.week.books.total = mockStats.week.books.large + mockStats.week.books.small;
        mockStats.month.books.total = mockStats.month.books.large + mockStats.month.books.small;
        mockStats.program.remaining = mockStats.program.goal - mockStats.program.achieved;
        mockStats.program.percentageAchieved = (mockStats.program.achieved / mockStats.program.goal) * 100;
        
        set({ 
          stats: mockStats, 
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

  // New method to update stats after a transaction is approved
  updateStatsAfterTransaction: (transaction) => {
    const currentStats = get().stats;
    if (!currentStats) return;

    // Only update if the transaction is APPROVED
    if (transaction.status !== 'APPROVED') return;

    // Get transaction date and amount
    const transactionDate = transaction.date;
    const transactionAmount = transaction.total;
    const today = getCurrentDate();

    // Create a copy of the current stats
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
    isLoading: false,
    error: null,
    wereStatsFetched: false,
    lastFetchTime: null
  });
}
}));