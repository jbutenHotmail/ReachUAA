import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../ui/Card';
import { SalesData } from '../../types';
import { format, subDays, isAfter } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { BookText, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesChartProps {
  data: SalesData[];
  booksData?: Array<{
    date: string;
    large: number;
    small: number;
  }>;
}

const SalesChart: React.FC<SalesChartProps> = ({ 
  data,
  booksData = []
}) => {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');
  const [chartType, setChartType] = useState<'sales' | 'books'>('sales');
  
  const locale = i18n.language === 'es' ? es : enUS;
  
  const filterData = () => {
    if (period === 'all') return data;
    
    const today = new Date();
    const days = period === '7d' ? 7 : 30;
    const threshold = subDays(today, days - 1);
    
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return isAfter(itemDate, threshold) || itemDate.toDateString() === threshold.toDateString();
    });
  };

  const filterBooksData = () => {
    if (period === 'all') return booksData;
    
    const today = new Date();
    const days = period === '7d' ? 7 : 30;
    const threshold = subDays(today, days - 1);
    
    return booksData.filter(item => {
      const itemDate = new Date(item.date);
      return isAfter(itemDate, threshold) || itemDate.toDateString() === threshold.toDateString();
    });
  };
  
  const chartData = filterData();
  const filteredBooksData = filterBooksData();
  
  // Prepare data for Chart.js
  const labels = chartType === 'sales' 
    ? chartData.map(item => format(new Date(item.date), 'MMM dd', { locale }))
    : filteredBooksData.map(item => format(new Date(item.date), 'MMM dd', { locale }));
  
  const amounts = chartType === 'sales' 
    ? chartData.map(item => item.amount)
    : [];
  
  const largeBooks = chartType === 'books' 
    ? filteredBooksData.map(item => item.large)
    : [];
  
  const smallBooks = chartType === 'books' 
    ? filteredBooksData.map(item => item.small)
    : [];
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (chartType === 'sales') {
              return `${t('dashboard.sales')}: $${context.parsed.y}`;
            } else {
              const datasetLabel = context.dataset.label || '';
              return `${datasetLabel}: ${context.parsed.y}`;
            }
          },
        },
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 14,
        },
        padding: 10,
        backgroundColor: 'white',
        titleColor: '#1e293b',
        bodyColor: '#1e293b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#e5e7eb',
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: (value: number) => chartType === 'sales' ? `$${value}` : value,
        },
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 3,
        hoverRadius: 6,
      },
    },
  };
  
  const getSalesChartData = () => {
    return {
      labels,
      datasets: [
        {
          label: t('dashboard.sales'),
          data: amounts,
          borderColor: '#1e40af',
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          fill: true,
          pointBackgroundColor: '#1e40af',
        },
      ],
    };
  };
  
  const getBooksChartData = () => {
    return {
      labels,
      datasets: [
        {
          label: t('inventory.large'),
          data: largeBooks,
          borderColor: '#1e40af',
          backgroundColor: 'rgba(30, 64, 175, 0.05)',
          fill: true,
          pointBackgroundColor: '#1e40af',
        },
        {
          label: t('inventory.small'),
          data: smallBooks,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          fill: true,
          pointBackgroundColor: '#10b981',
        },
      ],
    };
  };
  
  const chartDataConfig = chartType === 'sales' ? getSalesChartData() : getBooksChartData();
  
  return (
    <Card
      title={chartType === 'sales' ? t('dashboard.sales') : t('inventory.books')}
      actions={
        <div className="flex items-center space-x-2">
          <div className="flex space-x-2 mr-4">
            <button
              className={clsx(
                'px-3 py-1 text-xs rounded-full flex items-center gap-1',
                chartType === 'sales' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              onClick={() => setChartType('sales')}
            >
              <DollarSign size={14} />
              {t('dashboard.sales')}
            </button>
            <button
              className={clsx(
                'px-3 py-1 text-xs rounded-full flex items-center gap-1',
                chartType === 'books' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              onClick={() => setChartType('books')}
            >
              <BookText size={14} />
              {t('inventory.books')}
            </button>
          </div>
          
          <button
            className={clsx(
              'px-3 py-1 text-xs rounded-full',
              period === '7d' 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            onClick={() => setPeriod('7d')}
          >
            7D
          </button>
          <button
            className={clsx(
              'px-3 py-1 text-xs rounded-full',
              period === '30d' 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            onClick={() => setPeriod('30d')}
          >
            30D
          </button>
          <button
            className={clsx(
              'px-3 py-1 text-xs rounded-full',
              period === 'all' 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            onClick={() => setPeriod('all')}
          >
            {t('common.all')}
          </button>
        </div>
      }
      className="h-96"
    >
      <div className="h-full">
        {(chartType === 'sales' && chartData.length > 0) || (chartType === 'books' && filteredBooksData.length > 0) ? (
          <Line options={chartOptions} data={chartDataConfig} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">
              {chartType === 'sales' 
                ? 'No sales data available' 
                : 'No books data available'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SalesChart;