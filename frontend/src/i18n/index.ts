import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en';
import esTranslation from './locales/es';

// Get stored language preference or default to Spanish
const getStoredLanguage = () => {
  try {
    const settingsJson = localStorage.getItem('settings-storage');
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      if (settings.state && settings.state.settings && settings.state.settings.language) {
        return settings.state.settings.language;
      }
    }
  } catch (error) {
    console.error('Error reading stored language preference:', error);
  }
  return 'es'; // Default language
};

// Configure i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      es: {
        translation: esTranslation,
      },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;