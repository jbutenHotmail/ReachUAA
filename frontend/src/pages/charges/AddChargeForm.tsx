// AddChargeForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { Charge } from '../../types';

interface AddChargeFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Charge;
}

const AddChargeForm: React.FC<AddChargeFormProps> = ({ 
  onClose, 
  onSubmit,
  initialData 
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { werePeopleFetched, fetchPeople, getLeaders, getColporters } = useUserStore();
  
  const [formData, setFormData] = React.useState({
    personId: initialData?.personId || '',
    personName: initialData?.personName || '',
    personType: initialData?.personType || 'COLPORTER',
    amount: initialData?.amount || 0,
    reason: initialData?.reason || '',
    description: initialData?.description || '',
    category: initialData?.category || 'FINE',
    status: initialData?.status || 'PENDING',
    appliedBy: user?.id || '',
    appliedByName: user?.name || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
  });

  // Person selection state
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(
    initialData?.personId && initialData?.personName 
      ? { id: initialData.personId, name: initialData.personName }
      : null
  );
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const personDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    !werePeopleFetched && fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(event.target as Node)) {
        setIsPersonDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const people = formData.personType === 'COLPORTER' ? getColporters() : getLeaders();
  
  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      personId: selectedPerson?.id,
      personName: selectedPerson?.name,
      status: 'PENDING',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));

    // Reset person selection when type changes
    if (name === 'personType') {
      setSelectedPerson(null);
      setPersonSearch('');
    }
  };

  const categories = [
    { value: 'FINE', label: t('addChargeForm.fine'), description: t('addChargeForm.fineDescription') },
    { value: 'DEDUCTION', label: t('addChargeForm.deduction'), description: t('addChargeForm.deductionDescription') },
    { value: 'PENALTY', label: t('addChargeForm.penalty'), description: t('addChargeForm.penaltyDescription') },
    { value: 'OTHER', label: t('addChargeForm.other'), description: t('addChargeForm.otherDescription') },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? t('addChargeForm.editTitle') : t('addChargeForm.addTitle')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label={t('addChargeForm.date')}
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('addChargeForm.personType')}
                </label>
                <select
                  name="personType"
                  value={formData.personType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  <option value="COLPORTER">{t('addChargeForm.colporter')}</option>
                  <option value="LEADER">{t('addChargeForm.leader')}</option>
                </select>
              </div>

              <div className="md:col-span-2 relative" ref={personDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('addChargeForm.selectPerson')} {formData.personType === 'COLPORTER' ? t('addChargeForm.colporter') : t('addChargeForm.leader')}
                </label>
                <div
                  className={clsx(
                    'relative border border-gray-300 rounded-md shadow-sm',
                    isPersonDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
                  )}
                >
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder={`${t('addChargeForm.searchPlaceholder')} ${formData.personType.toLowerCase()}...`}
                      value={personSearch}
                      onChange={(e) => {
                        setPersonSearch(e.target.value);
                        setIsPersonDropdownOpen(true);
                        setSelectedPerson(null);
                      }}
                      onFocus={() => setIsPersonDropdownOpen(true)}
                      className="w-full px-3 py-2 rounded-md border-0 focus:outline-none text-sm"
                    />
                    <button
                      type="button"
                      className="pr-2 flex items-center"
                      onClick={() => setIsPersonDropdownOpen(!isPersonDropdownOpen)}
                    >
                      <ChevronDown
                        className={clsx(
                          'w-5 h-5 text-gray-400 transition-transform duration-200',
                          isPersonDropdownOpen && 'transform rotate-180'
                        )}
                      />
                    </button>
                  </div>
                  {selectedPerson && (
                    <div className="px-3 py-2 border-t border-gray-200 bg-primary-50">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-primary-900 text-sm">
                          {selectedPerson.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPerson(null);
                            setPersonSearch('');
                          }}
                          className="p-1 hover:bg-primary-100 rounded-full"
                        >
                          <X className="w-4 h-4 text-primary-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {isPersonDropdownOpen && !selectedPerson && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                    <div className="max-h-60 overflow-y-auto py-1">
                      {filteredPeople.length > 0 ? (
                        filteredPeople.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                            onClick={() => {
                              setSelectedPerson({ id: person.id, name: person.name });
                              setPersonSearch('');
                              setIsPersonDropdownOpen(false);
                            }}
                          >
                            <div className="font-medium text-sm">{person.name}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          {t('addChargeForm.noPeopleFound')} {formData.personType.toLowerCase()}s {t('addChargeForm.noPeopleFoundSuffix')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label={t('addChargeForm.amount')}
                type="number"
                name="amount"
                value={formData.amount || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                leftIcon={<DollarSign size={18} />}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('addChargeForm.category')}
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {categories.find(c => c.value === formData.category)?.description}
                </p>
              </div>

              <div className="md:col-span-2">
                <Input
                  label={t('addChargeForm.reason')}
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder={t('addChargeForm.reasonPlaceholder')}
                  maxLength={100}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('addChargeForm.description')}
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder={t('addChargeForm.descriptionPlaceholder')}
                />
              </div>

              {initialData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('addChargeForm.status')}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="PENDING">{t('addChargeForm.pending')}</option>
                    <option value="APPLIED">{t('addChargeForm.applied')}</option>
                    <option value="CANCELLED">{t('addChargeForm.cancelled')}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {t('addChargeForm.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!selectedPerson}
              >
                {initialData ? t('addChargeForm.saveChanges') : t('addChargeForm.addCharge')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddChargeForm;