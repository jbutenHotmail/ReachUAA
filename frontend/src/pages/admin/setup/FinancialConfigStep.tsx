import React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Percent, Calculator } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

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
}

interface FinancialConfigStepProps {
  formData: ProgramFormData;
  onChange: (data: Partial<ProgramFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const FinancialConfigStep: React.FC<FinancialConfigStepProps> = ({ 
  formData, 
  onChange, 
  onNext, 
  onBack 
}) => {
  const { t } = useTranslation();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: parseFloat(value) });
  };

  const isFormValid = () => {
    const totalPercentage = formData.colporterPercentage + formData.leaderPercentage;
    return (
      formData.colporterPercentage > 0 &&
      formData.leaderPercentage > 0 &&
      totalPercentage <= 100 &&
      formData.colporterCashAdvancePercentage > 0 &&
      formData.leaderCashAdvancePercentage > 0
    );
  };

  const programPercentage = 100 - formData.colporterPercentage - formData.leaderPercentage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="text-primary-600" size={24} />
          {t('programSetup.financialConfig')}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
          >
            {t('common.back')}
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            disabled={!isFormValid()}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        {t('programSetup.financialConfigDescription')}
      </p>

      <Card title={t('programSetup.revenueDistribution')} icon={<Calculator size={20} />}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('programSettings.colporterPercentage')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  name="colporterPercentage"
                  value={formData.colporterPercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  rightIcon={<Percent size={16} className="text-gray-400" />}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t('programSettings.colporterPercentageDescription')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('programSettings.leaderPercentage')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  name="leaderPercentage"
                  value={formData.leaderPercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  rightIcon={<Percent size={16} className="text-gray-400" />}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t('programSettings.leaderPercentageDescription')}
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">{t('common.program')}</span>
              <span className="text-sm font-bold text-gray-900">{programPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${programPercentage}%` }}></div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t('programSetup.programPercentageDescription')}
            </p>
          </div>
          
          {programPercentage < 0 && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
              {t('programSetup.totalExceeds100')}
            </div>
          )}
        </div>
      </Card>

      <Card title={t('programSetup.cashAdvances')} icon={<DollarSign size={20} />}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('programSettings.colporterCashAdvanceLimit')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  name="colporterCashAdvancePercentage"
                  value={formData.colporterCashAdvancePercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  rightIcon={<Percent size={16} className="text-gray-400" />}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t('programSettings.colporterCashAdvanceDescription')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('programSettings.leaderCashAdvanceLimit')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  name="leaderCashAdvancePercentage"
                  value={formData.leaderCashAdvancePercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  rightIcon={<Percent size={16} className="text-gray-400" />}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t('programSettings.leaderCashAdvanceDescription')}
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-primary-700">
              <strong>{t('programSetup.advanceExample')}</strong> {t('programSetup.advanceExampleDescription', {
                colporterPercentage: formData.colporterCashAdvancePercentage,
                leaderPercentage: formData.leaderCashAdvancePercentage
              })}
            </p>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={onBack}
        >
          {t('common.back')}
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!isFormValid()}
        >
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
};

export default FinancialConfigStep;