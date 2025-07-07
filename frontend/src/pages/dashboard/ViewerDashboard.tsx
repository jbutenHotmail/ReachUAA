import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useProgramStore } from '../../stores/programStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import GoalProgress from '../../components/dashboard/GoalProgress';
import Card from '../../components/ui/Card';
import { FileText, DollarSign, Calendar, BookText, TrendingUp, RefreshCw, ChevronRight, BookOpen } from 'lucide-react';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { formatNumber } from '../../utils/numberUtils';
import Badge from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

const ViewerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { program } = useProgramStore();
  const { 
    stats, 
    personalStats, 
    isLoadingPersonalStats, 
    personalStatsError, 
    fetchPersonalStats, 
    fetchDashboardStats,
    werePersonalStatsFetched 
  } = useDashboardStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'books'>('sales');
  
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);
  
  // Handle refresh button click
  const handleRefresh = async () => {
    if (!user?.id) return;
    
    setIsRefreshing(true);
    try {
      await fetchPersonalStats(user.id, true);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle manual refresh
  const handleDataRefresh = () => {
    if (!user?.id) return;
    fetchPersonalStats(user.id, true);
  };
  
  // Fetch personal stats if not already fetched
  React.useEffect(() => {
    if (user?.id && !werePersonalStatsFetched && !isLoadingPersonalStats) {
      fetchPersonalStats(user.id);
    }
  }, [user, fetchPersonalStats, werePersonalStatsFetched, isLoadingPersonalStats]);
  
  // Create program goal object for GoalProgress component
  const programGoal = program && stats ? {
    amount: parseFloat(program.financial_goal),
    achieved: stats.program.achieved,
    startDate: program.start_date,
    endDate: program.end_date
  } : null;
  
  // Calculate book totals from transactions
  const bookTotals = React.useMemo(() => {
    if (!personalStats || !personalStats.transactions) return { large: 0, small: 0, total: 0 };
    console.log(personalStats.transactions)
    return personalStats.transactions.reduce((acc, transaction) => {
      transaction.books?.forEach(book => {
        if (book.size === 'LARGE') {
          console.log(book)
          acc.large += book.quantity;
        } else {
          console.log(book)
          acc.small += book.quantity;
        }
      });
      acc.total = acc.large + acc.small;
      return acc;
    }, { large: 0, small: 0, total: 0 });
  }, [personalStats]);
  
  if (isLoadingPersonalStats || !personalStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t('dashboard.loading')} />
      </div>
    );
  }
  
  if (personalStatsError) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="text-danger-500 mb-4">
            <FileText size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('dashboard.errorTitle')}</h2>
          <p className="text-gray-600 mb-4">{personalStatsError}</p>
          <Button variant="primary" onClick={handleRefresh}>
            {t('dashboard.tryAgain')}
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {t('dashboard.welcome')}, {user?.name}!
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDataRefresh}
          leftIcon={<RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />}
          disabled={isRefreshing}
        >
          {t('common.refresh')}
        </Button>
      </div>
      
      {/* Program Goal */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <div>
          {programGoal && <GoalProgress goal={programGoal} />}
        </div>
      </div>
      
      {/* Tabs for Sales/Books */}
      <div className="flex border-b border-gray-200">
        <button
          className={clsx(
            'py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2',
            activeTab === 'sales'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => setActiveTab('sales')}
        >
          <DollarSign size={16} />
          {t('dashboard.sales')}
        </button>
        <button
          className={clsx(
            'py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2',
            activeTab === 'books'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => setActiveTab('books')}
        >
          <BookText size={16} />
          {t('inventory.books')}
        </button>
      </div>
      
      {/* Personal Report */}
      {personalStats && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="text-primary-600" size={24} />
              {t('dashboard.personalReport')}
            </h2>
            <span className="text-sm text-gray-500">
              {new Date(personalStats.startDate).toLocaleDateString()} - {new Date(personalStats.endDate).toLocaleDateString()}
            </span>
          </div>
          
          {/* Summary Cards */}
          {activeTab === 'sales' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="text-primary-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.totalSales')}</p>
                  <p className="mt-1 text-2xl font-bold text-primary-600">
                    ${formatNumber(personalStats.totals.total)}
                  </p>
                  <p className="text-xs text-gray-500">{t('dashboard.currentMonth')}</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="text-success-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.workingDays')}</p>
                  <p className="mt-1 text-2xl font-bold text-success-600">
                    {Object.keys(personalStats.dailyEarnings).length}
                  </p>
                  <p className="text-xs text-gray-500">{t('dashboard.daysWithSales')}</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BookText className="text-warning-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.transactions')}</p>
                  <p className="mt-1 text-2xl font-bold text-warning-600">
                    {personalStats.transactions.length}
                  </p>
                  <p className="text-xs text-gray-500">{t('dashboard.approvedTransactions')}</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="text-cta-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.dailyAverage')}</p>
                  <p className="mt-1 text-2xl font-bold text-cta-600">
                    ${formatNumber(personalStats.totals.total / Math.max(1, Object.keys(personalStats.dailyEarnings).length))}
                  </p>
                  <p className="text-xs text-gray-500">{t('dashboard.perWorkingDay')}</p>
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BookOpen className="text-primary-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('reports.totalBooks')}</p>
                  <p className="mt-1 text-2xl font-bold text-primary-600">
                    {bookTotals.total}
                  </p>
                  <p className="text-xs text-gray-500">{t('reports.delivered')}</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BookText className="text-success-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('inventory.large')}</p>
                  <p className="mt-1 text-2xl font-bold text-success-600">
                    {bookTotals.large}
                  </p>
                  <p className="text-xs text-gray-500">{t('reports.delivered')}</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BookText className="text-warning-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('inventory.small')}</p>
                  <p className="mt-1 text-2xl font-bold text-warning-600">
                    {bookTotals.small}
                  </p>
                  <p className="text-xs text-gray-500">{t('reports.delivered')}</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="text-cta-600" size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">{t('dashboard.dailyAverage')}</p>
                  <p className="mt-1 text-2xl font-bold text-cta-600">
                    {Math.round(bookTotals.total / Math.max(1, Object.keys(personalStats.dailyEarnings).length))}
                  </p>
                  <p className="text-xs text-gray-500">{t('reports.booksPerDay')}</p>
                </div>
              </Card>
            </div>
          )}
          
          {/* Earnings Breakdown */}
          <Card 
            title={activeTab === 'sales' ? t('dashboard.earningsBreakdown') : t('colporterReport.bookDetails')} 
            icon={activeTab === 'sales' ? <DollarSign size={20} /> : <BookText size={20} />}
          >
              {activeTab === 'sales' ? (
                <>
                  <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary-600">{t('dashboard.yourEarnings')} (${personalStats.earnings.percentage}%)</p>
                        <p className="text-2xl font-bold text-primary-700 mt-1">
                          ${formatNumber(personalStats.earnings.net)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-primary-600">{t('dashboard.basedOnSales')}</p>
                        <p className="text-lg font-semibold text-primary-700">${formatNumber(personalStats.totals.total)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {personalStats.earnings.charges > 0 && (
                      <div className="p-3 bg-danger-50 rounded-lg">
                        <p className="text-sm font-medium text-danger-700">{t('dashboard.chargesFines')}</p>
                        <p className="text-lg font-bold text-danger-700">
                          -${formatNumber(personalStats.earnings.charges)}
                        </p>
                        <p className="text-xs text-danger-600 mt-1">
                          {personalStats.charges.length} {t('dashboard.activeCharges')}
                        </p>
                      </div>
                    )}
                    
                    {personalStats.earnings.advances > 0 && (
                      <div className="p-3 bg-warning-50 rounded-lg">
                        <p className="text-sm font-medium text-warning-700">{t('dashboard.cashAdvances')}</p>
                        <p className="text-lg font-bold text-warning-700">
                          -${formatNumber(personalStats.earnings.advances)}
                        </p>
                        <p className="text-xs text-warning-600 mt-1">
                          {personalStats.advances.length} {t('dashboard.approvedAdvances')}
                        </p>
                      </div>
                    )}
                    
                    <div className="p-3 bg-success-50 rounded-lg md:col-span-1">
                      <p className="text-sm font-medium text-success-700">{t('dashboard.finalAmount')}</p>
                      <p className="text-lg font-bold text-success-700">
                        ${formatNumber(personalStats.earnings.final)}
                      </p>
                      <p className="text-xs text-success-600 mt-1">
                        {t('dashboard.afterDeductions')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Daily Sales Chart (simplified) */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">{t('dashboard.dailySales')}</h3>
                    <div className="grid grid-cols-7 gap-2">
                      {Object.entries(personalStats.dailyEarnings)
                        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                        .slice(-7) // Show only the last 7 days with sales
                        .map(([date, amount]) => {
                          const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                          const dayNum = new Date(date).getDate();
                          
                          // Calculate height percentage (max 100%)
                          const maxAmount = Math.max(...Object.values(personalStats.dailyEarnings));
                          const heightPercentage = Math.max(10, Math.min(100, (amount / maxAmount) * 100));
                          
                          return (
                            <div key={date} className="flex flex-col items-center">
                              <div className="text-xs text-gray-500">{dayName}</div>
                              <div className="w-full flex justify-center items-end h-24">
                                <div 
                                  className="w-5 sm:w-8 bg-primary-200 hover:bg-primary-300 rounded-t transition-all"
                                  style={{ height: `${heightPercentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs font-medium">{dayNum}</div>
                              <div className="text-xs text-gray-600">${formatNumber(amount, 0)}</div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary-600">{t('reports.totalBooks')}</p>
                        <p className="text-2xl font-bold text-primary-700 mt-1">
                          {bookTotals.total}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-primary-600">{t('inventory.books')}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="primary">{t('inventory.large')}: {bookTotals.large}</Badge>
                          <Badge variant="success">{t('inventory.small')}: {bookTotals.small}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Book distribution by transaction */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('common.date')}
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('inventory.large')}
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('inventory.small')}
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('common.total')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {personalStats.transactions
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 7)
                          .map((transaction) => {
                            const largeBooks = transaction.books?.reduce((sum, book) => {
                              return sum + (book.size === 'LARGE' ? book.quantity : 0);
                            }, 0) || 0;
                            
                            const smallBooks = transaction.books?.reduce((sum, book) => {
                              return sum + (book.size === 'SMALL' ? book.quantity : 0);
                            }, 0) || 0;
                            
                            return (
                              <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                  <Badge variant="primary">{largeBooks}</Badge>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                  <Badge variant="success">{smallBooks}</Badge>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                  <Badge variant="secondary">{largeBooks + smallBooks}</Badge>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                            {t('common.totals')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                            <Badge variant="primary">{bookTotals.large}</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                            <Badge variant="success">{bookTotals.small}</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                            <Badge variant="secondary">{bookTotals.total}</Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
              
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/transactions/finances')}
                  rightIcon={<ChevronRight size={16} />}
                >
                  {t('dashboard.createTransaction')}
                </Button>
              </div>
          </Card>
          
        </div>
      )}
      {personalStats.transactions.length > 0 && activeTab === 'sales' && (
        <div></div>
      )}
    </div>
  );
};

export default ViewerDashboard;