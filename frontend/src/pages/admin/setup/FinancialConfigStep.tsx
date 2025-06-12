import React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, PieChart } from 'lucide-react';
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

  const totalPercentage = formData.colporterPercentage + formData.leaderPercentage;
  const remainingPercentage = 100 - totalPercentage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="text-primary-600" size={24} />
          Financial Configuration
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        Configure the financial aspects of your program, including revenue distribution and cash advance limits.
      </p>

      <Card title="Revenue Distribution" icon={<PieChart size={20} />}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Colporter Percentage (%)"
              type="number"
              name="colporterPercentage"
              value={formData.colporterPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              required
              helperText="Percentage of sales that goes to colporters"
            />
            
            <Input
              label="Leader Percentage (%)"
              type="number"
              name="leaderPercentage"
              value={formData.leaderPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              required
              helperText="Percentage of sales that goes to leaders"
            />
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Distribution Summary</span>
              <span className="text-sm font-medium text-gray-700">100%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="flex h-2.5 rounded-full">
                <div 
                  className="bg-primary-600 h-2.5 rounded-l-full" 
                  style={{ width: `${formData.colporterPercentage}%` }}
                ></div>
                <div 
                  className="bg-success-600 h-2.5" 
                  style={{ width: `${formData.leaderPercentage}%` }}
                ></div>
                <div 
                  className="bg-gray-400 h-2.5 rounded-r-full" 
                  style={{ width: `${remainingPercentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary-600 rounded-full mr-1"></div>
                  <span className="text-gray-600">Colporters</span>
                </div>
                <span className="font-medium">{formData.colporterPercentage}%</span>
              </div>
              
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-success-600 rounded-full mr-1"></div>
                  <span className="text-gray-600">Leaders</span>
                </div>
                <span className="font-medium">{formData.leaderPercentage}%</span>
              </div>
              
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
                  <span className="text-gray-600">Program</span>
                </div>
                <span className="font-medium">{remainingPercentage}%</span>
              </div>
            </div>
            
            {totalPercentage > 100 && (
              <div className="mt-2 text-sm text-danger-600">
                Total distribution exceeds 100%. Please adjust the percentages.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title="Cash Advance Limits" icon={<DollarSign size={20} />}>
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Set the maximum percentage of weekly sales that can be requested as cash advances.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Colporter Cash Advance Limit (%)"
              type="number"
              name="colporterCashAdvancePercentage"
              value={formData.colporterCashAdvancePercentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              required
              helperText="Maximum percentage of weekly sales for colporter cash advances"
            />
            
            <Input
              label="Leader Cash Advance Limit (%)"
              type="number"
              name="leaderCashAdvancePercentage"
              value={formData.leaderCashAdvancePercentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              required
              helperText="Maximum percentage of weekly sales for leader cash advances"
            />
          </div>
          
          <div className="p-4 bg-primary-50 rounded-lg">
            <p className="text-sm text-primary-700">
              <strong>Example:</strong> With a 20% cash advance limit, a colporter with $1,000 in weekly sales can request up to $200 as a cash advance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FinancialConfigStep;