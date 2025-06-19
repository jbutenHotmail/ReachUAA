// ViewerDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useProgramStore } from '../../stores/programStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { api } from '../../api';
import GoalProgress from '../../components/dashboard/GoalProgress';
import Card from '../../components/ui/Card';
import { FileText, DollarSign, Calendar, BookText, TrendingUp, ChevronRight } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/ui/LoadingScreen';

interface PersonalStats {
  person: {
    id: string;
    name: string;
    email: string;
    phone: string;
    personType: string;
    organization: string;
  };
  startDate: string;
  endDate: string;
  transactions: any[];
  totals: {
    cash: number;
    checks: number;
    atmMobile: number;
    paypal: number;
    total: number;
  };
  earnings: {
    gross: number;
    percentage: number;
    net: number;
    charges: number;
    advances: number;
    final: number;
  };
  charges: any[];
  advances: any[];
  dailyEarnings: Record<string, number>;
}

const ViewerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { program } = useProgramStore();
  const { stats, fetchDashboardStats } = useDashboardStore();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null);
  
  // Fetch dashboard stats to get program achieved value
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);
  
  useEffect(() => {
    const fetchPersonalStats = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the user's person ID
        const userData = await api.get(`/users/${user.id}`);
        
        if (!userData.personId) {
          setError(t('dashboard.errorNoProfile'));
          setIsLoading(false);
          return;
        }
        
        // Get current date
        const today = new Date();
        
        // Calculate start of month
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Calculate end of month
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Fetch personal earnings report - ONLY APPROVED TRANSACTIONS
        const stats = await api.get<PersonalStats>(`/reports/earnings/${userData.personId}`, {
          params: {
            startDate: startDateStr,
            endDate: endDateStr,
            status: 'APPROVED'
          }
        });
        
        setPersonalStats(stats);
      } catch (err) {
        console.error('Error fetching personal stats:', err);
        setError(t('dashboard.errorLoadingStats'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPersonalStats();
  }, [user]);
  
  // Create program goal object for GoalProgress component
  const programGoal = program && stats ? {
    amount: parseFloat(program.financial_goal),
    achieved: stats.program.achieved,
    startDate: program.start_date,
    endDate: program.end_date
  } : null;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t('dashboard.loading')} />
      </div>
    );
  }
  
  if (error) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="text-danger-500 mb-4">
            <FileText size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('dashboard.errorTitle')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t('dashboard.tryAgain')}
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          {t('dashboard.welcome')}, {user?.name}!
        </p>
      </div>
      
      {/* Program Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-3">
          {programGoal && <GoalProgress goal={programGoal} />}
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="text-primary-600" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-500">{t('dashboard.totalSales')}</p>
                <p className="mt-1 text-2xl font-bold text-primary-600">
                  ${personalStats.totals.total.toFixed(2)}
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
                  ${(personalStats.totals.total / Math.max(1, Object.keys(personalStats.dailyEarnings).length)).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">{t('dashboard.perWorkingDay')}</p>
              </div>
            </Card>
          </div>
          
          {/* Earnings Breakdown */}
          <Card title={t('dashboard.earningsBreakdown')} icon={<DollarSign size={20} />}>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-600">{t('dashboard.yourEarnings')} (${personalStats.earnings.percentage}%)</p>
                    <p className="text-2xl font-bold text-primary-700 mt-1">
                      ${personalStats.earnings.net.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-primary-600">{t('dashboard.basedOnSales')}</p>
                    <p className="text-lg font-semibold text-primary-700">${personalStats.totals.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {personalStats.earnings.charges > 0 && (
                  <div className="p-3 bg-danger-50 rounded-lg">
                    <p className="text-sm font-medium text-danger-700">{t('dashboard.chargesFines')}</p>
                    <p className="text-lg font-bold text-danger-700">
                      -${personalStats.earnings.charges.toFixed(2)}
                    </p>
                    <p className="text-xs text-danger-600 mt-1">
                      ${personalStats.charges.length} ${t('dashboard.activeCharges')}
                    </p>
                  </div>
                )}
                
                {personalStats.earnings.advances > 0 && (
                  <div className="p-3 bg-warning-50 rounded-lg">
                    <p className="text-sm font-medium text-warning-700">{t('dashboard.cashAdvances')}</p>
                    <p className="text-lg font-bold text-warning-700">
                      -${personalStats.earnings.advances.toFixed(2)}
                    </p>
                    <p className="text-xs text-warning-600 mt-1">
                      ${personalStats.advances.length} ${t('dashboard.approvedAdvances')}
                    </p>
                  </div>
                )}
                
                <div className="p-3 bg-success-50 rounded-lg md:col-span-1">
                  <p className="text-sm font-medium text-success-700">{t('dashboard.finalAmount')}</p>
                  <p className="text-lg font-bold text-success-700">
                    ${personalStats.earnings.final.toFixed(2)}
                  </p>
                  <p className="text-xs text-success-600 mt-1">
                    ${t('dashboard.afterDeductions')}
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
                          <div className="text-xs text-gray-600">${amount.toFixed(0)}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/transactions/new')}
                  rightIcon={<ChevronRight size={16} />}
                >
                  {t('dashboard.createTransaction')}
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Recent Transactions */}
          {personalStats.transactions.length > 0 && (
            <Card title={t('dashboard.recentTransactions')} icon={<FileText size={20} />}>
              <div className="space-y-4">
                {personalStats.transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.leaderName}
                        </p>
                      </div>
                      <Badge variant="primary">
                        ${transaction.total.toFixed(2)}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                      <div className="flex flex-col items-center p-1 bg-green-50 rounded">
                        <span className="text-green-600">{t('dashboard.cash')}</span>
                        <span className="font-medium">${transaction.cash.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-blue-50 rounded">
                        <span className="text-blue-600">{t('dashboard.checks')}</span>
                        <span className="font-medium">${transaction.checks.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-purple-50 rounded">
                        <span className="text-purple-600">{t('dashboard.atm')}</span>
                        <span className="font-medium">${transaction.atmMobile?.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-center p-1 bg-indigo-50 rounded">
                        <span className="text-indigo-600">{t('dashboard.paypal')}</span>
                        <span className="font-medium">${transaction.paypal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {personalStats.transactions.length > 5 && (
                  <div className="text-center pt-2">
                    <span className="text-sm text-gray-500">
                      ${t('dashboard.showingTransactions')} 5 ${t('dashboard.of')} ${personalStats.transactions.length} ${t('dashboard.transactions')}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewerDashboard;