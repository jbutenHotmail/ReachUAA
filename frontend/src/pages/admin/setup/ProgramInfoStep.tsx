import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, BookText, Globe } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import ImageUpload from '../../../components/ui/ImageUpload';
import { useSettingsStore } from '../../../stores/settingsStore';

// Import logo
import logoReach from '../../../assets/logo_reach_1.webp';
interface ProgramFormData {
  name: string;
  motto: string;
  startDate: string;
  endDate: string;
  goal: number;
  workingDays: string[];
  logo?: string;
}

interface ProgramInfoStepProps {
  formData: ProgramFormData;
  onChange: (data: Partial<ProgramFormData>) => void;
  onNext: () => void;
}

const ProgramInfoStep: React.FC<ProgramInfoStepProps> = ({ 
  formData, 
  onChange, 
  onNext 
}) => {
  const { t } = useTranslation();
  const { settings, changeLanguage } = useSettingsStore();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    onChange({ [name]: type === 'number' ? parseFloat(value) : value });
  };

  const handleWorkingDaysChange = (day: string) => {
    const currentDays = [...formData.workingDays];
    if (currentDays.includes(day)) {
      onChange({ workingDays: currentDays.filter(d => d !== day) });
    } else {
      onChange({ workingDays: [...currentDays, day] });
    }
  };

  const handleLogoChange = (file: File | null) => {
    // File handling is now done by ImageUpload component
  };

  const handleLogoUpload = (url: string) => {
    onChange({ logo: url });
  };

  const toggleLanguage = () => {
    const newLang = settings.language === 'en' ? 'es' : 'en';
    changeLanguage(newLang);
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.startDate !== '' &&
      formData.endDate !== '' &&
      formData.goal > 0 &&
      formData.workingDays.length > 0
    );
  };

  const days = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={logoReach} 
            alt={t('common.logoAlt')} 
            className="h-12 w-auto"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="text-primary-600" size={24} />
              Program Information
            </h2>
          </div>
        </div>
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
            variant="primary"
            onClick={onNext}
            disabled={!isFormValid()}
          >
            Next
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        Enter the basic information about your colportage program.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Details */}
        <div className="lg:col-span-2">
          <Card>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <Input
                  label="Program Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Summer Colportage Program 2025"
                />
                
                <Input
                  label="Program Motto (Optional)"
                  name="motto"
                  value={formData.motto}
                  onChange={handleChange}
                  placeholder="Reaching hearts and minds through literature"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                  
                  <Input
                    label="End Date"
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <Input
                  label="Financial Goal ($)"
                  type="number"
                  name="goal"
                  value={formData.goal || ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  placeholder="100000"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Logo Upload */}
        <div className="lg:col-span-1">
          <Card title="Program Logo" icon={<BookText size={20} />}>
            <div className="space-y-4">
              <ImageUpload
                value={formData.logo}
                onChange={handleLogoChange}
                onUpload={handleLogoUpload}
                uploadEndpoint="/upload/program-logo"
                className="w-full"
              />
              <p className="text-sm text-gray-500 text-center">
                Upload a logo for your program (optional)
              </p>
            </div>
          </Card>
        </div>

        {/* Working Days */}
        <div className="lg:col-span-3">
          <Card title="Working Days" icon={<Calendar size={20} />}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select the days of the week that will be working days in your program.
              </p>
              
              <div className="flex flex-wrap gap-3">
                {days.map((day) => (
                  <label
                    key={day.id}
                    className={`flex items-center justify-center px-4 py-2 rounded-md border cursor-pointer transition-colors ${
                      formData.workingDays.includes(day.id)
                        ? 'bg-primary-100 border-primary-300 text-primary-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.workingDays.includes(day.id)}
                      onChange={() => handleWorkingDaysChange(day.id)}
                    />
                    {t(`programSettings.days.${day.id}`)}
                  </label>
                ))}
              </div>
              
              <div className="p-4 bg-primary-50 rounded-lg mt-4">
                <p className="text-sm text-primary-700">
                  <strong>Note:</strong> Working days will be used to calculate program statistics and financial projections. 
                  You can override specific dates later in the program settings.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProgramInfoStep;