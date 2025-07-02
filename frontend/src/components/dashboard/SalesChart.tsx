import React, { useState, useEffect } from 'react';
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
import { parseDate } from '../../utils/dateUtils';

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
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');
  
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
  
  const chartData = filterData();
  
  // Prepare data for Chart.js
  const labels = chartData.map(item => format(parseDate(item.date), locale === enUS ? "MMM dd" : "dd MMM", { locale }));
  const amounts = chartData.map(item => item.amount);
  
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
          label: (context: any) => `${t('dashboard.sales')}: $${context.parsed.y}`,
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
          callback: (value: number) => `$${value}`,
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
  
  const chartDataConfig = {
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
  
  return (
    <Card
      title={t('dashboard.sales')}
      actions={
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-xs rounded-full ${
              period === '7d' 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setPeriod('7d')}
          >
            7D
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-full ${
              period === '30d' 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setPeriod('30d')}
          >
            30D
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-full ${
              period === 'all' 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setPeriod('all')}
          >
            {t('common.all')}
          </button>
        </div>
      }
      className="h-96"
    >
      <div className="h-full">
        {chartData.length > 0 ? (
          <Line options={chartOptions} data={chartDataConfig} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">No sales data available</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SalesChart;