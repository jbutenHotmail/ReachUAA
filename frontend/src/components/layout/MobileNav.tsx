import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  BookText, 
  PiggyBank, 
  BarChart3, 
  User,
  Plus,
  Globe,
  BookOpen,
  Award
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuthStore } from '../../stores/authStore';

const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  // Define navigation items based on user role
  const getNavItems = () => {
    // Base items for all roles
    const baseItems = [
      { 
        path: '/dashboard', 
        label: t('navigation.dashboard'), 
        icon: <LayoutDashboard size={18} />, 
      },
      { 
        path: '/bible-studies', 
        label: 'Estudios Bíblicos', 
        icon: <BookOpen size={18} />, 
      },
      { 
        path: '/settings', 
        label: t('settings.title'), 
        icon: <Globe size={18} />, 
      },
      { 
        path: '/profile', 
        label: t('profile.title'), 
        icon: <User size={18} />, 
      },
    ];
    
    // Items for Admin and Supervisor
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERVISOR) {
      return [
        baseItems[0],
        { 
          path: '/inventory', 
          label: t('navigation.inventory'), 
          icon: <BookText size={18} />, 
        },
        { 
          path: '/transactions', 
          label: 'Transactions', 
          icon: <PiggyBank size={18} />, 
        },
        { 
          path: '/reports/program', 
          label: t('navigation.reports'), 
          icon: <BarChart3 size={18} />, 
        },
        baseItems[3], // Profile
      ];
    }
    
    // For Viewer role, just return the base items
    return [
      baseItems[0], // Dashboard
      { 
        path: '/transactions/new', 
        label: 'New Transaction', 
        icon: <Plus size={18} />, 
      },
      { 
        path: '/bonifications', 
        label: 'Bonificaciones', 
        icon: <Award size={18} />, 
      },
      baseItems[3], // Profile
    ];
  };
  
  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 md:hidden safe-area-pb">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center p-2 min-h-[60px] flex-1
              text-xs font-medium transition-colors
              ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-900'}
            `}
          >
            <span className="mb-1">{item.icon}</span>
            <span className="text-center leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="text-[9px] text-center text-gray-400 py-1 bg-gray-50 border-t border-gray-100">
        &copy; {new Date().getFullYear()} Reach UAA - Wilmer Buten
      </div>
    </nav>
  );
};

export default MobileNav;