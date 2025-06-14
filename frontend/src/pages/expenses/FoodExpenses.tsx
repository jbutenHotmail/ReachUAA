import React from 'react';
import { useTranslation } from 'react-i18next';
import AllExpenses from './AllExpenses';

const FoodExpenses: React.FC = () => {
  const { t } = useTranslation();
  
  return <AllExpenses defaultCategory="food" />;
};

export default FoodExpenses;