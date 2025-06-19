import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useUserStore } from '../../stores/userStore';

interface AddExpenseFormProps {
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  initialData?: ExpenseFormData;
}

interface ExpenseFormData {
  date: string;
  motivo: string;
  amount: number;
  category: string;
  notes?: string;
  leaderId?: string;
  leaderName?: string;
  status?: string;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t } = useTranslation();
  const { fetchUsers, getLeaders, werePeopleFetched, fetchPeople } = useUserStore();
  const [formData, setFormData] = React.useState<ExpenseFormData>(
    initialData || {
      date: new Date().toISOString().split('T')[0],
      motivo: '',
      amount: 0,
      category: '',
      notes: '',
      status: 'PENDING',
    }
  );

  const [leaderSearch, setLeaderSearch] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<{ id: string; name: string } | null>(
    initialData?.leaderId && initialData?.leaderName 
      ? { id: initialData.leaderId, name: initialData.leaderName }
      : null
  );
  const [isLeaderDropdownOpen, setIsLeaderDropdownOpen] = useState(false);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    !werePeopleFetched && fetchPeople();
    fetchUsers();
  }, [fetchUsers]);

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

  const leaders = [
    { id: 'program', name: t('common.program') },
    ...getLeaders()
  ];
  
  const filteredLeaders = leaders.filter((leader) =>
    leader.name.toLowerCase().includes(leaderSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      leaderId: selectedLeader?.id,
      leaderName: selectedLeader?.name,
      status: 'PENDING',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? t('expenses.editExpense') : t('expenses.addExpense')}
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
                label={t('expenses.date')}
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />

              <Input
                label={t('expenses.amount')}
                type="number"
                name="amount"
                value={formData.amount || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />

              <div className="md:col-span-2 relative" ref={leaderDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.leader')}
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
                      placeholder={t('common.search')}
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
                              setSelectedLeader({ id: leader.id, name: leader.name });
                              setLeaderSearch('');
                              setIsLeaderDropdownOpen(false);
                            }}
                          >
                            <div className="font-medium text-sm">{leader.name}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          {t('addBookForm.noBooksFound')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <Input
                  label={t('expenses.motivo')}
                  type="text"
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleChange}
                  maxLength={30}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('expenses.category')}
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  <option value="">{t('common.select')}</option>
                  <option value="food">{t('expenses.food')}</option>
                  <option value="health">{t('expenses.health')}</option>
                  <option value="supplies">{t('expenses.supplies')}</option>
                  <option value="maintenance">{t('expenses.maintenance')}</option>
                  <option value="vehicle">{t('expenses.vehicle')}</option>
                  <option value="program">{t('expenses.programCosts')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('transactions.notes')}
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              {initialData && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.status')}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    required
                  >
                    <option value="PENDING">{t('transactions.pending')}</option>
                    <option value="APPROVED">{t('transactions.approved')}</option>
                    <option value="REJECTED">{t('transactions.rejected')}</option>
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
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!selectedLeader}
              >
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddExpenseForm;