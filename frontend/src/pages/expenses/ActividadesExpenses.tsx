import React from 'react';
import { useTranslation } from 'react-i18next';
import AllExpenses from './AllExpenses';

const ActividadesExpenses: React.FC = () => {
  const { t } = useTranslation();
  
  return <AllExpenses defaultCategory="actividades" />;
};

export default ActividadesExpenses;