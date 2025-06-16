import React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, CreditCard, Wallet, CheckCircle, Clock, XCircle, BookText, ChevronRight } from 'lucide-react';
import { Transaction } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useTransactionStore } from '../../stores/transactionStore';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';

interface DailyTransactionsProps {
  transactions: Transaction[];
  date?: string;
}

const DailyTransactions: React.FC<DailyTransactionsProps> = ({ 
  transactions,
  date = new Date().toISOString().split('T')[0]
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateTransaction } = useTransactionStore();
  const { user } = useAuthStore();
  
  // Check if user is admin (only admins can approve/reject)
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Filter out rejected transactions for totals
  // IMPORTANT: Only count APPROVED transactions for totals
  const validTransactions = transactions.filter(t => t.status === 'APPROVED');
  
  const totals = validTransactions.reduce((acc, curr) => ({
    cash: Number(acc.cash) + Number(curr.cash),
    checks: Number(acc.checks) + Number(curr.checks),
    atmMobile: Number(acc.atmMobile) + Number(curr.atmMobile),
    paypal: Number(acc.paypal) + Number(curr.paypal),
    total: Number(acc.total) + Number(curr.total)
  }), {
    cash: 0,
    checks: 0,
    atmMobile: 0,
    paypal: 0,
    total: 0
  });

  const handleStatusChange = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateTransaction(id, { status });
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" leftIcon={<Clock size={14} />}>{t('transactions.pending')}</Badge>;
      case 'APPROVED':
        return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>{t('transactions.approved')}</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" leftIcon={<XCircle size={14} />}>{t('transactions.rejected')}</Badge>;
    }
  };

  return (
    <Card
      title={t('dashboard.dailyTransactions')}
      subtitle={new Date(date).toLocaleDateString()}
      icon={<DollarSign size={20} />}
    >
      <div className="space-y-4">
        {/* Mobile-first table */}
        <div className="block lg:hidden space-y-3">
          {transactions.map((transaction) => (
            <div 
              key={transaction.id}
              className={`p-4 rounded-lg border ${
                transaction.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' : 
                transaction.status === 'REJECTED' ? 'bg-red-50 border-red-200' : 
                'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium text-gray-900">{transaction.studentName}</p>
                  <p className="text-sm text-gray-500">{transaction.leaderName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${Number(transaction.total).toFixed(2)}</p>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cash:</span>
                  <span>${Number(transaction.cash).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Checks:</span>
                  <span>${Number(transaction.checks).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ATM/Mobile:</span>
                  
                  <span>${Number(transaction.atmMobile).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">PayPal:</span>
                  <span>${Number(transaction.paypal).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Badge variant="primary">
                  {transaction.books?.reduce((sum, book) => sum + book.quantity, 0) || 0} books
                </Badge>
                
                {transaction.status === 'PENDING' && isAdmin ? (
                  <div className="flex space-x-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleStatusChange(transaction.id, 'APPROVED')}
                    >
                      <CheckCircle size={14} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleStatusChange(transaction.id, 'REJECTED')}
                    >
                      <XCircle size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/transactions/${transaction.id}`)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.student')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.leader')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.cash')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.checks')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.atmMobile')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.paypal')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.total')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <BookText size={14} className="inline" />
                </th>
                <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.status')}
                </th>
                <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className={
                  transaction.status === 'PENDING' 
                    ? 'bg-yellow-50/50' 
                    : transaction.status === 'REJECTED'
                      ? 'bg-red-50/50'
                      : ''
                }>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {transaction.studentName}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {transaction.leaderName}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    ${Number(transaction.cash).toFixed(2)}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    ${Number(transaction.checks).toFixed(2)}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    ${Number(transaction.atmMobile).toFixed(2)}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    ${Number(transaction.paypal).toFixed(2)}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    ${Number(transaction.total).toFixed(2)}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Badge variant="primary">
                      {transaction.books?.reduce((sum, book) => sum + book.quantity, 0) || 0}
                    </Badge>
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-center">
                    {getStatusBadge(transaction.status)}
                  </td>
                  <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-center">
                    {transaction.status === 'PENDING' && isAdmin ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleStatusChange(transaction.id, 'APPROVED')}
                        >
                          <CheckCircle size={16} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleStatusChange(transaction.id, 'REJECTED')}
                        >
                          <XCircle size={16} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/transactions/${transaction.id}`)}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={2} className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {t('common.totals')}
                </td>
                
                <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${Number(totals.cash).toFixed(2)}
                </td>
                <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${Number(totals.checks).toFixed(2)}
                </td>
                <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${Number(totals.atmMobile).toFixed(2)}
                </td>
                <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${Number(totals.paypal).toFixed(2)}
                </td>
                <td className="px-3 lg:px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${Number(totals.total).toFixed(2)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <Wallet className="text-green-600 mr-2 sm:mr-3 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-green-600 truncate">{t('transactions.cash')}</p>
                <p className="text-sm sm:text-lg font-semibold text-green-700 truncate">
                  ${Number(totals.cash).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <CreditCard className="text-blue-600 mr-2 sm:mr-3 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-600 truncate">{t('transactions.checks')}</p>
                <p className="text-sm sm:text-lg font-semibold text-blue-700 truncate">
                  ${Number(totals.checks).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-primary-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="text-primary-600 mr-2 sm:mr-3 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-primary-600 truncate">{t('transactions.atmMobile')}</p>
                <p className="text-sm sm:text-lg font-semibold text-primary-700 truncate">
                  ${Number(totals.atmMobile).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-cta-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="text-cta-600 mr-2 sm:mr-3 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-cta-600 truncate">{t('transactions.paypal')}</p>
                <p className="text-sm sm:text-lg font-semibold text-cta-700 truncate">
                  ${Number(totals.paypal).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DailyTransactions;