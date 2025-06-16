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
  const { users, fetchUsers, getLeaders, getColporters } = useUserStore();
  
  const [formData, setFormData] = React.useState({
    personId: initialData?.personId || '',
    personName: initialData?.personName || '',
    personType: initialData?.personType || 'COLPORTER',
    amount: initialData?.amount || 0,
    reason: initialData?.reason || '',
    description: initialData?.description || '',
    category: initialData?.category || 'FINE',
    status: initialData?.status || 'PENDING', // Default to PENDING
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
    fetchUsers();
  }, [fetchUsers]);

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
      status: 'PENDING', // Always set to PENDING when submitting
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
    { value: 'FINE', label: 'Fine', description: 'Monetary penalty for rule violations' },
    { value: 'DEDUCTION', label: 'Deduction', description: 'Amount deducted from earnings' },
    { value: 'PENALTY', label: 'Penalty', description: 'Disciplinary charge' },
    { value: 'OTHER', label: 'Other', description: 'Other type of charge' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? 'Edit Charge' : 'Add New Charge'}
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
                label="Date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Person Type
                </label>
                <select
                  name="personType"
                  value={formData.personType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  <option value="COLPORTER">Colporter</option>
                  <option value="LEADER">Leader</option>
                </select>
              </div>

              <div className="md:col-span-2 relative" ref={personDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select {formData.personType === 'COLPORTER' ? 'Colporter' : 'Leader'}
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
                      placeholder={`Search ${formData.personType.toLowerCase()}...`}
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
                          No {formData.personType.toLowerCase()}s found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Amount ($)"
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
                  Category
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
                  label="Reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Brief reason for the charge"
                  maxLength={100}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Additional details about the charge..."
                />
              </div>

              {initialData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPLIED">Applied</option>
                    <option value="CANCELLED">Cancelled</option>
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
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!selectedPerson}
              >
                {initialData ? 'Save Changes' : 'Add Charge'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddChargeForm;