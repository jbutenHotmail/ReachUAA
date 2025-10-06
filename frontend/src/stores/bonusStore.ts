import { create } from "zustand";
import { api } from "../api";

interface Bonus {
  id: number;
  program_id: number;
  person_id: number;
  person_name: string;
  program_name: string;
  amount: number;
  description: string | null;
  bonus_date: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface BonusState {
  bonuses: Bonus[];
  isLoading: boolean;
  error: string | null;
  wereBonusesFetched: boolean;
}

interface BonusStore extends BonusState {
  fetchBonuses: (programId?: number) => Promise<void>;
  createBonus: (data: {
    program_id: number;
    person_id: number;
    amount: number;
    description?: string;
    bonus_date: string;
  }) => Promise<Bonus>;
  updateBonus: (
    id: number,
    data: {
      amount?: number;
      description?: string;
      bonus_date?: string;
    }
  ) => Promise<Bonus>;
  deleteBonus: (id: number) => Promise<void>;
  resetStore: () => void;
}

const initialState: BonusState = {
  bonuses: [],
  isLoading: false,
  error: null,
  wereBonusesFetched: false,
};

export const useBonusStore = create<BonusStore>((set, get) => ({
  ...initialState,

  fetchBonuses: async (programId?: number) => {
    set({ isLoading: true, error: null });

    try {
      const params = programId ? { programId } : {};
      const data = await api.get<Bonus[]>("/bonuses", { params });

      set({
        bonuses: data,
        isLoading: false,
        wereBonusesFetched: true,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar los bonos",
        isLoading: false,
      });
      throw error;
    }
  },

  createBonus: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const newBonus = await api.post<Bonus>("/bonuses", data);

      set((state) => ({
        bonuses: [...state.bonuses, newBonus],
        isLoading: false,
        error: null,
      }));

      return newBonus;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al crear el bono",
        isLoading: false,
      });
      throw error;
    }
  },

  updateBonus: async (id, data) => {
    set({ isLoading: true, error: null });

    try {
      const updatedBonus = await api.put<Bonus>(`/bonuses/${id}`, data);

      set((state) => ({
        bonuses: state.bonuses.map((bonus) => (bonus.id === id ? updatedBonus : bonus)),
        isLoading: false,
        error: null,
      }));

      return updatedBonus;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al actualizar el bono",
        isLoading: false,
      });
      throw error;
    }
  },

  deleteBonus: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await api.delete(`/bonuses/${id}`);

      set((state) => ({
        bonuses: state.bonuses.filter((bonus) => bonus.id !== id),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al eliminar el bono",
        isLoading: false,
      });
      throw error;
    }
  },

  resetStore: () => {
    set(initialState);
  },
}));
