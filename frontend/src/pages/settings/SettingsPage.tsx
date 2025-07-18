import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Moon, 
  Sun, 
  Check,
  ChevronRight,
  Building,
  Badge
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useSettingsStore } from '../../stores/settingsStore';
import { useProgramStore } from '../../stores/programStore';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { clsx } from 'clsx';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { settings, changeLanguage, changeTheme } = useSettingsStore();
  const { program, availablePrograms, fetchAvailablePrograms } = useProgramStore();
  const { user } = useAuthStore();
  
  // Sync i18n with store on component mount
  useEffect(() => {
    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
    
    // Fetch available programs if user is admin
    if (user?.role === UserRole.ADMIN) {
      fetchAvailablePrograms();
    }
  }, [i18n, settings.language, user, fetchAvailablePrograms]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const themes = [
    { code: 'light', name: t('settings.lightTheme'), icon: <Sun size={18} /> },
    { code: 'dark', name: t('settings.darkTheme'), icon: <Moon size={18} /> },
  ];

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="text-primary-600" size={28} />
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('settings.subtitle')}
        </p>
      </div>

      {user && (
        <Card title="Program Selection" icon={<Building size={20} />}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select which program you want to work with. This will affect all data displayed throughout the application.
            </p>
            
            <div className="space-y-3">
              {program && (
                <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-primary-800">{program.name}</h3>
                      <p className="text-xs text-primary-600 mt-1">
                        {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={() => navigate('/program-select')}
                leftIcon={<Building size={18} />}
                className="w-full"
              >
                {program ? t('common.switchProgram') : t('common.selectProgram')}
              </Button>
              
              {availablePrograms && availablePrograms.length > 0 && (
                <div className="text-xs text-gray-500">
                  {availablePrograms.length} program{availablePrograms.length !== 1 ? 's' : ''} available
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

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
      
      <div className="text-xs text-center text-gray-500 mt-4 pb-16 md:pb-0">
        &copy; {new Date().getFullYear()} Reach UAA - Developed by Wilmer Buten
      </div>
    </div>
  );
};

export default SettingsPage;