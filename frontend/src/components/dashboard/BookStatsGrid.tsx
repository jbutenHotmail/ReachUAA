import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookText, BookOpen, TrendingUp } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface BookStatsGridProps {
  dailyBooks: {
    large: number;
    small: number;
    total: number;
  };
  weeklyBooks: {
    large: number;
    small: number;
    total: number;
  };
  monthlyBooks: {
    large: number;
    small: number;
    total: number;
  };
  totalBooks?: {
    large: number;
    small: number;
    total: number;
  };
}

const BookStatsGrid: React.FC<BookStatsGridProps> = ({
  dailyBooks,
  weeklyBooks,
  monthlyBooks,
  totalBooks
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <BookText className="text-primary-600" size={24} />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('dashboard.today')}</p>
          <p className="mt-1 text-2xl font-bold text-primary-600">{dailyBooks.total}</p>
          <div className="flex justify-center gap-2 mt-1">
            <Badge variant="primary" size="sm">
              {t('inventory.large')}: {dailyBooks.large}
            </Badge>
            <Badge variant="success" size="sm">
              {t('inventory.small')}: {dailyBooks.small}
            </Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <BookOpen className="text-success-600" size={24} />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('dashboard.thisWeek')}</p>
          <p className="mt-1 text-2xl font-bold text-success-600">{weeklyBooks.total}</p>
          <div className="flex justify-center gap-2 mt-1">
            <Badge variant="primary" size="sm">
              {t('inventory.large')}: {weeklyBooks.large}
            </Badge>
            <Badge variant="success" size="sm">
              {t('inventory.small')}: {weeklyBooks.small}
            </Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="text-warning-600" size={24} />
          </div>
          <p className="text-sm font-medium text-gray-500">{t('dashboard.thisMonth')}</p>
          <p className="mt-1 text-2xl font-bold text-warning-600">{monthlyBooks.total}</p>
          <div className="flex justify-center gap-2 mt-1">
            <Badge variant="primary" size="sm">
              {t('inventory.large')}: {monthlyBooks.large}
            </Badge>
            <Badge variant="success" size="sm">
              {t('inventory.small')}: {monthlyBooks.small}
            </Badge>
          </div>
        </div>
      </Card>

      {totalBooks && (
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookText className="text-cta-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('reports.totalBooks')}</p>
            <p className="mt-1 text-2xl font-bold text-cta-600">{totalBooks.total}</p>
            <div className="flex justify-center gap-2 mt-1">
              <Badge variant="primary" size="sm">
                {t('inventory.large')}: {totalBooks.large}
              </Badge>
              <Badge variant="success" size="sm">
                {t('inventory.small')}: {totalBooks.small}
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BookStatsGrid;