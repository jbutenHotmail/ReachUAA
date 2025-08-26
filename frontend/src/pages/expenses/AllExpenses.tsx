import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Utensils, ChevronFirst as FirstAid, ShoppingBag, Wrench, Car, CheckCircle, XCircle, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddExpenseForm from './AddExpenseForm';
import { useAuthStore } from '../../stores/authStore';
import { Expense, UserRole } from '../../types';
import { useExpenseStore } from '../../stores/expenseStore';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { formatNumber } from '../../utils/numberUtils';

interface AllExpensesProps {
  defaultCategory?: string;
}

const AllExpenses: React.FC<AllExpensesProps> = ({ 
  defaultCategory 
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [leaderFilter, setLeaderFilter] = useState('');
  const [forLeaderFilter, setForLeaderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setSelectedCategory] = useState(defaultCategory || '');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { wereExpensesFetched, fetchExpenses, expenses, createExpense, updateExpense, deleteExpense, approveExpense, rejectExpense, isLoading } = useExpenseStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    !wereExpensesFetched && fetchExpenses();
  }, [fetchExpenses, wereExpensesFetched]);

  // Update category filter when defaultCategory changes
  useEffect(() => {
    if (defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, [defaultCategory]);

  const filteredExpenses = expenses.filter((expense) => {
    // Search term filter
    const matchesSearchTerm = searchTerm
      ? expense.motivo.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    // Category filter
    const matchesCategory = categoryFilter
      ? expense.category === categoryFilter
      : true;

    // Date filter
    const matchesDate = dateFilter
      ? new Date(expense.date).toISOString().split('T')[0] === dateFilter
      : true;

    // Leader filter
    const matchesLeader = leaderFilter
      ? leaderFilter === 'program'
        ? !expense.leaderId // Program expenses have no leaderId
        : Number(expense.leaderId) === Number(leaderFilter)
      : true;

    // For Leader filter (beneficiary)
    const matchesForLeader = forLeaderFilter
      ? Number(expense.forLeaderId) === Number(forLeaderFilter)
      : true;

    // Status filter
    const matchesStatus = statusFilter
      ? expense.status === statusFilter ||
        (!expense.status && statusFilter === 'APPROVED') // Handle backward compatibility
      : true;

    return (
      matchesSearchTerm &&
      matchesCategory &&
      matchesDate &&
      matchesLeader &&
      matchesForLeader &&
      matchesStatus
    );
  });
  // Calculate totals - ONLY APPROVED EXPENSES
  const approvedExpenses = filteredExpenses.filter(e => e.status === 'APPROVED' || !e.status);
  const totalAmount = approvedExpenses.reduce((sum, expense) => Number(sum) + Number(expense.amount), 0);
  const averagePerDay = totalAmount / (approvedExpenses.length || 1);

  // Get unique leaders from expenses
  const uniqueLeaders = Array.from(new Set(expenses
    .filter(e => e.leaderId)
    .map(e => e.leaderId)))
    .filter(Boolean)
    .map(id => ({
      id: id as string,
      name: expenses.find(e => e.leaderId === id)?.leaderName as string,
    }));

  // Get unique "for leaders" from expenses
  const uniqueForLeaders = Array.from(new Set(expenses
    .filter(e => e.forLeaderId)
    .map(e => e.forLeaderId)))
    .filter(Boolean)
    .map(id => ({
      id: id as string,
      name: expenses.find(e => e.forLeaderId === id)?.forLeaderName as string,
    }));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return <Utensils size={16} className="text-primary-600" />;
      case 'health':
        return <FirstAid size={16} className="text-danger-600" />;
      case 'supplies':
        return <ShoppingBag size={16} className="text-success-600" />;
      case 'maintenance':
        return <Wrench size={16} className="text-warning-600" />;
      case 'fuel':
        return <Car size={16} className="text-info-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" leftIcon={<Clock size={14} />}>{t('expenses.pending')}</Badge>;
      case 'APPROVED':
        return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>{t('expenses.approved')}</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" leftIcon={<XCircle size={14} />}>{t('expenses.rejected')}</Badge>;
      default:
        return <Badge variant="success">{t('expenses.approved')}</Badge>; // Default for backward compatibility
    }
  };

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createExpense(data);
      setShowAddForm(false);
      setSuccess(t('expenses.successCreated'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error creating expense:', error);
      setError(t('expenses.errorCreate'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditExpense = async (data: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense) {
      try {
        await updateExpense(editingExpense.id, data);
        setEditingExpense(null);
        setSuccess(t('expenses.successUpdated'));
        setTimeout(() => setSuccess(null), 5000);
      } catch (error) {
        console.error('Error updating expense:', error);
        setError(t('expenses.errorUpdate'));
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleApproveExpense = async (id: string) => {
    if (!isAdmin) return;
    
    try {
      await approveExpense(id);
      setSuccess(t('expenses.successApproved'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error approving expense:', error);
      setError(t('expenses.errorApprove'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRejectExpense = async (id: string) => {
    if (!isAdmin) return;
    
    try {
      await rejectExpense(id);
      setSuccess(t('expenses.successRejected'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error rejecting expense:', error);
      setError(t('expenses.errorReject'));
      setTimeout(() => setError(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen message={t('expenses.loading')} />
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t('expenses.errorTitle')}</p>
        <p>{error}</p>
      </div>
    );
  }

  // Calculate totals by status
  const pendingTotal = filteredExpenses.filter(e => e.status === 'PENDING').reduce((sum, e) => Number(sum) + Number(e.amount), 0);
  const approvedTotal = filteredExpenses.filter(e => e.status === 'APPROVED' || !e.status).reduce((sum, e) => Number(sum) + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('expenses.amount')}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${formatNumber(totalAmount)}</p>
            <p className="mt-1 text-sm text-gray-500">{t('expenses.totalExpenses')}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('expenses.pending')}</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">${formatNumber(pendingTotal)}</p>
            <p className="mt-1 text-sm text-gray-500">{t('expenses.awaiting')}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('expenses.approved')}</p>
            <p className="mt-2 text-3xl font-bold text-success-600">${formatNumber(approvedTotal)}</p>
            <p className="mt-1 text-sm text-gray-500">{t('expenses.confirmed')}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('expenses.dailyAverage')}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${formatNumber(averagePerDay)}</p>
            <p className="mt-1 text-sm text-gray-500">{t('expenses.perDay')}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <Input
                placeholder={t('expenses.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto"
              />

              <select
                value={leaderFilter}
                onChange={(e) => setLeaderFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t('common.all')} {t('common.leader').toLowerCase()}s</option>
                <option value="program">{t('expenses.program')}</option>
                {uniqueLeaders.map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t('expenses.allStatuses')}</option>
                <option value="PENDING">{t('expenses.pending')}</option>
                <option value="APPROVED">{t('expenses.approved')}</option>
                <option value="REJECTED">{t('expenses.rejected')}</option>
              </select>

              <select
                value={forLeaderFilter}
                onChange={(e) => setForLeaderFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Todos los Beneficiarios</option>
                {uniqueForLeaders.map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>

            </div>
            
            <div className="flex-shrink-0">
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={() => setShowAddForm(true)}
                className="w-full sm:w-auto"
              >
                {t('expenses.addExpense')}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expenses.date')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsable / Beneficiario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expenses.motivo')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expenses.amount')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expenses.category')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expenses.status')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expenses.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className={
                    expense.status === 'PENDING' ? 'bg-yellow-50/50' :
                    expense.status === 'REJECTED' ? 'bg-red-50/50' : ''
                  }>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {expense.leaderName}
                      {expense.forLeaderName && (
                        <div className="text-xs text-gray-500">
                          Líder: {expense.forLeaderName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {expense.motivo}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      ${formatNumber(expense.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge 
                        variant="primary" 
                        leftIcon={getCategoryIcon(expense.category)}
                      >
                        {t(`expenses.${expense.category}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {getStatusBadge(expense.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {expense.status === 'PENDING' && isAdmin && (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApproveExpense(expense.id)}
                          >
                            <CheckCircle size={16} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectExpense(expense.id)}
                          >
                            <XCircle size={16} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {(showAddForm || editingExpense) && (
        <AddExpenseForm
          onClose={() => {
            setShowAddForm(false);
            setEditingExpense(null);
          }}
          onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
          initialData={editingExpense || undefined}
        />
      )}
    </div>
  );
};

export default AllExpenses;