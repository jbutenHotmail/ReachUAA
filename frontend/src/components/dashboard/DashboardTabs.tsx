import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, BookText } from 'lucide-react';
import { clsx } from 'clsx';
import StatsGrid from './StatsGrid';
import BookStatsGrid from './BookStatsGrid';

interface DashboardTabsProps {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  goalPercentage: number;
  dailyChange: { value: number; type: 'increase' | 'decrease' };
  weeklyChange: { value: number; type: 'increase' | 'decrease' };
  monthlyChange: { value: number; type: 'increase' | 'decrease' };
  dailyBooks: { large: number; small: number; total: number };
  weeklyBooks: { large: number; small: number; total: number };
  monthlyBooks: { large: number; small: number; total: number };
  totalBooks?: { large: number; small: number; total: number };
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  dailySales,
  weeklySales,
  monthlySales,
  goalPercentage,
  dailyChange,
  weeklyChange,
  monthlyChange,
  dailyBooks,
  weeklyBooks,
  monthlyBooks,
  totalBooks
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'sales' | 'books'>('sales');

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200">
        <button
          className={clsx(
            'py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2',
            activeTab === 'sales'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => setActiveTab('sales')}
        >
          <DollarSign size={16} />
          {t('dashboard.sales')}
        </button>
        <button
          className={clsx(
            'py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2',
            activeTab === 'books'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => setActiveTab('books')}
        >
          <BookText size={16} />
          {t('inventory.books')}
        </button>
      </div>

      {activeTab === 'sales' ? (
        <StatsGrid
          dailySales={dailySales}
          weeklySales={weeklySales}
          monthlySales={monthlySales}
          goalPercentage={goalPercentage}
          dailyChange={dailyChange}
          weeklyChange={weeklyChange}
          monthlyChange={monthlyChange}
          dailyBooks={dailyBooks}
          weeklyBooks={weeklyBooks}
          monthlyBooks={monthlyBooks}
        />
      ) : (
        <BookStatsGrid
          dailyBooks={dailyBooks}
          weeklyBooks={weeklyBooks}
          monthlyBooks={monthlyBooks}
          totalBooks={totalBooks}
        />
      )}
    </div>
  );
};

export default DashboardTabs;