import { create } from 'zustand';
import { BibleStudy, Municipality, Country } from '../types';
import { api } from '../api';
import { useProgramStore } from './programStore';

interface BibleStudyState {
  bibleStudies: BibleStudy[];
  municipalities: Municipality[];
  countries: Country[];
  isLoading: boolean;
  error: string | null;
  wereBibleStudiesFetched: boolean;
  wereMunicipalitiesFetched: boolean;
  wereCountriesFetched: boolean;
}

interface BibleStudyStore extends BibleStudyState {
  fetchBibleStudies: () => Promise<void>;
  fetchMunicipalities: (countryId?: number) => Promise<void>;
  fetchCountries: () => Promise<void>;
  createBibleStudy: (study: Omit<BibleStudy, 'id' | 'colporterId' | 'colporterName' | 'createdAt' | 'updatedAt' | 'programId'>) => Promise<void>;
  updateBibleStudy: (id: string, study: Partial<BibleStudy>) => Promise<void>;
  deleteBibleStudy: (id: string) => Promise<void>;
  resetStore: () => void;
}

export const useBibleStudyStore = create<BibleStudyStore>((set) => ({
  bibleStudies: [],
  municipalities: [],
  countries: [],
  isLoading: false,
  error: null,
  wereBibleStudiesFetched: false,
  wereMunicipalitiesFetched: false,
  wereCountriesFetched: false,

  fetchBibleStudies: async () => {
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
      
      const bibleStudies = await api.get<BibleStudy[]>('/bible-studies', { params });
      set({ bibleStudies, isLoading: false, wereBibleStudiesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  fetchMunicipalities: async (countryId) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string | number> = {};
      if (countryId) {
        params.countryId = countryId;
      }
      
      const municipalities = await api.get<Municipality[]>('/bible-studies/locations/municipalities', { params });
      set({ municipalities, isLoading: false, wereMunicipalitiesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  fetchCountries: async () => {
    set({ isLoading: true, error: null });
    try {
      const countries = await api.get<Country[]>('/bible-studies/locations/countries');
      set({ countries, isLoading: false, wereCountriesFetched: true });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false 
      });
    }
  },

  createBibleStudy: async (studyData) => {
    set({ isLoading: true, error: null });
    try {
      // Get current program ID
      const { program } = useProgramStore.getState();
      const programId = program?.id;
      
      // Add program ID to study data
      const dataWithProgram = {
        ...studyData,
        programId: studyData.programId || programId
      };
      
      const newStudy = await api.post<BibleStudy>('/bible-studies', dataWithProgram);
      set(state => ({
        bibleStudies: [...state.bibleStudies, newStudy],
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

  updateBibleStudy: async (id, studyData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStudy = await api.put<BibleStudy>(`/bible-studies/${id}`, studyData);
      set(state => ({
        bibleStudies: state.bibleStudies.map(s => 
          s.id === id ? updatedStudy : s
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

  deleteBibleStudy: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/bible-studies/${id}`);
      set(state => ({
        bibleStudies: state.bibleStudies.filter(s => s.id !== id),
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

  // Reset store method
  resetStore: () => {
    set({
      bibleStudies: [],
      municipalities: [],
      countries: [],
      isLoading: false,
      error: null,
      wereBibleStudiesFetched: false,
      wereMunicipalitiesFetched: false,
      wereCountriesFetched: false
    });
  }
}));