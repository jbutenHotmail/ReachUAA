import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { TrendingUp, Calendar } from 'lucide-react';

import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

interface GoalProgressProps {
  goal: {
    amount: number;
    achieved: number;
    startDate: string;
    endDate: string;
  };
}

const GoalProgress: React.FC<GoalProgressProps> = ({ goal }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? es : enUS;
  
  const percentage = Math.round((goal.achieved / goal.amount) * 100);
  const remaining = goal.amount - goal.achieved;
  
  const formatDate = (date: string) => {
    return format(new Date(date), 'PP', { locale });
  };
  
  let progressVariant: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
  
  if (percentage >= 100) {
    progressVariant = 'success';
  } else if (percentage >= 75) {
    progressVariant = 'primary';
  } else if (percentage >= 50) {
    progressVariant = 'warning';
  } else {
    progressVariant = 'danger';
  }
  return (
    <Card
      title={t('dashboard.goal')}
      icon={<TrendingUp size={20} />}
      className="h-full"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">${goal.achieved.toLocaleString()}</p>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <Calendar size={14} className="mr-1" />
              {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg text-gray-500">{t('dashboard.goal')}: <span className="font-semibold">${goal.amount.toLocaleString()}</span></p>
            <p className="text-sm text-gray-500">{t('dashboard.remaining')}: <span className="font-semibold">${remaining.toLocaleString()}</span></p>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{t('dashboard.achieved')}</span>
            <span>{percentage}%</span>
          </div>
          <ProgressBar 
            value={goal.achieved} 
            max={goal.amount}
            height={10}
            variant={progressVariant}
          />
        </div>
      </div>
    </Card>
  );
};

export default GoalProgress;