import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, BookText, DollarSign, Check, Users, LogOut } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useProgramStore } from '../../../stores/programStore';
import { useAuthStore } from '../../../stores/authStore';
import { Book, Colporter, Leader } from '../../../types';
import ProgramInfoStep from './ProgramInfoStep';
import FinancialConfigStep from './FinancialConfigStep';
import BookSetupStep from './BookSetupStep';
import PeopleSetupStep from './PeopleSetupStep';
import ConfirmationStep from './ConfirmationStep';

type SetupStep = 'info' | 'financial' | 'books' | 'people' | 'confirmation';

interface ProgramFormData {
  name: string;
  motto: string;
  startDate: string;
  endDate: string;
  goal: number;
  workingDays: string[];
  logo?: string;
  colporterPercentage: number;
  leaderPercentage: number;
  colporterCashAdvancePercentage: number;
  leaderCashAdvancePercentage: number;
  books: Book[];
  colporters: Colporter[];
  leaders: Leader[];
}

const ProgramSetup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createProgram, isLoading } = useProgramStore();
  const { logout } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('info');
  const [formData, setFormData] = useState<ProgramFormData>({
    name: '',
    motto: '',
    startDate: '',
    endDate: '',
    goal: 0,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    colporterPercentage: 50,
    leaderPercentage: 15,
    colporterCashAdvancePercentage: 20,
    leaderCashAdvancePercentage: 25,
    books: [],
    colporters: [],
    leaders: [],
  });

  const handleInfoChange = (data: Partial<ProgramFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleFinancialChange = (data: Partial<ProgramFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleBooksChange = (books: Book[]) => {
    setFormData(prev => ({ ...prev, books }));
  };

  const handleColportersChange = (colporters: Colporter[]) => {
    setFormData(prev => ({ ...prev, colporters }));
  };

  const handleLeadersChange = (leaders: Leader[]) => {
    setFormData(prev => ({ ...prev, leaders }));
  };

  const handleSubmit = async () => {
    try {
      await createProgram({
        name: formData.name,
        motto: formData.motto,
        startDate: formData.startDate,
        endDate: formData.endDate,
        goal: formData.goal,
        workingDays: formData.workingDays,
        logo: formData.logo,
        colporterPercentage: formData.colporterPercentage,
        leaderPercentage: formData.leaderPercentage,
        colporterCashAdvancePercentage: formData.colporterCashAdvancePercentage,
        leaderCashAdvancePercentage: formData.leaderCashAdvancePercentage,
        books: formData.books,
        colporters: formData.colporters,
        leaders: formData.leaders
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating program:', error);
    }
  };

  const handleLogout = () => {
    logout().then(() => {
      navigate('/login');
    });
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 'info':
        return (
          <ProgramInfoStep 
            formData={formData} 
            onChange={handleInfoChange} 
            onNext={() => setCurrentStep('financial')} 
          />
        );
      case 'financial':
        return (
          <FinancialConfigStep 
            formData={formData} 
            onChange={handleFinancialChange} 
            onNext={() => setCurrentStep('books')} 
            onBack={() => setCurrentStep('info')} 
          />
        );
      case 'books':
        return (
          <BookSetupStep 
            books={formData.books} 
            onBooksChange={handleBooksChange} 
            onNext={() => setCurrentStep('people')} 
            onBack={() => setCurrentStep('financial')} 
          />
        );
      case 'people':
        return (
          <PeopleSetupStep 
            colporters={formData.colporters}
            leaders={formData.leaders}
            onColportersChange={handleColportersChange}
            onLeadersChange={handleLeadersChange}
            onNext={() => setCurrentStep('confirmation')} 
            onBack={() => setCurrentStep('books')} 
          />
        );
      case 'confirmation':
        return (
          <ConfirmationStep 
            formData={formData} 
            onSubmit={handleSubmit} 
            onBack={() => setCurrentStep('people')} 
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="py-6 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <img 
                src="/src/assets/logo_reach_1.webp" 
                alt={t('common.logoAlt')} 
                className="h-20 w-30 object-contain"
              />
            </div>
            <div className="h-8 border-l border-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">{t('programSetup.title')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              leftIcon={<LogOut size={18} />}
            >
              {t('auth.logout')}
            </Button>
            <div className="hidden sm:flex items-center space-x-2">
              <div className={`flex items-center ${currentStep === 'info' || currentStep === 'financial' || currentStep === 'books' || currentStep === 'people' || currentStep === 'confirmation' ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'info' || currentStep === 'financial' || currentStep === 'books' || currentStep === 'people' || currentStep === 'confirmation' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                  <Calendar size={16} />
                </div>
                <span className="ml-2 text-sm font-medium">{t('programSetup.programInfo')}</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`flex items-center ${currentStep === 'financial' || currentStep === 'books' || currentStep === 'people' || currentStep === 'confirmation' ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'financial' || currentStep === 'books' || currentStep === 'people' || currentStep === 'confirmation' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                  <DollarSign size={16} />
                </div>
                <span className="ml-2 text-sm font-medium">{t('programSetup.financial')}</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`flex items-center ${currentStep === 'books' || currentStep === 'people' || currentStep === 'confirmation' ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'books' || currentStep === 'people' || currentStep === 'confirmation' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                  <BookText size={16} />
                </div>
                <span className="ml-2 text-sm font-medium">{t('programSetup.books')}</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`flex items-center ${currentStep === 'people' || currentStep === 'confirmation' ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'people' || currentStep === 'confirmation' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                  <Users size={16} />
                </div>
                <span className="ml-2 text-sm font-medium">{t('programSetup.people')}</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`flex items-center ${currentStep === 'confirmation' ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'confirmation' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                  <Check size={16} />
                </div>
                <span className="ml-2 text-sm font-medium">{t('programSetup.confirmation')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {getStepContent()}
        </div>
      </div>
    </div>
  );
};

export default ProgramSetup;