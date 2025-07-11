import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, CheckCircle, XCircle, DollarSign, BookText, AlertTriangle } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, BookSize } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingScreen from '../../components/ui/LoadingScreen';

const TransactionDetails: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transactions, approveTransaction, rejectTransaction, isLoading } = useTransactionStore();
  const { user } = useAuthStore();
  if (transactions.length === 0) {
    console.log('transactions', transactions)
    return navigate('/transactions/finances');
  }

  // Check if user is admin (only admins can approve/reject)
  const isAdmin = user?.role === UserRole.ADMIN;

  const transaction = transactions.find(t => Number(t.id) === Number(id));

  if (isLoading) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('transactionDetails.notFound')}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/transactions')}
        >
          {t('common.back')}
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
    total: 0,
    value: 0
  };
  transaction.books?.forEach(book => {
    const bookSize = book.size;
    if (bookSize === BookSize.LARGE) {
      bookTotals.large += book.quantity;
    } else {
      bookTotals.small += book.quantity;
    }
    bookTotals.total += book.quantity;
    bookTotals.value += book.price * book.quantity;
  });

  // Calculate the surplus (can be positive or negative)
  const surplus = Number(transaction.total) - bookTotals.value;
  const hasPositiveSurplus = surplus > 0;
  const hasNegativeSurplus = surplus < 0;

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
            {t('transactionDetails.title')}
          </h1>
        </div>
        {transaction.status === 'PENDING' && isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={() => handleStatusChange('APPROVED')}
              leftIcon={<CheckCircle size={16} />}
            >
              {t('transactionDetails.approve')}
            </Button>
            <Button
              variant="danger"
              onClick={() => handleStatusChange('REJECTED')}
              leftIcon={<XCircle size={16} />}
            >
              {t('transactionDetails.reject')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">{t('transactionDetails.transactionInfo')}</h2>
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
                    {new Date(transaction.date).toLocaleDateString(i18n.language, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'UTC'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('transactionDetails.createdAt')}</p>
                  <p className="font-medium">
                    {new Date(transaction.createdAt).toLocaleDateString(i18n.language, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card title={t('transactionDetails.paymentDetails')} icon={<DollarSign size={20} />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">{t('transactionDetails.cash')}</p>
                  <p className="text-lg font-semibold text-green-700">
                    ${Number(transaction.cash).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">{t('transactionDetails.checks')}</p>
                  <p className="text-lg font-semibold text-blue-700">
                    ${Number(transaction.checks).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">{t('transactionDetails.atmMobile')}</p>
                  <p className="text-lg font-semibold text-purple-700">
                    ${Number(transaction.atmMobile).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600">{t('transactionDetails.paypal')}</p>
                  <p className="text-lg font-semibold text-indigo-700">
                    ${Number(transaction.paypal).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="font-medium text-gray-700">{t('common.total')}:</span>
                <Badge variant="primary" size="lg">
                  ${Number(transaction.total).toFixed(2)}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        <Card 
          title={t('transactionDetails.booksDelivered')} 
          icon={<BookText size={20} />}
        >
          <div className="space-y-4">
            {hasPositiveSurplus && (
              <div className="p-3 bg-success-50 border border-success-200 rounded-lg flex items-start gap-2 mb-4">
                <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-medium text-success-700">{t('transactionDetails.extraDonationDetected')}</p>
                  <p className="text-xs text-success-600">
                    {t('transactionDetails.extraDonationMessage', {
                      total: Number(transaction.total).toFixed(2),
                      bookValue: bookTotals.value.toFixed(2),
                      surplus: surplus.toFixed(2)
                    })}
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-primary-50 rounded-lg text-center">
                <p className="text-sm font-medium text-primary-700">{t('transactionDetails.largeBooks')}</p>
                <p className="text-xl font-bold text-primary-800">
                  {bookTotals.large}
                </p>
              </div>
              <div className="p-3 bg-success-50 rounded-lg text-center">
                <p className="text-sm font-medium text-success-700">{t('transactionDetails.smallBooks')}</p>
                <p className="text-xl font-bold text-success-800">
                  {bookTotals.small}
                </p>
              </div>
            </div>

            {transaction.books?.map((book) => {
              const bookSize = book.size;
              return (
                <div 
                  key={book.id} 
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    bookSize === BookSize.LARGE ? 'bg-primary-50' : 'bg-success-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{book.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={bookSize === BookSize.LARGE ? "primary" : "success"}
                        size="sm"
                      >
                        {t(`inventory.${bookSize === BookSize.LARGE ? 'large' : 'small'}`)}
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
              <div className="flex flex-col">
                <span className="font-medium text-gray-700">{t('transactionDetails.totalBooks')}:</span>
                <span className="text-xs text-gray-500">${bookTotals.value.toFixed(2)}</span>
                {hasNegativeSurplus && (
                  <span className="text-xs text-warning-500 font-medium">
                    {t('transactionDetails.difference')}: ${Math.abs(surplus).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="lg">
                  {bookTotals.total}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
        
        <div className="lg:col-span-2">
          <Card title={t('transactionDetails.transactionVsBookValue')} icon={<DollarSign size={20} />}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">{t('transactionDetails.transactionAmount')}</p>
                  <p className="text-lg font-semibold text-blue-700">
                    ${Number(transaction.total).toFixed(2)}
                    {hasPositiveSurplus && (
                      <span className="text-xs ml-2 text-success-600">
                        {t('transactionDetails.extraDonationNote', { amount: surplus.toFixed(2) })}
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">{t('transactionDetails.bookValue')}</p>
                  <p className="text-lg font-semibold text-green-700">
                    ${bookTotals.value.toFixed(2)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${surplus >= 0 ? 'bg-success-50' : 'bg-danger-50'}`}>
                  <p className={`text-sm ${surplus >= 0 ? 'text-success-600' : 'text-danger-600'}`}>{t('transactionDetails.difference')}</p>
                  <p className={`text-lg font-semibold ${surplus >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                    ${surplus.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {hasNegativeSurplus && (
                <div className="p-3 bg-warning-50 rounded-lg border border-warning-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={20} className="text-warning-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning-700">{t('transactionDetails.valueDiscrepancy')}</p>
                      <p className="text-sm text-warning-600">
                        {t('transactionDetails.valueDiscrepancyMessage', { amount: Math.abs(surplus).toFixed(2) })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {hasPositiveSurplus && (
                <div className="p-3 bg-success-50 rounded-lg border border-success-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={20} className="text-success-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-success-700">{t('transactionDetails.extraDonationDetected')}</p>
                      <p className="text-sm text-success-600">
                        {t('transactionDetails.extraDonationMessage', {
                          total: Number(transaction.total).toFixed(2),
                          bookValue: bookTotals.value.toFixed(2),
                          surplus: surplus.toFixed(2)
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {surplus === 0 && (
                <div className="p-3 bg-success-50 rounded-lg border border-success-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={20} className="text-success-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-success-700">{t('transactionDetails.valuesMatch')}</p>
                      <p className="text-sm text-success-600">
                        {t('transactionDetails.valuesMatchMessage')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;