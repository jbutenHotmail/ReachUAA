import React from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface ColporterStats {
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
}

const ColporterReport: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  // Mock data for the colporter
  const stats: ColporterStats = {
    bruto: {
      total: 1568.66,
      promedio: 313.73,
    },
    neto: {
      total: 784.33,
      promedio: 156.87,
    },
    libros: {
      grandes: 216,
      pequenos: 16,
    },
  };

  // Mock data for the weekly report
  const mockWeeklySales = [
    {
      colporterName: name || '',
      sales: {
        '2025-05-12': 386.69,
        '2025-05-13': 464.98,
        '2025-05-14': 375.36,
        '2025-05-15': 349.64,
        '2025-05-16': 298.70,
      },
      totalSales: 1875.37,
      fines: 10.00,
      advance5: 93.77,
      books: {
        '2025-05-12': {
          large: {
            'El Deseado de Todas las Gentes': 2,
            'El Gran Conflicto': 1,
            'Patriarcas y Profetas': 1
          },
          small: {
            'El Camino a Cristo': 2,
            'Consejos Sobre el Régimen Alimenticio': 1
          }
        },
        '2025-05-13': {
          large: {
            'El Deseado de Todas las Gentes': 1,
            'El Gran Conflicto': 2
          },
          small: {
            'El Camino a Cristo': 1,
            'Palabras de Vida del Gran Maestro': 1
          }
        },
        '2025-05-14': {
          large: {
            'El Deseado de Todas las Gentes': 2,
            'Patriarcas y Profetas': 2
          },
          small: {
            'El Camino a Cristo': 2,
            'Consejos Sobre el Régimen Alimenticio': 1
          }
        },
        '2025-05-15': {
          large: {
            'El Gran Conflicto': 2,
            'Patriarcas y Profetas': 1
          },
          small: {
            'El Camino a Cristo': 1,
            'Palabras de Vida del Gran Maestro': 1
          }
        },
        '2025-05-16': {
          large: {
            'El Deseado de Todas las Gentes': 2,
            'El Gran Conflicto': 1
          },
          small: {
            'El Camino a Cristo': 2
          }
        }
      }
    },
  ];

  // Calculate totals
  const totals = mockWeeklySales.reduce((acc, sale) => {
    Object.entries(sale.sales).forEach(([date, amount]) => {
      acc.dailyTotals[date] = (acc.dailyTotals[date] || 0) + amount;
    });
    acc.totalSales += sale.totalSales;
    acc.totalFines += sale.fines;
    acc.totalAdvance5 += sale.advance5;
    return acc;
  }, {
    dailyTotals: {} as Record<string, number>,
    totalSales: 0,
    totalFines: 0,
    totalAdvance5: 0,
  });

  // Get all unique book titles
  const allBooks = {
    large: new Set<string>(),
    small: new Set<string>()
  };

  // Collect all unique book titles
  mockWeeklySales.forEach(sale => {
    Object.values(sale.books).forEach(dayBooks => {
      Object.keys(dayBooks.large).forEach(book => allBooks.large.add(book));
      Object.keys(dayBooks.small).forEach(book => allBooks.small.add(book));
    });
  });

  // Calculate book totals
  const bookTotals = {
    large: {} as Record<string, number>,
    small: {} as Record<string, number>
  };

  mockWeeklySales.forEach(sale => {
    Object.values(sale.books).forEach(dayBooks => {
      Object.entries(dayBooks.large).forEach(([book, qty]) => {
        bookTotals.large[book] = (bookTotals.large[book] || 0) + qty;
      });
      Object.entries(dayBooks.small).forEach(([book, qty]) => {
        bookTotals.small[book] = (bookTotals.small[book] || 0) + qty;
      });
    });
  });

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
          <p className="text-sm text-gray-500">Semana 1 (12-16 de Mayo)</p>
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
                  <span className="text-sm font-bold text-gray-900">${stats.bruto.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">NETO (50%)</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <span className="text-sm font-bold text-gray-900">${stats.neto.total.toFixed(2)}</span>
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
              <Badge variant="primary">{stats.libros.grandes}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
              <span className="text-sm font-medium text-success-600">Pequeños</span>
              <Badge variant="success">{stats.libros.pequenos}</Badge>
            </div>
          </div>
        </Card>
      </div>
      {/* Weekly Report Table */}

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
                  {Object.keys(mockWeeklySales[0].sales).map((date) => (
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
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-danger-600 border-b">
                    Multas
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-warning-500 border-b">
                    Avance 5%
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600 border-b">
                    Avance Entregado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockWeeklySales.map((sale) => (
                  <tr key={sale.colporterName} className="bg-yellow-50">
                    <td className="px-4 py-3 text-sm font-medium text-white bg-[#0052B4] sticky left-0 z-10">
                      {sale.colporterName}
                    </td>
                    {Object.entries(sale.sales).map(([date, amount]) => (
                      <td key={date} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        ${amount.toFixed(2)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                      ${sale.totalSales.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap bg-danger-50">
                      ${sale.fines.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap bg-warning-50">
                      ${sale.advance5.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap bg-success-50">
                      -
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                    TOTALES
                  </td>
                  {Object.entries(totals.dailyTotals).map(([date, amount]) => (
                    <td key={date} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      ${amount.toFixed(2)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    ${totals.totalSales.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap bg-danger-50">
                    ${totals.totalFines.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap bg-warning-50">
                    ${totals.totalAdvance5.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap bg-success-50">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {/* Books Table */}
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
                  {Object.keys(mockWeeklySales[0].books).map((date) => (
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
                  <td colSpan={7} className="px-4 py-2 text-sm font-semibold">
                    Libros Grandes
                  </td>
                </tr>
                {Array.from(allBooks.large).map(book => (
                  <tr key={book} className="bg-primary-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-primary-50">
                      {book}
                    </td>
                    {Object.keys(mockWeeklySales[0].books).map(date => (
                      <td key={date} className="px-4 py-3 text-sm text-center">
                        <Badge variant="primary">
                          {mockWeeklySales[0].books[date].large[book] || 0}
                        </Badge>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      <Badge variant="primary">
                        {bookTotals.large[book] || 0}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {/* Small Books */}
                <tr className="bg-success-900 text-white">
                  <td colSpan={7} className="px-4 py-2 text-sm font-semibold">
                    Libros Pequeños
                  </td>
                </tr>
                {Array.from(allBooks.small).map(book => (
                  <tr key={book} className="bg-success-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-success-50">
                      {book}
                    </td>
                    {Object.keys(mockWeeklySales[0].books).map(date => (
                      <td key={date} className="px-4 py-3 text-sm text-center">
                        <Badge variant="success">
                          {mockWeeklySales[0].books[date].small[book] || 0}
                        </Badge>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      <Badge variant="success">
                        {bookTotals.small[book] || 0}
                      </Badge>
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

export default ColporterReport;