import React from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Users, Settings, UserCog, Percent } from 'lucide-react';
import { clsx } from 'clsx';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (location.pathname === '/admin') {
      navigate('/admin/users/manage');
    }
  }, [location, navigate]);

  // Define section-specific tabs
  const peopleTabs = [
    { path: '/admin/people/all', label: 'All People' },
    { path: '/admin/people/colporters', label: 'Colporters' },
    { path: '/admin/people/leaders', label: 'Leaders' },
  ];

  const usersTabs = [
    { path: '/admin/users/manage', label: 'Manage Users' },
    { path: '/admin/users/roles', label: 'Manage Roles' },
  ];

  // Determine which section we're in
  const getCurrentSection = () => {
    if (location.pathname.includes('/admin/users')) return 'users';
    if (location.pathname.includes('/admin/people')) return 'people';
    if (location.pathname.includes('/admin/percentages')) return 'percentages';
    if (location.pathname.includes('/admin/settings')) return 'settings';
    return null;
  };

  // Get the appropriate tabs for the current section
  const getCurrentTabs = () => {
    const section = getCurrentSection();
    switch (section) {
      case 'people':
        return peopleTabs;
      case 'users':
        return usersTabs;
      default:
        return [];
    }
  };

  // Get the current section title
  const getSectionTitle = () => {
    const section = getCurrentSection();
    switch (section) {
      case 'users':
        return 'User Management';
      case 'people':
        return 'People Management';
      case 'percentages':
        return 'Custom Percentages';
      case 'settings':
        return 'Program Settings';
      default:
        return 'Administration';
    }
  };

  // Get the current section description
  const getSectionDescription = () => {
    const section = getCurrentSection();
    switch (section) {
      case 'users':
        return 'Manage system users and their permissions';
      case 'people':
        return 'Manage colporters, leaders, and other personnel';
      case 'percentages':
        return 'Configure individual percentage rates for leaders';
      case 'settings':
        return 'Configure program settings and working days';
      default:
        return 'System settings and configurations';
    }
  };

  // Get the current section icon
  const getSectionIcon = () => {
    const section = getCurrentSection();
    switch (section) {
      case 'users':
        return <UserCog size={28} className="text-primary-600" />;
      case 'people':
        return <Users size={28} className="text-primary-600" />;
      case 'percentages':
        return <Percent size={28} className="text-primary-600" />;
      case 'settings':
        return <Settings size={28} className="text-primary-600" />;
      default:
        return null;
    }
  };

  const currentTabs = getCurrentTabs();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          {getSectionIcon()}
          <h1 className="text-2xl font-bold text-gray-900">{getSectionTitle()}</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {getSectionDescription()}
        </p>
      </div>

      {currentTabs.length > 0 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {currentTabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  clsx(
                    'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <Outlet />
    </div>
  );
}

export default AdminLayout;