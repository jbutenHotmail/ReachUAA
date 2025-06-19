import React from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

const InventoryLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (location.pathname === '/inventory') {
      navigate('/inventory/catalog');
    }
  }, [location, navigate]);

  const tabs = [
    { path: 'catalog', label: t('inventory.bookCatalog'), icon: <BookOpen size={18} /> },
    { path: 'tracking', label: t('inventory.inventoryTracking'), icon: <TrendingUp size={18} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('inventory.layoutTitle')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('inventory.description')}
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

export default InventoryLayout;