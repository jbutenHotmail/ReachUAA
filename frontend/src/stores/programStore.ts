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
import { useBibleStudyStore } from './bibleStudyStore';

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
  fetchProgram: (id?: number) => Promise<void>;
  fetchAvailablePrograms: () => Promise<void>;
  switchProgram: (programId: number) => Promise<void>;
  updateFinancialConfig: (id: number, configData: any) => Promise<void>;
  updateWorkingDay: (id: number, day: string, isWorkingDay: boolean) => Promise<void>;
  addCustomDay: (id: number, date: string, isWorkingDay: boolean) => Promise<void>;
  resetStore: () => void;
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
          
          // Update local state instead of fetching from API
          set(state => {
            if (state.program) {
              return {
                program: {
                  ...state.program,
                  ...programData,
                  updated_at: new Date().toISOString()
                },
                isLoading: false
              };
            }
            return { isLoading: false };
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
          throw error;
        }
      },

      fetchProgram: async (id?: number) => {
        set({ isLoading: true, error: null });
        try {
          let params; 
          id && (params = id);
          const response = params ? await api.get(`/program/${params}`) : await api.get('/program');
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
          // if (user?.role !== 'ADMIN') {
          //   set({ 
          //     availablePrograms: [], 
          //     isLoading: false
          //   });
          //   return;
          // }
          
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
          get().resetStore();
          
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
      resetStore: () => {
        // Reset program store state
        set({
          program: null,
          availablePrograms: null,
          isLoading: false,
          error: null,
          wasProgramFetched: false
        });
        
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
        
        // Reset bible study store
        const bibleStudyStore = useBibleStudyStore.getState();
        bibleStudyStore.resetStore && bibleStudyStore.resetStore();
      },

      // New method to update financial config
      updateFinancialConfig: async (id, configData) => {
        set({ isLoading: true, error: null });
        try {
          await api.put(`/program/${id}/financial-config`, configData);
          
          // Update local state instead of fetching from API
          set(state => {
            if (state.program) {
              return {
                program: {
                  ...state.program,
                  financialConfig: {
                    ...state.program.financialConfig,
                    ...configData
                  }
                },
                isLoading: false
              };
            }
            return { isLoading: false };
          });
          
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
          
          // Update local state instead of fetching from API
          set(state => {
            if (state.program && state.program.workingDays) {
              const updatedWorkingDays = state.program.workingDays.map(wd => 
                wd.day_of_week === day 
                  ? { ...wd, is_working_day: isWorkingDay }
                  : wd
              );
              
              return {
                program: {
                  ...state.program,
                  workingDays: updatedWorkingDays
                },
                isLoading: false
              };
            }
            return { isLoading: false };
          });
          
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
          const response = await api.post(`/program/${id}/custom-days`, { date, isWorkingDay });
          
          // Update local state instead of fetching from API
          set(state => {
            if (state.program && state.program.customDays) {
              // Check if this date already exists in customDays
              const existingCustomDayIndex = state.program.customDays.findIndex(
                cd => new Date(cd.date).toISOString().split('T')[0] === date
              );
              
              let updatedCustomDays;
              
              if (existingCustomDayIndex >= 0) {
                // Update existing custom day
                updatedCustomDays = state.program.customDays.map((cd, index) => 
                  index === existingCustomDayIndex
                    ? { ...cd, is_working_day: isWorkingDay }
                    : cd
                );
              } else {
                // Add new custom day
                const newCustomDay = {
                  id: response.id || Date.now(), // Use response ID if available, otherwise generate a temporary one
                  program_id: id,
                  date,
                  is_working_day: isWorkingDay
                };
                
                updatedCustomDays = [...state.program.customDays, newCustomDay];
              }
              
              return {
                program: {
                  ...state.program,
                  customDays: updatedCustomDays
                },
                isLoading: false
              };
            }
            return { isLoading: false };
          });
          
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