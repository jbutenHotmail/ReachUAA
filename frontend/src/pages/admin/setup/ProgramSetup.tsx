import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProgramInfoStep from './ProgramInfoStep';
import FinancialConfigStep from './FinancialConfigStep';
import BookSetupStep from './BookSetupStep';
import PeopleSetupStep from './PeopleSetupStep';
import ConfirmationStep from './ConfirmationStep';
import { useProgramStore } from '../../../stores/programStore';
import { Book, Colporter, Leader } from '../../../types';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { X, AlertTriangle, Globe } from 'lucide-react';
import { useSettingsStore } from '../../../stores/settingsStore';

const ProgramSetup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createProgram } = useProgramStore();
  const { settings, changeLanguage } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    motto: '',
    startDate: '',
    endDate: '',
    goal: 100000,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    logo: '',
    colporterPercentage: 50,
    leaderPercentage: 15,
    colporterCashAdvancePercentage: 20,
    leaderCashAdvancePercentage: 25,
    books: [] as Book[],
    colporters: [] as Colporter[],
    leaders: [] as Leader[],
  });
  
  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };
  
  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };
  
  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };
  
  const handleCancel = () => {
    setShowCancelConfirmation(true);
  };
  
  const confirmCancel = () => {
    navigate('/program-select');
  };
  
  const toggleLanguage = () => {
    const newLang = settings.language === 'en' ? 'es' : 'en';
    changeLanguage(newLang);
  };
  
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await createProgram(formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating program:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while creating the program');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <LoadingScreen message={t('common.loading')} />
        ) : (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t('programSetup.title')}</h1>
                <div className="flex items-center gap-3">
                     <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            leftIcon={<Globe size={16} />}
          >
            {settings.language === 'en' ? 'Español' : 'English'}
          </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <div className="text-sm text-gray-500">
                    {t('common.step')} {currentStep} {t('common.of')} 5
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 relative">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-primary-600 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / 5) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div 
                      key={step}
                      className={`text-xs font-medium ${
                        step <= currentStep ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    >
                      {step === 1 && t('programSetup.programInfo')}
                      {step === 2 && t('programSetup.financialConfig')}
                      {step === 3 && t('programSetup.books')}
                      {step === 4 && t('programSetup.people')}
                      {step === 5 && t('programSetup.confirmation')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-danger-800">Error creating program</h3>
                    <p className="mt-1 text-sm text-danger-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 1 && (
              <ProgramInfoStep 
                formData={formData} 
                onChange={updateFormData} 
                onNext={handleNext} 
              />
            )}
            
            {currentStep === 2 && (
              <FinancialConfigStep 
                formData={formData} 
                onChange={updateFormData} 
                onNext={handleNext} 
                onBack={handleBack}
              />
            )}
            
            {currentStep === 3 && (
              <BookSetupStep 
                books={formData.books} 
                onBooksChange={(books) => updateFormData({ books })} 
                onNext={handleNext} 
                onBack={handleBack}
              />
            )}
            
            {currentStep === 4 && (
              <PeopleSetupStep 
                colporters={formData.colporters} 
                leaders={formData.leaders} 
                onColportersChange={(colporters) => updateFormData({ colporters })} 
                onLeadersChange={(leaders) => updateFormData({ leaders })} 
                onNext={handleNext} 
                onBack={handleBack}
              />
            )}
            
            {currentStep === 5 && (
              <ConfirmationStep 
                formData={formData} 
                onSubmit={handleSubmit} 
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}
            
            {/* Cancel Confirmation Modal */}
            {showCancelConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <Card>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-warning-500" size={24} />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Cancel Program Setup
                        </h3>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        Are you sure you want to cancel the program setup? All your progress will be lost.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          onClick={() => setShowCancelConfirmation(false)}
                          leftIcon={<X size={16} />}
                          className="w-full sm:w-auto"
                        >
                          No, Continue Setup
                        </Button>
                        <Button
                          variant="danger"
                          onClick={confirmCancel}
                          className="w-full sm:w-auto"
                        >
                          Yes, Cancel Setup
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            <div className="text-xs text-center text-gray-500 mt-8">
              &copy; {new Date().getFullYear()} Reach UAA - Developed by Wilmer Buten
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgramSetup;