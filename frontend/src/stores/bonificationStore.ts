import { create } from "zustand"
import type { ColporterBonificationStatus } from "../types"
import { api } from "../api"
import { useProgramStore } from "./programStore"

interface BonificationState {
  bonificationStatus: ColporterBonificationStatus | null
  allColporterStatuses: ColporterBonificationStatus[]
  isLoading: boolean
  error: string | null
  wereBonificationsFetched: boolean
  availablePrograms: any[]
  selectedPrograms: number[]
  bonificationConfig: { selectedProgramIds: number[]; isDefault: boolean } | null
}

interface BonificationStore extends BonificationState {
  fetchBonificationStatus: (userId: string, user?: string) => Promise<void>
  fetchAllColporterStatuses: () => Promise<void>
  fetchAvailablePrograms: () => Promise<void>
  fetchBonificationConfig: () => Promise<void>
  updateBonificationConfig: (programIds: number[]) => Promise<void>
  setSelectedPrograms: (programIds: number[]) => void
  resetStore: () => void
}

// Bonification levels configuration
const BONIFICATION_LEVELS = {
  SILVER: {
    requiredHours: 280,
    requiredAmount: 3480,
    rewardAmount: 1496,
  },
  GOLD: {
    requiredHours: 320,
    requiredAmount: 4800,
    rewardAmount: 2160,
  },
}

export const useBonificationStore = create<BonificationStore>((set, get) => ({
  bonificationStatus: null,
  allColporterStatuses: [],
  isLoading: false,
  error: null,
  wereBonificationsFetched: false,
  availablePrograms: [],
  selectedPrograms: [],
  bonificationConfig: null,
  fetchBonificationStatus: async (userId: string, user?: string) => {
    set({ isLoading: true, error: null })
    try {
      // Use the API endpoint that respects admin configuration
      const params: Record<string, string | number> = {
        type: user ? 'user' : 'person'
      }

      // Get bonification status from the API (respects admin configuration)
      const bonificationStatus = await api.get(`/bonifications/status/${userId}`, { params })
      
      set({
        bonificationStatus,
        isLoading: false,
        wereBonificationsFetched: true,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      })
    }
  },

  fetchAllColporterStatuses: async () => {
    set({ isLoading: true, error: null })
    try {
      // Get all colporter bonifications from the backend
      // The backend will handle the program filtering and cross-program calculations
      const statuses = await api.get('/bonifications/all')

      set({
        allColporterStatuses: statuses || [],
        isLoading: false,
        wereBonificationsFetched: true,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      })
    }
  },

  fetchAvailablePrograms: async () => {
    set({ isLoading: true, error: null })
    try {
      const programs = await api.get('/bonifications/programs')
      set({ 
        availablePrograms: programs || [],
        isLoading: false 
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false
      })
    }
  },

  fetchBonificationConfig: async () => {
    set({ isLoading: true, error: null })
    try {
      const config = await api.get('/bonifications/config')
      set({ 
        bonificationConfig: config,
        selectedPrograms: config.selectedProgramIds || [],
        isLoading: false 
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false
      })
    }
  },

  updateBonificationConfig: async (programIds: number[]) => {
    set({ isLoading: true, error: null })
    try {
      await api.put('/bonifications/config', { 
        selectedProgramIds: programIds 
      })
      
      set({ 
        selectedPrograms: programIds,
        bonificationConfig: { selectedProgramIds: programIds, isDefault: false },
        isLoading: false 
      })
      
      // Refresh bonifications after updating config
      await get().fetchAllColporterStatuses()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false
      })
      throw error
    }
  },

  setSelectedPrograms: (programIds: number[]) => {
    set({ selectedPrograms: programIds })
  },

  resetStore: () => {
    set({
      bonificationStatus: null,
      allColporterStatuses: [],
      availablePrograms: [],
      selectedPrograms: [],
      bonificationConfig: null,
      isLoading: false,
      error: null,
      wereBonificationsFetched: false,
    })
  },
}))

// Helper function to calculate bonification status
function calculateBonificationStatus(
  name: string,
  id: string,
  currentHours: number,
  currentNetAmount: number,
): ColporterBonificationStatus {
  // Calculate silver progress
  const silverHoursProgress = Math.min(100, (currentHours / BONIFICATION_LEVELS.SILVER.requiredHours) * 100)
  const silverAmountProgress = Math.min(100, (currentNetAmount / BONIFICATION_LEVELS.SILVER.requiredAmount) * 100)
  const silverAchieved =
    currentHours >= BONIFICATION_LEVELS.SILVER.requiredHours &&
    currentNetAmount >= BONIFICATION_LEVELS.SILVER.requiredAmount

  // Calculate gold progress
  const goldHoursProgress = Math.min(100, (currentHours / BONIFICATION_LEVELS.GOLD.requiredHours) * 100)
  const goldAmountProgress = Math.min(100, (currentNetAmount / BONIFICATION_LEVELS.GOLD.requiredAmount) * 100)
  const goldAchieved =
    currentHours >= BONIFICATION_LEVELS.GOLD.requiredHours &&
    currentNetAmount >= BONIFICATION_LEVELS.GOLD.requiredAmount

  // Determine next target
  let nextTarget: "SILVER" | "GOLD" | "COMPLETED"
  if (goldAchieved) {
    nextTarget = "COMPLETED"
  } else if (silverAchieved) {
    nextTarget = "GOLD"
  } else {
    nextTarget = "SILVER"
  }

  return {
    colporterId: id,
    colporterName: name,
    currentHours,
    currentNetAmount,
    silverStatus: {
      achieved: silverAchieved,
      hoursProgress: silverHoursProgress,
      amountProgress: silverAmountProgress,
      hoursRemaining: Math.max(0, BONIFICATION_LEVELS.SILVER.requiredHours - currentHours),
      amountRemaining: Math.max(0, BONIFICATION_LEVELS.SILVER.requiredAmount - currentNetAmount),
    },
    goldStatus: {
      achieved: goldAchieved,
      hoursProgress: goldHoursProgress,
      amountProgress: goldAmountProgress,
      hoursRemaining: Math.max(0, BONIFICATION_LEVELS.GOLD.requiredHours - currentHours),
      amountRemaining: Math.max(0, BONIFICATION_LEVELS.GOLD.requiredAmount - currentNetAmount),
    },
    nextTarget,
  }
}
