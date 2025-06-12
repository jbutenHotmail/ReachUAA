import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProgramBook } from '../types';
import { api } from '../api';

interface WorkingDay {
  id: number;
  program_id: number;
  day_of_week: string;
  is_working_day: number;
}

interface CustomDay {
  // Add properties if customDays has data in the future
  id?: number;
  program_id?: number;
  // Add other relevant fields based on future data
}

interface ProgramConfig {
  id: number;
  name: string;
  motto: string;
  start_date: string;
  end_date: string;
  financial_goal: string;
  logo_url: string | null;
  is_active: number;
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
  isLoading: boolean;
  error: string | null;
}

interface ProgramStore extends ProgramState {
  createProgram: (programData: any) => Promise<void>;
  updateProgram: (id: string, programData: any) => Promise<void>;
  fetchProgram: () => Promise<void>;
}

export const useProgramStore = create<ProgramStore>()(
  persist(
    (set, get) => ({
      program: null,
      isLoading: false,
      error: null,

      createProgram: async (programData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/program', programData);
          console.log(response);
          set({ 
            program: response.program, 
            isLoading: false 
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
          console.log(response);
          set({ 
            program: response?.program || null, 
            isLoading: false 
          });
        } catch (error) {
          // If 404, it means no program exists yet
          if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
            set({ program: null, isLoading: false });
            return;
          }
          
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred', 
            isLoading: false 
          });
        }
      },

    }),
    {
      name: 'program-storage',
      partialize: (state) => ({ program: state.program }),
    }
  )
);