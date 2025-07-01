import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useProgramStore } from '../../stores/programStore';
import { api } from '../../api';
import LoadingScreen from '../../components/ui/LoadingScreen';

const ColporterReport: React.FC = () => {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { program } = useProgramStore();
  
  const [colporterId, setColporterId] = useState<string | null>(null);
  const [colporterData, setColporterData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);

  console.log('zsdfvxdfdfdsfgdf')
  useEffect(() => {
    const getColporterId = async () => {
      try {
        const people = await api.get('/people/colporters');
        const colporter = people.find((p: any) => 
          `${p.name} ${p.apellido}` === name || 
          p.name === name
        );
        
        if (colporter) {
          setColporterId(colporter.id);
        } else {
          setError(t('colportersPage.errorLoadingColporters'));
        }
      } catch (err) {
        console.error('Error fetching colporter:', err);
        setError(t('colportersPage.errorLoadingColporters'));
      }
    };
    
    if (name) {
      getColporterId();
    }
  }, [name, t]);

  useEffect(() => {
    const loadTransactionData = async () => {
      if (!colporterId) return;
      
      setIsLoading(true);
      try {
        const colporterTransactions = await api.get('/transactions', { 
          params: { studentId: colporterId, status: 'APPROVED' } 
        });
        
        processTransactionData(colporterTransactions);
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        setError(t('colportersPage.errorLoadingColporters'));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (colporterId) {
      loadTransactionData();
    }
  }, [colporterId, t]);

  const processTransactionData = (colporterTransactions: any[]) => {
    if (!colporterTransactions.length) {
      setWeeklyData(null);
      setColporterData(null);
      return;
    }
    
    const validTransactions = colporterTransactions.filter(t => t.status === 'APPROVED');
    
    const colporterPercentage = program?.financialConfig?.colporter_percentage 
      ? parseFloat(program.financialConfig.colporter_percentage) 
      : 50;
    
    const totalSales = validTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalBooks = {
      grandes: 0,
      pequenos: 0
    };
    
    validTransactions.forEach(transaction => {
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.size === 'LARGE') {
            totalBooks.grandes += book.quantity;
          } else {
            totalBooks.pequenos += book.quantity;
          }
        });
      }
    });
    
    const weekMap = new Map();
    
    validTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      const mondayStr = monday.toISOString().split('T')[0];
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sundayStr = sunday.toISOString().split('T')[0];
      
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
      
      weekData.sales[transaction.date] = (weekData.sales[transaction.date] || 0) + transaction.total;
      
      if (!weekData.books[transaction.date]) {
        weekData.books[transaction.date] = {
          large: {},
          small: {}
        };
      }
      
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.size === 'LARGE') {
            weekData.books[transaction.date].large[book.title] = 
              (weekData.books[transaction.date].large[book.title] || 0) + book.quantity;
          } else {
            weekData.books[transaction.date].small[book.title] = 
              (weekData.books[transaction.date].small[book.title] || 0) + book.quantity;
          }
        });
      }
    });
    
    const weeks = Array.from(weekMap.values());
    const mostRecentWeek = weeks.sort((a, b) => 
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    )[0];
    
    if (mostRecentWeek) {
      setWeeklyData(mostRecentWeek);
      
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
        <LoadingScreen message={t('colporterReport.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t('common.error')}</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!colporterData || !weeklyData) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">{t('colporterReport.noData')}</p>
        <p>{t('colporterReport.noDataDescription')}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/reports/week/finances')}
        >
          {t('common.back')}
        </Button>
      </div>
    );
  }

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
        <Card>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('colporterReport.gross', { percentage: 100 })}</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">{t('common.total')}</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.bruto.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">{t('colporterReport.average')}</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.bruto.promedio.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('colporterReport.net', { percentage: program?.financialConfig?.colporter_percentage || 50 })}</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">{t('common.total')}</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.neto.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">{t('colporterReport.average')}</span>
                  <span className="text-sm font-bold text-gray-900">${colporterData.neto.promedio.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.deliveredBooks')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
              <span className="text-sm font-medium text-primary-600">{t('inventory.large')}</span>
              <Badge variant="primary">{colporterData.libros.grandes}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
              <span className="text-sm font-medium text-success-600">{t('inventory.small')}</span>
              <Badge variant="success">{colporterData.libros.pequenos}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg col-span-2">
              <span className="text-sm font-medium text-gray-600">{t('common.total')}</span>
              <Badge variant="secondary">{colporterData.libros.grandes + colporterData.libros.pequenos}</Badge>
            </div>
          </div>
        </Card>
      </div>
      
      {weeklyData && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('colporterReport.salesDetails')}</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                      {t('common.colporters')}
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
                      {t('common.total')}
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
      
      {weeklyData && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('colporterReport.bookDetails')}</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                      {t('inventory.book')}
                    </th>
                    {Object.keys(weeklyData.books).sort().map((date) => (
                      <th key={date} className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: '2-digit',
                          day: '2-digit',
                          timeZone: 'UTC'
                        })}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                      {t('common.total')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-primary-900 text-white">
                    <td colSpan={Object.keys(weeklyData.books).length + 2} className="px-4 py-2 text-sm font-semibold">
                      {t('colporterReport.largeBooks')}
                    </td>
                  </tr>
                  
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

                  <tr className="bg-success-900 text-white">
                    <td colSpan={Object.keys(weeklyData.books).length + 2} className="px-4 py-2 text-sm font-semibold">
                      {t('colporterReport.smallBooks')}
                    </td>
                  </tr>
                  
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
                  
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                      {t('common.totals')}
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