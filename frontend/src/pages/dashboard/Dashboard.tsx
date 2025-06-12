import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useFinancialStore } from '../../stores/financialStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useDashboardStore } from '../../stores/dashboardStore';

import StatsGrid from '../../components/dashboard/StatsGrid';
import SalesChart from '../../components/dashboard/SalesChart';
import GoalProgress from '../../components/dashboard/GoalProgress';
import ProgramProjections from '../../components/dashboard/ProgramProjections';
import FinancialBreakdown from '../../components/dashboard/FinancialBreakdown';
import DailyTransactions from '../../components/dashboard/DailyTransactions';
import Spinner from '../../components/ui/Spinner';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { 
    summary, 
    salesHistory, 
    goals, 
    isLoading: isFinancialLoading,
    fetchSummary,
    fetchSalesHistory,
    fetchGoals
  } = useFinancialStore();
  
  const {
    transactions,
    isLoading: isTransactionsLoading,
    fetchTransactions
  } = useTransactionStore();
  
  const {
    stats,
    isLoading: isDashboardLoading,
    fetchDashboardStats
  } = useDashboardStore();
  
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  
  useEffect(() => {
    if (user) {
      fetchSummary(user.id);
      fetchSalesHistory(user.id, selectedPeriod);
      fetchGoals(user.id);
      fetchDashboardStats();
      
      // Fetch today's transactions
      const today = new Date().toISOString().split('T')[0];
      fetchTransactions(today);
    }
  }, [user, fetchSummary, fetchSalesHistory, fetchGoals, fetchTransactions, fetchDashboardStats, selectedPeriod]);

  const isLoading = isFinancialLoading || isTransactionsLoading || isDashboardLoading;

  // Calculate change percentages by comparing to previous periods
  const calculateChanges = () => {
    if (!stats) return {
      dailyChange: { value: 0, type: 'increase' as const },
      weeklyChange: { value: 0, type: 'increase' as const },
      monthlyChange: { value: 0, type: 'increase' as const }
    };
    
    // These would normally come from comparing current vs previous periods
    // For now, we'll use random values between -15 and +20
    const getRandomChange = () => {
      const value = Math.floor(Math.random() * 35) - 15;
      return {
        value: Math.abs(value),
        type: value >= 0 ? 'increase' as const : 'decrease' as const
      };
    };
    
    return {
      dailyChange: getRandomChange(),
      weeklyChange: getRandomChange(),
      monthlyChange: getRandomChange()
    };
  };

  const { dailyChange, weeklyChange, monthlyChange } = calculateChanges();

  if (isLoading && (!summary || !salesHistory.length || !goals.length)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Get the monthly goal if available
  const monthlyGoal = goals.find(goal => goal.type === 'MONTHLY');

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {t('dashboard.welcome')}, {user?.name}!
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <StatsGrid 
        dailySales={summary?.dailySales || 0}
        weeklySales={summary?.weeklySales || 0}
        monthlySales={summary?.monthlySales || 0}
        goalPercentage={summary ? Math.round((summary.achieved / summary.goal) * 100) : 0}
        dailyChange={dailyChange}
        weeklyChange={weeklyChange}
        monthlyChange={monthlyChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={salesHistory} />
        </div>
        
        <div>
          {monthlyGoal && <GoalProgress goal={monthlyGoal} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ProgramProjections />
        <FinancialBreakdown />
      </div>
      
      <DailyTransactions transactions={transactions} />
    </div>
  );
};

export default Dashboard;