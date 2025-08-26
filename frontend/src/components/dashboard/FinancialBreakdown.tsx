import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, DollarSign, TrendingUp, Users } from 'lucide-react';
import Card from '../ui/Card';
import { useTransactionStore } from '../../stores/transactionStore';
import { useProgramStore } from '../../stores/programStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { useExpenseStore } from '../../stores/expenseStore';
import { useLeaderPercentageStore } from '../../stores/leaderPercentageStore';
import { useUserStore } from '../../stores/userStore';
import { formatNumber } from '../../utils/numberUtils';

interface FinancialData {
  totalRevenue: number;
  expenses: {
    advances: number;
    programCosts: number;
    total: number;
  };
  distribution: {
    students: number;
    leaders: number;
    globalLeaders: number;
    customLeaders: number;
  };
  leaderBreakdown: {
    globalLeadersCount: number;
    customLeadersCount: number;
    globalLeadersPercentage: number;
    customLeadersPercentage: number;
    totalLeaderPercentage: number;
  };
  programGrossAmount: number;
  netProfit: number;
}

const FinancialBreakdown: React.FC = () => {
  const { t } = useTranslation();
  const { transactions, isLoading: transactionsLoading } = useTransactionStore();
  const { program } = useProgramStore();
  const { advances, isLoading: advancesLoading } = useCashAdvanceStore();
  const { expenses, wereExpensesFetched, fetchExpenses, isLoading: expensesLoading } = useExpenseStore();
  const { leaderPercentages, fetchLeaderPercentages, werePercentagesFetched } = useLeaderPercentageStore();
  const { people, fetchPeople, werePeopleFetched } = useUserStore();
  
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    expenses: {
      advances: 0,
      programCosts: 0,
      total: 0
    },
    distribution: {
      students: 0,
      leaders: 0
    },
    leaderBreakdown: {
      globalLeadersCount: 0,
      customLeadersCount: 0,
      globalLeadersPercentage: 0,
      customLeadersPercentage: 0,
      totalLeaderPercentage: 0,
    },
    netProfit: 0,
    programGrossAmount: 0
  });
  const [isCalculating, setIsCalculating] = useState(advancesLoading || expensesLoading || transactionsLoading);

  useEffect(() => {
    !wereExpensesFetched && fetchExpenses();
    !werePercentagesFetched && fetchLeaderPercentages();
    !werePeopleFetched && fetchPeople(program?.id);
  }, [fetchExpenses, fetchLeaderPercentages, fetchPeople, wereExpensesFetched, werePercentagesFetched, werePeopleFetched, program]);
  
  useEffect(() => {
    if (transactions.length > 0 && program && people.length > 0) {
      setIsCalculating(true);
      
      // Pequeño retraso para asegurar que el estado de carga se muestre
      const timer = setTimeout(() => {
        const validTransactions = transactions.filter(t => t.status === 'APPROVED');
        const totalRevenue = validTransactions.reduce((sum, t) => Number(sum) + Number(t.total), 0);
        
        const studentPercentage = program.financialConfig?.colporter_percentage 
          ? parseFloat(program.financialConfig.colporter_percentage) 
          : 50;
        
        // Get global leader percentage
        const globalLeaderPercentage = program.financialConfig?.leader_percentage 
          ? parseFloat(program.financialConfig.leader_percentage) 
          : 15;
        
        // Get all leaders
        const leaders = people.filter(p => p.personType === 'LEADER');
        
        // Separate leaders with custom vs global percentages
        const leadersWithCustom = leaders.filter(leader => 
          leaderPercentages.some(p => p.leaderId === leader.id && p.isActive)
        );
        
        const leadersWithGlobal = leaders.filter(leader => 
          !leaderPercentages.some(p => p.leaderId === leader.id && p.isActive)
        );
        
        // Calculate custom leaders total percentage
        const customLeaderPercentage = leadersWithCustom.reduce((sum, leader) => {
          const individualPercentage = leaderPercentages.find(
            p => p.leaderId === leader.id && p.isActive
          );
          return sum + (individualPercentage ? individualPercentage.percentage : 0);
        }, 0);
        
        // Calculate global leaders total percentage
        // If there are leaders using global percentage, they share the global percentage equally
        const globalLeadersTotalPercentage = leadersWithGlobal.length > 0 ? globalLeaderPercentage : 0;
        
        // Total leader percentage
        const totalLeaderPercentage = customLeaderPercentage + globalLeadersTotalPercentage;
        
        // Calculate amounts correctly
        const studentsAmount = totalRevenue * (studentPercentage / 100);
        const globalLeadersAmount = totalRevenue * (globalLeadersTotalPercentage / 100);
        const customLeadersAmount = totalRevenue * (customLeaderPercentage / 100);
        const totalLeadersAmount = globalLeadersAmount + customLeadersAmount;
        
        const advancesAmount = advances
          .filter(a => a.status === 'APPROVED')
          .reduce((sum, a) => sum + a.advanceAmount, 0);
        
        const programCostsAmount = expenses
          .filter(e => e.status === 'APPROVED')
          .reduce((sum: number, expense: any) => Number(sum) + Number(expense.amount), 0);
        
        const totalExpenses = advancesAmount + programCostsAmount;
        const programPercentage = 100 - studentPercentage - totalLeaderPercentage;
        const programGrossAmount = totalRevenue * (programPercentage / 100)
        const netProfit = programGrossAmount - totalExpenses;
        
        setFinancialData({
          totalRevenue,
          expenses: {
            advances: advancesAmount,
            programCosts: programCostsAmount,
            total: totalExpenses
          },
          distribution: {
            students: studentsAmount,
            globalLeaders: globalLeadersAmount,
            customLeaders: customLeadersAmount
          },
          leaderBreakdown: {
            globalLeadersCount: leadersWithGlobal.length,
            customLeadersCount: leadersWithCustom.length,
            globalLeadersPercentage: globalLeadersTotalPercentage,
            customLeadersPercentage: customLeaderPercentage,
            totalLeaderPercentage,
          },
          programGrossAmount,
          netProfit
        });
        
        setIsCalculating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [transactions, program, advances, expenses, people, leaderPercentages]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isLoading = transactionsLoading || advancesLoading || expensesLoading || isCalculating;

  const renderLoadingState = () => (
    <div className="space-y-6 animate-pulse">
      <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-300 rounded-full">
            <div className="w-5 h-5"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-gray-300 rounded w-48"></div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-gray-300 rounded w-48"></div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
            <div className="h-4 bg-gray-300 rounded w-24"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
            <div className="h-4 bg-gray-300 rounded w-24"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
            <div className="h-4 bg-gray-300 rounded w-24"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="p-3 bg-gray-100 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title={t('dashboard.financialSummary')}
      subtitle={t('reports.distributionExpenses')}
      icon={<PieChart size={20} />}
      className="h-full"
    >
      {isLoading ? (
        renderLoadingState()
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-full">
                <DollarSign size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-800">{t('dashboard.totalRevenue')}</p>
                <p className="text-2xl font-bold text-primary-900">
                  {formatCurrency(financialData.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Users size={16} />
              {t('dashboard.revenueDistribution')}
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-blue-700">
                    {t('common.student')} ({program?.financialConfig?.colporter_percentage || 50}%)
                  </span>
                  <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${program?.financialConfig?.colporter_percentage || 50}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-900">
                  {formatCurrency(financialData.distribution.students)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-purple-700">
                      Líderes 
                    </span>
                    <span className="text-sm font-bold text-purple-900">
                      {formatCurrency(financialData.distribution.globalLeaders)}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-1.5">
                    <div 
                      className="bg-purple-600 h-1.5 rounded-full" 
                      style={{ width: `${financialData.leaderBreakdown.globalLeadersPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {financialData.leaderBreakdown.customLeadersCount > 0 && (
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-yellow-700">
                        Líderes Personalizados ({financialData.leaderBreakdown.customLeadersCount} líderes)
                      </span>
                      <span className="text-sm font-bold text-yellow-900">
                        {formatCurrency(financialData.distribution.customLeaders)}
                      </span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-1.5">
                      <div 
                        className="bg-yellow-600 h-1.5 rounded-full" 
                        style={{ width: `${financialData.leaderBreakdown.customLeadersPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {t('common.program')} ({formatNumber(100 - (program?.financialConfig?.colporter_percentage ? parseFloat(program.financialConfig.colporter_percentage) : 50) - financialData.leaderBreakdown.totalLeaderPercentage, 1)}%)
                  </span>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-gray-600 h-1.5 rounded-full" 
                      style={{ width: `${100 - (program?.financialConfig?.colporter_percentage ? parseFloat(program.financialConfig.colporter_percentage) : 50) - financialData.leaderBreakdown.totalLeaderPercentage}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(financialData.programGrossAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp size={16} />
              {t('expenses.title')}
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                <span className="text-sm text-red-700">{t('cashAdvance.title')}</span>
                <span className="text-sm font-medium text-red-900">
                  {formatCurrency(financialData.expenses.advances)}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                <span className="text-sm text-orange-700">{t('expenses.programCosts')}</span>
                <span className="text-sm font-medium text-orange-900">
                  {formatCurrency(financialData.expenses.programCosts)}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-red-100 rounded border-t border-red-200">
                <span className="text-sm font-medium text-red-800">{t('common.totals')}</span>
                <span className="text-sm font-bold text-red-900">
                  {formatCurrency(financialData.expenses.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="p-3 bg-gradient-to-r from-success-50 to-success-100 rounded-lg border border-success-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-success-800">{t('dashboard.programSurplus')}</span>
                <span className="text-lg font-bold text-success-900">
                  {formatCurrency(financialData.netProfit)}
                </span>
              </div>
              <p className="text-xs text-success-600 mt-1">
                {t('dashboard.afterDistributions')}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FinancialBreakdown;