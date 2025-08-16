import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useProgramStore } from '../../stores/programStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useBibleStudyStore } from '../../stores/bibleStudyStore';
import GoalProgress from '../../components/dashboard/GoalProgress';
import Card from '../../components/ui/Card';
import { FileText, DollarSign, BookText, TrendingUp, RefreshCw, Grid3X3, BookOpen } from 'lucide-react';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { formatNumber } from '../../utils/numberUtils';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../../stores/transactionStore';
import { BookSize } from '../../types';
import { normalizeDateString } from '../../utils/dateUtils';
import Badge from '../../components/ui/Badge';

const ViewerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { program } = useProgramStore();
  const { transactions, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore();
  const { bibleStudies, fetchBibleStudies, wereBibleStudiesFetched } = useBibleStudyStore();
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
  const [activeTab, setActiveTab] = useState<'summary' | 'daily'>('summary');
  
  useEffect(() => {
    fetchDashboardStats();
    if (!wereTransactionsFetched) {
      fetchAllTransactions('APPROVED');
    }
    if (!wereBibleStudiesFetched) {
      fetchBibleStudies();
    }
  }, [fetchDashboardStats, fetchAllTransactions, fetchBibleStudies, wereTransactionsFetched, wereBibleStudiesFetched]);
  
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
  
  const handleDataRefresh = () => {
    if (!user?.id) return;
    fetchPersonalStats(user.id, true);
  };
  
  useEffect(() => {
    if (user?.id && !werePersonalStatsFetched && !isLoadingPersonalStats) {
      fetchPersonalStats(user.id);
    }
  }, [user, fetchPersonalStats, werePersonalStatsFetched, isLoadingPersonalStats]);
  
  const userTransactions = React.useMemo(() => {
    if (!personalStats || !personalStats.person) return [];
    return transactions.filter(t => 
      t.studentId === personalStats.person.id && t.status === 'APPROVED'
    );
  }, [transactions, personalStats]);

  const userBibleStudies = React.useMemo(() => {
    if (!personalStats || !personalStats.person) return [];
    return bibleStudies.filter(bs => bs.colporterId === personalStats.person.id);
  }, [bibleStudies, personalStats]);

  const dailyReportData = React.useMemo(() => {
    if (!userTransactions.length && !userBibleStudies.length) return [];

    const allDates = new Set<string>();
    
    // Normalize transaction dates
    userTransactions.forEach(t => {
      const normalizedDate = normalizeDateString(t.createdAt);
      console.log('Transaction date:', t.createdAt, '→ normalized:', normalizedDate, '→ date:', t.date);
      allDates.add(normalizedDate);
    });
    console.log(personalStats)
    // Normalize bible study dates
    userBibleStudies.forEach(bs => {
      const normalizedDate = normalizeDateString(bs.createdAt);
      console.log('Bible study date:', bs.createdAt, '→ normalized:', normalizedDate);
      allDates.add(normalizedDate);
    });

    const sortedDates = Array.from(allDates).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedDates.slice(0, 30).map(date => {
      const dayTransactions = userTransactions.filter(t => normalizeDateString(t.createdAt) === date);
      const dayStudies = userBibleStudies.filter(bs => {
        return normalizeDateString(bs.createdAt) === date;
      });

      const totalSales = dayTransactions.reduce((sum, t) => sum + t.total, 0);
      const totalBooks = dayTransactions.reduce((sum, t) => {
        return sum + (t.books?.reduce((bookSum, book) => bookSum + book.quantity, 0) || 0);
      }, 0);
      const largeBooks = dayTransactions.reduce((sum, t) => {
        return sum + (t.books?.reduce((bookSum, book) => 
          bookSum + (book.size === BookSize.LARGE ? book.quantity : 0), 0) || 0);
      }, 0);
      const smallBooks = dayTransactions.reduce((sum, t) => {
        return sum + (t.books?.reduce((bookSum, book) => 
          bookSum + (book.size === BookSize.SMALL ? book.quantity : 0), 0) || 0);
      }, 0);

      return {
        date,
        transactions: dayTransactions,
        bibleStudies: dayStudies,
        totals: {
          sales: totalSales,
          books: totalBooks,
          largeBooks,
          smallBooks,
          studies: dayStudies.length
        }
      };
    }).filter(day => 
      day.totals.sales > 0 || day.totals.studies > 0
    );
  }, [userTransactions, userBibleStudies]);

  const programGoal = program && stats ? {
    amount: parseFloat(program.financial_goal),
    achieved: stats.program.achieved,
    startDate: program.start_date,
    endDate: program.end_date
  } : null;
  
  const bookTotals = React.useMemo(() => {
    if (!personalStats || !personalStats.transactions) return { large: 0, small: 0, total: 0 };
    
    return personalStats.transactions.reduce((acc, transaction) => {
      transaction.books?.forEach((book: any) => {
        if (book.size === BookSize.LARGE) {
          acc.large += book.quantity;
        } else if (book.size === BookSize.SMALL) {
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
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={clsx(isRefreshing && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
      </div>
      
      {programGoal && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <GoalProgress goal={programGoal} />
        </div>
      )}
      
      <div className="flex border-b border-gray-200">
        <button
          className={clsx(
            'py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2',
            activeTab === 'summary'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => setActiveTab('summary')}
        >
          <DollarSign size={16} />
          {t('dashboard.summary')}
        </button>
        <button
          className={clsx(
            'py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2',
            activeTab === 'daily'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => setActiveTab('daily')}
        >
          <Grid3X3 size={16} />
          {t('dashboard.dailyReport')}
        </button>
      </div>
      
      {personalStats && (
        <div className="space-y-6">
          {activeTab === 'summary' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="text-primary-600" size={24} />
                  {t('dashboard.personalReport')}
                </h2>
                <span className="text-sm text-gray-500">
                  {new Date(personalStats.startDate).toLocaleDateString()} - {new Date(personalStats.endDate).toLocaleDateString()}
                </span>
              </div>
              
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
                      <BookText className="text-warning-600" size={24} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">{t('dashboard.totalBooks')}</p>
                    <p className="mt-1 text-2xl font-bold text-warning-600">
                      {bookTotals.total}
                    </p>
                    <p className="text-xs text-gray-500">
                      {bookTotals.large} grandes, {bookTotals.small} pequeños
                    </p>
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
              
              <Card 
                title={t('dashboard.earningsBreakdown')} 
                icon={<DollarSign size={20} />}
              >
                <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600">{t('dashboard.yourEarnings')} ({personalStats.earnings.percentage}%)</p>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-success-50 rounded-lg">
                    <p className="text-sm font-medium text-success-700">{t('dashboard.workingDays')}</p>
                    <p className="text-lg font-bold text-success-700">
                      {Object.keys(personalStats.dailyEarnings).length}
                    </p>
                    <p className="text-xs text-success-600">{t('dashboard.daysWithSales')}</p>
                  </div>
                </div>
                
                <div className="space-y-4 mt-4">
                  {(personalStats.earnings.charges > 0 || personalStats.earnings.advances > 0) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">{t('individualReports.deductions')}</h4>
                      <div className="space-y-2">
                        {personalStats.earnings.charges > 0 && (
                          <div className="p-3 bg-danger-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium text-danger-700">{t('dashboard.chargesFines')}</p>
                                <p className="text-xs text-danger-600">
                                  {personalStats.charges.length} {t('dashboard.activeCharges')}
                                </p>
                              </div>
                              <p className="text-lg font-bold text-danger-700">
                                -${formatNumber(personalStats.earnings.charges)}
                              </p>
                            </div>
                            
                            {personalStats.charges.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {personalStats.charges.map((charge, index) => (
                                  <div key={index} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-danger-100">
                                    <span className="text-danger-600">{charge.reason}</span>
                                    <span className="font-medium text-danger-700">-${charge.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {personalStats.earnings.advances > 0 && (
                          <div className="p-3 bg-warning-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium text-warning-700">{t('dashboard.cashAdvances')}</p>
                                <p className="text-xs text-warning-600">
                                  {personalStats.advances.length} {t('dashboard.approvedAdvances')}
                                </p>
                              </div>
                              <p className="text-lg font-bold text-warning-700">
                                -${formatNumber(personalStats.earnings.advances)}
                              </p>
                            </div>
                            {personalStats.advances.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {personalStats.advances.map((advance, index) => (
                                  <div key={index} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-warning-100">
                                    <span className="text-warning-600">
                                      Semana {new Date(advance.week_start_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} - {new Date(advance.week_end_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                                    </span>
                                    <span className="font-medium text-warning-700">-${Number(advance.amount).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-lg border border-success-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-success-700">{t('dashboard.finalAmount')}</p>
                        <p className="text-xs text-success-600">{t('dashboard.afterDeductions')}</p>
                      </div>
                      <p className="text-2xl font-bold text-success-800">
                        ${formatNumber(personalStats.earnings.final)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{t('dashboard.dailySales')}</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(personalStats.dailyEarnings)
                      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                      .slice(-7)
                      .map(([date, amount]) => {
                        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = new Date(date).getDate();
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
              </Card>
            </>
          )}
          
          {activeTab === 'daily' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Grid3X3 className="text-primary-600" size={24} />
                  {t('dashboard.dailyReport')}
                </h2>
                <span className="text-sm text-gray-500">
                  {t('dashboard.lastDaysWithActivity', { count: dailyReportData.length })}
                </span>
              </div>
              
              {dailyReportData.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {dailyReportData.map((day) => (
                    <div 
                      onClick={() => navigate(`/daily-report/${day.date}`)} 
                      key={day.date}
                    >
                      <Card 
                      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary-300"
                    >
                      <div className="text-center p-2">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {new Date(day.date).toLocaleDateString('es-ES', { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        
                        {/* Actividad unificada del día */}
                        <div className="space-y-2">
                          {/* Ventas del día */}
                          {day.totals.sales > 0 && (
                            <div className="flex items-center justify-center gap-1">
                              <DollarSign size={12} className="text-primary-600" />
                              <span className="text-sm font-bold text-primary-600">
                                ${day.totals.sales.toFixed(0)}
                              </span>
                            </div>
                          )}
                          
                          {/* Libros y estudios en una línea */}
                          <div className="flex justify-center gap-1 flex-wrap">
                            {day.totals.largeBooks > 0 && (
                              <Badge variant="primary" size="sm" className="text-xs px-1">
                                {day.totals.largeBooks}G
                              </Badge>
                            )}
                            {day.totals.smallBooks > 0 && (
                              <Badge variant="success" size="sm" className="text-xs px-1">
                                {day.totals.smallBooks}P
                              </Badge>
                            )}
                            {day.totals.studies > 0 && (
                              <Badge variant="warning" size="sm" className="text-xs px-1 flex items-center gap-1">
                                <BookOpen size={10} />
                                {day.totals.studies}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Mensaje si no hay actividad */}
                          {day.totals.sales === 0 && day.totals.books === 0 && day.totals.studies === 0 && (
                            <div className="text-xs text-gray-400">Sin actividad</div>
                          )}
                        </div>
                      </div>
                    </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Grid3X3 size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('dashboard.noActivityRegistered')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t('dashboard.startCreatingTransactions')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewerDashboard;