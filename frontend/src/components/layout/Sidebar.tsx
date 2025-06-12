import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { 
  LayoutDashboard, BookText, PiggyBank, BarChart3, Heart, Settings, 
  X, DollarSign, ChevronDown, ClipboardList, 
  Receipt, Wallet, Utensils, ChevronFirst as FirstAid, ShoppingBag, Wrench, 
  Fuel, Users, UserPlus, BookOpen, UserCog, UsersRound,
  Package, TrendingUp, Calendar, Sun, AlertTriangle, FileText, Plus, Lock
} from 'lucide-react';

import { UserRole } from '../../types';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onCollapse }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [recordsOpen, setRecordsOpen] = React.useState(true);
  const [inventoryOpen, setInventoryOpen] = React.useState(true);
  const [expensesOpen, setExpensesOpen] = React.useState(true);
  const [cashAdvanceOpen, setCashAdvanceOpen] = React.useState(true);
  const [reportsOpen, setReportsOpen] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(true);
  const [peopleOpen, setPeopleOpen] = React.useState(true);
  const [usersOpen, setUsersOpen] = React.useState(true);
  
  const menuItems = [
    { 
      path: '/dashboard', 
      label: t('navigation.dashboard'), 
      icon: <LayoutDashboard size={20} />, 
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
    },
    {
      label: t('navigation.records'),
      icon: <ClipboardList size={20} />,
      submenu: [
        {
          path: '/transactions/finances',
          label: t('dashboard.dailyTransactions'),
          icon: <DollarSign size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
        },
        {
          path: '/transactions/delivered-books',
          label: t('navigation.deliveredBooks'),
          icon: <BookText size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
        },
        {
          path: '/transactions/new',
          label: t('navigation.newTransaction'),
          icon: <Plus size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
        }
      ],
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
    },
    {
      label: t('navigation.inventory'),
      icon: <Package size={20} />,
      submenu: [
        {
          path: '/inventory/catalog',
          label: 'Book Catalog',
          icon: <BookOpen size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
        },
        {
          path: '/inventory/tracking',
          label: 'Inventory Tracking',
          icon: <TrendingUp size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        }
      ],
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VIEWER]
    },
    {
      label: t('cashAdvance.title'),
      icon: <Wallet size={20} />,
      submenu: [
        {
          path: '/cash-advance/overview',
          label: 'Overview',
          icon: <PiggyBank size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/cash-advance/new',
          label: 'New Advance',
          icon: <DollarSign size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        }
      ],
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      label: t('navigation.expenses'),
      icon: <Receipt size={20} />,
      submenu: [
        {
          path: '/expenses/all',
          label: 'All Expenses',
          icon: <ClipboardList size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/expenses/food',
          label: t('expenses.food'),
          icon: <Utensils size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/expenses/health',
          label: t('expenses.health'),
          icon: <FirstAid size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/expenses/supplies',
          label: t('expenses.supplies'),
          icon: <ShoppingBag size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/expenses/maintenance',
          label: t('expenses.maintenance'),
          icon: <Wrench size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/expenses/fuel',
          label: t('expenses.fuel'),
          icon: <Fuel size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        }
      ],
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    { 
      path: '/charges', 
      label: 'Charges & Fines', 
      icon: <AlertTriangle size={20} />, 
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      label: t('navigation.reports'),
      icon: <BarChart3 size={20} />,
      submenu: [
        {
          path: '/reports/donations/finances',
          label: 'Donations',
          icon: <Heart size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/reports/program',
          label: 'Program Report',
          icon: <BarChart3 size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        },
        {
          path: '/reports/individual',
          label: 'Individual Reports',
          icon: <FileText size={20} />,
          roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
        }
      ],
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
    },
    {
      label: 'Administration',
      icon: <Settings size={20} />,
      submenu: [
        {
          label: 'Users',
          icon: <UserCog size={20} />,
          submenu: [
            {
              path: '/admin/users/manage',
              label: 'Manage Users',
              icon: <UserCog size={20} />,
              roles: [UserRole.ADMIN]
            },
            {
              path: '/admin/users/roles',
              label: 'Manage Roles',
              icon: <Lock size={20} />,
              roles: [UserRole.ADMIN]
            }
          ],
          roles: [UserRole.ADMIN]
        },
        {
          label: 'People',
          icon: <Users size={20} />,
          submenu: [
            {
              path: '/admin/people/all',
              label: 'All People',
              icon: <Users size={20} />,
              roles: [UserRole.ADMIN]
            },
            {
              path: '/admin/people/colporters',
              label: 'Colporters',
              icon: <UserPlus size={20} />,
              roles: [UserRole.ADMIN]
            },
            {
              path: '/admin/people/leaders',
              label: 'Leaders',
              icon: <UsersRound size={20} />,
              roles: [UserRole.ADMIN]
            }
          ],
          roles: [UserRole.ADMIN]
        },
        {
          path: '/admin/settings',
          label: 'Program',
          icon: <Calendar size={20} />,
          roles: [UserRole.ADMIN]
        }
      ],
      roles: [UserRole.ADMIN]
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: <Settings size={20} />, 
      roles: [UserRole.ADMIN, UserRole.SUPERVISOR]
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    onCollapse(!isCollapsed);
    if (!isCollapsed) {
      setRecordsOpen(false);
      setInventoryOpen(false);
      setExpensesOpen(false);
      setCashAdvanceOpen(false);
      setReportsOpen(false);
      setAdminOpen(false);
      setPeopleOpen(false);
      setUsersOpen(false);
    }
  };

  const handleMenuItemClick = (item: any) => {
    if (isCollapsed && 'submenu' in item) {
      // If sidebar is collapsed and item has submenu, expand sidebar
      setIsCollapsed(false);
      onCollapse(false);
      
      // Open the appropriate submenu
      if (item.label === t('navigation.records')) {
        setRecordsOpen(true);
      } else if (item.label === t('navigation.inventory')) {
        setInventoryOpen(true);
      } else if (item.label === t('navigation.expenses')) {
        setExpensesOpen(true);
      } else if (item.label === t('cashAdvance.title')) {
        setCashAdvanceOpen(true);
      } else if (item.label === t('navigation.reports')) {
        setReportsOpen(true);
      } else if (item.label === 'Administration') {
        setAdminOpen(true);
      }
    } else if (!isCollapsed && 'submenu' in item) {
      // Toggle submenu when sidebar is expanded
      if (item.label === t('navigation.records')) {
        setRecordsOpen(!recordsOpen);
      } else if (item.label === t('navigation.inventory')) {
        setInventoryOpen(!inventoryOpen);
      } else if (item.label === t('navigation.expenses')) {
        setExpensesOpen(!expensesOpen);
      } else if (item.label === t('cashAdvance.title')) {
        setCashAdvanceOpen(!cashAdvanceOpen);
      } else if (item.label === t('navigation.reports')) {
        setReportsOpen(!reportsOpen);
      } else if (item.label === 'Administration') {
        setAdminOpen(!adminOpen);
      }
    }
  };

  const renderSubmenuItems = (submenu: any[], level = 0) => {
    return submenu.map((subItem) => {
      if ('submenu' in subItem) {
        return (
          <div key={subItem.label}>
            <button
              onClick={() => {
                if (level === 0) {
                  if (subItem.label === 'People') {
                    setPeopleOpen(!peopleOpen);
                  } else if (subItem.label === 'Users') {
                    setUsersOpen(!usersOpen);
                  }
                }
              }}
              className={clsx(
                'flex items-center w-full px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium',
                'transition-colors duration-150 ease-in-out',
                'text-white/80 hover:bg-white/10 hover:text-white',
                isCollapsed ? 'justify-center' : 'justify-between',
                level > 0 && !isCollapsed && 'pl-6 sm:pl-8',
                isCollapsed && 'justify-center'
              )}
            >
              <div className="flex items-center">
                <span>{subItem.icon}</span>
                {!isCollapsed && <span className="ml-3 truncate">{subItem.label}</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={16}
                  className={clsx(
                    'transition-transform',
                    (subItem.label === 'People' && peopleOpen) ||
                    (subItem.label === 'Users' && usersOpen)
                      ? 'transform rotate-180'
                      : ''
                  )}
                />
              )}
            </button>
            {(
              (subItem.label === 'People' && peopleOpen) ||
              (subItem.label === 'Users' && usersOpen) ||
              isCollapsed
            ) && (
              <ul className={clsx(
                "mt-1 space-y-1",
                !isCollapsed && "pl-4 sm:pl-6",
                isCollapsed && "pl-0"
              )}>
                {renderSubmenuItems(subItem.submenu, level + 1)}
              </ul>
            )}
          </div>
        );
      }

      return (
        <li key={subItem.path}>
          <NavLink
            to={subItem.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium',
                'transition-colors duration-150 ease-in-out',
                isActive
                  ? 'bg-[#ED0000] text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
                level > 0 && !isCollapsed && 'pl-6 sm:pl-8',
                isCollapsed && 'justify-center'
              )
            }
            onClick={() => {
              if (window.innerWidth < 768) {
                onClose();
              }
            }}
          >
            <span>{subItem.icon}</span>
            {!isCollapsed && <span className="ml-3 truncate">{subItem.label}</span>}
          </NavLink>
        </li>
      );
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
        ></div>
      )}
      
      <aside
        className={clsx(
          'fixed top-0 left-0 z-30 h-full bg-[#0052B4] transform transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16 sm:w-20' : 'w-56 sm:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        <div className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 bg-[#003D85]">
          {!isCollapsed ? (
            <div 
              className="flex-1 flex justify-center cursor-pointer"
              onClick={toggleCollapse}
            >
              <img src="/src/assets/logo_reach.webp" alt="Reach UAA" className="h-12 sm:h-16 w-24 sm:w-32" />
            </div>
          ) : (
            <div 
              className="flex-1 flex justify-center cursor-pointer"
              onClick={toggleCollapse}
            >
              <img src="/src/assets/logo_reach.webp" alt="Reach UAA" className="h-10 sm:h-12 w-10 sm:w-12 object-cover" />
            </div>
          )}
          
          <button
            className="md:hidden p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="h-[calc(100%-3.5rem)] sm:h-[calc(100%-4rem)] flex flex-col">
          <div className="flex-1 px-2 sm:px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
            <ul className="space-y-1">
              {filteredMenuItems.map((item, index) => (
                <li key={item.label}>
                  {'submenu' in item ? (
                    <div>
                      <button
                        onClick={() => handleMenuItemClick(item)}
                         className={clsx(
                           'flex items-center w-full px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium',
                           'transition-colors duration-150 ease-in-out',
                           'text-white/80 hover:bg-white/10 hover:text-white',
                           isCollapsed ? 'justify-center' : 'justify-between'
                         )}
                      >
                        <div className="flex items-center">
                          <span>{item.icon}</span>
                          {!isCollapsed && <span className="ml-3 truncate">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown
                            size={16}
                            className={clsx(
                              'transition-transform',
                              (item.label === t('navigation.records') && recordsOpen) ||
                              (item.label === t('navigation.inventory') && inventoryOpen) ||
                              (item.label === t('navigation.expenses') && expensesOpen) ||
                              (item.label === t('cashAdvance.title') && cashAdvanceOpen) ||
                              (item.label === t('navigation.reports') && reportsOpen) ||
                              (item.label === 'Administration' && adminOpen)
                                ? 'transform rotate-180'
                                : ''
                            )}
                          />
                        )}
                      </button>
                      {(
                        (item.label === t('navigation.records') && recordsOpen) ||
                        (item.label === t('navigation.inventory') && inventoryOpen) ||
                        (item.label === t('navigation.expenses') && expensesOpen) ||
                        (item.label === t('cashAdvance.title') && cashAdvanceOpen) ||
                        (item.label === t('navigation.reports') && reportsOpen) ||
                        (item.label === 'Administration' && adminOpen)
                      ) && !isCollapsed && (
                        <ul className="mt-1 pl-4 sm:pl-6 space-y-1">
                          {renderSubmenuItems(item.submenu)}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium',
                          'transition-colors duration-150 ease-in-out',
                          isActive
                            ? 'bg-[#ED0000] text-white'
                            : 'text-white/80 hover:bg-white/10 hover:text-white',
                          isCollapsed ? 'justify-center' : 'justify-start'
                        )
                      }
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          onClose();
                        }
                      }}
                    >
                      <span>{item.icon}</span>
                      {!isCollapsed && <span className="ml-3 truncate">{item.label}</span>}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;