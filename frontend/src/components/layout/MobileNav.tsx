import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  BookText, 
  PiggyBank, 
  BarChart3, 
  User 
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuthStore } from '../../stores/authStore';

const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const navItems = [
    { 
      path: '/dashboard', 
      label: t('navigation.dashboard'), 
      icon: <LayoutDashboard size={18} />, 
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
    },
    { 
      path: '/inventory', 
      label: t('navigation.inventory'), 
      icon: <BookText size={18} />, 
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
    },
    { 
      path: '/transactions', 
      label: 'Transactions', 
      icon: <PiggyBank size={18} />, 
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
    },
    { 
      path: '/reports', 
      label: t('navigation.reports'), 
      icon: <BarChart3 size={18} />, 
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    { 
      path: '/admin', 
      label: 'Admin', 
      icon: <User size={18} />, 
      roles: [UserRole.ADMIN]
    },
  ];
  
  // Filter nav items by user role
  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 md:hidden safe-area-pb">
      <div className={`grid gap-0 ${filteredNavItems.length === 5 ? 'grid-cols-5' : filteredNavItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center p-2 min-h-[60px]
              text-xs font-medium transition-colors
              ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-900'}
            `}
          >
            <span className="mb-1">{item.icon}</span>
            <span className="text-center leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;