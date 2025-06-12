import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  AlertTriangle, 
  Receipt, 
  Wallet, 
  Users, 
  PieChart,
  BarChart3
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { clsx } from 'clsx';
import { useTransactionStore } from '../../stores/transactionStore';
import { useChargeStore } from '../../stores/chargeStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { useProgramStore } from '../../stores/programStore';
import Spinner from '../../components/ui/Spinner';

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
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'all'>('all');
  const [viewType, setViewType] = useState<'summary' | 'detailed'>('summary');
  const [programFinancials, setProgramFinancials] = useState<ProgramFinancials | null>(null);
  const [colporterFinancials, setColporterFinancials] = useState<ColporterFinancials[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { transactions, fetchTransactions } = useTransactionStore();
  const { charges, fetchCharges } = useChargeStore();
  const { advances, fetchAdvances } = useCashAdvanceStore();
  const { program, fetchProgram } = useProgramStore();

  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all required data
        await Promise.all([
          fetchTransactions(),
          fetchCharges(),
          fetchAdvances(),
          fetchProgram()
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report data');
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [fetchTransactions, fetchCharges, fetchAdvances, fetchProgram]);

  useEffect(() => {
    // Calculate program financials from fetched data
    if (transactions.length > 0 || charges.length > 0 || advances.length > 0) {
      // Get financial percentages from program config
      const colporterPercentage = program?.colporterPercentage || 50;
      const leaderPercentage = program?.leaderPercentage || 10;
      
      // Calculate total donations from transactions
      const totalDonations = transactions.reduce((sum, t) => sum + t.total, 0);
      
      // Calculate total fines from charges
      const totalFines = charges.reduce((sum, c) => 
        c.status === 'APPLIED' ? sum + c.amount : sum, 0);
      
      // Calculate total advances
      const totalAdvances = advances.reduce((sum, a) => 
        a.status === 'APPROVED' ? sum + a.advanceAmount : sum, 0);
      
      // Assume program expenses for now (in a real app, this would come from expenses API)
      const programExpenses = totalDonations * 0.15; // 15% of donations as a placeholder
      
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
      
      // Process charges
      charges.forEach(c => {
        if (c.status === 'APPLIED' && colporterMap.has(c.personId)) {
          const colporter = colporterMap.get(c.personId)!;
          colporter.charges += c.amount;
        }
      });
      
      // Process advances
      advances.forEach(a => {
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
  }, [transactions, charges, advances, program]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
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
        leaderEarnings: 0,
      };
    }
    
    acc[leaderName].colporters.push(colporter);
    acc[leaderName].totalDonations += colporter.donations;
    acc[leaderName].totalFines += colporter.fines;
    acc[leaderName].totalCharges += colporter.charges;
    acc[leaderName].totalAdvances += colporter.advances;
    acc[leaderName].totalEarnings += colporter.earnings;
    acc[leaderName].leaderEarnings = acc[leaderName].totalDonations * (acc[leaderName].leaderPercentage / 100);
    
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-primary-600" size={28} />
            Program Financial Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete financial overview of the colportage program
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
      </Card>

      {/* Detailed View */}
      {viewType === 'detailed' && (
        <>
          {/* Leader Performance */}
          <Card title="Leader Performance Summary" icon={<Users size={20} />}>
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
                      Total Donations
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leader Earnings
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
                        {formatCurrency(leader.leaderEarnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Individual Colporter Performance */}
          <Card title="Individual Colporter Performance" icon={<Users size={20} />}>
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
                  {colporterFinancials.map((colporter, index) => (
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
                      {formatCurrency(colporterFinancials.reduce((sum, c) => sum + c.donations, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-yellow-600">
                      {formatCurrency(colporterFinancials.reduce((sum, c) => sum + c.fines, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600">
                      {formatCurrency(colporterFinancials.reduce((sum, c) => sum + c.charges, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-orange-600">
                      {formatCurrency(colporterFinancials.reduce((sum, c) => sum + c.advances, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                      {formatCurrency(colporterFinancials.reduce((sum, c) => sum + c.earnings, 0))}
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