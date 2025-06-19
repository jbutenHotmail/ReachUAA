import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  AlertTriangle, 
  Receipt, 
  Wallet, 
  Users,
  PieChart,
  BarChart3,
  Download,
  X
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useTransactionStore } from '../../stores/transactionStore';
import { useChargeStore } from '../../stores/chargeStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { useProgramStore } from '../../stores/programStore';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useExpenseStore } from '../../stores/expenseStore';
import LoadingScreen from '../../components/ui/LoadingScreen';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface ProgramFinancials {
  income: {
    donations: number;
    totalDonations: number;
  };
  miscellaneous: {
    fines: number;
    totalFines: number;
  };
  expenses: {
    advances: number;
    programExpenses: number;
    totalExpenses: number;
  };
  distribution: {
    colporterPercentage: number;
    leaderPercentage: number;
    colporterAmount: number;
    leaderAmount: number;
  };
  netProfit: number;
}

interface ColporterFinancials {
  id: string;
  name: string;
  leaderName: string;
  donations: number;
  fines: number;
  charges: number;
  advances: number;
  percentage: number;
  earnings: number;
}

const ProgramReport: React.FC = () => {
  const { t } = useTranslation();
  const [viewType, setViewType] = useState<'summary' | 'detailed'>('summary');
  const [programFinancials, setProgramFinancials] = useState<ProgramFinancials | null>(null);
  const [colporterFinancials, setColporterFinancials] = useState<ColporterFinancials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderFilter, setLeaderFilter] = useState<string>('');
  const { expenses, fetchExpenses, wereExpensesFetched } = useExpenseStore();
  const { transactions, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore();
  const { charges, fetchCharges, wereChargesFetched } = useChargeStore();
  const { advances, fetchAdvances, wereAdvancesFetched } = useCashAdvanceStore();
  const { program, fetchProgram, wasProgramFetched } = useProgramStore();

  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true);
      setError(null);
      let dataToFetch: any[] = [];
      !wereExpensesFetched && dataToFetch.push(fetchExpenses());
      !wereTransactionsFetched && dataToFetch.push(fetchAllTransactions());
      !wereChargesFetched && dataToFetch.push(fetchCharges());
      !wereAdvancesFetched && dataToFetch.push(fetchAdvances());
      !wasProgramFetched && dataToFetch.push(fetchProgram());
      try {
        await Promise.all(dataToFetch);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [fetchAllTransactions, fetchCharges, fetchAdvances, fetchProgram, t]);

  useEffect(() => {
    if (transactions.length > 0 || charges.length > 0 || advances.length > 0 || expenses.length > 0) {
      const colporterPercentage = program?.financialConfig?.colporter_percentage 
        ? parseFloat(program.financialConfig.colporter_percentage) 
        : 50;
      const leaderPercentage = program?.financialConfig?.leader_percentage 
        ? parseFloat(program.financialConfig.leader_percentage) 
        : 15;
      
      const totalDonations = transactions.reduce((sum, t) => sum + t.total, 0);
      
      const filteredCharges = charges.filter(charge => charge.status === 'APPLIED');
      const totalFines = filteredCharges.reduce((sum, c) => sum + c.amount, 0);
      
      const filteredAdvances = advances.filter(advance => advance.status === 'APPROVED');
      const totalAdvances = filteredAdvances.reduce((sum, a) => sum + a.advanceAmount, 0);
      
      const programExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      
      const colporterAmount = totalDonations * (colporterPercentage / 100);
      const leaderAmount = totalDonations * (leaderPercentage / 100);
      
      const totalIncome = totalDonations + totalFines;
      const totalExpenses = totalAdvances + programExpenses;
      const totalDistribution = colporterAmount + leaderAmount;
      const netProfit = totalIncome - totalExpenses - totalDistribution;
      
      setProgramFinancials({
        income: {
          donations: totalDonations,
          totalDonations
        },
        miscellaneous: {
          fines: totalFines,
          totalFines
        },
        expenses: {
          advances: totalAdvances,
          programExpenses,
          totalExpenses
        },
        distribution: {
          colporterPercentage,
          leaderPercentage,
          colporterAmount,
          leaderAmount
        },
        netProfit
      });
      
      const colporterMap = new Map<string, ColporterFinancials>();
      
      transactions.forEach(t => {
        if (!colporterMap.has(t.studentId)) {
          colporterMap.set(t.studentId, {
            id: t.studentId,
            name: t.studentName,
            leaderName: t.leaderName,
            donations: 0,
            fines: 0,
            charges: 0,
            advances: 0,
            percentage: colporterPercentage,
            earnings: 0
          });
        }
        
        const colporter = colporterMap.get(t.studentId)!;
        colporter.donations += t.total;
      });
      
      filteredCharges.forEach(c => {
        if (colporterMap.has(c.personId)) {
          const colporter = colporterMap.get(c.personId)!;
          colporter.charges += c.amount;
        }
      });
      
      filteredAdvances.forEach(a => {
        if (colporterMap.has(a.personId)) {
          const colporter = colporterMap.get(a.personId)!;
          colporter.advances += a.advanceAmount;
        }
      });
      
      colporterMap.forEach(colporter => {
        colporter.earnings = colporter.donations * (colporter.percentage / 100);
      });
      
      setColporterFinancials(Array.from(colporterMap.values()));
    }
  }, [transactions, charges, advances, program, expenses]);

  const filteredColporterFinancials = React.useMemo(() => {
    let filtered = [...colporterFinancials];
    
    if (leaderFilter) {
      filtered = filtered.filter(c => c.leaderName === leaderFilter);
    }
    
    return filtered;
  }, [colporterFinancials, leaderFilter]);

  const uniqueLeaders = React.useMemo(() => {
    const leaders = new Set<string>();
    colporterFinancials.forEach(c => leaders.add(c.leaderName));
    return Array.from(leaders);
  }, [colporterFinancials]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const distributionChartData = {
    labels: [
      t('dashboard.distributionExpenses'),
      t('common.leaders'),
      t('expenses.program'),
      t('cashAdvance.title'),
      t('dashboard.programSurplus')
    ],
    datasets: [
      {
        data: programFinancials ? [
          programFinancials.distribution.colporterAmount,
          programFinancials.distribution.leaderAmount,
          programFinancials.expenses.programExpenses,
          programFinancials.expenses.advances,
          programFinancials.netProfit
        ] : [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const leaderPerformanceData = {
    labels: uniqueLeaders,
    datasets: [
      {
        label: t('reports.programSales'),
        data: uniqueLeaders.map(leader => {
          return colporterFinancials
            .filter(c => c.leaderName === leader)
            .reduce((sum, c) => sum + c.donations, 0);
        }),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: t('dashboard.revenueDistribution'),
        data: uniqueLeaders.map(() => {
          return programFinancials?.distribution.leaderAmount 
            ? programFinancials.distribution.leaderAmount / uniqueLeaders.length
            : 0;
        }),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== undefined) {
              label += formatCurrency(context.parsed);
            }
            return label;
          }
        }
      }
    },
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== undefined) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen message={t('dashboard.loading')} />
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">{t('reports.errorTitle')}</p>
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  if (!programFinancials) {
    return (
      <Card>
        <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
          <p className="font-medium">{t('colporterReport.noData')}</p>
          <p>{t('colporterReport.noDataDescription')}</p>
        </div>
      </Card>
    );
  }

  const leaderSummaries = colporterFinancials.reduce((acc, colporter) => {
    const leaderName = colporter.leaderName;
    
    if (!acc[leaderName]) {
      acc[leaderName] = {
        name: leaderName,
        colporters: [],
        totalDonations: 0,
        totalFines: 0,
        totalCharges: 0,
        totalAdvances: 0,
        totalEarnings: 0,
        leaderPercentage: programFinancials.distribution.leaderPercentage,
      };
    }
    
    acc[leaderName].colporters.push(colporter);
    acc[leaderName].totalDonations += colporter.donations;
    acc[leaderName].totalFines += colporter.fines;
    acc[leaderName].totalCharges += colporter.charges;
    acc[leaderName].totalAdvances += colporter.advances;
    acc[leaderName].totalEarnings += colporter.earnings;
    
    return acc;
  }, {} as Record<string, any>);

  const leaderCount = Object.keys(leaderSummaries).length;
  const equalLeaderEarnings = leaderCount > 0 
    ? programFinancials.distribution.leaderAmount / leaderCount 
    : 0;

  Object.values(leaderSummaries).forEach(leader => {
    leader.leaderEarnings = equalLeaderEarnings;
  });

  const totalProgramExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-primary-600" size={28} />
            {t('reports.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('reports.completeProgram')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewType(viewType === 'summary' ? 'detailed' : 'summary')}
            leftIcon={viewType === 'summary' ? <PieChart size={16} /> : <BarChart3 size={16} />}
          >
            {viewType === 'summary' ? t('reports.showDetails') : t('reports.showTotalsOnly')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Heart className="text-red-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('dashboard.totalRevenue')}</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)}
            </p>
            <p className="text-xs text-gray-500">{t('donations.title')} + {t('charges.fine')}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Receipt className="text-orange-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('expenses.totalExpenses')}</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(programFinancials.expenses.totalExpenses)}
            </p>
            <p className="text-xs text-gray-500">{t('cashAdvance.title')} + {t('expenses.program')}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="text-blue-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('dashboard.revenueDistribution')}</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(programFinancials.distribution.colporterAmount + programFinancials.distribution.leaderAmount)}
            </p>
            <p className="text-xs text-gray-500">{t('common.colporters')} + {t('common.leaders')}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('dashboard.programSurplus')}</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">
              {formatCurrency(programFinancials.netProfit)}
            </p>
            <p className="text-xs text-gray-500">{t('dashboard.afterDistributions')}</p>
          </div>
        </Card>
      </div>

      {viewType === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={t('dashboard.financialSummary')} icon={<PieChart size={20} />}>
            <div className="h-80 flex justify-center items-center">
              <Pie data={distributionChartData} options={chartOptions} />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700">{t('dashboard.revenueDistribution')}</p>
                <p className="text-lg font-bold text-blue-800 mt-1">
                  {formatCurrency(programFinancials.distribution.colporterAmount)}
                </p>
                <p className="text-xs text-blue-600">
                  {programFinancials.distribution.colporterPercentage}% {t('common.of')} {t('donations.title')}
                </p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-700">{t('dashboard.revenueDistribution')}</p>
                <p className="text-lg font-bold text-purple-800 mt-1">
                  {formatCurrency(programFinancials.distribution.leaderAmount)}
                </p>
                <p className="text-xs text-purple-600">
                  {programFinancials.distribution.leaderPercentage}% {t('common.of')} {t('donations.title')}
                </p>
              </div>
            </div>
          </Card>

          <Card title={t('reports.byLeaders')} icon={<Users size={20} />}>
            <div className="h-80 flex justify-center items-center">
              <Bar data={leaderPerformanceData} options={barChartOptions} />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-sm font-medium text-primary-700">{t('reports.programSales')}</p>
                <p className="text-lg font-bold text-primary-800 mt-1">
                  {formatCurrency(programFinancials.income.donations)}
                </p>
                <p className="text-xs text-primary-600">
                  {Object.keys(leaderSummaries).length} {t('common.leaders')}
                </p>
              </div>

              <div className="p-3 bg-success-50 rounded-lg">
                <p className="text-sm font-medium text-success-700">{t('reports.perColporter')}</p>
                <p className="text-lg font-bold text-success-800 mt-1">
                  {formatCurrency(programFinancials.income.donations / Math.max(1, Object.keys(leaderSummaries).length))}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {viewType === 'detailed' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('reports.title')} icon={<TrendingUp size={20} />}>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">{t('donations.title')}</span>
                  </div>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(programFinancials.income.donations)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">{t('charges.fine')}</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-700">
                    {formatCurrency(programFinancials.miscellaneous.fines)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg border-t-2 border-primary-100">
                  <span className="text-sm font-bold text-primary-700">{t('dashboard.totalRevenue')}</span>
                  <span className="text-xl font-bold text-primary-700">
                    {formatCurrency(programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)}
                  </span>
                </div>
              </div>
            </Card>

            <Card title={t('expenses.title')} icon={<TrendingDown size={20} />}>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">{t('cashAdvance.title')}</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">
                    {formatCurrency(programFinancials.expenses.advances)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">{t('expenses.program')}</span>
                  </div>
                  <span className="text-lg font-bold text-orange-700">
                    {formatCurrency(programFinancials.expenses.programExpenses)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-t-2 border-red-100">
                  <span className="text-sm font-bold text-red-700">{t('expenses.totalExpenses')}</span>
                  <span className="text-xl font-bold text-red-700">
                    {formatCurrency(programFinancials.expenses.totalExpenses)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card title={t('expenses.program')} icon={<Receipt size={20} />}>
            {expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.date')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.category')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('inventory.description')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.amount')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('programSetup.created')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <Badge variant="primary">
                            {t(`expenses.${expense.category}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {t(`expenses.${expense.motivo}`)}
                          {expense.notes && (
                            <p className="text-xs text-gray-500 mt-1">{expense.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {expense.createdByName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100">
                      <td colSpan={3} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {t('expenses.totalExpenses')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600">
                        {formatCurrency(totalProgramExpenses)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">{t('colporterReport.noData')}</p>
              </div>
            )}
          </Card>

          <Card title={t('dashboard.revenueDistribution')} icon={<PieChart size={20} />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-600">{t('dashboard.revenueDistribution')}</p>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {formatCurrency(programFinancials.distribution.colporterAmount)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {programFinancials.distribution.colporterPercentage}% {t('common.of')} {t('donations.title')}
                </p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-600">{t('dashboard.revenueDistribution')}</p>
                <p className="text-2xl font-bold text-purple-700 mt-2">
                  {formatCurrency(programFinancials.distribution.leaderAmount)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {programFinancials.distribution.leaderPercentage}% {t('common.of')} {t('donations.title')}
                </p>
              </div>
              
              <div className="text-center p-4 bg-primary-50 rounded-lg">
                <p className="text-sm font-medium text-primary-600">{t('dashboard.programSurplus')}</p>
                <p className="text-2xl font-bold text-primary-700 mt-2">
                  {formatCurrency(programFinancials.netProfit)}
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  {((programFinancials.netProfit / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}% {t('common.of')} {t('dashboard.totalRevenue')}
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t('confirmationStep.distributionSummary')}</span>
                <span className="text-sm font-medium text-gray-700">100%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div className="flex h-2.5 rounded-full">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-l-full" 
                    style={{ width: `${programFinancials.distribution.colporterPercentage}%` }}
                  ></div>
                  <div 
                    className="bg-purple-600 h-2.5" 
                    style={{ width: `${programFinancials.distribution.leaderPercentage}%` }}
                  ></div>
                  <div 
                    className="bg-orange-500 h-2.5" 
                    style={{ width: `${(programFinancials.expenses.programExpenses / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100}%` }}
                  ></div>
                  <div 
                    className="bg-red-500 h-2.5" 
                    style={{ width: `${(programFinancials.expenses.advances / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100}%` }}
                  ></div>
                  <div 
                    className="bg-green-500 h-2.5 rounded-r-full" 
                    style={{ width: `${(programFinancials.netProfit / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mr-1"></div>
                    <span className="text-gray-600">{t('common.colporters')}</span>
                  </div>
                  <span className="font-medium">{programFinancials.distribution.colporterPercentage}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-600 rounded-full mr-1"></div>
                    <span className="text-gray-600">{t('common.leaders')}</span>
                  </div>
                  <span className="font-medium">{programFinancials.distribution.leaderPercentage}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">{t('expenses.program')}</span>
                  </div>
                  <span className="font-medium">{((programFinancials.expenses.programExpenses / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">{t('cashAdvance.title')}</span>
                  </div>
                  <span className="font-medium">{((programFinancials.expenses.advances / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">{t('dashboard.programSurplus')}</span>
                  </div>
                  <span className="font-medium">{((programFinancials.netProfit / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title={t('reports.byLeaders')} icon={<Users size={20} />}>
            <div className="p-4 mb-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800">{t('dashboard.revenueDistribution')}</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    {t('confirmationStep.distributionSummary')} ({programFinancials.distribution.leaderPercentage}% {t('common.of')} {t('reports.programSales')}) {t('reports.byLeaders')} <strong>{t('common.all')}</strong> {t('common.leaders')}, {t('common.regardless')} {t('reports.performance')}.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="p-2 bg-white rounded border border-purple-100">
                      <p className="text-xs text-purple-600">{t('dashboard.revenueDistribution')}</p>
                      <p className="text-lg font-bold text-purple-800">{formatCurrency(programFinancials.distribution.leaderAmount)}</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-purple-100">
                      <p className="text-xs text-purple-600">{t('reports.perColporter')} ({Object.keys(leaderSummaries).length})</p>
                      <p className="text-lg font-bold text-purple-800">{formatCurrency(equalLeaderEarnings)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.leader')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.colporters')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('reports.programSales')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.revenueDistribution')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % {t('common.of')} {t('common.program')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(leaderSummaries).map((leader, index) => (
                    <tr key={leader.name} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {leader.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <Badge variant="primary">{leader.colporters.length}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(leader.totalDonations)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                        {formatCurrency(equalLeaderEarnings)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <Badge variant="secondary">
                          {((leader.totalDonations / programFinancials.income.donations) * 100).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {t('common.totals')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                      <Badge variant="primary">{colporterFinancials.length}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      {formatCurrency(programFinancials.income.donations)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                      {formatCurrency(programFinancials.distribution.leaderAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                      <Badge variant="secondary">100%</Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card title={t('reports.byColporters')} icon={<Users size={20} />}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('dashboard.showingTransactions')} {filteredColporterFinancials.length} {t('common.of')} {colporterFinancials.length} {t('common.colporters')}</span>
                {leaderFilter && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {leaderFilter}
                    <button 
                      onClick={() => setLeaderFilter('')}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download size={16} />}
              >
                {t('common.export')}
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.colporter')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.leader')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('donations.title')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('charges.fine')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('charges.title')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('cashAdvance.title')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.revenueDistribution')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredColporterFinancials.map((colporter, index) => (
                    <tr key={colporter.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {colporter.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {colporter.leaderName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        {formatCurrency(colporter.donations)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-yellow-600">
                        {formatCurrency(colporter.fines)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">
                        {formatCurrency(colporter.charges)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600">
                        {formatCurrency(colporter.advances)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                        {formatCurrency(colporter.earnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100">
                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900">
                      {t('common.totals')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-green-600">
                      {formatCurrency(filteredColporterFinancials.reduce((sum, c) => sum + c.donations, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-yellow-600">
                      {formatCurrency(filteredColporterFinancials.reduce((sum, c) => sum + c.fines, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600">
                      {formatCurrency(filteredColporterFinancials.reduce((sum, c) => sum + c.charges, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-orange-600">
                      {formatCurrency(filteredColporterFinancials.reduce((sum, c) => sum + c.advances, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                      {formatCurrency(filteredColporterFinancials.reduce((sum, c) => sum + c.earnings, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProgramReport;