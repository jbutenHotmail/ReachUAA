import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProgramBook } from '../types';
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
  workingDays: {
    id: number;
    program_id: number;
    day_of_week: string;
    is_working_day: number | boolean;
  }[];
  customDays: {
    id: number;
    program_id: number;
    date: string;
    is_working_day: number | boolean;
  }[];
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
          console.log(response);
          set({ 
            program: response.program, 
            isLoading: false,
            wasProgramFetched: true
          });
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
          set({ 
            program: response?.program || null, 
            isLoading: false,
            wasProgramFetched: true
          });
        } catch (error) {
          // If 404, it means no program exists yet
          if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
            set({ program: null, isLoading: false, wasProgramFetched: true });
            return;
          }
          
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
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
          set({ 
            program: response.program, 
            isLoading: false,
            wasProgramFetched: true
          });
          
          // Reload the page to refresh all data
          window.location.href = '/dashboard';
        } catch (error) {
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
      partialize: (state) => ({ program: state.program }),
    }
  )
);