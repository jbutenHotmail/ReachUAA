import React from 'react';
import { useTranslation } from 'react-i18next';
import AllExpenses from './AllExpenses';

const HealthExpenses: React.FC = () => {
  const { t } = useTranslation();
  
  return <AllExpenses defaultCategory="health" />;
};

export default HealthExpenses;