// AdminCashAdvance.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, Calendar, ChevronDown, X, Edit3, Save, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useUserStore } from '../../stores/userStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { useProgramStore } from '../../stores/programStore';
import { useTransactionStore } from '../../stores/transactionStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import LoadingScreen from '../../components/ui/LoadingScreen';

const AdminCashAdvance: React.FC = () => {
  const { t } = useTranslation();
  const { people, fetchPeople, werePeopleFetched } = useUserStore();
  const { program, fetchProgram, wasProgramFetched } = useProgramStore();
  const { transactions, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore();
  const { 
    weeklySales,
    isLoading,
    fetchWeeklySales,
    createCashAdvance,
    wereAdvancesFetched,
    fetchAdvances
  } = useCashAdvanceStore();

  // Person selection state
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string; personType: 'COLPORTER' | 'LEADER' } | null>(null);
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isEditingPercentage, setIsEditingPercentage] = useState(false);
  const [customPercentage, setCustomPercentage] = useState<number>(0); // Will be set from program config
  const [localWeeklySales, setLocalWeeklySales] = useState<any>(null);
  const [isCalculatingLocally, setIsCalculatingLocally] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    !wasProgramFetched && fetchProgram();
    !werePeopleFetched && fetchPeople();
    !wereAdvancesFetched && fetchAdvances();
    !wereTransactionsFetched && fetchAllTransactions('APPROVED');
  }, [fetchProgram, fetchPeople, fetchAdvances, fetchAllTransactions, wasProgramFetched, werePeopleFetched, wereAdvancesFetched, wereTransactionsFetched]);

  useEffect(() => {
    if (selectedPerson) {
      setError('');
      setSuccess('');
      setConfirmationText('');
      setLocalWeeklySales(null);
      
      // Set default percentage based on person type
      const defaultPercentage = selectedPerson.personType === 'COLPORTER' 
        ? program?.financialConfig?.colporter_cash_advance_percentage || 20
        : program?.financialConfig?.leader_percentage || 25;
      setCustomPercentage(defaultPercentage);
      setIsEditingPercentage(false);
      
      // Calculate weekly sales locally if we have transactions and advances
      if (wereTransactionsFetched && wereAdvancesFetched) {
        setIsCalculatingLocally(true);
        calculateWeeklySalesLocally(selectedPerson.id, selectedPerson.personType);
      } else {
        // Otherwise fetch from API
        fetchWeeklySales(selectedPerson.id)
          .catch(err => {
            setError(t('cashAdvance.errorFetchingSales'));
            console.error('Error fetching weekly sales:', err);
          });
      }
    }
  }, [selectedPerson, fetchWeeklySales, program, wereTransactionsFetched, wereAdvancesFetched]);

  // Calculate weekly sales locally
  const calculateWeeklySalesLocally = (personId: string, personType: 'COLPORTER' | 'LEADER') => {
    // Get current date
    const today = new Date();
    
    // Calculate start of week (Sunday)
    const startOfWeek = new Date(today);
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    startOfWeek.setDate(today.getDate() - day); // Go back to Sunday
    
    // Calculate end of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday + 6 days = Saturday
    
    const weekStartDate = startOfWeek.toISOString().split('T')[0];
    const weekEndDate = endOfWeek.toISOString().split('T')[0];
    
    // Filter transactions for this person and this week
    const personTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const isInDateRange = transactionDate >= startOfWeek && transactionDate <= endOfWeek;
      
      if (personType === 'COLPORTER') {
        return t.studentId === personId && isInDateRange && t.status === 'APPROVED';
      } else {
        return t.leaderId === personId && isInDateRange && t.status === 'APPROVED';
      }
    });
    
    // Calculate total sales and transaction count
    const totalSales = personTransactions.reduce((sum, t) => sum + t.total, 0);
    const transactionCount = personTransactions.length;
    
    // Calculate daily sales
    const dailySales: Record<string, number> = {};
    personTransactions.forEach(t => {
      const date = t.date;
      dailySales[date] = (dailySales[date] || 0) + t.total;
    });
    
    // Get financial configuration
    const maxPercentage = personType === 'COLPORTER' 
      ? program?.financialConfig?.colporter_cash_advance_percentage || 20
      : program?.financialConfig?.leader_cash_advance_percentage || 25;
    
    // Calculate maximum advance amount
    const maxAdvanceAmount = totalSales * (maxPercentage / 100);
    
    // Create weekly sales object
    const calculatedWeeklySales = {
      colporterId: personId,
      colporterName: selectedPerson?.name || '',
      weekStartDate,
      weekEndDate,
      totalSales,
      transactionCount,
      dailySales,
      maxAdvanceAmount,
      maxAdvancePercentage: maxPercentage
    };
    
    setLocalWeeklySales(calculatedWeeklySales);
    setAdvanceAmount(0);
    setIsCalculatingLocally(false);
  };

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPersonDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get all people (both colporters and leaders)
  const allPeople = people;
  
  const filteredPeople = allPeople.filter((person) =>
    (person.name.toLowerCase().includes(personSearch.toLowerCase()) ||
     person.apellido.toLowerCase().includes(personSearch.toLowerCase()))
  );

  // Get current week sales data - either from API or calculated locally
  const currentWeekSales = isCalculatingLocally ? null : (localWeeklySales || weeklySales[0]);
  
  const maxAdvanceAmount = currentWeekSales ? currentWeekSales.totalSales * (customPercentage / 100) : 0;

  const handleAdvanceAmountChange = (amount: number) => {
    setError('');
    setSuccess('');
    
    if (amount < 0) {
      setError(t('cashAdvance.negativeAmountError'));
      return;
    }
    
    if (amount > maxAdvanceAmount) {
      setError(t('cashAdvance.exceedAmountError'));
      return;
    }
    
    setAdvanceAmount(amount);
  };

  const handlePercentageChange = (percentage: number) => {
    if (percentage < 0 || percentage > 50) return;
    setCustomPercentage(percentage);
    
    // Recalculate advance amount if it exceeds new limit
    const newMaxAmount = currentWeekSales ? currentWeekSales.totalSales * (percentage / 100) : 0;
    if (advanceAmount > newMaxAmount) {
      setAdvanceAmount(newMaxAmount);
    }
  };

  const handleCreateAdvance = async () => {
    if (!selectedPerson || !currentWeekSales) return;
    
    try {
      setError('');
      setSuccess('');
      
      if (advanceAmount <= 0 || advanceAmount > maxAdvanceAmount) {
        setError(t('cashAdvance.invalidAmountError'));
        return;
      }

      // Check confirmation text
      if (confirmationText.toLowerCase() !== 'confirm' && confirmationText.toLowerCase() !== 'confirmar') {
        setError(t('cashAdvance.confirmationTextError'));
        return;
      }

      await createCashAdvance({
        personId: selectedPerson.id,
        weekStartDate: currentWeekSales.weekStartDate,
        weekEndDate: currentWeekSales.weekEndDate,
        totalSales: currentWeekSales.totalSales,
        transactionCount: currentWeekSales.transactionCount,
        advanceAmount: advanceAmount,
        personType: selectedPerson.personType,
        personName: selectedPerson.name
      });
      setSuccess(t('cashAdvance.successMessage'));
      
      // Reset form
      setSelectedPerson(null);
      setPersonSearch('');
      setAdvanceAmount(0);
      setConfirmationText('');
      setIsEditingPercentage(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('cashAdvance.genericError'));
    }
  };

  // Format date for table headers
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      date: date.getDate(),
    };
  };

  if (isLoading) {
    return (
      <LoadingScreen message={t('cashAdvance.loadingMessage')} />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('cashAdvance.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('cashAdvance.description')}
        </p>
      </div>

      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-success-700">
            <p className="font-medium">{t('cashAdvance.success')}</p>
            <p>{success}</p>
          </div>
        </div>
      )}

      <Card className="overflow-visible">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            {t('cashAdvance.selectPerson')}
          </label>
          <div className="relative" ref={dropdownRef}>
            <div
              className={clsx(
                'relative border border-gray-300 rounded-md shadow-sm',
                isPersonDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
              )}
            >
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder={t('cashAdvance.searchPlaceholder')}
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
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-primary-900 text-sm">
                        {selectedPerson.name}
                      </div>
                      <Badge 
                        variant={selectedPerson.personType === 'COLPORTER' ? 'primary' : 'success'}
                        size="sm"
                      >
                        {t(`personForm.${selectedPerson.personType.toLowerCase()}`)}
                      </Badge>
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
              <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 top-full left-0">
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        onClick={() => {
                          setSelectedPerson({ 
                            id: person.id, 
                            name: `${person.name} ${person.apellido}`, 
                            personType: person.personType
                          });
                          setPersonSearch('');
                          setIsPersonDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{person.name} {person.apellido}</div>
                          <Badge 
                            variant={person.personType === 'COLPORTER' ? 'primary' : 'success'}
                            size="sm"
                          >
                            {t(`personForm.${person.personType.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      {t('cashAdvance.noPeopleFound')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {isCalculatingLocally && (
        <div className="flex items-center justify-center h-64">
          <LoadingScreen message={t('cashAdvance.calculatingMessage')} />
        </div>
      )}

      {selectedPerson && currentWeekSales && (
        <>
          <Card title={t('cashAdvance.weeklySales')} icon={<Calendar size={20} />}>
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {Object.entries(currentWeekSales.dailySales).map(([date]) => {
                        const { day, date: dayNumber } = formatDate(date);
                        return (
                          <th 
                            key={date} 
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                          >
                            <div>{t(`programSettings.days.${day.toLowerCase()}`)}</div>
                            <div className="text-lg font-bold text-gray-700">{dayNumber}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Object.entries(currentWeekSales.dailySales).map(([date, amount]) => (
                        <td 
                          key={date} 
                          className={clsx(
                            "px-4 py-3 text-center whitespace-nowrap text-sm font-medium",
                            amount > 0 ? "text-success-600" : "text-gray-400"
                          )}
                        >
                          ${amount.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td 
                        colSpan={Object.keys(currentWeekSales.dailySales).length} 
                        className="px-4 py-3 text-right text-sm font-medium text-gray-900"
                      >
                        {t('common.total')}: ${Number(currentWeekSales.totalSales).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cash Advance Configuration */}
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-primary-600">{t('cashAdvance.cashAdvanceLimit')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {isEditingPercentage ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={customPercentage}
                            onChange={(e) => handlePercentageChange(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-sm text-primary-600">%</span>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => setIsEditingPercentage(false)}
                          >
                            <Save size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary-700">{customPercentage}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingPercentage(true)}
                          >
                            <Edit3 size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-700">
                      ${maxAdvanceAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-primary-600">{t('cashAdvance.maxAvailable')}</p>
                  </div>
                </div>
                
                {customPercentage !== (selectedPerson.personType === 'COLPORTER' 
                  ? (program?.financialConfig?.colporter_cash_advance_percentage || 20) 
                  : (program?.financialConfig?.leader_cash_advance_percentage || 25)) && (
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-700">
                      <strong>{t('cashAdvance.customPercentage')}</strong> {t('cashAdvance.customPercentageWarning')}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200">
                <Input
                  label={t('cashAdvance.advanceAmount')}
                  type="number"
                  min="0"
                  max={maxAdvanceAmount}
                  value={advanceAmount || ''}
                  onChange={(e) => handleAdvanceAmountChange(parseFloat(e.target.value))}
                  error={error}
                  leftIcon={<Wallet size={18} />}
                />

                <Input
                  label={t('cashAdvance.confirmationPrompt')}
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={t('cashAdvance.confirmationPlaceholder')}
                />

                <Button
                  variant="primary"
                  onClick={handleCreateAdvance}
                  disabled={
                    !advanceAmount || 
                    advanceAmount <= 0 || 
                    advanceAmount > maxAdvanceAmount ||
                    (confirmationText.toLowerCase() !== 'confirm' && confirmationText.toLowerCase() !== 'confirmar')
                  }
                  fullWidth
                >
                  {t('cashAdvance.createAdvance')}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminCashAdvance;