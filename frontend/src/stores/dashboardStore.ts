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

const initialStats: DashboardStats = {
  today: {
    sales: 0,
    books: {
      large: 0,
      small: 0,
      total: 0,
    },
  },
  week: {
    sales: 0,
    books: {
      large: 0,
      small: 0,
      total: 0,
    },
  },
  month: {
    sales: 0,
    books: {
      large: 0,
      small: 0,
      total: 0,
    },
  },
  program: {
    goal: 0,
    achieved: 0,
    remaining: 0,
    percentageAchieved: 0,
  },
  salesChart: [],
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real implementation, this would be a single API call
      // For now, we'll simulate it with a timeout
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // This would be the actual API call in a real implementation
      // const stats = await api.get<DashboardStats>('/dashboard/stats');
      
      // For now, we'll use mock data that looks like it came from the API
      const today = new Date();
      const salesChart = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - 29 + i);
        return {
          date: date.toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 500) + 200,
        };
      });
      
      const totalSales = salesChart.reduce((sum, day) => sum + day.amount, 0);
      
      const stats: DashboardStats = {
        today: {
          sales: salesChart[salesChart.length - 1].amount,
          books: {
            large: Math.floor(Math.random() * 10) + 5,
            small: Math.floor(Math.random() * 15) + 10,
            total: 0, // Will be calculated
          },
        },
        week: {
          sales: salesChart.slice(-7).reduce((sum, day) => sum + day.amount, 0),
          books: {
            large: Math.floor(Math.random() * 50) + 20,
            small: Math.floor(Math.random() * 70) + 30,
            total: 0, // Will be calculated
          },
        },
        month: {
          sales: totalSales,
          books: {
            large: Math.floor(Math.random() * 200) + 100,
            small: Math.floor(Math.random() * 300) + 150,
            total: 0, // Will be calculated
          },
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
      stats.today.books.total = stats.today.books.large + stats.today.books.small;
      stats.week.books.total = stats.week.books.large + stats.week.books.small;
      stats.month.books.total = stats.month.books.large + stats.month.books.small;
      stats.program.remaining = stats.program.goal - stats.program.achieved;
      stats.program.percentageAchieved = (stats.program.achieved / stats.program.goal) * 100;
      
      set({ stats, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },
}));