import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  AlertTriangle, 
  Receipt, 
  Wallet, 
  Users, 
  Calendar,
  PieChart,
  BarChart3,
  Download,
  ChevronDown,
  X
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { clsx } from 'clsx';
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

type TimePeriod = 'month' | 'quarter' | 'all';

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
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [viewType, setViewType] = useState<'summary' | 'detailed'>('summary');
  const [programFinancials, setProgramFinancials] = useState<ProgramFinancials | null>(null);
  const [colporterFinancials, setColporterFinancials] = useState<ColporterFinancials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderFilter, setLeaderFilter] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
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
        // Fetch all required data
        await Promise.all(dataToFetch);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report data');
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [fetchAllTransactions, fetchCharges, fetchAdvances, fetchProgram]);

  // Filter expenses based on selected time period
  const getFilteredExpenses = () => {
    if (selectedPeriod === 'all') {
      return expenses;
    }
    
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      
      if (selectedPeriod === 'month') {
        // Filter for current month
        return expenseDate.getMonth() === today.getMonth() && 
               expenseDate.getFullYear() === today.getFullYear();
      } else if (selectedPeriod === 'quarter') {
        // Filter for current quarter (3 months)
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return expenseDate >= threeMonthsAgo && expenseDate <= today;
      }
      
      return true;
    });
  };

  // Filter transactions based on selected time period
  const getFilteredTransactions = () => {
    if (selectedPeriod === 'all') {
      return transactions;
    }
    
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      transactionDate.setHours(0, 0, 0, 0);
      
      if (selectedPeriod === 'month') {
        // Filter for current month
        return transactionDate.getMonth() === today.getMonth() && 
               transactionDate.getFullYear() === today.getFullYear();
      } else if (selectedPeriod === 'quarter') {
        // Filter for current quarter (3 months)
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return transactionDate >= threeMonthsAgo && transactionDate <= today;
      }
      
      return true;
    });
  };

  useEffect(() => {
    // Calculate program financials from fetched data
    if (transactions.length > 0 || charges.length > 0 || advances.length > 0 || expenses.length > 0) {
      // Get filtered transactions based on selected period
      const filteredTransactions = getFilteredTransactions();
      
      // Get filtered expenses based on selected period
      const filteredExpenses = getFilteredExpenses();
      
      // Get financial percentages from program config
      const colporterPercentage = program?.financialConfig?.colporter_percentage 
        ? parseFloat(program.financialConfig.colporter_percentage) 
        : 50;
      const leaderPercentage = program?.financialConfig?.leader_percentage 
        ? parseFloat(program.financialConfig.leader_percentage) 
        : 15;
      
      // Calculate total donations from transactions
      const totalDonations = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
      
      // Filter charges based on selected period
      const filteredCharges = charges.filter(charge => {
        if (selectedPeriod === 'all') {
          return charge.status === 'APPLIED';
        }
        
        const chargeDate = new Date(charge.date);
        const today = new Date(selectedDate);
        
        if (selectedPeriod === 'month') {
          return chargeDate.getMonth() === today.getMonth() && 
                 chargeDate.getFullYear() === today.getFullYear() &&
                 charge.status === 'APPLIED';
        } else if (selectedPeriod === 'quarter') {
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setMonth(today.getMonth() - 3);
          return chargeDate >= threeMonthsAgo && 
                 chargeDate <= today &&
                 charge.status === 'APPLIED';
        }
        
        return charge.status === 'APPLIED';
      });
      
      // Calculate total fines from charges
      const totalFines = filteredCharges.reduce((sum, c) => sum + c.amount, 0);
      
      // Filter advances based on selected period
      const filteredAdvances = advances.filter(advance => {
        if (selectedPeriod === 'all') {
          return advance.status === 'APPROVED';
        }
        
        const advanceDate = new Date(advance.weekStartDate);
        const today = new Date(selectedDate);
        
        if (selectedPeriod === 'month') {
          return advanceDate.getMonth() === today.getMonth() && 
                 advanceDate.getFullYear() === today.getFullYear() &&
                 advance.status === 'APPROVED';
        } else if (selectedPeriod === 'quarter') {
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setMonth(today.getMonth() - 3);
          return advanceDate >= threeMonthsAgo && 
                 advanceDate <= today &&
                 advance.status === 'APPROVED';
        }
        
        return advance.status === 'APPROVED';
      });
      
      // Calculate total advances
      const totalAdvances = filteredAdvances.reduce((sum, a) => sum + a.advanceAmount, 0);
      
      // Calculate program expenses from real expense data
      const programExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate distribution amounts
      const colporterAmount = totalDonations * (colporterPercentage / 100);
      const leaderAmount = totalDonations * (leaderPercentage / 100);
      
      // Calculate net profit
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
      
      // Calculate colporter financials
      const colporterMap = new Map<string, ColporterFinancials>();
      
      // Process transactions
      filteredTransactions.forEach(t => {
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
      
      // Process charges
      filteredCharges.forEach(c => {
        if (c.status === 'APPLIED' && colporterMap.has(c.personId)) {
          const colporter = colporterMap.get(c.personId)!;
          colporter.charges += c.amount;
        }
      });
      
      // Process advances
      filteredAdvances.forEach(a => {
        if (a.status === 'APPROVED' && colporterMap.has(a.personId)) {
          const colporter = colporterMap.get(a.personId)!;
          colporter.advances += a.advanceAmount;
        }
      });
      
      // Calculate earnings
      colporterMap.forEach(colporter => {
        colporter.earnings = colporter.donations * (colporter.percentage / 100);
      });
      
      setColporterFinancials(Array.from(colporterMap.values()));
    }
  }, [transactions, charges, advances, program, selectedPeriod, selectedDate, expenses]);

  // Apply filters to colporter financials
  const filteredColporterFinancials = React.useMemo(() => {
    let filtered = [...colporterFinancials];
    
    // Apply leader filter
    if (leaderFilter) {
      filtered = filtered.filter(c => c.leaderName === leaderFilter);
    }
    
    // Apply date range filter (in a real implementation)
    // This would filter transactions by date
    
    return filtered;
  }, [colporterFinancials, leaderFilter]);

  // Get unique leaders for filter dropdown
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

  // Prepare data for pie chart
  const distributionChartData = {
    labels: ['Colporters', 'Leaders', 'Program Expenses', 'Cash Advances', 'Net Profit'],
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
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(139, 92, 246, 0.8)', // purple
          'rgba(249, 115, 22, 0.8)', // orange
          'rgba(239, 68, 68, 0.8)', // red
          'rgba(16, 185, 129, 0.8)', // green
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

  // Prepare data for leader performance bar chart
  const leaderPerformanceData = {
    labels: uniqueLeaders,
    datasets: [
      {
        label: 'Team Sales',
        data: uniqueLeaders.map(leader => {
          return colporterFinancials
            .filter(c => c.leaderName === leader)
            .reduce((sum, c) => sum + c.donations, 0);
        }),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Leader Earnings',
        data: uniqueLeaders.map(() => {
          // Each leader gets an equal share of the total leader earnings
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

  // Format date range based on selected period
  const formatDateRange = () => {
    if (selectedPeriod === 'all') {
      return 'Complete Program';
    }
    
    const today = selectedDate;
    
    if (selectedPeriod === 'month') {
      return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (selectedPeriod === 'quarter') {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      return `${threeMonthsAgo.toLocaleDateString('en-US', { month: 'short' })} - ${today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    
    return '';
  };

  // Navigate date based on selected period
  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      
      if (selectedPeriod === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (selectedPeriod === 'quarter') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 3 : -3));
      }
      
      return newDate;
    });
  };

  if (isLoading) {
    return (
      <LoadingScreen message="Loading program report..." />
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">Error loading program report</p>
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  if (!programFinancials) {
    return (
      <Card>
        <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
          <p className="font-medium">No financial data available</p>
          <p>There is no transaction data available to generate a program report.</p>
        </div>
      </Card>
    );
  }

  // Calculate leader summaries
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

  // Calculate equal leader earnings
  const leaderCount = Object.keys(leaderSummaries).length;
  const equalLeaderEarnings = leaderCount > 0 
    ? programFinancials.distribution.leaderAmount / leaderCount 
    : 0;

  // Assign equal earnings to each leader
  Object.values(leaderSummaries).forEach(leader => {
    leader.leaderEarnings = equalLeaderEarnings;
  });

  // Get filtered expenses for display
  const filteredExpenses = getFilteredExpenses();
  const totalProgramExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-primary-600" size={28} />
            Program Financial Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDateRange()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Card className="p-0 shadow-sm">
            <div className="flex items-center divide-x">
              {(['month', 'quarter', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={clsx(
                    'px-3 py-2 text-sm font-medium transition-colors',
                    selectedPeriod === period 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </Card>
          
          {selectedPeriod !== 'all' && (
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="px-2"
              >
                <ChevronDown size={20} className="rotate-90" />
              </Button>
              
              <div className="px-4 py-2 flex items-center gap-2 border-l border-r border-gray-200">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium">
                  {selectedPeriod === 'month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {selectedPeriod === 'quarter' && `Quarter (${formatDateRange()})`}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate('next')}
                className="px-2"
              >
                <ChevronDown size={20} className="-rotate-90" />
              </Button>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewType(viewType === 'summary' ? 'detailed' : 'summary')}
            leftIcon={viewType === 'summary' ? <PieChart size={16} /> : <BarChart3 size={16} />}
          >
            {viewType === 'summary' ? 'Detailed View' : 'Summary View'}
          </Button>
          
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Heart className="text-red-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)}
            </p>
            <p className="text-xs text-gray-500">Donations + Fines</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Receipt className="text-orange-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(programFinancials.expenses.totalExpenses)}
            </p>
            <p className="text-xs text-gray-500">Advances + Program Costs</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="text-blue-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Participant Earnings</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(programFinancials.distribution.colporterAmount + programFinancials.distribution.leaderAmount)}
            </p>
            <p className="text-xs text-gray-500">Colporters + Leaders</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Net Profit</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">
              {formatCurrency(programFinancials.netProfit)}
            </p>
            <p className="text-xs text-gray-500">Program Surplus</p>
          </div>
        </Card>
      </div>

      {/* Summary View - Charts */}
      {viewType === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Financial Distribution" icon={<PieChart size={20} />}>
            <div className="h-80">
              <Pie data={distributionChartData} options={chartOptions} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700">Colporter Earnings</p>
                <p className="text-lg font-bold text-blue-800 mt-1">
                  {formatCurrency(programFinancials.distribution.colporterAmount)}
                </p>
                <p className="text-xs text-blue-600">
                  {programFinancials.distribution.colporterPercentage}% of donations
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-700">Leader Earnings</p>
                <p className="text-lg font-bold text-purple-800 mt-1">
                  {formatCurrency(programFinancials.distribution.leaderAmount)}
                </p>
                <p className="text-xs text-purple-600">
                  {programFinancials.distribution.leaderPercentage}% of donations
                </p>
              </div>
            </div>
          </Card>
          
          <Card title="Leader Performance" icon={<Users size={20} />}>
            <div className="h-80">
              <Bar data={leaderPerformanceData} options={barChartOptions} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-sm font-medium text-primary-700">Total Team Sales</p>
                <p className="text-lg font-bold text-primary-800 mt-1">
                  {formatCurrency(programFinancials.income.donations)}
                </p>
                <p className="text-xs text-primary-600">
                  {Object.keys(leaderSummaries).length} teams
                </p>
              </div>
              
              <div className="p-3 bg-success-50 rounded-lg">
                <p className="text-sm font-medium text-success-700">Average Per Team</p>
                <p className="text-lg font-bold text-success-800 mt-1">
                  {formatCurrency(programFinancials.income.donations / Math.max(1, Object.keys(leaderSummaries).length))}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Detailed View */}
      {viewType === 'detailed' && (
        <>
          {/* Detailed Financial Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Breakdown */}
            <Card title="Income Sources" icon={<TrendingUp size={20} />}>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">Donations</span>
                  </div>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(programFinancials.income.donations)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">Fines</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-700">
                    {formatCurrency(programFinancials.miscellaneous.fines)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg border-t-2 border-primary-100">
                  <span className="text-sm font-bold text-primary-700">Total Income</span>
                  <span className="text-xl font-bold text-primary-700">
                    {formatCurrency(programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Expenses Breakdown */}
            <Card title="Expense Categories" icon={<TrendingDown size={20} />}>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">Cash Advances</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">
                    {formatCurrency(programFinancials.expenses.advances)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Program Expenses</span>
                  </div>
                  <span className="text-lg font-bold text-orange-700">
                    {formatCurrency(programFinancials.expenses.programExpenses)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-t-2 border-red-100">
                  <span className="text-sm font-bold text-red-700">Total Expenses</span>
                  <span className="text-xl font-bold text-red-700">
                    {formatCurrency(programFinancials.expenses.totalExpenses)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Program Expenses Detail */}
          <Card title="Program Expenses Detail" icon={<Receipt size={20} />}>
            {filteredExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <Badge variant="primary">
                            {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {expense.motivo}
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
                        Total Program Expenses
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
                <p className="text-gray-500">No program expenses found for this period</p>
              </div>
            )}
          </Card>

          {/* Distribution Summary */}
          <Card title="Earnings Distribution" icon={<PieChart size={20} />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Colporter Earnings</p>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {formatCurrency(programFinancials.distribution.colporterAmount)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {programFinancials.distribution.colporterPercentage}% of donations
                </p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-600">Leader Earnings</p>
                <p className="text-2xl font-bold text-purple-700 mt-2">
                  {formatCurrency(programFinancials.distribution.leaderAmount)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {programFinancials.distribution.leaderPercentage}% of donations
                </p>
              </div>
              
              <div className="text-center p-4 bg-primary-50 rounded-lg">
                <p className="text-sm font-medium text-primary-600">Program Profit</p>
                <p className="text-2xl font-bold text-primary-700 mt-2">
                  {formatCurrency(programFinancials.netProfit)}
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  {((programFinancials.netProfit / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}% of total income
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Distribution Breakdown</span>
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
                    <span className="text-gray-600">Colporters</span>
                  </div>
                  <span className="font-medium">{programFinancials.distribution.colporterPercentage}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-600 rounded-full mr-1"></div>
                    <span className="text-gray-600">Leaders</span>
                  </div>
                  <span className="font-medium">{programFinancials.distribution.leaderPercentage}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">Program Expenses</span>
                  </div>
                  <span className="font-medium">{((programFinancials.expenses.programExpenses / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">Cash Advances</span>
                  </div>
                  <span className="font-medium">{((programFinancials.expenses.advances / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}%</span>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">Net Profit</span>
                  </div>
                  <span className="font-medium">{((programFinancials.netProfit / (programFinancials.income.totalDonations + programFinancials.miscellaneous.totalFines)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Leader Performance */}
          <Card title="Leader Performance Summary" icon={<Users size={20} />}>
            <div className="p-4 mb-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800">Leader Earnings Distribution</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Leader earnings ({programFinancials.distribution.leaderPercentage}% of total program sales) are distributed <strong>equally</strong> among all leaders, regardless of their individual team performance.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="p-2 bg-white rounded border border-purple-100">
                      <p className="text-xs text-purple-600">Total Leader Earnings</p>
                      <p className="text-lg font-bold text-purple-800">{formatCurrency(programFinancials.distribution.leaderAmount)}</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-purple-100">
                      <p className="text-xs text-purple-600">Per Leader ({Object.keys(leaderSummaries).length})</p>
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
                      Leader
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Colporters
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Sales
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leader Earnings
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Program
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
                      TOTALS
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

          {/* Individual Colporter Performance */}
          <Card title="Individual Colporter Performance" icon={<Users size={20} />}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Showing {filteredColporterFinancials.length} of {colporterFinancials.length} colporters</span>
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
                Export Data
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Colporter
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leader
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donations
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fines
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charges
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Advances
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
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
                      TOTALS
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