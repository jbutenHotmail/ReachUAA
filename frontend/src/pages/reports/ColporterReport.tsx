import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useTransactionStore } from '../../stores/transactionStore';
import { useProgramStore } from '../../stores/programStore';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api';

const ColporterReport: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { transactions, fetchTransactions } = useTransactionStore();
  const { program } = useProgramStore();
  
  // State for colporter data
  const [colporterId, setColporterId] = useState<string | null>(null);
  const [colporterData, setColporterData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);

  // Fetch colporter ID by name
  useEffect(() => {
    const getColporterId = async () => {
      try {
        // In a real implementation, we would fetch the colporter by name
        const people = await api.get('/people/colporters');
        const colporter = people.find((p: any) => 
          `${p.name} ${p.apellido}` === name || 
          p.name === name
        );
        
        if (colporter) {
          setColporterId(colporter.id);
        } else {
          setError('Colporter not found');
        }
      } catch (err) {
        console.error('Error fetching colporter:', err);
        setError('Failed to load colporter data');
      }
    };
    
    if (name) {
      getColporterId();
    }
  }, [name]);

  // Fetch transactions for this colporter
  useEffect(() => {
    const loadTransactionData = async () => {
      if (!colporterId) return;
      
      setIsLoading(true);
      try {
        // Get all transactions for this colporter
        const colporterTransactions = await api.get('/transactions', { 
          params: { studentId: colporterId } 
        });
        
        // Process the transactions to get weekly data
        processTransactionData(colporterTransactions);
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        setError('Failed to load transaction data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (colporterId) {
      loadTransactionData();
    }
  }, [colporterId]);

  // Process transaction data to get weekly stats
  const processTransactionData = (colporterTransactions: any[]) => {
    if (!colporterTransactions.length) {
      setWeeklyData(null);
      setColporterData(null);
      return;
    }
    
    // Filter out rejected transactions
    const validTransactions = colporterTransactions.filter(t => t.status !== 'REJECTED');
    
    // Get the colporter percentage from program config
    const colporterPercentage = program?.financialConfig?.colporter_percentage 
      ? parseFloat(program.financialConfig.colporter_percentage) 
      : 50;
    
    // Calculate total sales and books
    const totalSales = validTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalBooks = {
      grandes: 0,
      pequenos: 0
    };
    
    // Process books
    validTransactions.forEach(transaction => {
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.price >= 20) {
            totalBooks.grandes += book.quantity;
          } else {
            totalBooks.pequenos += book.quantity;
          }
        });
      }
    });
    
    // Group transactions by week
    const weekMap = new Map();
    
    validTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      // Get the Monday of this week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      const monday = new Date(date);
      monday.setDate(diff);
      const mondayStr = monday.toISOString().split('T')[0];
      
      // Get the Sunday of this week
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sundayStr = sunday.toISOString().split('T')[0];
      
      // Create week key
      const weekKey = `${mondayStr}_${sundayStr}`;
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          startDate: mondayStr,
          endDate: sundayStr,
          transactions: [],
          sales: {},
          books: {}
        });
      }
      
      const weekData = weekMap.get(weekKey);
      weekData.transactions.push(transaction);
      
      // Add sales for this day
      weekData.sales[transaction.date] = (weekData.sales[transaction.date] || 0) + transaction.total;
      
      // Add books for this day
      if (!weekData.books[transaction.date]) {
        weekData.books[transaction.date] = {
          large: {},
          small: {}
        };
      }
      
      // Process books for this transaction
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.price >= 20) {
            weekData.books[transaction.date].large[book.title] = 
              (weekData.books[transaction.date].large[book.title] || 0) + book.quantity;
          } else {
            weekData.books[transaction.date].small[book.title] = 
              (weekData.books[transaction.date].small[book.title] || 0) + book.quantity;
          }
        });
      }
    });
    
    // Get the most recent week
    const weeks = Array.from(weekMap.values());
    const mostRecentWeek = weeks.sort((a, b) => 
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    )[0];
    
    if (mostRecentWeek) {
      // Calculate weekly totals
      const weeklyTotal = Object.values(mostRecentWeek.sales).reduce((sum: number, amount: any) => sum + amount, 0);
      
      setWeeklyData(mostRecentWeek);
      
      // Set colporter data
      setColporterData({
        bruto: {
          total: totalSales,
          promedio: totalSales / validTransactions.length
        },
        neto: {
          total: totalSales * (colporterPercentage / 100),
          promedio: (totalSales * (colporterPercentage / 100)) / validTransactions.length
        },
        libros: totalBooks
      });
    }
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

  if (!colporterData || !weeklyData) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">No Data Available</p>
        <p>There is no transaction data available for this colporter.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/reports/week/finances')}
        >
          Go back
        </Button>
      </div>
    );
  }

  // Format date for display
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/reports/week/finances')}
        >
          <ChevronLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500">
            {weeklyData && formatDateRange(weeklyData.startDate, weeklyData.endDate)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bruto y Neto */}
        <Card>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">BRUTO (100%)</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.bruto.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Promedio</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.bruto.promedio.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">NETO ({program?.financialConfig?.colporter_percentage || 50}%)</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.neto.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Promedio</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.neto.promedio.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Libros Entregados */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Libros Entregados</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
              <span className="text-sm font-medium text-primary-600">Grandes</span>
              <Badge variant="primary">{colporterData.libros.grandes}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
              <span className="text-sm font-medium text-success-600">Pequeños</span>
              <Badge variant="success">{colporterData.libros.pequenos}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg col-span-2">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <Badge variant="secondary">{colporterData.libros.grandes + colporterData.libros.pequenos}</Badge>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Weekly Report Table */}
      {weeklyData && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Ventas</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                      Colportores
                    </th>
                    {Object.keys(weeklyData.sales).sort().map((date) => (
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
                    {Object.keys(weeklyData.sales).sort().map((date) => (
                      <td key={date} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        ${weeklyData.sales[date].toFixed(2)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                      ${Object.values(weeklyData.sales).reduce((sum: number, amount: any) => sum + amount, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      
      {/* Books Table */}
      {weeklyData && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Libros</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                      Libro
                    </th>
                    {Object.keys(weeklyData.books).sort().map((date) => (
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
                  {/* Large Books */}
                  <tr className="bg-primary-900 text-white">
                    <td colSpan={Object.keys(weeklyData.books).length + 2} className="px-4 py-2 text-sm font-semibold">
                      Libros Grandes
                    </td>
                  </tr>
                  
                  {/* Get all unique large book titles */}
                  {Array.from(new Set(
                    Object.values(weeklyData.books).flatMap((dayBooks: any) => 
                      Object.keys(dayBooks.large)
                    )
                  )).map((bookTitle: string) => (
                    <tr key={`large-${bookTitle}`} className="bg-primary-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-primary-50">
                        {bookTitle}
                      </td>
                      {Object.keys(weeklyData.books).sort().map(date => (
                        <td key={date} className="px-4 py-3 text-sm text-center">
                          <Badge variant="primary">
                            {weeklyData.books[date]?.large[bookTitle] || 0}
                          </Badge>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-center font-medium">
                        <Badge variant="primary">
                          {Object.values(weeklyData.books).reduce((sum: number, dayBooks: any) => 
                            sum + (dayBooks.large[bookTitle] || 0), 0
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {/* Small Books */}
                  <tr className="bg-success-900 text-white">
                    <td colSpan={Object.keys(weeklyData.books).length + 2} className="px-4 py-2 text-sm font-semibold">
                      Libros Pequeños
                    </td>
                  </tr>
                  
                  {/* Get all unique small book titles */}
                  {Array.from(new Set(
                    Object.values(weeklyData.books).flatMap((dayBooks: any) => 
                      Object.keys(dayBooks.small)
                    )
                  )).map((bookTitle: string) => (
                    <tr key={`small-${bookTitle}`} className="bg-success-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-success-50">
                        {bookTitle}
                      </td>
                      {Object.keys(weeklyData.books).sort().map(date => (
                        <td key={date} className="px-4 py-3 text-sm text-center">
                          <Badge variant="success">
                            {weeklyData.books[date]?.small[bookTitle] || 0}
                          </Badge>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-center font-medium">
                        <Badge variant="success">
                          {Object.values(weeklyData.books).reduce((sum: number, dayBooks: any) => 
                            sum + (dayBooks.small[bookTitle] || 0), 0
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                      TOTALES
                    </td>
                    {Object.keys(weeklyData.books).sort().map(date => {
                      const largeBooksCount = Object.values(weeklyData.books[date]?.large || {}).reduce((sum: number, qty: any) => sum + qty, 0);
                      const smallBooksCount = Object.values(weeklyData.books[date]?.small || {}).reduce((sum: number, qty: any) => sum + qty, 0);
                      return (
                        <td key={date} className="px-4 py-3 text-sm text-center">
                          <Badge variant="secondary">
                            {largeBooksCount + smallBooksCount}
                          </Badge>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="secondary">
                        {colporterData.libros.grandes + colporterData.libros.pequenos}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ColporterReport;