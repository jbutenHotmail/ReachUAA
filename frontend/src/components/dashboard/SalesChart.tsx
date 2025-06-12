import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import Card from '../ui/Card';
import { SalesData } from '../../types';
import { format, subDays, isAfter } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

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
  
  const chartData = filterData().map(item => ({
    ...item,
    formattedDate: format(new Date(item.date), 'MMM dd', { locale }),
  }));
  
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
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#6b7280" 
              tick={{ fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis 
              stroke="#6b7280" 
              tick={{ fontSize: 12 }}
              tickMargin={10}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              formatter={(value) => [`$${value}`, t('dashboard.sales')]}
              labelFormatter={(label) => label}
              contentStyle={{ 
                backgroundColor: 'white', 
                borderRadius: '0.375rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: 'none'
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="amount" 
              name={t('dashboard.sales')}
              stroke="#1e40af" 
              fill="rgba(30, 64, 175, 0.2)" 
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SalesChart;