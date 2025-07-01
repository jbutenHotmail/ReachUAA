import React, { useState, useEffect } from 'react';
import { BookText, Heart, Calendar, UserCog, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SummerReport from '../../components/reports/SummerReport';
import SummerBooksReport from '../../components/reports/SummerBooksReport';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { clsx } from 'clsx';
import { useTransactionStore } from '../../stores/transactionStore';
import LoadingScreen from '../../components/ui/LoadingScreen';

type TimePeriod = 'day' | 'week' | 'month' | 'all';

const DonationsReport: React.FC = () => {
  const { t } = useTranslation();
  const [showColporters, setShowColporters] = useState(true);
  const [showLeaders, setShowLeaders] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const { transactions, isLoading, error, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore();

  const isFinancesRoute = location.pathname.includes('/finances');

  useEffect(() => {
    const loadTransactionData = async () => {
      try {
        if (!wereTransactionsFetched) {
          await fetchAllTransactions('APPROVED');
        }
      } catch (err) {
        console.error('Error fetching transaction data:', err);
      }
    };

    loadTransactionData();
  }, [fetchAllTransactions, wereTransactionsFetched]);

  const handleToggleView = () => {
    setShowColporters(!showColporters);
  };

  const handleToggleGrouping = () => {
    setShowLeaders(!showLeaders);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      
      if (timePeriod === 'day') {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
      } else if (timePeriod === 'week') {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      } else if (timePeriod === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      }
      
      return newDate;
    });
  };

  const tabs = [
    { id: 'finances', label: t('donationsReport.donations'), icon: <Heart size={18} />, path: '/reports/donations/finances' },
    { id: 'delivered-books', label: t('reports.deliveredBooks'), icon: <BookText size={18} />, path: '/reports/donations/delivered-books' },
  ];

  const getFilteredTransactions = () => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    const approvedTransactions = transactions.filter(t => t.status === 'APPROVED');
    
    if (timePeriod === 'all') {
      return approvedTransactions;
    }
    
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    return approvedTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      transactionDate.setHours(0, 0, 0, 0);
      
      if (timePeriod === 'day') {
        return transactionDate.getTime() === today.getTime();
      } else if (timePeriod === 'week') {
        const startOfWeek = new Date(today);
        const day = today.getDay();
        startOfWeek.setDate(today.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
      } else if (timePeriod === 'month') {
        return transactionDate.getMonth() === today.getMonth() && 
               transactionDate.getFullYear() === today.getFullYear();
      }
      
      return true;
    });
  };

  const transformTransactionsToSalesData = () => {
    const filteredTransactions = getFilteredTransactions();
    
    const colporterMap = new Map();
    
    filteredTransactions.forEach(transaction => {
      if (!colporterMap.has(transaction.studentId)) {
        colporterMap.set(transaction.studentId, {
          colporterName: transaction.studentName,
          leaderName: transaction.leaderName,
          dailySales: {},
          totalSales: 0
        });
      }
      
      const colporterData = colporterMap.get(transaction.studentId);
      
      if (!colporterData.dailySales[transaction.date]) {
        colporterData.dailySales[transaction.date] = 0;
      }
      
      colporterData.dailySales[transaction.date] += transaction.total;
      colporterData.totalSales += transaction.total;
    });
    
    return Array.from(colporterMap.values());
  };

  const transformTransactionsToBookData = () => {
    const filteredTransactions = getFilteredTransactions();
    
    const colporterMap = new Map();
    
    filteredTransactions.forEach(transaction => {
      if (!colporterMap.has(transaction.studentId)) {
        colporterMap.set(transaction.studentId, {
          colporterName: transaction.studentName,
          leaderName: transaction.leaderName,
          dailyBooks: {},
          totalBooks: { large: 0, small: 0 }
        });
      }
      
      const colporterData = colporterMap.get(transaction.studentId);
      
      if (transaction.books && transaction.books.length > 0) {
        if (!colporterData.dailyBooks[transaction.date]) {
          colporterData.dailyBooks[transaction.date] = { large: 0, small: 0 };
        }
        
        transaction.books.forEach(book => {
          if (book.size === 'LARGE') {
            colporterData.dailyBooks[transaction.date].large += book.quantity;
            colporterData.totalBooks.large += book.quantity;
          } else {
            colporterData.dailyBooks[transaction.date].small += book.quantity;
            colporterData.totalBooks.small += book.quantity;
          }
        });
      }
    });
    
    return Array.from(colporterMap.values());
  };

  const formatDateRange = () => {
    if (timePeriod === 'all') {
      return t('donationsReport.completeProgram');
    }
    
    const startDate = selectedDate;
    
    if (timePeriod === 'day') {
      return startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (timePeriod === 'week') {
      const day = startDate.getDay();
      const sunday = new Date(startDate);
      sunday.setDate(startDate.getDate() - day);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      
      return `${sunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${saturday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    } else if (timePeriod === 'month') {
      return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    return '';
  };

  const salesData = transformTransactionsToSalesData();
  const booksData = transformTransactionsToBookData();

  if (isLoading) {
    return (
      <LoadingScreen message={t('donationsReport.loading')} />
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">{t('common.error')}</p>
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="text-red-500" size={28} />
            {t('donationsReport.title')}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              {formatDateRange()}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Card className="p-0 shadow-sm">
            <div className="flex items-center divide-x">
              {(['day', 'week', 'month', 'all'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={clsx(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    timePeriod === period 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {t(`donationsReport.${period}`)}
                </button>
              ))}
            </div>
          </Card>
          
          {timePeriod !== 'all' && (
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="px-2"
              >
                <ChevronLeft size={20} />
              </Button>
              
              <div className="px-4 py-2 flex items-center gap-2 border-l border-r border-gray-200">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium">
                  {timePeriod === 'day' && selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  {timePeriod === 'week' && t('donationsReport.weekOf', { date: selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) })}
                  {timePeriod === 'month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate('next')}
                className="px-2"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleGrouping}
            leftIcon={showLeaders ? <Users size={16} /> : <UserCog size={16} />}
          >
            {showLeaders ? t('donationsReport.byColporters') : t('donationsReport.byLeaders')}
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={clsx(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2',
                location.pathname.includes(tab.id)
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isFinancesRoute ? (
        <SummerReport 
          sales={salesData}
          showColporters={showColporters}
          showLeaders={showLeaders}
          onToggleView={handleToggleView}
          onToggleGrouping={handleToggleGrouping}
          timePeriod={timePeriod}
          selectedDate={selectedDate}
        />
      ) : (
        <SummerBooksReport
          booksData={booksData}
          showColporters={showColporters}
          showLeaders={showLeaders}
          onToggleView={handleToggleView}
          onToggleGrouping={handleToggleGrouping}
          timePeriod={timePeriod}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

export default DonationsReport;