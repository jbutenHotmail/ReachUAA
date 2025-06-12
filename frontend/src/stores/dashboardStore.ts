import { create } from 'zustand';
import { api } from '../api';

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
      // Make the actual API call to get dashboard stats
      const stats = await api.get<DashboardStats>('/dashboard/stats');
      
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
        throw new Error('Invalid dashboard stats data received');
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