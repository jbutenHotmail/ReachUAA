import React from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Utensils, ChevronFirst as FirstAid, ShoppingBag, Wrench, Fuel, LayoutGrid } from 'lucide-react';
import { clsx } from 'clsx';

const ExpenseLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (location.pathname === '/expenses') {
      navigate('/expenses/all');
    }
  }, [location, navigate]);

  const tabs = [
    { path: 'all', label: 'All', icon: <LayoutGrid size={18} /> },
    { path: 'food', label: t('expenses.food'), icon: <Utensils size={18} /> },
    { path: 'health', label: t('expenses.health'), icon: <FirstAid size={18} /> },
    { path: 'supplies', label: t('expenses.supplies'), icon: <ShoppingBag size={18} /> },
    { path: 'maintenance', label: t('expenses.maintenance'), icon: <Wrench size={18} /> },
    { path: 'fuel', label: t('expenses.fuel'), icon: <Fuel size={18} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.expenses')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and track all program expenses
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                clsx(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )
              }
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
};

export default ExpenseLayout;