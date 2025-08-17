import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BookText } from 'lucide-react';
import Card from '../ui/Card';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: { 
    value: number; 
    type: 'increase' | 'decrease' 
  };
  prefix?: string;
  secondaryValue?: number | string;
  secondaryLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  prefix = '$',
  secondaryValue,
  secondaryLabel
}) => {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {typeof value === 'number' ? `${prefix}${value.toLocaleString()}` : value}
          </p>
          {secondaryValue !== undefined && secondaryLabel && (
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {secondaryLabel}: <span className="font-medium">{secondaryValue}</span>
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${icon.props.className} flex-shrink-0 ml-2`}>
          {React.cloneElement(icon, { size: 16, className: icon.props.className.replace(/h-6 w-6/, 'w-4 h-4 sm:w-5 sm:h-5') })}
        </div>
      </div>
      
      {change && (
        <div className="mt-2 sm:mt-4">
          <div className={`inline-flex items-center text-xs sm:text-sm font-medium ${
            change.type === 'increase' 
              ? 'text-success-600' 
              : 'text-danger-600'
          }`}>
            {change.type === 'increase' ? (
              <TrendingUp size={14} className="mr-1" />
            ) : (
              <TrendingDown size={14} className="mr-1" />
            )}
            {change.value}%
          </div>
          <span className="ml-2 text-xs text-gray-500">from last period</span>
        </div>
      )}
    </Card>
  );
};

interface StatsGridProps {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  goalPercentage: number;
  dailyChange: { value: number; type: 'increase' | 'decrease' };
  weeklyChange: { value: number; type: 'increase' | 'decrease' };
  monthlyChange: { value: number; type: 'increase' | 'decrease' };
  dailyBooks?: { large: number; small: number; total: number };
  weeklyBooks?: { large: number; small: number; total: number };
  monthlyBooks?: { large: number; small: number; total: number };
}

const StatsGrid: React.FC<StatsGridProps> = ({ 
  dailySales, 
  weeklySales, 
  monthlySales, 
  goalPercentage,
  dailyChange,
  weeklyChange,
  monthlyChange,
  dailyBooks = { large: 0, small: 0, total: 0 },
  weeklyBooks = { large: 0, small: 0, total: 0 },
  monthlyBooks = { large: 0, small: 0, total: 0 }
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      <StatCard
        title={t('dashboard.today')}
        value={dailySales}
        icon={<DollarSign className="h-6 w-6 text-cta-600 bg-cta-100" />}
        change={dailyChange}
        secondaryValue={dailyBooks.total}
        secondaryLabel={t('inventory.books')}
      />
      <StatCard
        title={t('dashboard.thisWeek')}
        value={weeklySales}
        icon={<ShoppingBag className="h-6 w-6 text-primary-600 bg-primary-100" />}
        change={weeklyChange}
        secondaryValue={weeklyBooks.total}
        secondaryLabel={t('inventory.books')}
      />
      <StatCard
        title={t('dashboard.thisMonth')}
        value={monthlySales}
        icon={<TrendingUp className="h-6 w-6 text-success-600 bg-success-100" />}
        change={monthlyChange}
        secondaryValue={monthlyBooks.total}
        secondaryLabel={t('inventory.books')}
      />
      <StatCard
        title={t('dashboard.monthlyGoal')}
        value={`${goalPercentage}%`}
        prefix=""
        icon={<BookText className="h-6 w-6 text-warning-600 bg-warning-100" />}
        secondaryValue={`${monthlyBooks.large}/${monthlyBooks.small}`}
        secondaryLabel={`${t('inventory.large')}/${t('inventory.small')}`}
      />
    </div>
  );
};

export default StatsGrid;