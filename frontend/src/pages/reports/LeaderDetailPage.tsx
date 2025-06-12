import React from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, TrendingUp, BookOpen, DollarSign, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface LeaderStats {
  totalSales: number;
  averageSales: number;
  totalBooks: {
    large: number;
    small: number;
  };
  colporterCount: number;
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

interface ColporterSummary {
  name: string;
  totalSales: number;
  averageSales: number;
  books: {
    large: number;
    small: number;
  };
  bestDay: {
    date: string;
    amount: number;
  };
}

// Helper function to generate all working days in the program
const generateProgramDays = () => {
  const startDate = new Date('2025-05-01');
  const endDate = new Date('2025-08-31');
  const days = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Skip Sundays (day 0) as they are typically rest days
    if (d.getDay() !== 0) {
      days.push(d.toISOString().split('T')[0]);
    }
  }
  
  return days;
};

const LeaderDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  // Mock data for the leader
  const leaderData = {
    'Odrie Aponte': {
      colporters: [
        { name: 'Moises Amador', baseSales: 285, baseLarge: 2, baseSmall: 1 },
        { name: 'Ambar de Jesus', baseSales: 305, baseLarge: 3, baseSmall: 2 },
      ]
    },
    'Moises Amador': {
      colporters: [
        { name: 'Amy Wilmery Buten', baseSales: 335, baseLarge: 3, baseSmall: 1 },
        { name: 'Carlo Bravo', baseSales: 295, baseLarge: 2, baseSmall: 2 },
      ]
    }
  };

  const data = leaderData[name as keyof typeof leaderData] || leaderData['Odrie Aponte'];
  const workingDays = generateProgramDays().length;
  
  // Calculate statistics for each colporter
  const colporterStats: ColporterSummary[] = data.colporters.map(colporter => {
    const totalSales = colporter.baseSales * workingDays * (1 + (Math.random() * 0.2 - 0.1)); // Add some variation
    const averageSales = totalSales / workingDays;
    const totalLargeBooks = colporter.baseLarge * workingDays * (1 + (Math.random() * 0.2 - 0.1));
    const totalSmallBooks = colporter.baseSmall * workingDays * (1 + (Math.random() * 0.2 - 0.1));
    
    // Generate a random best day
    const bestDayAmount = colporter.baseSales * 2;
    const randomDayIndex = Math.floor(Math.random() * workingDays);
    const bestDayDate = generateProgramDays()[randomDayIndex];
    
    return {
      name: colporter.name,
      totalSales,
      averageSales,
      books: {
        large: Math.round(totalLargeBooks),
        small: Math.round(totalSmallBooks)
      },
      bestDay: {
        date: bestDayDate,
        amount: bestDayAmount
      }
    };
  });
  
  // Calculate leader totals
  const leaderStats: LeaderStats = {
    totalSales: colporterStats.reduce((sum, c) => sum + c.totalSales, 0),
    averageSales: colporterStats.reduce((sum, c) => sum + c.averageSales, 0) / colporterStats.length,
    totalBooks: {
      large: colporterStats.reduce((sum, c) => sum + c.books.large, 0),
      small: colporterStats.reduce((sum, c) => sum + c.books.small, 0)
    },
    colporterCount: colporterStats.length,
    workingDays,
    bestDay: {
      date: colporterStats[0].bestDay.date, // Just use the first colporter's best day for simplicity
      amount: colporterStats.reduce((sum, c) => sum + c.bestDay.amount, 0) / 2 // Average of best days
    },
    worstDay: {
      date: generateProgramDays()[Math.floor(Math.random() * workingDays)],
      amount: colporterStats.reduce((sum, c) => sum + c.averageSales, 0) * 0.5 // Half of average
    }
  };

  // Group data by months for better visualization
  const months = ['May 2025', 'June 2025', 'July 2025', 'August 2025'];
  const monthlyData = months.reduce((acc, month) => {
    // Generate random data for each month
    const daysInMonth = month === 'May 2025' || month === 'July 2025' ? 26 : 25; // Approximate working days per month
    const salesFactor = month === 'July 2025' ? 1.2 : month === 'August 2025' ? 0.9 : 1; // Sales vary by month
    
    acc[month] = {
      sales: Math.round(leaderStats.averageSales * daysInMonth * salesFactor * 100) / 100,
      days: daysInMonth,
      books: {
        large: Math.round((leaderStats.totalBooks.large / workingDays) * daysInMonth * salesFactor),
        small: Math.round((leaderStats.totalBooks.small / workingDays) * daysInMonth * salesFactor)
      }
    };
    return acc;
  }, {} as Record<string, { sales: number; days: number; books: { large: number; small: number } }>);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/reports/summer/finances')}
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
            Complete Summer Program (May 1 - August 31, 2025) • {leaderStats.workingDays} working days
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
              <BookOpen className="text-warning-600" size={24} />
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
                <tr key={colporter.name} className={index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}>
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
                      {new Date(colporter.bestDay.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="font-medium text-success-600">
                      {formatCurrency(colporter.bestDay.amount)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/reports/summer-colporter/${colporter.name}`)}
                    >
                      <ChevronLeft size={16} className="transform rotate-180" />
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Books Per Day
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
                    {formatCurrency(data.sales)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                    {data.days}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(data.sales / data.days)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Badge variant="primary">{data.books.large}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Badge variant="success">{data.books.small}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                    {((data.books.large + data.books.small) / data.days).toFixed(1)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  TOTAL
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {formatCurrency(leaderStats.totalSales)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                  {leaderStats.workingDays}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {formatCurrency(leaderStats.totalSales / leaderStats.workingDays)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                  <Badge variant="primary">{leaderStats.totalBooks.large}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                  <Badge variant="success">{leaderStats.totalBooks.small}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                  {((leaderStats.totalBooks.large + leaderStats.totalBooks.small) / leaderStats.workingDays).toFixed(1)}
                </td>
              </tr>
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
                  {formatCurrency(leaderStats.bestDay.amount)}
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
                  {(leaderStats.totalBooks.large / leaderStats.totalBooks.small).toFixed(1)}:1
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