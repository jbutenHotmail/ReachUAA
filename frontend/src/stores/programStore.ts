import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProgramBook, WorkingDay, CustomDay } from '../types';
import { api } from '../api';

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
          console.log('Program created:', response);
          
          // Fetch the newly created program to get complete data
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
          console.log('Fetched program data:', response.financialConfig);
          
          if (response && response.financialConfig) {
            set({ 
              program: response, 
              isLoading: false,
              wasProgramFetched: true
            });
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
          const response = await api.post(`/program/switch/${programId}`);
          console.log('Switched to program:', response, response.program);
          
          if (response && response.program) {
            set({ 
              program: response, 
              isLoading: false,
              wasProgramFetched: true
            });
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