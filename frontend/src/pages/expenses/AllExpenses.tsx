import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Download, Utensils, ChevronFirst as FirstAid, ShoppingBag, Wrench, Car } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddExpenseForm from './AddExpenseForm';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api';

interface Expense {
  id: string;
  leaderId: string | null;
  leaderName: string;
  amount: number;
  motivo: string;
  category: string;
  notes?: string;
  date: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

interface AllExpensesProps {
  defaultCategory?: string;
}

const AllExpenses: React.FC<AllExpensesProps> = ({ defaultCategory }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [leaderFilter, setLeaderFilter] = useState('');
  const [categoryFilter, setSelectedCategory] = useState(defaultCategory || '');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (categoryFilter) {
          params.category = categoryFilter;
        }
        if (leaderFilter) {
          params.leaderId = leaderFilter;
        }
        if (dateFilter) {
          params.date = dateFilter;
        }
        
        const fetchedExpenses = await api.get<Expense[]>('/expenses', { params });
        setExpenses(fetchedExpenses);
      } catch (err) {
        console.error('Error fetching expenses:', err);
        setError('Failed to load expenses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [categoryFilter, leaderFilter, dateFilter]);

  const filteredExpenses = expenses.filter(expense => {
    return expense.motivo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averagePerDay = totalAmount / (filteredExpenses.length || 1);
  const averagePerWeek = averagePerDay * 7;

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

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newExpense = await api.post<Expense>('/expenses', data);
      setExpenses(prev => [...prev, newExpense]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const handleEditExpense = async (data: Omit<Expense, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense) {
      try {
        const updatedExpense = await api.put<Expense>(`/expenses/${editingExpense.id}`, data);
        setExpenses(prev =>
          prev.map(expense =>
            expense.id === editingExpense.id
              ? updatedExpense
              : expense
          )
        );
        setEditingExpense(null);
      } catch (error) {
        console.error('Error updating expense:', error);
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await api.delete(`/expenses/${id}`);
        setExpenses(prev => prev.filter(expense => expense.id !== id));
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('expenses.amount')}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">Total expenses</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Daily Average</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${averagePerDay.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">Per day</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Weekly Average</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${averagePerWeek.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">Per week</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
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
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
              >
                Export
              </Button>
              
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={() => setShowAddForm(true)}
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingExpense(expense)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        Delete
                      </Button>
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