import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddExpenseForm from './AddExpenseForm';

interface Expense {
  id: string;
  date: string;
  motivo: string;
  amount: number;
  category: string;
  notes?: string;
  leaderId?: string;
  leaderName?: string;
}

const mockExpenses = [
  {
    id: '1',
    date: '2025-05-01',
    motivo: 'Almuerzo',
    amount: 2297.91,
    category: 'Alimentación',
    leaderId: '1',
    leaderName: 'Odrie Aponte',
  },
  {
    id: '2',
    date: '2025-05-01',
    motivo: 'Cena',
    amount: 1534.56,
    category: 'Alimentación',
    leaderId: '2',
    leaderName: 'Moises Amador',
  },
];

const FoodExpenses: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [leaderFilter, setLeaderFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.motivo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || expense.date === dateFilter;
    const matchesLeader = !leaderFilter || expense.leaderId === leaderFilter;
    return matchesSearch && matchesDate && matchesLeader;
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averagePerDay = totalAmount / (filteredExpenses.length || 1);
  const averagePerWeek = averagePerDay * 7;

  // Get unique leaders from expenses
  const uniqueLeaders = Array.from(new Set(expenses.map(e => e.leaderId)))
    .filter(Boolean)
    .map(id => ({
      id: id as string,
      name: expenses.find(e => e.leaderId === id)?.leaderName as string,
    }));

  const handleAddExpense = (data: Omit<Expense, 'id'>) => {
    const newExpense = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
    };
    setExpenses(prev => [...prev, newExpense]);
    setShowAddForm(false);
  };

  const handleEditExpense = (data: Omit<Expense, 'id'>) => {
    if (editingExpense) {
      setExpenses(prev =>
        prev.map(expense =>
          expense.id === editingExpense.id
            ? { ...expense, ...data }
            : expense
        )
      );
      setEditingExpense(null);
    }
  };

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
                {uniqueLeaders.map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
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
                      <Badge variant="primary">{expense.category}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingExpense(expense)}
                      >
                        Edit
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

export default FoodExpenses;