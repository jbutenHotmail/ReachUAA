import { create } from 'zustand';
import { CashAdvance, WeeklySales } from '../types';
import { api } from '../api';
import { useProgramStore } from './programStore';

interface CashAdvanceState {
  advances: CashAdvance[];
  weeklySales: WeeklySales[];
  isLoading: boolean;
  error: string | null;
  wereAdvancesFetched: boolean;
}

interface CashAdvanceStore extends CashAdvanceState {
  fetchAdvances: (colporterId?: string) => Promise<void>;
  approveAdvance: (id: string) => Promise<void>;
  rejectAdvance: (id: string) => Promise<void>;
  fetchWeeklySales: (colporterId: string, weekStartDate?: string, weekEndDate?: string) => Promise<void>;
  createCashAdvance: (advanceData: Omit<CashAdvance, 'id' | 'status' | 'requestDate' | 'approvedDate' | 'approvedBy' | 'approvedByName'>) => Promise<void>;
  resetStore: () => void;
}

export const useCashAdvanceStore = create<CashAdvanceStore>((set) => ({
  advances: [],
  weeklySales: [],
  isLoading: false,
  error: null,
  wereAdvancesFetched: false,
  fetchAdvances: async (colporterId) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Prepare params
      const params: Record<string, string | number> = {};
      if (colporterId) {
        params.personId = colporterId;
      }
      if (programId) {
        params.programId = programId;
      }
      
      const advances = await api.get<CashAdvance[]>('/cash-advance', { params });
      set({ advances, isLoading: false, wereAdvancesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  createCashAdvance: async (advanceData) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to advance data
      const dataWithProgram = {
        ...advanceData,
        programId: advanceData.programId || programId
      };
      
      const newAdvance = await api.post<CashAdvance>('/cash-advance', dataWithProgram);
      set(state => ({
        advances: [...state.advances, newAdvance],
        isLoading: false,
      }));
      return newAdvance;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  approveAdvance: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { advance } = await api.patch<{ message: string; advance: CashAdvance }>(`/cash-advance/${id}/approve`);
      
      set(state => ({
        advances: state.advances.map(a => a.id === id ? advance : a),
        isLoading: false,
      }));
      
      return advance;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  rejectAdvance: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { advance } = await api.patch<{ message: string; advance: CashAdvance }>(`/cash-advance/${id}/reject`);
      set(state => ({
        advances: state.advances.map(a => 
          a.id === id ? advance : a
        ),
        isLoading: false,
      }));
      return advance;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },resetStore: () => {
  set({
    advances: [],
    weeklySales: [],
    isLoading: false,
    error: null,
    wereAdvancesFetched: false
  });
},

  fetchWeeklySales: async (colporterId, weekStartDate, weekEndDate) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // If dates aren't provided, calculate current week dates (Sunday to Saturday)
      if (!weekStartDate || !weekEndDate) {
        const today = new Date();
        const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Calculate Sunday (start of week)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - day); // Go back to Sunday
        
        // Calculate Saturday (end of week)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Sunday + 6 days = Saturday
        
        weekStartDate = weekStart.toISOString().split('T')[0];
        weekEndDate = weekEnd.toISOString().split('T')[0];
      }
      
      const params: Record<string, string | number> = {
        weekStartDate,
        weekEndDate
      };
      
      if (programId) {
        params.programId = programId;
      }
      
      const weeklySales = await api.get<WeeklySales>(`/cash-advance/weekly-sales/${colporterId}`, { params });
      
      set({ weeklySales: [weeklySales], isLoading: false });
      return weeklySales;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },
}));