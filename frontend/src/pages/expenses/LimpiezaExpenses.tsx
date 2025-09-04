import React from 'react';
import { useTranslation } from 'react-i18next';
import AllExpenses from './AllExpenses';

const LimpiezaExpenses: React.FC = () => {
  const { t } = useTranslation();
  
  return <AllExpenses defaultCategory="limpieza" />;
};

export default LimpiezaExpenses;