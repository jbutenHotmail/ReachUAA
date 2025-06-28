import { create } from 'zustand';
import { Charge } from '../types';
import { api } from '../api';
import { useProgramStore } from './programStore';

interface ChargeState {
  charges: Charge[];
  isLoading: boolean;
  error: string | null;
  wereChargesFetched: boolean;
}

interface ChargeStore extends ChargeState {
  fetchCharges: () => Promise<void>;
  createCharge: (charge: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCharge: (id: string, charge: Partial<Charge>) => Promise<void>;
  deleteCharge: (id: string) => Promise<void>;
  applyCharge: (id: string) => Promise<void>;
  cancelCharge: (id: string) => Promise<void>;
  resetStore: () => void;
}

export const useChargeStore = create<ChargeStore>((set) => ({
  charges: [],
  isLoading: false,
  error: null,
  wereChargesFetched: false,

  fetchCharges: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program filter if available
      const params: Record<string, string | number> = {};
      if (programId) {
        params.programId = programId;
      }
      
      const charges = await api.get<Charge[]>('/charges', { params });
      set({ charges, isLoading: false, wereChargesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  createCharge: async (chargeData) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to charge data
      const dataWithProgram = {
        ...chargeData,
        programId: chargeData.programId || programId
      };
      
      const newCharge = await api.post<Charge>('/charges', dataWithProgram);
      set(state => ({
        charges: [...state.charges, newCharge],
        isLoading: false,
        wereChargesFetched: true
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  updateCharge: async (id, chargeData) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to charge data if not already present
      const dataWithProgram = {
        ...chargeData,
        programId: chargeData.programId || programId
      };
      
      const updatedCharge = await api.put<Charge>(`/charges/${id}`, dataWithProgram);
      set(state => ({
        charges: state.charges.map(c => 
          c.id === id 
            ? updatedCharge
            : c
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteCharge: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/charges/${id}`);
      set(state => ({
        charges: state.charges.filter(c => c.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  applyCharge: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { charge } = await api.patch<{ message: string; charge: Charge }>(`/charges/${id}/apply`);
      set(state => ({
        charges: state.charges.map(c => 
          c.id === id 
            ? charge
            : c
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },

  cancelCharge: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { charge } = await api.patch<{ message: string; charge: Charge }>(`/charges/${id}/cancel`);
      set(state => ({
        charges: state.charges.map(c => 
          c.id === id 
            ? charge
            : c
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
      throw error;
    }
  },
  resetStore: () => {
  set({
    charges: [],
    isLoading: false,
    error: null,
    wereChargesFetched: false
  });
}
}));