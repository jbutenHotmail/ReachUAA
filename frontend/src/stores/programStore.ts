import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api';
import { ProgramConfig } from '../types';

interface ProgramState {
  program: ProgramConfig | null;
  isLoading: boolean;
  error: string | null;
}

interface ProgramStore extends ProgramState {
  createProgram: (programData: any) => Promise<void>;
  updateProgram: (id: number, programData: any) => Promise<void>;
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