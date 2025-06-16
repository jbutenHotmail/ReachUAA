import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, TrendingUp, BookOpen, DollarSign, Users } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useTransactionStore } from '../../stores/transactionStore';
import { useProgramStore } from '../../stores/programStore';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api';

interface ColporterSummerStats {
  bruto: {
    total: number;
    promedio: number;
  };
  neto: {
    total: number;
    promedio: number;
  };
  libros: {
    grandes: number;
    pequenos: number;
  };
  workingDays: number;
  bestDay: {
    date: string;
    amount: number;
  };
  worstDay: {
    date: string;
    amount: number;
  };
}

const SummerColporterReport: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { program } = useProgramStore();
  
  // State for colporter/leader data
  const [personId, setPersonId] = useState<string | null>(null);
  const [personType, setPersonType] = useState<'COLPORTER' | 'LEADER'>('COLPORTER');
  const [stats, setStats] = useState<ColporterSummerStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<Record<string, { sales: number; days: number; books: { large: number; small: number } }>>({});
  const [dailySales, setDailySales] = useState<Record<string, number>>({});
  const [dailyBooks, setDailyBooks] = useState<Record<string, { large: number; small: number }>>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Fetch person ID by name
  useEffect(() => {
    const getPersonId = async () => {
      try {
        // First try to find as a colporter
        const colporters = await api.get('/people/colporters');
        const colporter = colporters.find((p: any) => 
          `${p.name} ${p.apellido}` === name || 
          p.name === name
        );
        
        if (colporter) {
          setPersonId(colporter.id);
          setPersonType('COLPORTER');
          return;
        }
        
        // If not found as colporter, try as a leader
        const leaders = await api.get('/people/leaders');
        const leader = leaders.find((p: any) => 
          `${p.name} ${p.apellido}` === name || 
          p.name === name
        );
        
        if (leader) {
          setPersonId(leader.id);
          setPersonType('LEADER');
          return;
        }
        
        setError('Person not found');
      } catch (err) {
        console.error('Error fetching person:', err);
        setError('Failed to load person data');
      }
    };
    
    if (name) {
      getPersonId();
    }
  }, [name]);

  // Fetch transactions for this person
  useEffect(() => {
    const loadTransactionData = async () => {
      if (!personId) return;
      
      setIsLoading(true);
      try {
        // Get all transactions for this person based on their type - ONLY APPROVED TRANSACTIONS
        const params = personType === 'COLPORTER' 
          ? { studentId: personId, status: 'APPROVED' } 
          : { leaderId: personId, status: 'APPROVED' };
        
        const personTransactions = await api.get('/transactions', { params });
        
        // Process the transactions to get statistics
        processTransactionData(personTransactions, personType);
        
        // If this is a leader, also fetch their team members
        if (personType === 'LEADER') {
          await fetchTeamMembers(personId, personTransactions);
        }
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        setError('Failed to load transaction data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (personId) {
      loadTransactionData();
    }
  }, [personId, personType]);

  // Fetch team members for a leader
  const fetchTeamMembers = async (leaderTransactions: any[]) => {
    try {
      // Get unique colporter IDs from transactions
      const colporterIds = new Set<string>();
      leaderTransactions.forEach(t => colporterIds.add(t.studentId));
      
      // Get colporter details
      const colporters = await api.get('/people/colporters');
      
      // Filter to only include colporters in this leader's team
      const teamColporters = colporters.filter((c: any) => 
        colporterIds.has(c.id)
      );
      
      // Calculate stats for each team member
      const teamStats = teamColporters.map((colporter: any) => {
        // Get transactions for this colporter - ONLY APPROVED TRANSACTIONS
        const colporterTransactions = leaderTransactions.filter(t => 
          t.studentId === colporter.id && t.status === 'APPROVED'
        );
        
        // Calculate total sales
        const totalSales = colporterTransactions.reduce((sum, t) => sum + t.total, 0);
        
        // Calculate book counts
        const books = {
          large: 0,
          small: 0
        };
        
        colporterTransactions.forEach(transaction => {
          if (transaction.books && transaction.books.length > 0) {
            transaction.books.forEach((book: any) => {
              if (book.price >= 20) {
                books.large += book.quantity;
              } else {
                books.small += book.quantity;
              }
            });
          }
        });
        
        return {
          id: colporter.id,
          name: `${colporter.name} ${colporter.apellido}`,
          totalSales,
          books,
          transactionCount: colporterTransactions.length
        };
      });
      
      setTeamMembers(teamStats);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  // Process transaction data to get statistics
  const processTransactionData = (personTransactions: any[], type: 'COLPORTER' | 'LEADER') => {
    if (!personTransactions.length) {
      setStats(null);
      setMonthlyData({});
      setDailySales({});
      setDailyBooks({});
      return;
    }
    
    // Filter out rejected transactions - only include APPROVED transactions
    const validTransactions = personTransactions.filter(t => t.status === 'APPROVED');
    
    // Get the appropriate percentage from program config
    const percentage = type === 'COLPORTER'
      ? (program?.financialConfig?.colporter_percentage 
          ? parseFloat(program.financialConfig.colporter_percentage) 
          : 50)
      : (program?.financialConfig?.leader_percentage 
          ? parseFloat(program.financialConfig.leader_percentage) 
          : 15);
    
    // Calculate total sales
    const totalSales = validTransactions.reduce((sum, t) => sum + t.total, 0);
    const workingDays = validTransactions.length;
    const averagePerDay = totalSales / workingDays;
    
    // Process books
    const totalBooks = {
      grandes: 0,
      pequenos: 0
    };
    
    // Process daily sales and books
    const dailySalesData: Record<string, number> = {};
    const dailyBooksData: Record<string, { large: number; small: number }> = {};
    
    validTransactions.forEach(transaction => {
      // Add sales for this day
      dailySalesData[transaction.date] = (dailySalesData[transaction.date] || 0) + transaction.total;
      
      // Initialize books for this day
      if (!dailyBooksData[transaction.date]) {
        dailyBooksData[transaction.date] = { large: 0, small: 0 };
      }
      
      // Process books for this transaction
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.price >= 20) {
            totalBooks.grandes += book.quantity;
            dailyBooksData[transaction.date].large += book.quantity;
          } else {
            totalBooks.pequenos += book.quantity;
            dailyBooksData[transaction.date].small += book.quantity;
          }
        });
      }
    });
    
    // Find best and worst days
    const salesEntries = Object.entries(dailySalesData);
    const bestDay = salesEntries.reduce((best, [date, amount]) => 
      amount > best.amount ? { date, amount } : best, 
      { date: '', amount: 0 }
    );
    const worstDay = salesEntries.reduce((worst, [date, amount]) => 
      amount < worst.amount ? { date, amount } : worst, 
      { date: '', amount: Infinity }
    );
    
    // Group data by months
    const monthlyDataObj: Record<string, { sales: number; days: number; books: { large: number; small: number } }> = {};
    
    validTransactions.forEach(transaction => {
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
      const isNewDay = !validTransactions.some(t => 
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
          if (book.price >= 20) {
            monthlyDataObj[month].books.large += book.quantity;
          } else {
            monthlyDataObj[month].books.small += book.quantity;
          }
        });
      }
    });
    
    // Set state with processed data
    setStats({
      bruto: {
        total: totalSales,
        promedio: averagePerDay,
      },
      neto: {
        total: totalSales * (percentage / 100),
        promedio: averagePerDay * (percentage / 100),
      },
      libros: totalBooks,
      workingDays,
      bestDay,
      worstDay: worstDay.amount === Infinity ? { date: '', amount: 0 } : worstDay,
    });
    
    setMonthlyData(monthlyDataObj);
    setDailySales(dailySalesData);
    setDailyBooks(dailyBooksData);
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

  if (!stats || Object.keys(monthlyData).length === 0) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">No Data Available</p>
        <p>There is no transaction data available for this {personType.toLowerCase()}.</p>
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
            <TrendingUp className="text-primary-600" size={28} />
            {name} - {personType === 'LEADER' ? 'Leader' : 'Colporter'} Report
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <Calendar size={16} />
            Complete Program • {stats.workingDays} working days
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
            <p className="text-sm font-medium text-gray-500">Total Sales (Bruto)</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">${stats.bruto.total.toFixed(2)}</p>
            <p className="text-xs text-gray-500">100% of sales</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-success-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Net Earnings (Neto)</p>
            <p className="mt-1 text-2xl font-bold text-success-600">${stats.neto.total.toFixed(2)}</p>
            <p className="text-xs text-gray-500">
              {personType === 'COLPORTER' 
                ? program?.financialConfig?.colporter_percentage || 50
                : program?.financialConfig?.leader_percentage || 15}% of sales
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="text-warning-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total Books</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">{stats.libros.grandes + stats.libros.pequenos}</p>
            <p className="text-xs text-gray-500">{stats.libros.grandes} large, {stats.libros.pequenos} small</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="text-info-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Daily Average</p>
            <p className="mt-1 text-2xl font-bold text-info-600">${stats.bruto.promedio.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Per working day</p>
          </div>
        </Card>
      </div>

      {/* Performance Highlights - More Compact */}
      <Card title="Performance Highlights" icon={<TrendingUp size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-success-50 rounded-lg">
            <h4 className="font-semibold text-success-700 text-sm">Best Day</h4>
            <p className="text-xs text-success-600 mt-1">
              {stats.bestDay.date ? new Date(stats.bestDay.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              }) : 'N/A'}
            </p>
            <p className="text-base font-bold text-success-700">${stats.bestDay.amount.toFixed(2)}</p>
          </div>

          <div className="p-3 bg-warning-50 rounded-lg">
            <h4 className="font-semibold text-warning-700 text-sm">Lowest Day</h4>
            <p className="text-xs text-warning-600 mt-1">
              {stats.worstDay.date ? new Date(stats.worstDay.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              }) : 'N/A'}
            </p>
            <p className="text-base font-bold text-warning-700">
              ${stats.worstDay.amount > 0 ? stats.worstDay.amount.toFixed(2) : '0.00'}
            </p>
          </div>

          <div className="p-3 bg-primary-50 rounded-lg">
            <h4 className="font-semibold text-primary-700 text-sm">Book Distribution</h4>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-primary-600">Large:</span>
              <span className="font-medium text-primary-700">{stats.libros.grandes} ({((stats.libros.grandes / (stats.libros.grandes + stats.libros.pequenos)) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-success-600">Small:</span>
              <span className="font-medium text-success-700">{stats.libros.pequenos} ({((stats.libros.pequenos / (stats.libros.grandes + stats.libros.pequenos)) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Team Members (only for leaders) */}
      {personType === 'LEADER' && teamMembers.length > 0 && (
        <Card title="Team Performance" icon={<Users size={20} />}>
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
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Large Books
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Small Books
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamMembers.map((member, index) => (
                  <tr key={member.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      ${member.totalSales.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge variant="primary">{member.books.large}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge variant="success">{member.books.small}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge variant="secondary">{member.transactionCount}</Badge>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    ${teamMembers.reduce((sum, m) => sum + m.totalSales, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                    <Badge variant="primary">{teamMembers.reduce((sum, m) => sum + m.books.large, 0)}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                    <Badge variant="success">{teamMembers.reduce((sum, m) => sum + m.books.small, 0)}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                    <Badge variant="secondary">{teamMembers.reduce((sum, m) => sum + m.transactionCount, 0)}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Ventas</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    {personType === 'LEADER' ? 'Leader' : 'Colporter'}
                  </th>
                  {Object.keys(dailySales).sort().map((date) => (
                    <th key={date} className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-yellow-50">
                  <td className="px-4 py-3 text-sm font-medium text-white bg-[#0052B4] sticky left-0 z-10">
                    {name}
                  </td>
                  {Object.keys(dailySales).sort().map((date) => (
                    <td key={date} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      ${dailySales[date].toFixed(2)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                    ${stats.bruto.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {/* Books Table */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Libros por Mes</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    Mes
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700 border-b">
                    Libros Grandes
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600 border-b">
                    Libros Pequeños
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    Total Libros
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    Ventas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(monthlyData).map(([month, data]) => (
                  <tr key={month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-white">
                      {month}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="primary">{data.books.large}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="success">{data.books.small}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      <Badge variant="secondary">{data.books.large + data.books.small}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      ${data.sales.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100">
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 sticky left-0 z-10 bg-gray-100">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold">
                    <Badge variant="primary">{stats.libros.grandes}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold">
                    <Badge variant="success">{stats.libros.pequenos}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold">
                    <Badge variant="secondary">{stats.libros.grandes + stats.libros.pequenos}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold">
                    ${stats.bruto.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {/* Daily Books Breakdown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Libros por Día</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700 border-b">
                    Libros Grandes
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600 border-b">
                    Libros Pequeños
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    Total Libros
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    Ventas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.keys(dailySales).sort().map((date) => (
                  <tr key={date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-white">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="primary">{dailyBooks[date]?.large || 0}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="success">{dailyBooks[date]?.small || 0}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      <Badge variant="secondary">{(dailyBooks[date]?.large || 0) + (dailyBooks[date]?.small || 0)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      ${dailySales[date].toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SummerColporterReport;