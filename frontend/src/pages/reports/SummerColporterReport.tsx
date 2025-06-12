import React from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, TrendingUp, BookOpen, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

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

// Generate mock data for each working day
const generateDailySales = (colporterName: string, baseSales: number) => {
  const days = generateProgramDays();
  const dailySales: Record<string, number> = {};
  
  days.forEach((day, index) => {
    // Add some variation to daily sales (±30% of base)
    const variation = (Math.random() - 0.5) * 0.6;
    const dailyAmount = baseSales * (1 + variation);
    dailySales[day] = Math.max(0, Math.round(dailyAmount * 100) / 100);
  });
  
  return dailySales;
};

const generateDailyBooks = (colporterName: string, baseLarge: number, baseSmall: number) => {
  const days = generateProgramDays();
  const dailyBooks: Record<string, { large: number; small: number }> = {};
  
  days.forEach((day, index) => {
    // Add some variation to daily book counts
    const largeVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    const smallVariation = Math.floor(Math.random() * 2); // 0 or 1
    
    dailyBooks[day] = {
      large: Math.max(0, baseLarge + largeVariation),
      small: Math.max(0, baseSmall + smallVariation)
    };
  });
  
  return dailyBooks;
};

const SummerColporterReport: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  // Generate mock data for the specific colporter
  const colporterData = {
    'Moises Amador': { baseSales: 285, baseLarge: 2, baseSmall: 1 },
    'Odrie Aponte': { baseSales: 310, baseLarge: 2, baseSmall: 1 },
    'Amy Wilmery Buten': { baseSales: 335, baseLarge: 3, baseSmall: 1 },
  };

  const data = colporterData[name as keyof typeof colporterData] || colporterData['Amy Wilmery Buten'];
  const dailySales = generateDailySales(name || '', data.baseSales);
  const dailyBooks = generateDailyBooks(name || '', data.baseLarge, data.baseSmall);
  
  // Calculate statistics
  const totalSales = Object.values(dailySales).reduce((sum, amount) => sum + amount, 0);
  const workingDays = Object.keys(dailySales).length;
  const averagePerDay = totalSales / workingDays;
  
  const totalLargeBooks = Object.values(dailyBooks).reduce((sum, day) => sum + day.large, 0);
  const totalSmallBooks = Object.values(dailyBooks).reduce((sum, day) => sum + day.small, 0);
  
  // Find best and worst days
  const salesEntries = Object.entries(dailySales);
  const bestDay = salesEntries.reduce((best, [date, amount]) => 
    amount > best.amount ? { date, amount } : best, 
    { date: '', amount: 0 }
  );
  const worstDay = salesEntries.reduce((worst, [date, amount]) => 
    amount < worst.amount ? { date, amount } : worst, 
    { date: '', amount: Infinity }
  );

  const stats: ColporterSummerStats = {
    bruto: {
      total: totalSales,
      promedio: averagePerDay,
    },
    neto: {
      total: totalSales * 0.5,
      promedio: averagePerDay * 0.5,
    },
    libros: {
      grandes: totalLargeBooks,
      pequenos: totalSmallBooks,
    },
    workingDays,
    bestDay,
    worstDay: worstDay.amount === Infinity ? { date: '', amount: 0 } : worstDay,
  };

  // Group data by months for better visualization
  const monthlyData = Object.entries(dailySales).reduce((acc, [date, amount]) => {
    const month = new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { sales: 0, days: 0, books: { large: 0, small: 0 } };
    }
    acc[month].sales += amount;
    acc[month].days += 1;
    acc[month].books.large += dailyBooks[date]?.large || 0;
    acc[month].books.small += dailyBooks[date]?.small || 0;
    return acc;
  }, {} as Record<string, { sales: number; days: number; books: { large: number; small: number } }>);

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
            <TrendingUp className="text-primary-600" size={28} />
            {name} - Summer Report
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <Calendar size={16} />
            Complete Summer Program (May 1 - August 31, 2025) • {stats.workingDays} working days
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
            <p className="text-xs text-gray-500">50% of sales</p>
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
              {new Date(stats.bestDay.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
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
                  {Object.keys(monthlyData).map((month) => (
                    <th key={month} className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                      {month}
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
                  {Object.entries(monthlyData).map(([month, data]) => (
                    <td key={month} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      ${data.sales.toFixed(2)}
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
    </div>
  );
};

export default SummerColporterReport;