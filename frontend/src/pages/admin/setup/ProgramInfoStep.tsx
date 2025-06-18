import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, BookText } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import ImageUpload from '../../../components/ui/ImageUpload';

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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      onChange({ logo: undefined });
    }
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
    { id: 'monday', label: t('programSettings.days.monday') },
    { id: 'tuesday', label: t('programSettings.days.tuesday') },
    { id: 'wednesday', label: t('programSettings.days.wednesday') },
    { id: 'thursday', label: t('programSettings.days.thursday') },
    { id: 'friday', label: t('programSettings.days.friday') },
    { id: 'saturday', label: t('programSettings.days.saturday') },
    { id: 'sunday', label: t('programSettings.days.sunday') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="text-primary-600" size={24} />
          {t('programSettings.programInformation')}
        </h2>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!isFormValid()}
        >
          {t('common.next')}
        </Button>
      </div>

      <p className="text-gray-600">
        {t('programSettings.noteProgramInformation')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Details */}
        <div className="lg:col-span-2">
          <Card>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <Input
                  label={t('programSettings.programName')}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t('programSettings.programNamePlaceholder')}
                />
                
                <Input
                  label={t('confirmationStep.motto')}
                  name="motto"
                  value={formData.motto}
                  onChange={handleChange}
                  placeholder={t('programSettings.mottoPlaceholder')}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('programSettings.startDate')}
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                  
                  <Input
                    label={t('programSettings.endDate')}
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <Input
                  label={t('confirmationStep.financialGoal')}
                  type="number"
                  name="goal"
                  value={formData.goal || ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  placeholder={t('programSettings.financialGoalPlaceholder')}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Logo Upload */}
        <div className="lg:col-span-1">
          <Card title={t('programSettings.programLogo')} icon={<BookText size={20} />}>
            <div className="space-y-4">
              <ImageUpload
                value={formData.logo}
                onChange={handleLogoChange}
                className="w-full"
              />
              <p className="text-sm text-gray-500 text-center">
                {t('programSettings.programLogoDescription')}
              </p>
            </div>
          </Card>
        </div>

        {/* Working Days */}
        <div className="lg:col-span-3">
          <Card title={t('programSettings.workingDays')} icon={<Calendar size={20} />}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('programSettings.workingDaysDescription')}
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
                    {day.label}
                  </label>
                ))}
              </div>
              
              <div className="p-4 bg-primary-50 rounded-lg mt-4">
                <p className="text-sm text-primary-700">
                  <strong>{t('programSettings.importantNotes')}:</strong> {t('programSettings.workingDaysNote')}
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