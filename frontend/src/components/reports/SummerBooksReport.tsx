import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronRight, Users, BarChart3, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, UserCog } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface BookDelivery {
  large: number;
  small: number;
}

interface SummerBooks {
  colporterName: string;
  leaderName?: string;
  totalBooks: BookDelivery;
  dailyBooks: {
    [date: string]: BookDelivery;
  };
}

interface SummerBooksReportProps {
  booksData: SummerBooks[];
  showColporters?: boolean;
  showLeaders?: boolean;
  onToggleView?: () => void;
  onToggleGrouping?: () => void;
}

type SortField = 'name' | 'large' | 'small' | 'total' | 'average';
type SortDirection = 'asc' | 'desc';

const SummerBooksReport: React.FC<SummerBooksReportProps> = ({ 
  booksData, 
  showColporters = true,
  showLeaders = false,
  onToggleView,
  onToggleGrouping
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const daysPerPage = 8; // Show 8 days at a time for books (need more space for large/small columns)

  // Get all days from the data and sort them
  const allDays = booksData.length > 0 
    ? Object.keys(booksData[0].dailyBooks).sort()
    : [];

  // Group books by leader if needed
  const groupedBooksData = React.useMemo(() => {
    if (!showLeaders) return booksData;

    const leaderMap = new Map<string, SummerBooks>();
    
    booksData.forEach(data => {
      const leaderName = data.leaderName || 'Unknown';
      
      if (!leaderMap.has(leaderName)) {
        leaderMap.set(leaderName, {
          colporterName: leaderName,
          totalBooks: { large: 0, small: 0 },
          dailyBooks: {}
        });
        
        // Initialize all days with zero
        allDays.forEach(day => {
          leaderMap.get(leaderName)!.dailyBooks[day] = { large: 0, small: 0 };
        });
      }
      
      // Add books to leader totals
      const leaderData = leaderMap.get(leaderName)!;
      leaderData.totalBooks.large += data.totalBooks.large;
      leaderData.totalBooks.small += data.totalBooks.small;
      
      // Add daily books
      Object.entries(data.dailyBooks).forEach(([date, books]) => {
        if (!leaderData.dailyBooks[date]) {
          leaderData.dailyBooks[date] = { large: 0, small: 0 };
        }
        leaderData.dailyBooks[date].large += books.large;
        leaderData.dailyBooks[date].small += books.small;
      });
    });
    
    return Array.from(leaderMap.values());
  }, [booksData, showLeaders, allDays]);

  // Sort books data
  const sortedBooksData = [...groupedBooksData].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = a.colporterName.toLowerCase();
        bValue = b.colporterName.toLowerCase();
        break;
      case 'large':
        aValue = a.totalBooks.large;
        bValue = b.totalBooks.large;
        break;
      case 'small':
        aValue = a.totalBooks.small;
        bValue = b.totalBooks.small;
        break;
      case 'total':
        aValue = a.totalBooks.large + a.totalBooks.small;
        bValue = b.totalBooks.large + b.totalBooks.small;
        break;
      case 'average':
        aValue = (a.totalBooks.large + a.totalBooks.small) / allDays.length;
        bValue = (b.totalBooks.large + b.totalBooks.small) / allDays.length;
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
  const totals = sortedBooksData.reduce((acc, colporter) => {
    allDays.forEach(date => {
      const dayBooks = colporter.dailyBooks[date] || { large: 0, small: 0 };
      acc.dailyTotals[date] = acc.dailyTotals[date] || { large: 0, small: 0 };
      acc.dailyTotals[date].large += dayBooks.large;
      acc.dailyTotals[date].small += dayBooks.small;
    });
    acc.totalLarge += colporter.totalBooks.large;
    acc.totalSmall += colporter.totalBooks.small;
    return acc;
  }, {
    dailyTotals: {} as Record<string, BookDelivery>,
    totalLarge: 0,
    totalSmall: 0,
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Total Books</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{totals.totalLarge + totals.totalSmall}</p>
            <p className="text-xs text-gray-500">Complete program</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Large Books</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{totals.totalLarge}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Small Books</p>
            <p className="mt-2 text-3xl font-bold text-success-600">{totals.totalSmall}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Daily Average</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">
              {Math.round((totals.totalLarge + totals.totalSmall) / allDays.length)}
            </p>
            <p className="text-xs text-gray-500">Books per day</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Summer Books Report (Daily View)</h3>
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
                <option value="total-desc">Total Books (High-Low)</option>
                <option value="total-asc">Total Books (Low-High)</option>
                <option value="large-desc">Large Books (High-Low)</option>
                <option value="large-asc">Large Books (Low-High)</option>
                <option value="small-desc">Small Books (High-Low)</option>
                <option value="small-asc">Small Books (Low-High)</option>
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
                    <th 
                      key={date} 
                      colSpan={2}
                      className="text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b min-w-[100px]"
                    >
                      <div className="px-2 py-1">
                        <div className="flex flex-col items-center mb-1">
                          <span className="text-[10px]">{day}</span>
                          <span className="font-bold">{dayNum}</span>
                          <span className="text-[10px]">{month}</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/20 text-[10px]">
                          <div className="px-1">Large</div>
                          <div className="px-1">Small</div>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th 
                  colSpan={2}
                  className="text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b"
                >
                  <div className="px-4 py-1">Total</div>
                  <div className="grid grid-cols-2 divide-x divide-white/20 px-2 py-1 text-[10px]">
                    <button
                      onClick={() => handleSort('large')}
                      className="px-2 flex items-center justify-center gap-1 hover:text-gray-200 transition-colors"
                    >
                      Large
                      {getSortIcon('large')}
                    </button>
                    <button
                      onClick={() => handleSort('small')}
                      className="px-2 flex items-center justify-center gap-1 hover:text-gray-200 transition-colors"
                    >
                      Small
                      {getSortIcon('small')}
                    </button>
                  </div>
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
                sortedBooksData.map((colporter, index) => (
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
                    {currentDays.map((date) => {
                      const dayBooks = colporter.dailyBooks[date] || { large: 0, small: 0 };
                      return (
                        <React.Fragment key={date}>
                          <td className="px-1 py-3 text-xs text-center whitespace-nowrap">
                            <Badge variant="primary" size="sm">{dayBooks.large}</Badge>
                          </td>
                          <td className="px-1 py-3 text-xs text-center whitespace-nowrap">
                            <Badge variant="success" size="sm">{dayBooks.small}</Badge>
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                      <Badge variant="primary">{colporter.totalBooks.large}</Badge>
                    </td>
                    <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                      <Badge variant="success">{colporter.totalBooks.small}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/reports/summer-colporter/${colporter.colporterName}`)}
                      >
                        <ChevronRight size={20} />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                // Show only totals
                <tr className="bg-primary-50">
                  {currentDays.map((date) => {
                    const dayTotal = totals.dailyTotals[date] || { large: 0, small: 0 };
                    return (
                      <React.Fragment key={date}>
                        <td className="px-1 py-3 text-xs text-center whitespace-nowrap">
                          <Badge variant="primary" className="font-bold" size="sm">{dayTotal.large}</Badge>
                        </td>
                        <td className="px-1 py-3 text-xs text-center whitespace-nowrap">
                          <Badge variant="success" className="font-bold" size="sm">{dayTotal.small}</Badge>
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                    <Badge variant="primary" className="font-bold">{totals.totalLarge}</Badge>
                  </td>
                  <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                    <Badge variant="success" className="font-bold">{totals.totalSmall}</Badge>
                  </td>
                </tr>
              )}
              
              {/* Totals row - only show when showing colporters */}
              {showColporters && (
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                    TOTALES
                  </td>
                  {currentDays.map((date) => {
                    const dayTotal = totals.dailyTotals[date] || { large: 0, small: 0 };
                    return (
                      <React.Fragment key={date}>
                        <td className="px-1 py-3 text-xs text-center whitespace-nowrap">
                          <Badge variant="primary" size="sm">{dayTotal.large}</Badge>
                        </td>
                        <td className="px-1 py-3 text-xs text-center whitespace-nowrap">
                          <Badge variant="success" size="sm">{dayTotal.small}</Badge>
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                    <Badge variant="primary">{totals.totalLarge}</Badge>
                  </td>
                  <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                    <Badge variant="success">{totals.totalSmall}</Badge>
                  </td>
                  <td></td>
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

export default SummerBooksReport;