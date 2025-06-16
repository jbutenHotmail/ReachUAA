import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, DollarSign, TrendingUp, Users } from 'lucide-react';
import Card from '../ui/Card';
import { useTransactionStore } from '../../stores/transactionStore';
import { useProgramStore } from '../../stores/programStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { api } from '../../api';

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
  };
  netProfit: number;
}

const FinancialBreakdown: React.FC = () => {
  const { t } = useTranslation();
  const { transactions } = useTransactionStore();
  const { program } = useProgramStore();
  const { advances } = useCashAdvanceStore();
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
    netProfit: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        // Fetch program expenses (where leaderId is null) - ONLY APPROVED EXPENSES
        const expenses = await api.get('/expenses', { 
          params: { 
            leaderId: 'program',
            status: 'APPROVED' // Only include approved expenses
          } 
        });
        return expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
      } catch (error) {
        console.error('Error fetching expenses:', error);
        return 0;
      }
    };

    const calculateFinancials = async () => {
      if (transactions.length > 0 && program) {
        setIsLoading(true);
        
        // Filter out rejected transactions - ONLY INCLUDE APPROVED TRANSACTIONS
        const validTransactions = transactions.filter(t => t.status === 'APPROVED');
        
        // Calculate total revenue from transactions
        const totalRevenue = validTransactions.reduce((sum, t) => sum + t.total, 0);
        
        // Get financial percentages from program
        const studentPercentage = program.financialConfig?.colporter_percentage 
          ? parseFloat(program.financialConfig.colporter_percentage) 
          : 50;
        const leaderPercentage = program.financialConfig?.leader_percentage 
          ? parseFloat(program.financialConfig.leader_percentage) 
          : 15;
        
        // Calculate distribution amounts
        const studentsAmount = totalRevenue * (studentPercentage / 100);
        const leadersAmount = totalRevenue * (leaderPercentage / 100);
        
        // Calculate expenses - ONLY APPROVED ADVANCES
        const advancesAmount = advances
          .filter(a => a.status === 'APPROVED') // Only include approved advances
          .reduce((sum, a) => sum + a.advanceAmount, 0);
        
        // Fetch real program costs from expenses API - ONLY APPROVED EXPENSES
        const programCostsAmount = await fetchExpenses();
        
        // Calculate total expenses
        const totalExpenses = advancesAmount + programCostsAmount;
        
        // Calculate net profit
        const netProfit = totalRevenue - totalExpenses - (studentsAmount + leadersAmount);
        
        setFinancialData({
          totalRevenue,
          expenses: {
            advances: advancesAmount,
            programCosts: programCostsAmount,
            total: totalExpenses
          },
          distribution: {
            students: studentsAmount,
            leaders: leadersAmount
          },
          netProfit
        });
        setIsLoading(false);
      }
    };

    calculateFinancials();
  }, [transactions, program, advances]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card
      title="Financial Breakdown"
      subtitle="Revenue Distribution & Expenses"
      icon={<PieChart size={20} />}
      className="h-full"
    >
      <div className="space-y-6">
        {/* Revenue Overview */}
        <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-full">
              <DollarSign size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary-800">Total Revenue</p>
              <p className="text-2xl font-bold text-primary-900">
                {formatCurrency(financialData.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        {/* Distribution Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Users size={16} />
            Revenue Distribution
          </h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-blue-700">
                  Students ({program?.financialConfig?.colporter_percentage || 50}%)
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
              <div>
                <span className="text-sm font-medium text-purple-700">
                  Leaders ({program?.financialConfig?.leader_percentage || 15}%)
                </span>
                <div className="w-full bg-purple-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-purple-600 h-1.5 rounded-full" 
                    style={{ width: `${program?.financialConfig?.leader_percentage || 15}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-bold text-purple-900">
                {formatCurrency(financialData.distribution.leaders)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Program ({100 - (program?.financialConfig?.colporter_percentage ? parseFloat(program.financialConfig.colporter_percentage) : 50) - (program?.financialConfig?.leader_percentage ? parseFloat(program.financialConfig.leader_percentage) : 15)}%)
                </span>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-gray-600 h-1.5 rounded-full" 
                    style={{ width: `${100 - (program?.financialConfig?.colporter_percentage ? parseFloat(program.financialConfig.colporter_percentage) : 50) - (program?.financialConfig?.leader_percentage ? parseFloat(program.financialConfig.leader_percentage) : 15)}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(financialData.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp size={16} />
            Program Expenses
          </h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-red-50 rounded">
              <span className="text-sm text-red-700">Cash Advances</span>
              <span className="text-sm font-medium text-red-900">
                {formatCurrency(financialData.expenses.advances)}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
              <span className="text-sm text-orange-700">Program Costs</span>
              <span className="text-sm font-medium text-orange-900">
                {formatCurrency(financialData.expenses.programCosts)}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-red-100 rounded border-t border-red-200">
              <span className="text-sm font-medium text-red-800">Total Expenses</span>
              <span className="text-sm font-bold text-red-900">
                {formatCurrency(financialData.expenses.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Net Result */}
        <div className="pt-4 border-t border-gray-200">
          <div className="p-3 bg-gradient-to-r from-success-50 to-success-100 rounded-lg border border-success-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-success-800">Program Surplus</span>
              <span className="text-lg font-bold text-success-900">
                {formatCurrency(Math.max(0, financialData.netProfit))}
              </span>
            </div>
            <p className="text-xs text-success-600 mt-1">
              After all distributions and expenses
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FinancialBreakdown;