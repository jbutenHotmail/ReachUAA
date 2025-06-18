import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings } from '../types';
import i18n from '../i18n';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
}

interface SettingsStore extends SettingsState {
  updateSettings: (settings: Partial<AppSettings>) => void;
  changeLanguage: (language: string) => void;
  changeTheme: (theme: string) => void;
  toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: {
        language: 'es', // Default language
        theme: 'light', // Default theme
        notifications: true, // Default notifications setting
      },
      isLoading: false,
      error: null,

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));
      },

      changeLanguage: (language) => {
        // Change the i18n language
        i18n.changeLanguage(language);
        
        // Update the store
        set((state) => ({
          settings: {
            ...state.settings,
            language,
          },
        }));
      },

      changeTheme: (theme) => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme,
          },
        }));
      },

      toggleNotifications: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            notifications: !state.settings.notifications,
          },
        }));
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);