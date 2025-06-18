import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, CheckCircle, XCircle, DollarSign, BookText } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, BookSize } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingScreen from '../../components/ui/LoadingScreen';

const TransactionDetails: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transactions, approveTransaction, rejectTransaction, isLoading } = useTransactionStore();
  const { user } = useAuthStore();
  
  // Check if user is admin (only admins can approve/reject)
  const isAdmin = user?.role === UserRole.ADMIN;

  const transaction = transactions.find(t => Number(t.id) === Number(id));

  if (isLoading) {
    return <LoadingScreen message="Loading transaction details..." />;
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Transaction not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/transactions')}
        >
          Go back
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" leftIcon={<Clock size={14} />}>{t('transactions.pending')}</Badge>;
      case 'APPROVED':
        return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>{t('transactions.approved')}</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" leftIcon={<XCircle size={14} />}>{t('transactions.rejected')}</Badge>;
      default:
        return null;
    }
  };

  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED') => {
    try {
      if (status === 'APPROVED') {
        await approveTransaction(transaction.id);
      } else {
        await rejectTransaction(transaction.id);
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  };

  // Calculate book totals by size
  const bookTotals = {
    large: 0,
    small: 0,
    total: 0
  };

  transaction.books?.forEach(book => {
    // Use the book's size field if available, otherwise determine by price
    const bookSize = book.size;
    if (bookSize === BookSize.LARGE) {
      bookTotals.large += book.quantity;
    } else {
      bookTotals.small += book.quantity;
    }
    bookTotals.total += book.quantity;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/transactions')}
          >
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Transaction Details
          </h1>
        </div>
        {transaction.status === 'PENDING' && isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={() => handleStatusChange('APPROVED')}
              leftIcon={<CheckCircle size={16} />}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => handleStatusChange('REJECTED')}
              leftIcon={<XCircle size={16} />}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Transaction Info</h2>
                {getStatusBadge(transaction.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('common.student')}</p>
                  <p className="font-medium">{transaction.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('common.leader')}</p>
                  <p className="font-medium">{transaction.leaderName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('transactions.date')}</p>
                  <p className="font-medium">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-medium">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Payment Details" icon={<DollarSign size={20} />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">{t('transactions.cash')}</p>
                  <p className="text-lg font-semibold text-green-700">
                    ${transaction.cash.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">{t('transactions.checks')}</p>
                  <p className="text-lg font-semibold text-blue-700">
                    ${transaction.checks.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">{t('transactions.atmMobile')}</p>
                  <p className="text-lg font-semibold text-purple-700">
                    ${transaction.atmMobile.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600">{t('transactions.paypal')}</p>
                  <p className="text-lg font-semibold text-indigo-700">
                    ${transaction.paypal.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="font-medium text-gray-700">{t('common.total')}:</span>
                <Badge variant="primary" size="lg">
                  ${transaction.total.toFixed(2)}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Books Delivered" icon={<BookText size={20} />}>
          <div className="space-y-4">
            {/* Book size summary */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-primary-50 rounded-lg text-center">
                <p className="text-sm font-medium text-primary-700">Large Books</p>
                <p className="text-xl font-bold text-primary-800">{bookTotals.large}</p>
              </div>
              <div className="p-3 bg-success-50 rounded-lg text-center">
                <p className="text-sm font-medium text-success-700">Small Books</p>
                <p className="text-xl font-bold text-success-800">{bookTotals.small}</p>
              </div>
            </div>

            {/* Book list */}
            {transaction.books?.map((book) => {
              // Use the book's size field if available, otherwise determine by price
              const bookSize = book.size;
              return (
                <div 
                  key={book.id} 
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    bookSize === BookSize.LARGE ? 'bg-primary-50' : 'bg-success-50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{book.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">${book.price.toFixed(2)}</p>
                      <Badge 
                        variant={bookSize === BookSize.LARGE ? "primary" : "success"}
                        size="sm"
                      >
                        {bookSize === BookSize.LARGE ? "Large" : "Small"}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={bookSize === BookSize.LARGE ? "primary" : "success"}>
                    {book.quantity}
                  </Badge>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className="font-medium text-gray-700">Total Books:</span>
              <Badge variant="primary" size="lg">
                {bookTotals.total}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TransactionDetails;