import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronRight, Users, BarChart3, ChevronLeft, Calendar, ArrowUpDown, ArrowUp, ArrowDown, UserCog } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface SummerSale {
  colporterName: string;
  leaderName?: string;
  totalSales: number;
  dailySales: {
    [date: string]: number;
  };
}

interface SummerReportProps {
  sales: SummerSale[];
  showColporters?: boolean;
  showLeaders?: boolean;
  onToggleView?: () => void;
  onToggleGrouping?: () => void;
}

type SortField = 'name' | 'total' | 'average';
type SortDirection = 'asc' | 'desc';

const SummerReport: React.FC<SummerReportProps> = ({ 
  sales, 
  showColporters = true,
  showLeaders = false,
  onToggleView,
  onToggleGrouping
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const daysPerPage = 10; // Show 10 days at a time for better visibility

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get all days from the data and sort them
  const allDays = sales.length > 0 
    ? Object.keys(sales[0].dailySales).sort()
    : [];

  // Group sales by leader if needed
  const groupedSales = React.useMemo(() => {
    if (!showLeaders) return sales;

    const leaderMap = new Map<string, SummerSale>();
    
    sales.forEach(sale => {
      const leaderName = sale.leaderName || 'Unknown';
      
      if (!leaderMap.has(leaderName)) {
        leaderMap.set(leaderName, {
          colporterName: leaderName,
          totalSales: 0,
          dailySales: {},
        });
        
        // Initialize all days with zero
        allDays.forEach(day => {
          leaderMap.get(leaderName)!.dailySales[day] = 0;
        });
      }
      
      // Add sales to leader totals
      const leaderData = leaderMap.get(leaderName)!;
      leaderData.totalSales += sale.totalSales;
      
      // Add daily sales
      Object.entries(sale.dailySales).forEach(([date, amount]) => {
        leaderData.dailySales[date] = (leaderData.dailySales[date] || 0) + amount;
      });
    });
    
    return Array.from(leaderMap.values());
  }, [sales, showLeaders, allDays]);

  // Sort sales data
  const sortedSales = [...groupedSales].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = a.colporterName.toLowerCase();
        bValue = b.colporterName.toLowerCase();
        break;
      case 'total':
        aValue = a.totalSales;
        bValue = b.totalSales;
        break;
      case 'average':
        aValue = a.totalSales / allDays.length;
        bValue = b.totalSales / allDays.length;
        break;
      default:
        aValue = a.colporterName.toLowerCase();
        bValue = b.colporterName.toLowerCase();
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else {
      const comparison = (aValue as number) - (bValue as number);
      return sortDirection === 'asc' ? comparison : -comparison;
    }
  });

  // Paginate days
  const totalPages = Math.ceil(allDays.length / daysPerPage);
  const startIndex = currentPage * daysPerPage;
  const endIndex = Math.min(startIndex + daysPerPage, allDays.length);
  const currentDays = allDays.slice(startIndex, endIndex);

  // Calculate totals
  const totals = sortedSales.reduce((acc, colporter) => {
    allDays.forEach(date => {
      acc.dailyTotals[date] = (acc.dailyTotals[date] || 0) + (colporter.dailySales[date] || 0);
    });
    acc.totalSales += colporter.totalSales;
    return acc;
  }, {
    dailyTotals: {} as Record<string, number>,
    totalSales: 0,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' })
    };
  };

  const navigatePage = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-primary-600" />
      : <ArrowDown size={14} className="text-primary-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Total Donations</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{formatCurrency(totals.totalSales)}</p>
            <p className="text-xs text-gray-500">Complete program</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Average per Day</p>
            <p className="mt-2 text-3xl font-bold text-success-600">
              {formatCurrency(totals.totalSales / allDays.length)}
            </p>
            <p className="text-xs text-gray-500">Across {allDays.length} working days</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Average per Colporter</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">
              {formatCurrency(totals.totalSales / sortedSales.length)}
            </p>
            <p className="text-xs text-gray-500">Per participant</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Summer Donations Report (Daily View)</h3>
          <div className="flex items-center gap-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-') as [SortField, SortDirection];
                  setSortField(field);
                  setSortDirection(direction);
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="total-desc">Total Donations (High-Low)</option>
                <option value="total-asc">Total Donations (Low-High)</option>
                <option value="average-desc">Daily Average (High-Low)</option>
                <option value="average-asc">Daily Average (Low-High)</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigatePage('prev')}
                disabled={currentPage === 0}
              >
                <ChevronLeft size={16} />
              </Button>
              
              <span className="text-sm text-gray-600">
                Days {startIndex + 1}-{endIndex} of {allDays.length}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigatePage('next')}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight size={16} />
              </Button>
            </div>

            {/* Toggle between colporters and totals */}
            {onToggleView && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleView}
                leftIcon={showColporters ? <BarChart3 size={16} /> : <Users size={16} />}
              >
                {showColporters ? 'Show Totals Only' : 'Show Details'}
              </Button>
            )}

            {/* Toggle between colporters and leaders */}
            {onToggleGrouping && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleGrouping}
                leftIcon={showLeaders ? <Users size={16} /> : <UserCog size={16} />}
              >
                {showLeaders ? 'By Colporters' : 'By Leaders'}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {showColporters && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                    >
                      {showLeaders ? 'Leaders' : 'Colportores'}
                      {getSortIcon('name')}
                    </button>
                  </th>
                )}
                {currentDays.map((date) => {
                  const { day, date: dayNum, month } = formatDate(date);
                  return (
                    <th key={date} className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px]">{day}</span>
                        <span className="font-bold">{dayNum}</span>
                        <span className="text-[10px]">{month}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                  <button
                    onClick={() => handleSort('total')}
                    className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                  >
                    Total
                    {getSortIcon('total')}
                  </button>
                </th>
                {showColporters && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    Details
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {showColporters ? (
                // Show individual colporters or leaders
                sortedSales.map((colporter, index) => (
                  <tr 
                    key={colporter.colporterName}
                    className={clsx(
                      'hover:bg-gray-50 transition-colors',
                      index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-white bg-[#0052B4] sticky left-0 z-10">
                      {colporter.colporterName}
                    </td>
                    {currentDays.map((date) => (
                      <td key={date} className="px-4 py-3 text-sm text-center whitespace-nowrap">
                        {formatCurrency(colporter.dailySales[date] || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-center font-medium whitespace-nowrap">
                      {formatCurrency(colporter.totalSales)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(showLeaders 
                          ? `/reports/leader/${colporter.colporterName}`
                          : `/reports/summer-colporter/${colporter.colporterName}`
                        )}
                      >
                        <ChevronRight size={20} />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                // Show only totals
                <tr className="bg-primary-50">
                  {currentDays.map((date) => (
                    <td key={date} className="px-4 py-3 text-sm text-center font-semibold whitespace-nowrap text-primary-900">
                      {formatCurrency(totals.dailyTotals[date] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-center font-bold whitespace-nowrap text-primary-900">
                    {formatCurrency(totals.totalSales)}
                  </td>
                </tr>
              )}
              
              {/* Totals row - always show when showing colporters */}
              {showColporters && (
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                    TOTALES
                  </td>
                  {currentDays.map((date) => (
                    <td key={date} className="px-4 py-3 text-sm text-center whitespace-nowrap">
                      {formatCurrency(totals.dailyTotals[date] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    {formatCurrency(totals.totalSales)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Page indicator */}
        <div className="flex justify-center items-center mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={clsx(
                  'w-2 h-2 rounded-full transition-colors',
                  i === currentPage ? 'bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'
                )}
              />
            ))}
          </div>
          <span className="ml-4 text-xs text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
        </div>
      </Card>
    </div>
  );
};

export default SummerReport;