import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useFinancialStore } from '../../stores/financialStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';

import StatsGrid from '../../components/dashboard/StatsGrid';
import SalesChart from '../../components/dashboard/SalesChart';
import GoalProgress from '../../components/dashboard/GoalProgress';
import ProgramProjections from '../../components/dashboard/ProgramProjections';
import FinancialBreakdown from '../../components/dashboard/FinancialBreakdown';
import { useProgramStore } from '../../stores/programStore';
import LoadingScreen from '../../components/ui/LoadingScreen';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { 
    isLoading: isFinancialLoading,
    fetchSummary,
    fetchSalesHistory,
    wasSummaryFetched,
    wasSalesHistoryFetched
  } = useFinancialStore();
  
  const {
    isLoading: isTransactionsLoading,
    fetchAllTransactions,
    wereTransactionsFetched
  } = useTransactionStore();

  const {
    fetchAdvances,
    wereAdvancesFetched
  } = useCashAdvanceStore();
  
  const {
    stats,
    isLoading: isDashboardLoading,
    fetchDashboardStats,
    wereStatsFetched
  } = useDashboardStore();

  const { program, fetchProgram, wasProgramFetched } = useProgramStore();
  
  const selectedPeriod = 'all'
  
  useEffect(() => {
    if (user) {
      !wasSummaryFetched && fetchSummary(user.id);
      !wasSalesHistoryFetched && fetchSalesHistory(user.id, selectedPeriod);
      !wereStatsFetched && program && fetchDashboardStats();
      !wereAdvancesFetched && fetchAdvances();
      !wasProgramFetched && fetchProgram();
      
    }
  }, [program]);

  
  useEffect(() => {
    const loadTransactionData = async () => {
      try {
        // Fetch all APPROVED transactions without date filtering
        !wereTransactionsFetched && await fetchAllTransactions();
      } catch (err) {
        console.error('Error fetching transaction data:', err);
      }
    };

    loadTransactionData();
  }, [fetchAllTransactions, wereTransactionsFetched]);
  

  const isLoading = isFinancialLoading || isTransactionsLoading || isDashboardLoading;

  // Calculate change percentages by comparing to previous periods
  const calculateChanges = () => {
    if (!stats) return {
      dailyChange: { value: 0, type: 'increase' as const },
      weeklyChange: { value: 0, type: 'increase' as const },
      monthlyChange: { value: 0, type: 'increase' as const }
    };
    
 
    const dailySales = stats.today.sales;
    const previousDaysSales = stats.salesChart.slice(-8, -1); // Last 7 days excluding today
    const previousDaysAverage = previousDaysSales.length > 0 
      ? previousDaysSales.reduce((sum, day) => sum + day.amount, 0) / previousDaysSales.length
      : dailySales;
    
    const dailyChangeValue = previousDaysAverage === 0 
      ? 0 
      : Math.round(((dailySales - previousDaysAverage) / previousDaysAverage) * 100);
    
    // Calculate weekly change
    // Compare this week with previous week
    const weeklySales = stats.week.sales;
    const previousWeekSales = stats.salesChart.slice(-14, -7).reduce((sum, day) => sum + day.amount, 0);
    
    const weeklyChangeValue = previousWeekSales === 0 
      ? 0 
      : Math.round(((weeklySales - previousWeekSales) / previousWeekSales) * 100);
    
    // Calculate monthly change
    // Compare this month with previous month (approximated)
    const monthlySales = stats.month.sales;
    // Assuming we have at least 60 days of data
    const previousMonthSales = stats.salesChart.length >= 60 
      ? stats.salesChart.slice(-60, -30).reduce((sum, day) => sum + day.amount, 0)
      : monthlySales * 0.9; // Fallback: assume 10% growth
    
    const monthlyChangeValue = previousMonthSales === 0 
      ? 0 
      : Math.round(((monthlySales - previousMonthSales) / previousMonthSales) * 100);
    
    return {
      dailyChange: { 
        value: Math.abs(dailyChangeValue), 
        type: dailyChangeValue >= 0 ? 'increase' as const : 'decrease' as const 
      },
      weeklyChange: { 
        value: Math.abs(weeklyChangeValue), 
        type: weeklyChangeValue >= 0 ? 'increase' as const : 'decrease' as const 
      },
      monthlyChange: { 
        value: Math.abs(monthlyChangeValue), 
        type: monthlyChangeValue >= 0 ? 'increase' as const : 'decrease' as const 
      }
    };
  };

  const { dailyChange, weeklyChange, monthlyChange } = calculateChanges();

  if (isLoading && (!stats || !program)) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message="Loading dashboard stats..." />
      </div>
    );
  }

  // Create program goal object for GoalProgress component
  const programGoal = program ? {
    amount: parseFloat(program.financial_goal),
    achieved: stats?.program.achieved || 0,
    startDate: program.start_date,
    endDate: program.end_date
  } : null;
  
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {t('dashboard.welcome')}, {user?.name}!
          </p>
        </div>
        
      </div>

      {stats && (
        <StatsGrid 
          dailySales={stats.today.sales}
          weeklySales={stats.week.sales}
          monthlySales={stats.month.sales}
          goalPercentage={Math.round(stats.program.percentageAchieved)}
          dailyChange={dailyChange}
          weeklyChange={weeklyChange}
          monthlyChange={monthlyChange}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          {stats?.salesChart && <SalesChart data={stats.salesChart} />}
        </div>
        
        <div>
          {programGoal && <GoalProgress goal={programGoal} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ProgramProjections />
        <FinancialBreakdown />
      </div>
      
    </div>
  );
};

export default Dashboard;