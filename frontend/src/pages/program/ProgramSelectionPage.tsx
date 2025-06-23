import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building, Calendar, DollarSign, ArrowRight, LogOut, Globe, Plus, ArrowLeft } from 'lucide-react';
import { useProgramStore } from '../../stores/programStore';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/ui/LoadingScreen';

const ProgramSelectionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { settings, changeLanguage } = useSettingsStore();
  const { program, availablePrograms, fetchAvailablePrograms, switchProgram } = useProgramStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  // Check if we're coming from the layout (not direct navigation)
  const isFromLayout = location.pathname === '/admin/programs' || location.pathname === '/program-select';
  const showBackButton = isFromLayout && program;

  useEffect(() => {
    const loadPrograms = async () => {
      setIsLoading(true);
      try {
        await fetchAvailablePrograms();
      } catch (err) {
        setError('Failed to load available programs');
        console.error('Error loading programs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrograms();
  }, [fetchAvailablePrograms]);

  // If there's only one program, automatically select it
  useEffect(() => {
    if (availablePrograms && availablePrograms.length === 1 && !program && !isFromLayout) {
      handleProgramSwitch(availablePrograms[0].id);
    }
  }, [availablePrograms, program, isFromLayout]);

  // If a program is already selected and we're not coming from the layout, redirect to dashboard
  useEffect(() => {
    if (program && !isFromLayout) {
      navigate('/dashboard');
    }
  }, [program, navigate, isFromLayout]);

  const handleProgramSwitch = async (programId: number) => {
    setSwitching(true);
    try {
      await switchProgram(programId);
      // Navigation will happen automatically in the useEffect above
    } catch (err) {
      setError('Failed to switch program');
      console.error('Error switching program:', err);
      setSwitching(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = settings.language === 'en' ? 'es' : 'en';
    changeLanguage(newLang);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  if (switching) {
    return <LoadingScreen message="Switching program..." />;
  }

  const renderAddNewProgramCard = () => (
    <Card className="border-dashed border-2 border-gray-300 hover:border-primary-300 transition-colors">
      <div className="flex flex-col items-center justify-center h-full py-8 cursor-pointer" onClick={() => navigate('/setup')}>
        <div className="bg-primary-100 rounded-full p-4 mb-4">
          <Plus size={32} className="text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{t('programSetup.addProgram')}</h3>
      </div>
    </Card>
  );

  if (!availablePrograms || availablePrograms.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-gray-50 to-primary-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center mb-6">
              <img src="/src/assets/logo_reach_1.webp" alt="Reach UAA" className="h-24 mb-3" />
            </div>
            
            {/* Language and Logout buttons */}
            <div className="absolute -top-4 right-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                leftIcon={<Globe size={16} />}
                className="bg-white"
              >
                {settings.language === 'en' ? 'Español' : 'English'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut size={16} />}
                className="bg-white"
              >
                {t('auth.logout')}
              </Button>
            </div>
          </div>
          
          {renderAddNewProgramCard()}
          
          <div className="text-xs text-center text-gray-500 mt-8">
            &copy; {new Date().getFullYear()} Reach UAA - Developed by Wilmer Buten
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-gray-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8 relative pt-12">
          <div className="flex flex-col items-center justify-center mb-6">
            <img src="/src/assets/logo_reach_1.webp" alt="Reach UAA" className="h-32 mb-8" />
            <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <Building className="text-primary-600" size={32} />
              {t('common.selectProgram')}
            </h1>
          </div>
          
          {/* Back button if coming from layout */}
          {showBackButton && (
            <div className="absolute -top-4 left-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                leftIcon={<ArrowLeft size={16} />}
                className="bg-white"
              >
                Back
              </Button>
            </div>
          )}
          
          {/* Language and Logout buttons */}
          <div className="absolute -top-4 right-0 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              leftIcon={<Globe size={16} />}
              className="bg-white"
            >
              {settings.language === 'en' ? 'Español' : 'English'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
              className="bg-white"
            >
              {t('auth.logout')}
            </Button>
          </div>
          
          <p className="mt-2 text-gray-600">
            {t('programSetup.welcomingMessage', { name: user?.name || '' })}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 mb-6">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availablePrograms.map((prog) => (
            <Card key={prog.id} className={`${Boolean(prog.is_active) ? 'border-primary-500 ring-2 ring-primary-100' : 'hover:border-gray-300'} transition-all`}>
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 truncate">{prog.name}</h3>
                  {Boolean(prog.is_active) && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {t('common.active')}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar size={16} className="mr-2 text-gray-400" />
                    <span>
                      {new Date(prog.start_date).toLocaleDateString()} - {new Date(prog.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {prog.motto && (
                    <p className="text-sm text-gray-600 italic">"{prog.motto}"</p>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign size={16} className="mr-2 text-gray-400" />
                    <span>Goal: ${Number(prog.financial_goal).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button
                    variant={Boolean(prog.is_active) ? "success" : "primary"}
                    onClick={() => handleProgramSwitch(prog.id)}
                    fullWidth
                    rightIcon={<ArrowRight size={16} />}
                  >
                    {Boolean(prog.is_active) 
                      ? "Continue with this Program" 
                      : "Select this Program"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Add New Program Card */}
          {renderAddNewProgramCard()}
        </div>
        
        <div className="text-xs text-center text-gray-500 mt-8">
          &copy; {new Date().getFullYear()} Reach UAA - Developed by Wilmer Buten
        </div>
      </div>
    </div>
  );
};

export default ProgramSelectionPage;