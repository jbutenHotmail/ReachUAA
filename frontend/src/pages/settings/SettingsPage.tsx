import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Moon, 
  Sun, 
  Bell, 
  Check,
  ChevronRight
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { useSettingsStore } from '../../stores/settingsStore';
import { clsx } from 'clsx';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, changeLanguage, changeTheme, toggleNotifications } = useSettingsStore();
  
  // Sync i18n with store on component mount
  useEffect(() => {
    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [i18n, settings.language]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const themes = [
    { code: 'light', name: t('settings.lightTheme'), icon: <Sun size={18} /> },
    { code: 'dark', name: t('settings.darkTheme'), icon: <Moon size={18} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="text-primary-600" size={28} />
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Language Settings */}
      <Card title={t('settings.language')} icon={<Globe size={20} />}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('settings.languageDescription')}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={clsx(
                  'flex items-center justify-between p-4 rounded-lg border transition-colors',
                  settings.language === language.code
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-primary-200 hover:bg-primary-50/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                </div>
                {settings.language === language.code && (
                  <Check size={20} className="text-primary-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Theme Settings */}
      <Card title={t('settings.theme')} icon={<Sun size={20} />}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('settings.themeDescription')}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.code}
                onClick={() => changeTheme(theme.code)}
                className={clsx(
                  'flex items-center justify-between p-4 rounded-lg border transition-colors',
                  settings.theme === theme.code
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-primary-200 hover:bg-primary-50/30'
                )}
              >
                <div className="flex items-center gap-3">
                  {theme.icon}
                  <span className="font-medium">{theme.name}</span>
                </div>
                {settings.theme === theme.code && (
                  <Check size={20} className="text-primary-600" />
                )}
              </button>
            ))}
          </div>
          
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-700">
              <strong>Note:</strong> {t('settings.themeNote')}
            </p>
          </div>
        </div>
      </Card>

      {/* Account Settings Link */}
      <Card>
        <button
          onClick={() => window.location.href = '/profile'}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div>
            <h3 className="font-medium text-gray-900">{t('profile.title')}</h3>
            <p className="text-sm text-gray-500">{t('settings.accountSettingsDescription')}</p>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </Card>
    </div>
  );
};

export default SettingsPage;