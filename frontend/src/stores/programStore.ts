import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProgramBook, WorkingDay, CustomDay } from '../types';
import { api } from '../api';
import { useAuthStore } from './authStore';
import { useTransactionStore } from './transactionStore';
import { useInventoryStore } from './inventoryStore';
import { useCashAdvanceStore } from './cashAdvanceStore';
import { useExpenseStore } from './expenseStore';
import { useChargeStore } from './chargeStore';
import { useUserStore } from './userStore';
import { useDashboardStore } from './dashboardStore';

interface ProgramConfig {
  id: number;
  name: string;
  motto: string;
  start_date: string;
  end_date: string;
  financial_goal: string;
  logo_url: string | null;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
  financialConfig: {
    id: number;
    program_id: number;
    colporter_percentage: string;
    leader_percentage: string;
    colporter_cash_advance_percentage: string;
    leader_cash_advance_percentage: string;
    created_at: string;
    updated_at: string;
  };
  workingDays: WorkingDay[];
  customDays: CustomDay[];
  books: ProgramBook[];
}

interface ProgramState {
  program: ProgramConfig | null;
  availablePrograms: ProgramConfig[] | null;
  isLoading: boolean;
  error: string | null;
  wasProgramFetched: boolean;
}

interface ProgramStore extends ProgramState {
  createProgram: (programData: any) => Promise<void>;
  updateProgram: (id: number, programData: any) => Promise<void>;
  fetchProgram: () => Promise<void>;
  fetchAvailablePrograms: () => Promise<void>;
  switchProgram: (programId: number) => Promise<void>;
  updateFinancialConfig: (id: number, configData: any) => Promise<void>;
  updateWorkingDay: (id: number, day: string, isWorkingDay: boolean) => Promise<void>;
  addCustomDay: (id: number, date: string, isWorkingDay: boolean) => Promise<void>;
  resetStores: () => void;
}

export const useProgramStore = create<ProgramStore>()(
  persist(
    (set, get) => ({
      program: null,
      availablePrograms: null,
      isLoading: false,
      error: null,
      wasProgramFetched: false,

      createProgram: async (programData) => {
        set({ isLoading: true, error: null });
        try {
          console.log('programData', programData);
          const response = await api.post('/program', programData);
          
          // Switch to the new program
          await get().switchProgram(response.programId);
          
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      updateProgram: async (id, programData) => {
        set({ isLoading: true, error: null });
        try {
          await api.put(`/program/${id}`, programData);
          await get().fetchProgram();
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      fetchProgram: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/program');
          
          if (response) {
            set({ 
              program: response, 
              isLoading: false,
              wasProgramFetched: true
            });
            
            // Update the current program ID in the auth store
            const authStore = useAuthStore.getState();
            authStore.setCurrentProgram(response.id);
          } else {
            // If no program exists or it's incomplete, set program to null
            set({ program: null, isLoading: false, wasProgramFetched: true });
          }
        } catch (error) {
          // If 404, it means no program exists yet
          if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
            set({ program: null, isLoading: false, wasProgramFetched: true });
            return;
          }
          
          console.error('Error fetching program:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false,
            wasProgramFetched: true
          });
        }
      },

      fetchAvailablePrograms: async () => {
        set({ isLoading: true, error: null });
        try {
          // Check if user is admin before fetching
          const { user } = useAuthStore.getState();
          if (user?.role !== 'ADMIN') {
            set({ 
              availablePrograms: [], 
              isLoading: false
            });
            return;
          }
          
          const programs = await api.get('/program/available');
          set({ 
            availablePrograms: programs || [], 
            isLoading: false
          });
        } catch (error) {
          console.error('Error fetching available programs:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
        }
      },

      switchProgram: async (programId) => {
        set({ isLoading: true, error: null });
        try {
          // Reset all stores before switching programs
          get().resetStores();
          
          const response = await api.post(`/program/switch/${programId}`);
          
          if (response) {
            set({ 
              program: response, 
              isLoading: false,
              wasProgramFetched: true
            });
            
            // Update the current program ID in the auth store
            const authStore = useAuthStore.getState();
            authStore.setCurrentProgram(programId);
          }
        } catch (error) {
          console.error('Error switching program:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      // Reset all stores to clear local data
      resetStores: () => {
        // Reset transaction store
        const transactionStore = useTransactionStore.getState();
        transactionStore.resetStore && transactionStore.resetStore();
        
        // Reset inventory store
        const inventoryStore = useInventoryStore.getState();
        inventoryStore.resetStore && inventoryStore.resetStore();
        
        // Reset cash advance store
        const cashAdvanceStore = useCashAdvanceStore.getState();
        cashAdvanceStore.resetStore && cashAdvanceStore.resetStore();
        
        // Reset expense store
        const expenseStore = useExpenseStore.getState();
        expenseStore.resetStore && expenseStore.resetStore();
        
        // Reset charge store
        const chargeStore = useChargeStore.getState();
        chargeStore.resetStore && chargeStore.resetStore();
        
        // Reset user store (people data)
        const userStore = useUserStore.getState();
        userStore.resetStore && userStore.resetStore();
        
        // Reset dashboard store
        const dashboardStore = useDashboardStore.getState();
        dashboardStore.resetStore && dashboardStore.resetStore();
      },

      // New method to update financial config
      updateFinancialConfig: async (id, configData) => {
        set({ isLoading: true, error: null });
        try {
          await api.put(`/program/${id}/financial-config`, configData);
          
          // Fetch fresh data from API instead of updating local state
          await get().fetchProgram();
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Error updating financial config:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      // New method to update working day
      updateWorkingDay: async (id, day, isWorkingDay) => {
        set({ isLoading: true, error: null });
        try {
          await api.put(`/program/${id}/working-days/${day}`, { isWorkingDay });
          
          // Fetch fresh data from API instead of updating local state
          await get().fetchProgram();
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Error updating working day:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      // New method to add custom day
      addCustomDay: async (id, date, isWorkingDay) => {
        set({ isLoading: true, error: null });
        try {
          await api.post(`/program/${id}/custom-days`, { date, isWorkingDay });
          
          // Fetch fresh data from API instead of updating local state
          await get().fetchProgram();
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Error adding custom day:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'program-storage',
      partialize: (state) => ({ 
        program: state.program,
        wasProgramFetched: state.wasProgramFetched
      }),
    }
  )
);