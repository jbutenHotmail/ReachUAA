import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Utensils, ChevronFirst as FirstAid, ShoppingBag, Wrench, Car, CheckCircle, XCircle, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddExpenseForm from './AddExpenseForm';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useExpenseStore } from '../../stores/expenseStore';
import LoadingScreen from '../../components/ui/LoadingScreen';

interface Expense {
  id: string;
  leaderId: string | null;
  leaderName: string;
  amount: number;
  motivo: string;
  category: string;
  notes?: string;
  date: string;
  status?: string; // Added status field
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

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
  }, []);

  //useeffect para el filtro

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
      : expense.leaderId === leaderFilter
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
    matchesStatus
  );
});

  // Calculate totals - ONLY APPROVED EXPENSES
  const approvedExpenses = filteredExpenses.filter(e => e.status === 'APPROVED' || !e.status);
  const totalAmount = approvedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
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
        return <Badge variant="warning" leftIcon={<Clock size={14} />}>Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" leftIcon={<XCircle size={14} />}>Rejected</Badge>;
      default:
        return <Badge variant="success">Approved</Badge>; // Default for backward compatibility
    }
  };

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt' >) => {
    try {
      await createExpense(data);
      setShowAddForm(false);
      setSuccess('Expense created successfully. It will be reviewed by an administrator.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error creating expense:', error);
      setError('Failed to create expense');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditExpense = async (data: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    }
  };

  const handleApproveExpense = async (id: string) => {
    if (!isAdmin) return;
    
    await approveExpense(id);
  };

  const handleRejectExpense = async (id: string) => {
    if (!isAdmin) return;
    await rejectExpense(id);  
    
  };

  if (isLoading) {
    return (
      <LoadingScreen message="Loading expenses..." />
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">Error loading expenses</p>
        <p>{error}</p>
      </div>
    );
  }

  // Calculate totals by status
  const pendingTotal = filteredExpenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0);
  const approvedTotal = filteredExpenses.filter(e => e.status === 'APPROVED' || !e.status).reduce((sum, e) => sum + e.amount, 0);

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
            <p className="mt-2 text-3xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">Total expenses</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">${pendingTotal.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">Awaiting approval</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Approved</p>
            <p className="mt-2 text-3xl font-bold text-success-600">${approvedTotal.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">Confirmed expenses</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Daily Average</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${averagePerDay.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">Per day</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <Input
                placeholder="Search expenses..."
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
                <option value="program">Program</option>
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
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t('common.all')} categories</option>
                <option value="food">{t('expenses.food')}</option>
                <option value="health">{t('expenses.health')}</option>
                <option value="supplies">{t('expenses.supplies')}</option>
                <option value="maintenance">{t('expenses.maintenance')}</option>
                <option value="fuel">{t('expenses.fuel')}</option>
              </select>
            </div>
            
            <div className="flex-shrink-0">
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={() => setShowAddForm(true)}
                className="w-full sm:w-auto"
              >
                Add Expense
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
                    {t('common.leader')}
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
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {expense.motivo}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      ${expense.amount.toFixed(2)}
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