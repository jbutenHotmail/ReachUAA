import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, BookText, DollarSign, Users, ChevronRight, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useProgramStore } from '../../stores/programStore';
import { api } from '../../api';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { Leader } from '../../types';

const LeaderDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { program } = useProgramStore();
  
  // State for leader data
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [leaderStats, setLeaderStats] = useState<any>(null);
  const [colporterStats, setColporterStats] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, { sales: number; days: number; books: { large: number; small: number } }>>({});

  // Fetch leader ID by name
  useEffect(() => {
    const getLeaderId = async () => {
      try {
        const people: Leader[] = await api.get('/people/leaders');
        const leader = people.find((p: any) => 
          `${p.name} ${p.apellido}` === name || 
          p.name === name
        );
        
        if (leader) {
          setLeaderId(leader.id);
        } else {
          setError(t('common.error'));
        }
      } catch (err) {
        console.error('Error fetching leader:', err);
        setError(t('common.error'));
      }
    };
    
    if (name) {
      getLeaderId();
    }
  }, [name, t]);

  // Fetch transactions for this leader's team
  useEffect(() => {
    const loadTransactionData = async () => {
      if (!leaderId) return;
      
      setIsLoading(true);
      try {
        const leaderTransactions = await api.get('/transactions', { 
          params: { leaderId, status: 'APPROVED', programId: program?.id }
        });
        
        processTransactionData(leaderTransactions);
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        setError(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (leaderId) {
      loadTransactionData();
    }
  }, [leaderId, t]);

  // Process transaction data to get statistics
  const processTransactionData = (leaderTransactions: any[] ) => {
    if (!leaderTransactions.length) {
      console.log('no transactions')
      setLeaderStats(null);
      setColporterStats([]);
      setMonthlyData({});
      return;
    }
    
    const totalSales = leaderTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalBooks = {
      large: 0,
      small: 0
    };
    
    leaderTransactions.forEach(transaction => {
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.size === 'LARGE') {
            totalBooks.large += book.quantity;
          } else {
            totalBooks.small += book.quantity;
          }
        });
      }
    });
    
    const colporterMap = new Map();
    
    leaderTransactions.forEach(transaction => {
      if (!colporterMap.has(transaction.studentId)) {
        colporterMap.set(transaction.studentId, {
          id: transaction.studentId,
          name: transaction.studentName,
          totalSales: 0,
          transactions: [],
          books: {
            large: 0,
            small: 0
          },
          bestDay: {
            date: '',
            amount: 0
          }
        });
      }
      
      const colporter = colporterMap.get(transaction.studentId);
      colporter.totalSales += transaction.total;
      colporter.transactions.push(transaction);
      
      if (transaction.total > colporter.bestDay.amount) {
        colporter.bestDay = {
          date: transaction.date,
          amount: transaction.total
        };
      }
      
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.size === 'LARGE') {
            colporter.books.large += book.quantity;
          } else {
            colporter.books.small += book.quantity;
          }
        });
      }
    });
    
    const colporterStatsArray = Array.from(colporterMap.values()).map(colporter => ({
      ...colporter,
      averageSales: colporter.totalSales / colporter.transactions.length
    }));
    
    const monthlyDataObj: Record<string, { sales: number; days: number; books: { large: number; small: number } }> = {};
    
    leaderTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const month = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      
      if (!monthlyDataObj[month]) {
        monthlyDataObj[month] = { 
          sales: 0, 
          days: 0, 
          books: { large: 0, small: 0 } 
        };
      }
      
      const dateStr = transaction.date;
      const isNewDay = !leaderTransactions.some(t => 
        t.date === dateStr && 
        t.id !== transaction.id && 
        new Date(t.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) === month
      );
      
      if (isNewDay) {
        monthlyDataObj[month].days += 1;
      }
      
      monthlyDataObj[month].sales += transaction.total;
      
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.size === 'LARGE') {
            monthlyDataObj[month].books.large += book.quantity;
          } else {
            monthlyDataObj[month].books.small += book.quantity;
          }
        });
      }
    });
    
    const salesByDay = leaderTransactions.reduce((acc: Record<string, number>, transaction) => {
      const date = transaction.date;
      acc[date] = (acc[date] || 0) + transaction.total;
      return acc;
    }, {});
    
    const salesEntries = Object.entries(salesByDay);
    const bestDay = salesEntries.reduce((best, [date, amount]) => 
      amount > best.amount ? { date, amount } : best, 
      { date: '', amount: 0 }
    );
    const worstDay = salesEntries.reduce((worst, [date, amount]) => 
      amount < worst.amount ? { date, amount } : worst, 
      { date: '', amount: Infinity }
    );
    
    const workingDays = Object.keys(salesByDay).length;
    
    setLeaderStats({
      totalSales,
      averageSales: totalSales / workingDays,
      totalBooks,
      colporterCount: colporterStatsArray.length,
      workingDays,
      bestDay,
      worstDay: worstDay.amount === Infinity ? { date: '', amount: 0 } : worstDay,
    });
    
    setColporterStats(colporterStatsArray);
    setMonthlyData(monthlyDataObj);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t('common.error')}</p>
        <p>{error}</p>
      </div>
    );
  }
  if (!leaderStats || colporterStats.length === 0) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">{t('colporterReport.noData')}</p>
        <p>{t('colporterReport.noDataDescription')}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/reports/donations/finances')}
        >
          {t('common.back')}
        </Button>
      </div>
    );
  }

  // Calculate leader earnings based on their team's sales
  const leaderPercentage = program?.financialConfig?.leader_percentage 
    ? parseFloat(program.financialConfig.leader_percentage) / 100 
    : 0.15;
  
  // Calculate leader earnings based on their team's sales, not the entire program
  const leaderEarnings = leaderStats.totalSales * leaderPercentage;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/reports/donations/finances')}
        >
          <ChevronLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-primary-600" size={28} />
            {name} - {t('dashboard.title')}
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <Calendar size={16} />
            {t('reports.completeProgram')} • {leaderStats.workingDays} {t('common.days')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('dashboard.totalSales')}</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">{formatCurrency(leaderStats.totalSales)}</p>
            <p className="text-xs text-gray-500">{leaderStats.colporterCount} {t('common.colporters')}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="text-success-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('reports.perColporter')}</p>
            <p className="mt-1 text-2xl font-bold text-success-600">
              {formatCurrency(leaderStats.totalSales / leaderStats.colporterCount)}
            </p>
            <p className="text-xs text-gray-500">{t('reports.completeProgram')}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookText className="text-warning-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('reports.totalBooks')}</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">
              {leaderStats.totalBooks.large + leaderStats.totalBooks.small}
            </p>
            <p className="text-xs text-gray-500">
              {leaderStats.totalBooks.large} {t('colporterReport.largeBooks')}, {leaderStats.totalBooks.small} {t('colporterReport.smallBooks')}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="text-info-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('dashboard.dailyAverage')}</p>
            <p className="mt-1 text-2xl font-bold text-info-600">
              {formatCurrency(leaderStats.totalSales / leaderStats.workingDays)}
            </p>
            <p className="text-xs text-gray-500">{t('dashboard.perWorkingDay')}</p>
          </div>
        </Card>
      </div>

      <Card title={t('dashboard.earningsBreakdown')} icon={<DollarSign size={20} />}>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">{t('programSettings.leaderPercentage')} ({program?.financialConfig?.leader_percentage || 15}%)</p>
                <p className="text-2xl font-bold text-purple-800 mt-1">
                  {formatCurrency(leaderEarnings)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-600">{t('dashboard.basedOnSales')}</p>
                <p className="text-lg font-semibold text-purple-700">{formatCurrency(leaderStats.totalSales)}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-100">
              <p className="text-sm text-purple-800">
                <strong>{t('confirmationStep.importantNotes')}:</strong> {t('programSettings.leaderPercentage')} {t('reports.distributionExpenses')} ({formatCurrency(leaderStats.totalSales)}) {t('reports.totalSales')}.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{t('confirmationStep.programPeople')}</p>
              <p className="text-lg font-bold text-gray-900">
                {leaderStats.colporterCount}
              </p>
              <p className="text-xs text-gray-500">
                {t('common.colporters')}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{t('reports.perColporter')}</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(leaderEarnings / leaderStats.colporterCount)}
              </p>
              <p className="text-xs text-gray-500">
                {t('confirmationStep.programPeople')}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{t('dashboard.perWorkingDay')}</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(leaderEarnings / leaderStats.workingDays)}
              </p>
              <p className="text-xs text-gray-500">
                {t('dashboard.perWorkingDay')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card title={t('colporterReport.salesDetails')} icon={<Users size={20} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.colporter')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.totalSales')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.dailyAverage')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('colporterReport.largeBooks')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('colporterReport.smallBooks')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('colporterReport.bestDay')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.details')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {colporterStats.map((colporter, index) => (
                <tr key={colporter.id} className={index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {colporter.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(colporter.totalSales)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(colporter.averageSales)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Badge variant="primary">{colporter.books.large}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Badge variant="success">{colporter.books.small}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <div className="text-xs text-gray-500">
                      {colporter.bestDay.date ? new Date(colporter.bestDay.date).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </div>
                    <div className="font-medium text-success-600">
                      {colporter.bestDay.date ? formatCurrency(colporter.bestDay.amount) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/reports/summer-colporter/${colporter.name}`)}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {t('common.total')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {formatCurrency(leaderStats.totalSales)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {formatCurrency(leaderStats.averageSales)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                  <Badge variant="primary">{leaderStats.totalBooks.large}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                  <Badge variant="success">{leaderStats.totalBooks.small}</Badge>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card title={t('reports.monthly')} icon={<Calendar size={20} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('programSettings.months')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.totalSales')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('programSettings.workingDays')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dashboard.dailyAverage')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('colporterReport.largeBooks')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('colporterReport.smallBooks')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(monthlyData).map(([month, data]) => (
                <tr key={month} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {month}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(data.sales)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                    {data.days}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(data.sales / data.days)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Badge variant="primary">{data.books.large}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Badge variant="success">{data.books.small}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={t('dashboard.performanceForecast')} icon={<TrendingUp size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">{t('colporterReport.salesDetails')}</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                <span className="text-sm font-medium text-primary-700">{t('reports.perColporter')}</span>
                <span className="text-lg font-bold text-primary-700">
                  {formatCurrency(leaderStats.totalSales / leaderStats.colporterCount)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
                <span className="text-sm font-medium text-success-700">{t('dashboard.dailyAverage')}</span>
                <span className="text-lg font-bold text-success-700">
                  {formatCurrency(leaderStats.totalSales / leaderStats.workingDays)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-warning-50 rounded-lg">
                <span className="text-sm font-medium text-warning-700">{t('colporterReport.bestDay')}</span>
                <span className="text-lg font-bold text-warning-700">
                  {leaderStats.bestDay.date ? formatCurrency(leaderStats.bestDay.amount) : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">{t('colporterReport.bookDetails')}</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                <span className="text-sm font-medium text-primary-700">{t('reports.perColporter')}</span>
                <span className="text-lg font-bold text-primary-700">
                  {Math.round((leaderStats.totalBooks.large + leaderStats.totalBooks.small) / leaderStats.colporterCount)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
                <span className="text-sm font-medium text-success-700">{t('reports.booksPerDay')}</span>
                <span className="text-lg font-bold text-success-700">
                  {((leaderStats.totalBooks.large + leaderStats.totalBooks.small) / leaderStats.workingDays).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-warning-50 rounded-lg">
                <span className="text-sm font-medium text-warning-700">{t('colporterReport.largeBooks')}/{t('colporterReport.smallBooks')} {t('reports.byColporters')}</span>
                <span className="text-lg font-bold text-warning-700">
                  {leaderStats.totalBooks.small > 0 
                    ? (leaderStats.totalBooks.large / leaderStats.totalBooks.small).toFixed(1) 
                    : leaderStats.totalBooks.large}:1
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LeaderDetailPage;