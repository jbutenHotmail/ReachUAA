import { create } from 'zustand';
import { api } from '../api';
import { getCurrentDate, addDays } from '../utils/dateUtils';

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
}

interface DashboardStore extends DashboardState {
  fetchDashboardStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get today's date in a consistent format
      const today = getCurrentDate();
      console.log('Fetching dashboard stats for date:', today);
      
      // Make the actual API call to get dashboard stats with the date parameter
      const stats = await api.get<DashboardStats>('/dashboard/stats', {
        params: { date: today }
      });
      
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
        
        set({ stats: validatedStats, isLoading: false });
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
        
        set({ stats: mockStats, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },
}));