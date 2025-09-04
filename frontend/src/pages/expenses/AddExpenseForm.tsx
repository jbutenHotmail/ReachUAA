import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useUserStore } from '../../stores/userStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useProgramStore } from '../../stores/programStore';
import Badge from '../../components/ui/Badge';
import api from '../../api';
import { Expense } from '../../types';
import { formatNumber } from '../../utils/numberUtils';

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
  forLeaderId?: string;
  forLeaderName?: string;
  status?: string;
  distributionType?: 'specific' | 'proportional';
  leaderDistribution?: Array<{
    leaderId: string;
    leaderName: string;
    amount: number;
    percentage: number;
  }>;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t } = useTranslation();
  const { fetchUsers, getLeaders, werePeopleFetched, fetchPeople } = useUserStore();
  const { transactions, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore();
  const { program } = useProgramStore();
  const [formData, setFormData] = React.useState<ExpenseFormData>(
    initialData || {
      date: new Date().toISOString().split('T')[0],
      motivo: '',
      amount: 0,
      category: '',
      notes: '',
      status: 'PENDING',
      distributionType: 'specific',
      leaderDistribution: []
    }
  );

  const [leaderSearch, setLeaderSearch] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<{ id: string; name: string } | null>(
    initialData?.leaderId && initialData?.leaderName 
      ? { id: initialData.leaderId, name: initialData.leaderName }
      : null
  );
  const [selectedForLeader, setSelectedForLeader] = useState<{ id: string; name: string } | null>(
    initialData?.forLeaderId && initialData?.forLeaderName 
      ? { id: initialData.forLeaderId, name: initialData.forLeaderName }
      : null
  );
  const [isLeaderDropdownOpen, setIsLeaderDropdownOpen] = useState(false);
  const [isForLeaderDropdownOpen, setIsForLeaderDropdownOpen] = useState(false);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);
  const forLeaderDropdownRef = useRef<HTMLDivElement>(null);
  const [leaderSalesData, setLeaderSalesData] = useState<Array<{
    id: string;
    name: string;
    totalSales: number;
    percentage: number;
    incentiveAmount: number;
  }>>([]);
  const [budgetWarning, setBudgetWarning] = useState<{
    category: string;
    budgetAmount: number;
    currentSpending: number;
    remaining: number;
    wouldExceed: boolean;
  } | null>(null);
  const [budgetInfo, setBudgetInfo] = useState<{
    category: string;
    budgetAmount: number;
    currentSpending: number;
    remaining: number;
    percentageUsed: number;
  } | null>(null);

  useEffect(() => {
    !werePeopleFetched && fetchPeople();
    fetchUsers();
    !wereTransactionsFetched && fetchAllTransactions('APPROVED');
  }, [fetchUsers, fetchPeople, fetchAllTransactions, werePeopleFetched, wereTransactionsFetched]);
  
  // Check budget when amount, category, program, or selectedLeader changes
  useEffect(() => {
    if (formData.category && formData.amount > 0 && program?.financialConfig?.expense_budgets && shouldShowBudgetInfo()) {
      checkBudgetConstraints();
    } else {
      setBudgetWarning(null);
      setBudgetInfo(null);
    }
  }, [formData.category, formData.amount, program, selectedLeader, formData.distributionType]);
  
  // Helper function to determine if budget info should be shown
  const shouldShowBudgetInfo = () => {
    // Only show budget info if:
    // 1. Category is selected
    // 2. The selected leader is "program" and it's either a non-incentivos category or a specific incentivos expense
    return formData.category && selectedLeader?.id === 'program' && (
      (formData.category !== 'incentivos') ||
      (formData.category === 'incentivos' && formData.distributionType === 'specific')
    );
  };
  
  const checkBudgetConstraints = async () => {
    if (!program?.financialConfig?.expense_budgets) return;
    
    const budget = program.financialConfig.expense_budgets.find(
      b => b.category === formData.category
    );
    
    if (!budget || budget.budget_amount <= 0) {
      // Show unlimited budget info
      try {
        const response = await api.get<{ total: number }>('/budget/spending', {
          params: {
            category: formData.category,
            status: 'APPROVED',
            programId: program.id,
            isParentExpense: 'FALSE'
          }
        });
        
        const currentSpending = response.total;
        
        setBudgetInfo({
          category: formData.category,
          budgetAmount: 0,
          currentSpending,
          remaining: -1,
          percentageUsed: 0
        });
        setBudgetWarning(null);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
      return;
    }
    
    try {
      const response = await api.get<{ total: number }>('/expenses', {
        params: {
          category: formData.category,
          status: 'APPROVED',
          programId: program.id,
          isParentExpense: 'FALSE'
        }
      });
      
      const currentSpending = response.total;
      
      const remaining = budget.budget_amount - currentSpending;
      const percentageUsed = (currentSpending / budget.budget_amount) * 100;
      
      setBudgetInfo({
        category: formData.category,
        budgetAmount: budget.budget_amount,
        currentSpending,
        remaining,
        percentageUsed
      });
      
      const requestedAmount = formData.amount;
      
      setBudgetWarning({
        category: formData.category,
        budgetAmount: budget.budget_amount,
        currentSpending,
        remaining,
        wouldExceed: requestedAmount > remaining
      });
    } catch (error) {
      console.error('Error checking budget constraints:', error);
      setBudgetWarning(null);
      setBudgetInfo(null);
    }
  };
  
  // Calculate leader sales when category is incentivos and distribution type is proportional
  useEffect(() => {
    if (formData.category === 'incentivos' && formData.distributionType === 'proportional' && transactions.length > 0) {
      calculateLeaderSales();
    } else {
      setLeaderSalesData([]);
      setFormData(prev => ({
        ...prev,
        leaderDistribution: []
      }));
    }
  }, [formData.category, formData.distributionType, transactions, formData.amount]);

  const calculateLeaderSales = () => {
    const leaders = getLeaders();
    const totalSales = transactions.reduce((sum, transaction) => sum + Number(transaction.total), 0);
    
    const leaderDistribution = leaders.map(leader => {
      const leaderSales = transactions
        .filter(t => t.leaderId === leader.id)
        .reduce((sum, t) => sum + Number(t.total), 0);
      
      const percentage = totalSales > 0 ? (leaderSales / totalSales) * 100 : 0;
      const incentiveAmount = (formData.amount * percentage) / 100;
      
      return {
        id: leader.id,
        name: `${leader.name} ${leader.apellido}`,
        totalSales: leaderSales,
        percentage,
        incentiveAmount
      };
    });
    
    setLeaderSalesData(leaderDistribution);
    
    setFormData(prev => ({
      ...prev,
      leaderDistribution: leaderDistribution
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leaderDropdownRef.current && !leaderDropdownRef.current.contains(event.target as Node)) {
        setIsLeaderDropdownOpen(false);
      }
      if (forLeaderDropdownRef.current && !forLeaderDropdownRef.current.contains(event.target as Node)) {
        setIsForLeaderDropdownOpen(false);
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
    
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        distributionType: 'specific',
        leaderDistribution: []
      }));
      setLeaderSalesData([]);
    }
  };

  const handleDistributionTypeChange = (type: 'specific' | 'proportional') => {
    setFormData(prev => ({
      ...prev,
      distributionType: type
    }));
    
    if (type === 'specific') {
      setLeaderSalesData([]);
    }
  };

  const isIncentivosCategory = formData.category === 'incentivos';
  const isProportionalDistribution = isIncentivosCategory && formData.distributionType === 'proportional';
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProportionalDistribution && leaderSalesData.length > 0) {
      onSubmit({
        ...formData,
        leaderId: 'program',
        leaderName: t('common.program'),
        status: 'PENDING',
      });
      return;
    }
    
    onSubmit({
      ...formData,
      leaderId: selectedLeader?.id,
      leaderName: selectedLeader?.name,
      forLeaderId: selectedForLeader?.id,
      forLeaderName: selectedForLeader?.name,
      status: 'PENDING',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {budgetInfo && shouldShowBudgetInfo() && (
              <div className={`p-4 border rounded-lg ${
                budgetInfo.budgetAmount === 0
                  ? 'bg-blue-50 border-blue-200'
                  : budgetInfo.percentageUsed >= 90 && !program?.financialConfig?.allow_budget_override
                    ? 'bg-danger-50 border-danger-200' 
                    : budgetInfo.percentageUsed >= 75 && !program?.financialConfig?.allow_budget_override
                      ? 'bg-warning-50 border-warning-200'
                      : 'bg-success-50 border-success-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-medium ${
                    budgetInfo.budgetAmount === 0
                      ? 'text-blue-700'
                      : budgetInfo.percentageUsed >= 90 && !program?.financialConfig?.allow_budget_override
                        ? 'text-danger-700' 
                        : budgetInfo.percentageUsed >= 75 && !program?.financialConfig?.allow_budget_override
                          ? 'text-warning-700'
                          : 'text-success-700'
                  }`}>
                    {budgetInfo.budgetAmount === 0 ? '∞' : '💰'} Presupuesto de {t(`expenses.${budgetInfo.category}`)}
                  </h4>
                  {budgetInfo.budgetAmount === 0 ? (
                    <Badge variant="info" size="sm">
                      Sin límite
                    </Badge>
                  ) : (
                    <Badge 
                      variant={
                        budgetInfo.percentageUsed >= 90 && !program?.financialConfig?.allow_budget_override
                          ? 'danger' :
                          budgetInfo.percentageUsed >= 75 && !program?.financialConfig?.allow_budget_override
                            ? 'warning' : 'success'
                      }
                      size="sm"
                    >
                      {formatNumber(budgetInfo.percentageUsed)}% usado
                    </Badge>
                  )}
                </div>
                
                {budgetInfo.budgetAmount === 0 ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-blue-600">Presupuesto</p>
                      <p className="font-bold text-blue-700 text-lg">∞ Sin límite</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600">Gastado Total</p>
                      <p className="font-bold text-blue-700">${formatNumber(budgetInfo.currentSpending)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600">Presupuesto Total</p>
                      <p className="font-bold text-gray-900">${formatNumber(budgetInfo.budgetAmount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Gastado</p>
                      <p className="font-bold text-gray-900">${formatNumber(budgetInfo.currentSpending)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Disponible</p>
                      <p className={`font-bold ${
                        budgetInfo.remaining <= 0 && !program?.financialConfig?.allow_budget_override
                          ? 'text-danger-600' : 'text-success-600'
                      }`}>
                        ${formatNumber(budgetInfo.remaining)}
                      </p>
                    </div>
                  </div>
                )}
                
                {budgetInfo.budgetAmount > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          budgetInfo.percentageUsed >= 90 && !program?.financialConfig?.allow_budget_override
                            ? 'bg-danger-500' 
                            : budgetInfo.percentageUsed >= 75 && !program?.financialConfig?.allow_budget_override
                              ? 'bg-warning-500'
                              : 'bg-success-500'
                        }`}
                        style={{ width: `${Math.min(budgetInfo.percentageUsed, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {budgetInfo.budgetAmount > 0 && budgetInfo.percentageUsed >= 90 && !program?.financialConfig?.allow_budget_override && (
                  <div className="mt-2 text-xs text-danger-600">
                    ⚠️ Presupuesto casi agotado. Quedan solo ${formatNumber(budgetInfo.remaining)} disponibles.
                  </div>
                )}
                
                {budgetInfo.budgetAmount > 0 && budgetInfo.remaining <= 0 && !program?.financialConfig?.allow_budget_override && (
                  <div className="mt-2 text-xs text-danger-600 font-medium">
                    🚫 Presupuesto agotado. No se pueden crear más gastos en esta categoría.
                  </div>
                )}
                
                {budgetInfo.budgetAmount > 0 && program?.financialConfig?.allow_budget_override && (
                  <div className="mt-2 text-xs text-blue-600">
                    💡 <strong>Nota:</strong> Se permite superar el presupuesto para esta categoría.
                  </div>
                )}
                
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Nota:</strong> Los presupuestos solo se aplican a gastos del programa. 
                    Los gastos de líderes individuales no afectan estos límites.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
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
                  <option value="fuel">{t('expenses.fuel')}</option>
                  <option value="snacks">{t('expenses.snacks')}</option>
                  <option value="incentivos">{t('expenses.incentivos')}</option>
                  <option value="limpieza">{t('expenses.limpieza')}</option>
                  <option value="actividades">{t('expenses.actividades')}</option>
                  <option value="program">{t('expenses.programCosts')}</option>
                </select>
              </div>
            </div>

            {isIncentivosCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Distribución
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="distributionType"
                      value="specific"
                      checked={formData.distributionType === 'specific'}
                      onChange={() => handleDistributionTypeChange('specific')}
                      className="mr-2"
                    />
                    <span className="text-sm">Líder Específico</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="distributionType"
                      value="proportional"
                      checked={formData.distributionType === 'proportional'}
                      onChange={() => handleDistributionTypeChange('proportional')}
                      className="mr-2"
                    />
                    <span className="text-sm">Distribución Proporcional</span>
                  </label>
                </div>
              </div>
            )}

            {isProportionalDistribution && leaderSalesData.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Vista Previa de Distribución</h4>
                <div className="space-y-2">
                  {leaderSalesData.map((leader, index) => (
                    <div key={leader.id} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                      <div>
                        <span className="font-medium text-sm">{leader.name}</span>
                        <div className="text-xs text-gray-500">
                          Ventas: ${formatNumber(leader.totalSales)} ({formatNumber(leader.percentage)}%)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">${formatNumber(leader.incentiveAmount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-gray-700">Total:</span>
                    <span className="font-bold text-sm text-gray-900">${formatNumber(formData.amount)}</span>
                  </div>
                </div>
              </div>
            )}

            {!isProportionalDistribution && (
              <div className="relative" ref={leaderDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable del Gasto
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
                      placeholder="Buscar responsable del gasto..."
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
                          {selectedLeader.id === 'program' && (
                            <Badge variant="info" size="sm" className="ml-2">
                              Afecta presupuesto
                            </Badge>
                          )}
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
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">{leader.name}</div>
                              {leader.id === 'program' && (
                                <Badge variant="info" size="sm">
                                  Afecta presupuesto
                                </Badge>
                              )}
                            </div>
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
                <p className="mt-1 text-xs text-gray-500">
                  💡 <strong>Importante:</strong> Solo los gastos del "Programa" afectan los presupuestos configurados. 
                  Los gastos de líderes individuales son independientes.
                </p>
              </div>
            )}

            {!isProportionalDistribution && (
              <div className="relative" ref={forLeaderDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Líder (Opcional - Solo para registro)
                </label>
                <div
                  className={clsx(
                    'relative border border-gray-300 rounded-md shadow-sm',
                    isForLeaderDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
                  )}
                >
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="Buscar líder para quien es el gasto..."
                      value={selectedForLeader ? selectedForLeader.name : ''}
                      onChange={(e) => {
                        if (!selectedForLeader) {
                          setIsForLeaderDropdownOpen(true);
                        }
                      }}
                      onFocus={() => setIsForLeaderDropdownOpen(true)}
                      className="w-full px-3 py-2 rounded-md border-0 focus:outline-none text-sm"
                      readOnly={!!selectedForLeader}
                    />
                    <button
                      type="button"
                      className="pr-2 flex items-center"
                      onClick={() => setIsForLeaderDropdownOpen(!isForLeaderDropdownOpen)}
                    >
                      <ChevronDown
                        className={clsx(
                          'w-5 h-5 text-gray-400 transition-transform duration-200',
                          isForLeaderDropdownOpen && 'transform rotate-180'
                        )}
                      />
                    </button>
                  </div>
                  {selectedForLeader && (
                    <div className="px-3 py-2 border-t border-gray-200 bg-success-50">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-success-900 text-sm">
                          {selectedForLeader.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForLeader(null);
                          }}
                          className="p-1 hover:bg-success-100 rounded-full"
                        >
                          <X className="w-4 h-4 text-success-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {isForLeaderDropdownOpen && !selectedForLeader && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                    <div className="max-h-60 overflow-y-auto py-1">
                      {getLeaders().length > 0 ? (
                        getLeaders().map((leader) => (
                          <button
                            key={leader.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                            onClick={() => {
                              setSelectedForLeader({ id: leader.id, name: `${leader.name} ${leader.apellido}` });
                              setIsForLeaderDropdownOpen(false);
                            }}
                          >
                            <div className="font-medium text-sm">{leader.name} {leader.apellido}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          {t('addExpenseForm.noLeadersFound')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Este campo es opcional y solo se usa para registrar para qué líder fue el gasto (diferente de quien lo paga).
                </p>
              </div>
            )}

            <div className="md:col-span-3">
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

            <div className="md:col-span-3">
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
              <div>
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

            {isProportionalDistribution && (
              <div className="md:col-span-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-2">Distribución Proporcional de Incentivos</p>
                    <ul className="space-y-1 text-xs">
                      <li>• El incentivo se distribuirá automáticamente entre todos los líderes</li>
                      <li>• La distribución se basa en las ventas totales de cada equipo</li>
                      <li>• El líder con más ventas recibirá una mayor proporción</li>
                      <li>• Se crearán gastos individuales para cada líder</li>
                      <li>• Estos gastos no afectan el presupuesto del programa</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {budgetWarning && shouldShowBudgetInfo() && (
              <div className={`md:col-span-3 p-4 border rounded-lg ${
                budgetWarning.wouldExceed && !program?.financialConfig?.allow_budget_override
                  ? 'bg-danger-50 border-danger-200'
                  : 'bg-warning-50 border-warning-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    budgetWarning.wouldExceed && !program?.financialConfig?.allow_budget_override
                      ? 'text-danger-600' : 'text-warning-600'
                  }`} />
                  <div className="text-sm">
                    <p className={`font-medium mb-2 ${
                      budgetWarning.wouldExceed && !program?.financialConfig?.allow_budget_override
                        ? 'text-danger-700' : 'text-warning-700'
                    }`}>
                      {budgetWarning.wouldExceed && !program?.financialConfig?.allow_budget_override
                        ? 'Presupuesto Excedido' : 'Advertencia de Presupuesto'}
                    </p>
                    <p className="text-gray-600 mb-2">
                      Presupuesto para {t(`expenses.${budgetWarning.category}`)}: ${formatNumber(budgetWarning.budgetAmount)}
                    </p>
                    <p className="text-gray-600 mb-2">
                      Gastado actualmente: ${formatNumber(budgetWarning.currentSpending)}
                    </p>
                    <p className="text-gray-600 mb-2">
                      Disponible: ${formatNumber(budgetWarning.remaining)}
                    </p>
                    {budgetWarning.wouldExceed && !program?.financialConfig?.allow_budget_override && (
                      <p className="text-danger-600 font-medium">
                        Este gasto excedería el presupuesto disponible.
                      </p>
                    )}
                    {budgetWarning.wouldExceed && program?.financialConfig?.allow_budget_override && (
                      <p className="text-blue-600 font-medium">
                        Este gasto excedería el presupuesto, pero está permitido superarlo.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 p-6">
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
                isProportionalDistribution 
                  ? leaderSalesData.length === 0 || formData.amount <= 0 || !formData.motivo
                  : !selectedLeader || !formData.motivo || !formData.category
              }
              onClick={handleFormSubmit}
            >
              {isProportionalDistribution 
                ? `Crear Distribución de Incentivos`
                : t('common.save')
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseForm;