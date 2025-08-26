import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { 
  LayoutDashboard, BookText, PiggyBank, BarChart3, Heart, Settings, 
  X, DollarSign, ChevronDown, ClipboardList, 
  Receipt, Wallet, Utensils, ChevronFirst as FirstAid, ShoppingBag, Wrench, 
  Fuel, Users, UserPlus, BookOpen, UserCog, UsersRound, Percent,
  Package, TrendingUp, Calendar, AlertTriangle, FileText, Plus, Lock
} from 'lucide-react';
import logoReach from '../../assets/logo_reach.webp';
import logoReach1 from '../../assets/logo_reach_1.webp';
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
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [recordsOpen, setRecordsOpen] = React.useState(true);
  const [inventoryOpen, setInventoryOpen] = React.useState(true);
  const [expensesOpen, setExpensesOpen] = React.useState(true);
  const [cashAdvanceOpen, setCashAdvanceOpen] = React.useState(true);
  const [reportsOpen, setReportsOpen] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(true);
  const [peopleOpen, setPeopleOpen] = React.useState(true);
  const [usersOpen, setUsersOpen] = React.useState(true);
  
  // Define menu items based on user role
  const getMenuItems = () => {
    // Base dashboard item for all roles
    const dashboardItem = { 
      path: '/dashboard', 
      label: t('navigation.dashboard'), 
      icon: <LayoutDashboard size={20} />, 
    };
    
    // New transaction item for all roles
    const newTransactionItem = {
      path: '/transactions/new',
      label: t('navigation.newTransaction'),
      icon: <Plus size={20} />,
    };
    
    // Settings item for all roles
    const settingsItem = { 
      path: '/settings', 
      label: t('settings.title'), 
      icon: <Settings size={20} />, 
    };
    
    // For Viewer role, return limited menu
    if (user?.role === UserRole.VIEWER) {
      return [
        dashboardItem,
        newTransactionItem,
        {
          path: '/bible-studies',
          label: 'Estudios Bíblicos',
          icon: <BookOpen size={20} />,
        },
        settingsItem
      ];
    }
    
    // For Admin and Supervisor roles
    return [
      dashboardItem,
      {
        label: t('navigation.records'),
        icon: <ClipboardList size={20} />,
        submenu: [
          {
            path: '/transactions/finances',
            label: t('dashboard.dailyTransactions'),
            icon: <DollarSign size={20} />,
          },
          {
            path: '/transactions/delivered-books',
            label: t('navigation.deliveredBooks'),
            icon: <BookText size={20} />,
          },
          {
            path: '/transactions/new',
            label: t('navigation.newTransaction'),
            icon: <Plus size={20} />,
          },
          {
            path: '/bible-studies',
            label: 'Estudios Bíblicos',
            icon: <BookOpen size={20} />,
          }
        ],
      },
      {
        label: t('navigation.inventory'),
        icon: <Package size={20} />,
        submenu: [
          {
            path: '/inventory/catalog',
            label: 'Book Catalog',
            icon: <BookOpen size={20} />,
          },
          {
            path: '/inventory/tracking',
            label: 'Inventory Tracking',
            icon: <TrendingUp size={20} />,
          }
        ],
      },
      {
        label: t('cashAdvance.title'),
        icon: <Wallet size={20} />,
        submenu: [
          {
            path: '/cash-advance/overview',
            label: 'Overview',
            icon: <PiggyBank size={20} />,
          },
          {
            path: '/cash-advance/new',
            label: 'New Advance',
            icon: <DollarSign size={20} />,
          }
        ],
      },
      {
        label: t('navigation.expenses'),
        icon: <Receipt size={20} />,
        submenu: [
          {
            path: '/expenses/all',
            label: 'All Expenses',
            icon: <ClipboardList size={20} />,
          },
          {
            path: '/expenses/food',
            label: t('expenses.food'),
            icon: <Utensils size={20} />,
          },
          {
            path: '/expenses/health',
            label: t('expenses.health'),
            icon: <FirstAid size={20} />,
          },
          {
            path: '/expenses/supplies',
            label: t('expenses.supplies'),
            icon: <ShoppingBag size={20} />,
          },
          {
            path: '/expenses/maintenance',
            label: t('expenses.maintenance'),
            icon: <Wrench size={20} />,
          },
          {
            path: '/expenses/fuel',
            label: t('expenses.fuel'),
            icon: <Fuel size={20} />,
          }
        ],
      },
      { 
        path: '/charges', 
        label: 'Charges & Fines', 
        icon: <AlertTriangle size={20} />, 
      },
      {
        label: t('navigation.reports.reports'),
        icon: <BarChart3 size={20} />,
        submenu: [
          {
            path: '/reports/donations/finances',
            label: t('navigation.reports.donations'),
            icon: <Heart size={20} />,
            roles: [UserRole.ADMIN]
          },
          {
            path: '/reports/program',
            label: t('navigation.reports.programReport'),
            icon: <BarChart3 size={20} />,
            roles: [UserRole.ADMIN]
          },
          {
            path: '/reports/individual',
            label: t('navigation.reports.individualReport'),
            icon: <FileText size={20} />,
            roles: [UserRole.ADMIN]
          },
          {
            path: '/reports/access-denied',
            label: 'Reports Access',
            icon: <Lock size={20} />,
            roles: [UserRole.SUPERVISOR]
          }
        ],
      },
      // Admin section only for Admin role
      ...(user?.role === UserRole.ADMIN ? [
        {
          label: t('navigation.administration'),
          icon: <Lock size={20} />,
          submenu: [
            {
              label: t('navigation.users.users'),
              icon: <UserCog size={20} />,
              submenu: [
                {
                  path: '/admin/users/manage',
                  label: t('navigation.users.manageUsers'),
                  icon: <UserCog size={20} />,
                },
                {
                  path: '/admin/users/roles',
                  label: t('navigation.users.manageRoles'),
                  icon: <Lock size={20} />,
                }
              ],
            },
            {
              label: t('navigation.people.people'),
              icon: <Users size={20} />,
              submenu: [
                {
                  path: '/admin/people/all',
                  label: t('navigation.people.allPeople'),
                  icon: <Users size={20} />,
                },
                {
                  path: '/admin/people/colporters',
                  label: t('navigation.people.colporters'),
                  icon: <UserPlus size={20} />,
                },
                {
                  path: '/admin/people/leaders',
                  label: t('navigation.people.leaders'),
                  icon: <UsersRound size={20} />,
                }
              ],
            },
            {
              path: '/admin/percentages',
              label: 'Custom Percentages',
              icon: <Percent size={20} />,
            },
            {
              path: '/admin/settings',
              label: t('navigation.program'),
              icon: <Calendar size={20} />,
            }
          ],
        }
      ] : []),
      settingsItem
    ];
  };

  const menuItems = getMenuItems();
  
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
      } else if (item.label === t('navigation.reports.reports')) {
        setReportsOpen(true);
      } else if (item.label === t('navigation.administration')) {
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
      } else if (item.label === t('navigation.reports.reports')) {
        setReportsOpen(!reportsOpen);
      } else if (item.label === t('navigation.administration')) {
        setAdminOpen(!adminOpen);
      }
    }
  };

  const renderSubmenuItems = (submenu: any[], level = 0) => {
    return submenu.map((subItem) => {
      // Skip items that require specific roles the user doesn't have
      if (subItem.roles && (!user || !subItem.roles.includes(user.role))) {
        return null;
      }
      
      if ('submenu' in subItem) {
        return (
          <div key={subItem.label}>
            <button
              onClick={() => {
                if (level === 0) {
                  if (subItem.label === t('navigation.people.people')) {
                    setPeopleOpen(!peopleOpen);
                  } else if (subItem.label === t('navigation.users.users')) {
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
                    (subItem.label === t('navigation.people.people') && peopleOpen) ||
                    (subItem.label === t('navigation.users.users') && usersOpen)
                      ? 'transform rotate-180'
                      : ''
                  )}
                />
              )}
            </button>
            {(
              (subItem.label === t('navigation.people.people') && peopleOpen) ||
              (subItem.label === t('navigation.users.users') && usersOpen) ||
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
              className="flex-1 flex justify-center cursor-pointer w-full"
              onClick={toggleCollapse}
            >
              <img src={logoReach} alt="Reach UAA" className="h-12 sm:h-16 w-auto" />
            </div>
          ) : (
            <div 
              className="flex-1 flex justify-center items-center cursor-pointer"
              onClick={toggleCollapse}
            >
              <img 
                src={logoReach1}
                alt="Reach UAA" 
                className="h-10 sm:h-12 w-10 sm:w-12 object-contain rounded-full" 
              />
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
              {menuItems.map((item) => (
                <li key={item.label || item.path}>
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
                              (item.label === t('navigation.reports.reports') && reportsOpen) ||
                              (item.label === t('navigation.administration') && adminOpen)
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
                        (item.label === t('navigation.reports.reports') && reportsOpen) ||
                        (item.label === t('navigation.administration') && adminOpen)
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