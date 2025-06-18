import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, BookText, DollarSign, Users, ChevronRight, TrendingUp } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useProgramStore } from '../../stores/programStore';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api';

const LeaderDetailPage: React.FC = () => {
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
  const [programTotalSales, setProgramTotalSales] = useState<number>(0);
  const [totalLeadersCount, setTotalLeadersCount] = useState<number>(1);

  // Fetch leader ID by name
  useEffect(() => {
    const getLeaderId = async () => {
      try {
        // In a real implementation, we would fetch the leader by name
        const people = await api.get('/people/leaders');
        const leader = people.find((p: any) => 
          `${p.name} ${p.apellido}` === name || 
          p.name === name
        );
        
        if (leader) {
          setLeaderId(leader.id);
        } else {
          setError('Leader not found');
        }
      } catch (err) {
        console.error('Error fetching leader:', err);
        setError('Failed to load leader data');
      }
    };
    
    if (name) {
      getLeaderId();
    }
  }, [name]);

  // Fetch transactions for this leader's team and total program sales
  useEffect(() => {
    const loadTransactionData = async () => {
      if (!leaderId) return;
      
      setIsLoading(true);
      try {
        // Get all transactions for this leader's team - ONLY APPROVED TRANSACTIONS
        const leaderTransactions = await api.get('/transactions', { 
          params: { leaderId, status: 'APPROVED' } 
        });
        
        // Get all program transactions to calculate total program sales - ONLY APPROVED TRANSACTIONS
        const allTransactions = await api.get('/transactions', {
          params: { status: 'APPROVED' }
        });
        
        // Calculate total program sales
        const totalProgramSales = allTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
        setProgramTotalSales(totalProgramSales);
        
        // Get total number of leaders in the program
        const leaders = await api.get('/people/leaders');
        const activeLeaders = leaders.filter((l: any) => l.status === 'ACTIVE');
        setTotalLeadersCount(activeLeaders.length || 1); // Ensure we don't divide by zero
        
        // Process the transactions to get statistics
        processTransactionData(leaderTransactions, totalProgramSales);
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        setError('Failed to load transaction data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (leaderId) {
      loadTransactionData();
    }
  }, [leaderId]);

  // Process transaction data to get statistics
  const processTransactionData = (leaderTransactions: any[], totalProgramSales: number) => {
    if (!leaderTransactions.length) {
      setLeaderStats(null);
      setColporterStats([]);
      setMonthlyData({});
      return;
    }
    
    // Get the leader percentage from program config
    const leaderPercentage = program?.financialConfig?.leader_percentage 
      ? parseFloat(program.financialConfig.leader_percentage) 
      : 15;
    
    // Calculate total sales and books
    const totalSales = leaderTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalBooks = {
      large: 0,
      small: 0
    };
    
    // Process books
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
    
    // Group transactions by colporter
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
      
      // Update best day if this transaction is better
      if (transaction.total > colporter.bestDay.amount) {
        colporter.bestDay = {
          date: transaction.date,
          amount: transaction.total
        };
      }
      
      // Process books for this transaction
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
    
    // Calculate colporter stats
    const colporterStatsArray = Array.from(colporterMap.values()).map(colporter => ({
      ...colporter,
      averageSales: colporter.totalSales / colporter.transactions.length
    }));
    
    // Group data by months
    const monthlyDataObj: Record<string, { sales: number; days: number; books: { large: number; small: number } }> = {};
    
    leaderTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const month = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!monthlyDataObj[month]) {
        monthlyDataObj[month] = { 
          sales: 0, 
          days: 0, 
          books: { large: 0, small: 0 } 
        };
      }
      
      // Check if this is a new day for this month
      const dateStr = transaction.date;
      const isNewDay = !leaderTransactions.some(t => 
        t.date === dateStr && 
        t.id !== transaction.id && 
        new Date(t.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) === month
      );
      
      if (isNewDay) {
        monthlyDataObj[month].days += 1;
      }
      
      monthlyDataObj[month].sales += transaction.total;
      
      // Process books for this transaction
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
    
    // Find best and worst days
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
    
    // Calculate working days
    const workingDays = Object.keys(salesByDay).length;
    
    // Set state with processed data
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

  // Format currency
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
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!leaderStats || colporterStats.length === 0) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">No Data Available</p>
        <p>There is no transaction data available for this leader's team.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/reports/donations/finances')}
        >
          Go back
        </Button>
      </div>
    );
  }

  // Calculate leader earnings based on total program sales divided by number of leaders
  const leaderEarnings = (programTotalSales * (program?.financialConfig?.leader_percentage 
    ? parseFloat(program.financialConfig.leader_percentage) / 100 
    : 0.15)) / totalLeadersCount;

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
            {name} - Leader Report
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <Calendar size={16} />
            Complete Program • {leaderStats.workingDays} working days
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total Team Sales</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">{formatCurrency(leaderStats.totalSales)}</p>
            <p className="text-xs text-gray-500">{leaderStats.colporterCount} colporters</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="text-success-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Average Per Colporter</p>
            <p className="mt-1 text-2xl font-bold text-success-600">
              {formatCurrency(leaderStats.totalSales / leaderStats.colporterCount)}
            </p>
            <p className="text-xs text-gray-500">For the entire program</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookText className="text-warning-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total Books</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">
              {leaderStats.totalBooks.large + leaderStats.totalBooks.small}
            </p>
            <p className="text-xs text-gray-500">
              {leaderStats.totalBooks.large} large, {leaderStats.totalBooks.small} small
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="text-info-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Daily Team Average</p>
            <p className="mt-1 text-2xl font-bold text-info-600">
              {formatCurrency(leaderStats.totalSales / leaderStats.workingDays)}
            </p>
            <p className="text-xs text-gray-500">Per working day</p>
          </div>
        </Card>
      </div>

      {/* Leader Earnings - Prominently displayed */}
      <Card title="Leader Earnings (Based on Total Program Sales)" icon={<DollarSign size={20} />}>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Leader Commission ({program?.financialConfig?.leader_percentage || 15}%)</p>
                <p className="text-2xl font-bold text-purple-800 mt-1">
                  {formatCurrency(leaderEarnings)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-600">Based on total program sales of</p>
                <p className="text-lg font-semibold text-purple-700">{formatCurrency(programTotalSales)}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-100">
              <p className="text-sm text-purple-800">
                <strong>Important:</strong> Leader earnings are calculated as {program?.financialConfig?.leader_percentage || 15}% of the <strong>total program sales</strong> ({formatCurrency(programTotalSales)}), divided by the total number of leaders ({totalLeadersCount}).
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Team Contribution</p>
              <p className="text-lg font-bold text-gray-900">
                {((leaderStats.totalSales / programTotalSales) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(leaderStats.totalSales)} of {formatCurrency(programTotalSales)}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Per Colporter</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(leaderEarnings / leaderStats.colporterCount)}
              </p>
              <p className="text-xs text-gray-500">
                Earnings divided by team size
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Per Working Day</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(leaderEarnings / leaderStats.workingDays)}
              </p>
              <p className="text-xs text-gray-500">
                Earnings per day worked
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Colporter Performance Table */}
      <Card title="Colporter Performance" icon={<Users size={20} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colporter
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daily Average
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Large Books
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Small Books
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Best Day
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
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
                      {colporter.bestDay.date ? new Date(colporter.bestDay.date).toLocaleDateString('en-US', {
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
                  TOTAL
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

      {/* Monthly Breakdown */}
      <Card title="Monthly Performance" icon={<Calendar size={20} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Working Days
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daily Average
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Large Books
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Small Books
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
                    ${data.sales.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                    {data.days}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    ${(data.sales / data.days).toFixed(2)}
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

      {/* Team Performance Metrics */}
      <Card title="Team Performance Metrics" icon={<TrendingUp size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Sales Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                <span className="text-sm font-medium text-primary-700">Average Per Colporter</span>
                <span className="text-lg font-bold text-primary-700">
                  {formatCurrency(leaderStats.totalSales / leaderStats.colporterCount)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
                <span className="text-sm font-medium text-success-700">Team Daily Average</span>
                <span className="text-lg font-bold text-success-700">
                  {formatCurrency(leaderStats.totalSales / leaderStats.workingDays)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-warning-50 rounded-lg">
                <span className="text-sm font-medium text-warning-700">Best Team Day</span>
                <span className="text-lg font-bold text-warning-700">
                  {leaderStats.bestDay.date ? formatCurrency(leaderStats.bestDay.amount) : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Book Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                <span className="text-sm font-medium text-primary-700">Books Per Colporter</span>
                <span className="text-lg font-bold text-primary-700">
                  {Math.round((leaderStats.totalBooks.large + leaderStats.totalBooks.small) / leaderStats.colporterCount)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
                <span className="text-sm font-medium text-success-700">Books Per Day</span>
                <span className="text-lg font-bold text-success-700">
                  {((leaderStats.totalBooks.large + leaderStats.totalBooks.small) / leaderStats.workingDays).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-warning-50 rounded-lg">
                <span className="text-sm font-medium text-warning-700">Large/Small Ratio</span>
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