import React from 'react';
import { useTranslation } from 'react-i18next';
import AllExpenses from './AllExpenses';

const ActivitiesExpenses: React.FC = () => {
  const { t } = useTranslation();
  
  return <AllExpenses defaultCategory="activities" />;
};

export default ActivitiesExpenses;