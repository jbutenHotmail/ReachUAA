import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, Percent, AlertCircle, Users } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import { LeaderPercentage, Person } from '../../../types';

interface AddLeaderPercentageFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: LeaderPercentage;
  availableLeaders: Person[];
  defaultPercentage: number;
}

const AddLeaderPercentageForm: React.FC<AddLeaderPercentageFormProps> = ({
  onClose,
  onSubmit,
  initialData,
  availableLeaders,
  defaultPercentage
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    leaderId: initialData?.leaderId || '',
    leaderName: initialData?.leaderName || '',
    percentage: initialData?.percentage || defaultPercentage,
    isActive: initialData?.isActive !== false,
  });

  // Leader selection state
  const [leaderSearch, setLeaderSearch] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<{ id: string; name: string } | null>(
    initialData?.leaderId && initialData?.leaderName 
      ? { id: initialData.leaderId, name: initialData.leaderName }
      : null
  );
  const [isLeaderDropdownOpen, setIsLeaderDropdownOpen] = useState(false);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leaderDropdownRef.current && !leaderDropdownRef.current.contains(event.target as Node)) {
        setIsLeaderDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredLeaders = availableLeaders.filter((leader) =>
    `${leader.name} ${leader.apellido}`.toLowerCase().includes(leaderSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      leaderId: selectedLeader?.id,
      leaderName: selectedLeader?.name,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               name === 'percentage' ? parseFloat(value) || 0 : value,
    }));
  };

  // Calculate impact on program distribution
  const calculateDistributionImpact = () => {
    if (!selectedLeader && !initialData) return null;
    
    // Simulate what would happen with this percentage
    const colporterPercentage = 50; // From program config
    const newLeaderPercentage = formData.percentage;
    
    // Calculate remaining for program
    const programPercentage = 100 - colporterPercentage - newLeaderPercentage;
    
    return {
      colporterPercentage,
      leaderPercentage: newLeaderPercentage,
      programPercentage,
      isExcessive: programPercentage < 0,
      isLow: programPercentage < 10
    };
  };

  const distributionImpact = calculateDistributionImpact();

  const percentageDifference = formData.percentage - defaultPercentage;
  const isHigherThanDefault = percentageDifference > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {t(initialData ? 'leaderPercentages.editFormTitle' : 'leaderPercentages.addFormTitle')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Leader Selection - Only for new percentages */}
              {!initialData && (
                <div className="relative" ref={leaderDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('leaderPercentages.selectLeader')}
                  </label>
                  <div
                    className={clsx(
                      'relative border border-gray-300 rounded-md shadow-sm',
                      isLeaderDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
                    )}
                  >
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder={t('leaderPercentages.searchLeaderPlaceholder')}
                        value={leaderSearch}
                        onChange={(e) => {
                          setLeaderSearch(e.target.value);
                          setIsLeaderDropdownOpen(true);
                          setSelectedLeader(null);
                        }}
                        onFocus={() => setIsLeaderDropdownOpen(true)}
                        className="w-full px-3 py-2 rounded-md border-0 focus:outline-none text-sm"
                      />
                      <button
                        type="button"
                        className="pr-2 flex items-center"
                        onClick={() => setIsLeaderDropdownOpen(!isLeaderDropdownOpen)}
                      >
                        <ChevronDown
                          className={clsx(
                            'w-5 h-5 text-gray-400 transition-transform duration-200',
                            isLeaderDropdownOpen && 'transform rotate-180'
                          )}
                        />
                      </button>
                    </div>
                    {selectedLeader && (
                      <div className="px-3 py-2 border-t border-gray-200 bg-primary-50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-primary-900 text-sm">
                            {selectedLeader.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeader(null);
                              setLeaderSearch('');
                            }}
                            className="p-1 hover:bg-primary-100 rounded-full"
                          >
                            <X className="w-4 h-4 text-primary-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isLeaderDropdownOpen && !selectedLeader && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                      <div className="max-h-60 overflow-y-auto py-1">
                        {filteredLeaders.length > 0 ? (
                          filteredLeaders.map((leader) => (
                            <button
                              key={leader.id}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                              onClick={() => {
                                setSelectedLeader({ 
                                  id: leader.id, 
                                  name: `${leader.name} ${leader.apellido}` 
                                });
                                setLeaderSearch('');
                                setIsLeaderDropdownOpen(false);
                              }}
                            >
                              <div className="font-medium text-sm">{leader.name} {leader.apellido}</div>
                              <div className="text-xs text-gray-500">{leader.institution}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {t('leaderPercentages.noLeadersFound')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Display selected leader info for editing */}
              {initialData && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success-100 flex items-center justify-center text-success-700">
                      <Users size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{initialData.leaderName}</p>
                      <p className="text-xs text-gray-500">ID: {initialData.leaderId}</p>
                    </div>
                    <Badge variant="success" size="sm">{t('leaderPercentages.leader')}</Badge>
                  </div>
                </div>
              )}

              {/* Percentage Input */}
              <div>
                <Input
                  label={t('leaderPercentages.earningsPercentage')}
                  type="number"
                  name="percentage"
                  value={formData.percentage || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  leftIcon={<Percent size={18} />}
                  required
                />
                
                {/* Comparison with default */}
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('leaderPercentages.globalPercentage')}:</span>
                    <Badge variant="secondary">{defaultPercentage}%</Badge>
                  </div>
                  
                  {percentageDifference !== 0 && (
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('common.difference')}:</span>
                      <div className={`flex items-center gap-1 ${
                        isHigherThanDefault ? 'text-success-600' : 'text-warning-600'
                      }`}>
                        <span className="text-sm font-medium">
                          {percentageDifference > 0 && '+'}
                          {percentageDifference.toFixed(1)}%
                        </span>
                        {isHigherThanDefault && <span className="text-xs">↑</span>}
                        {percentageDifference < 0 && <span className="text-xs">↓</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Status - Only for editing */}
              {initialData && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    {t('leaderPercentages.activePercentage')}
                  </label>
                </div>
              )}

              {/* Information Box */}
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-primary-700">
                    <p className="font-medium mb-2">{t('leaderPercentages.importantInfo')}:</p>
                    <ul className="space-y-1 text-xs">
                      <li>{t('leaderPercentages.percentageOverrideInfo', { percentage: defaultPercentage })}</li>
                      <li>{t('leaderPercentages.appliedToFutureEarnings')}</li>
                      <li>{t('leaderPercentages.teamSalesCalculation')}</li>
                      <li>{t('leaderPercentages.temporaryDeactivation')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Distribution Impact Warning */}
              {distributionImpact && (
                <div className={`p-4 border rounded-lg ${
                  distributionImpact.isExcessive 
                    ? 'bg-danger-50 border-danger-200' 
                    : distributionImpact.isLow 
                      ? 'bg-warning-50 border-warning-200'
                      : 'bg-success-50 border-success-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`flex-shrink-0 mt-0.5 ${
                      distributionImpact.isExcessive 
                        ? 'text-danger-600' 
                        : distributionImpact.isLow 
                          ? 'text-warning-600'
                          : 'text-success-600'
                    }`} size={20} />
                    <div className={`text-sm ${
                      distributionImpact.isExcessive 
                        ? 'text-danger-700' 
                        : distributionImpact.isLow 
                          ? 'text-warning-700'
                          : 'text-success-700'
                    }`}>
                      <p className="font-medium">
                        {t(distributionImpact.isExcessive 
                          ? 'leaderPercentages.excessiveDistribution' 
                          : distributionImpact.isLow 
                            ? 'leaderPercentages.lowProgramSurplus'
                            : 'leaderPercentages.balancedDistribution')}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p>{t('leaderPercentages.colporters')}: {distributionImpact.colporterPercentage}%</p>
                        <p>{t('leaderPercentages.thisLeader')}: {distributionImpact.leaderPercentage}%</p>
                        <p>{t('leaderPercentages.program')}: {distributionImpact.programPercentage}%</p>
                      </div>
                      {distributionImpact.isExcessive && (
                        <p className="mt-2 text-xs">
                          <strong>{t('common.problem')}:</strong> {t('leaderPercentages.excessiveDistributionIssue')}
                        </p>
                      )}
                      {distributionImpact.isLow && (
                        <p className="mt-2 text-xs">
                          <strong>{t('common.warning')}:</strong> {t('leaderPercentages.lowSurplusWarning', { percentage: distributionImpact.programPercentage })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  (!selectedLeader && !initialData) || 
                  (distributionImpact?.isExcessive)
                }
              >
                {t(initialData ? 'leaderPercentages.saveChanges' : 'leaderPercentages.createPercentage')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddLeaderPercentageForm;