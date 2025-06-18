import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  timePeriod?: 'day' | 'week' | 'month' | 'all';
  selectedDate?: Date;
}

type SortField = 'name' | 'large' | 'small' | 'total' | 'average';
type SortDirection = 'asc' | 'desc';

const SummerBooksReport: React.FC<SummerBooksReportProps> = ({ 
  booksData, 
  showColporters = true,
  showLeaders = false,
  onToggleView,
  onToggleGrouping,
  timePeriod = 'all',
  selectedDate = new Date()
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const daysPerPage = 8;

  const filteredDays = React.useMemo(() => {
    if (booksData.length === 0) return [];
    
    const allDates = new Set<string>();
    booksData.forEach(data => {
      Object.keys(data.dailyBooks).forEach(date => {
        allDates.add(date);
      });
    });
    
    const allDaysArray = Array.from(allDates).sort();
    
    if (timePeriod === 'all') {
      return allDaysArray;
    }
    
    const today = selectedDate;
    today.setHours(0, 0, 0, 0);
    
    if (timePeriod === 'day') {
      const dateStr = today.toISOString().split('T')[0];
      return allDaysArray.filter(day => day === dateStr);
    }
    
    if (timePeriod === 'week') {
      const startOfWeek = new Date(today);
      const day = today.getDay();
      startOfWeek.setDate(today.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return allDaysArray.filter(day => {
        const date = new Date(day);
        return date >= startOfWeek && date <= endOfWeek;
      });
    }
    
    if (timePeriod === 'month') {
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      return allDaysArray.filter(day => {
        const date = new Date(day);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
    }
    
    return allDaysArray;
  }, [booksData, timePeriod, selectedDate]);

  const groupedBooksData = React.useMemo(() => {
    if (!showLeaders) return booksData;

    const leaderMap = new Map<string, SummerBooks>();
    
    booksData.forEach(data => {
      const leaderName = data.leaderName || t('common.unknown');
      
      if (!leaderMap.has(leaderName)) {
        leaderMap.set(leaderName, {
          colporterName: leaderName,
          totalBooks: { large: 0, small: 0 },
          dailyBooks: {}
        });
        
        filteredDays.forEach(day => {
          leaderMap.get(leaderName)!.dailyBooks[day] = { large: 0, small: 0 };
        });
      }
      
      const leaderData = leaderMap.get(leaderName)!;
      
      filteredDays.forEach(day => {
        if (data.dailyBooks[day]) {
          if (!leaderData.dailyBooks[day]) {
            leaderData.dailyBooks[day] = { large: 0, small: 0 };
          }
          
          leaderData.dailyBooks[day].large += data.dailyBooks[day]?.large || 0;
          leaderData.dailyBooks[day].small += data.dailyBooks[day]?.small || 0;
          
          leaderData.totalBooks.large += data.dailyBooks[day]?.large || 0;
          leaderData.totalBooks.small += data.dailyBooks[day]?.small || 0;
        }
      });
    });
    
    return Array.from(leaderMap.values());
  }, [booksData, showLeaders, filteredDays, t]);

  const sortedBooksData = [...groupedBooksData].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    const aTotalLarge = filteredDays.reduce((sum, day) => sum + (a.dailyBooks[day]?.large || 0), 0);
    const aTotalSmall = filteredDays.reduce((sum, day) => sum + (a.dailyBooks[day]?.small || 0), 0);
    const aTotal = aTotalLarge + aTotalSmall;
    
    const bTotalLarge = filteredDays.reduce((sum, day) => sum + (b.dailyBooks[day]?.large || 0), 0);
    const bTotalSmall = filteredDays.reduce((sum, day) => sum + (b.dailyBooks[day]?.small || 0), 0);
    const bTotal = bTotalLarge + bTotalSmall;

    switch (sortField) {
      case 'name':
        aValue = a.colporterName.toLowerCase();
        bValue = b.colporterName.toLowerCase();
        break;
      case 'large':
        aValue = aTotalLarge;
        bValue = bTotalLarge;
        break;
      case 'small':
        aValue = aTotalSmall;
        bValue = bTotalSmall;
        break;
      case 'total':
        aValue = aTotal;
        bValue = bTotal;
        break;
      case 'average':
        const aDaysWithBooks = filteredDays.filter(day => 
          (a.dailyBooks[day]?.large || 0) + (a.dailyBooks[day]?.small || 0) > 0
        ).length;
        
        const bDaysWithBooks = filteredDays.filter(day => 
          (b.dailyBooks[day]?.large || 0) + (b.dailyBooks[day]?.small || 0) > 0
        ).length;
        
        aValue = aDaysWithBooks > 0 ? aTotal / aDaysWithBooks : 0;
        bValue = bDaysWithBooks > 0 ? bTotal / bDaysWithBooks : 0;
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

  const totalPages = Math.ceil(filteredDays.length / daysPerPage);
  const startIndex = currentPage * daysPerPage;
  const endIndex = Math.min(startIndex + daysPerPage, filteredDays.length);
  const currentDays = filteredDays.slice(startIndex, endIndex);

  const totals = sortedBooksData.reduce((acc, colporter) => {
    filteredDays.forEach(date => {
      acc.dailyTotals[date] = acc.dailyTotals[date] || { large: 0, small: 0 };
      acc.dailyTotals[date].large += colporter.dailyBooks[date]?.large || 0;
      acc.dailyTotals[date].small += colporter.dailyBooks[date]?.small || 0;
    });
    
    const colporterTotalLarge = filteredDays.reduce((sum, day) => sum + (colporter.dailyBooks[day]?.large || 0), 0);
    const colporterTotalSmall = filteredDays.reduce((sum, day) => sum + (colporter.dailyBooks[day]?.small || 0), 0);
    
    acc.totalLarge += colporterTotalLarge;
    acc.totalSmall += colporterTotalSmall;
    
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('reports.totalBooks')}</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{totals.totalLarge + totals.totalSmall}</p>
            <p className="text-xs text-gray-500">
              {timePeriod === 'all' ? t('reports.completeProgram') : 
               timePeriod === 'month' ? t('reports.currentMonth') :
               timePeriod === 'week' ? t('reports.currentWeek') : t('reports.today')}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('inventory.large')}</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{totals.totalLarge}</p>
            <p className="text-xs text-gray-500">{t('reports.delivered')}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('inventory.small')}</p>
            <p className="mt-2 text-3xl font-bold text-success-600">{totals.totalSmall}</p>
            <p className="text-xs text-gray-500">{t('reports.delivered')}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('dashboard.dailyAverage')}</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">
              {filteredDays.length > 0 
                ? Math.round((totals.totalLarge + totals.totalSmall) / filteredDays.length) 
                : 0}
            </p>
            <p className="text-xs text-gray-500">{t('reports.booksPerDay')}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('reports.summerBooksReport')}</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('common.sortBy')}:</span>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-') as [SortField, SortDirection];
                  setSortField(field);
                  setSortDirection(direction);
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="name-asc">{t('reports.sortNameAsc')}</option>
                <option value="name-desc">{t('reports.sortNameDesc')}</option>
                <option value="total-desc">{t('reports.sortTotalDesc')}</option>
                <option value="total-asc">{t('reports.sortTotalAsc')}</option>
                <option value="large-desc">{t('reports.sortLargeDesc')}</option>
                <option value="large-asc">{t('reports.sortLargeAsc')}</option>
                <option value="small-desc">{t('reports.sortSmallDesc')}</option>
                <option value="small-asc">{t('reports.sortSmallAsc')}</option>
                <option value="average-desc">{t('reports.sortAverageDesc')}</option>
                <option value="average-asc">{t('reports.sortAverageAsc')}</option>
              </select>
            </div>

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
                {t('reports.days')} {startIndex + 1}-{endIndex} {t('reports.of')} {filteredDays.length}
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

            {onToggleView && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleView}
                leftIcon={showColporters ? <BarChart3 size={16} /> : <Users size={16} />}
              >
                {showColporters ? t('reports.showTotalsOnly') : t('reports.showDetails')}
              </Button>
            )}

            {onToggleGrouping && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleGrouping}
                leftIcon={showLeaders ? <Users size={16} /> : <UserCog size={16} />}
              >
                {showLeaders ? t('reports.byColporters') : t('reports.byLeaders')}
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
                      {showLeaders ? t('common.leader') : t('common.student')}
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
                          <div className="px-1">{t('inventory.large')}</div>
                          <div className="px-1">{t('inventory.small')}</div>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th 
                  colSpan={2}
                  className="text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b"
                >
                  <div className="px-4 py-1">{t('common.total')}</div>
                  <div className="grid grid-cols-2 divide-x divide-white/20 px-2 py-1 text-[10px]">
                    <button
                      onClick={() => handleSort('large')}
                      className="px-2 flex items-center justify-center gap-1 hover:text-gray-200 transition-colors"
                    >
                      {t('inventory.large')}
                      {getSortIcon('large')}
                    </button>
                    <button
                      onClick={() => handleSort('small')}
                      className="px-2 flex items-center justify-center gap-1 hover:text-gray-200 transition-colors"
                    >
                      {t('inventory.small')}
                      {getSortIcon('small')}
                    </button>
                  </div>
                </th>
                {showColporters && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    {t('common.details')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {showColporters ? (
                sortedBooksData.map((colporter, index) => {
                  const colporterTotalLarge = filteredDays.reduce((sum, day) => sum + (colporter.dailyBooks[day]?.large || 0), 0);
                  const colporterTotalSmall = filteredDays.reduce((sum, day) => sum + (colporter.dailyBooks[day]?.small || 0), 0);
                  
                  return (
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
                        <Badge variant="primary">{colporterTotalLarge}</Badge>
                      </td>
                      <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                        <Badge variant="success">{colporterTotalSmall}</Badge>
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
                  );
                })
              ) : (
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
              
              {showColporters && (
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                    {t('common.totals')}
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
            {t('reports.page')} {currentPage + 1} {t('reports.of')} {totalPages}
          </span>
        </div>
      </Card>
    </div>
  );
};

export default SummerBooksReport;