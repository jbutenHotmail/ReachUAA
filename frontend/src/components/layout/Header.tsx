import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom'; // Import NavLink
import { Menu, User, LogOut, Footprints } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProgramStore } from '../../stores/programStore';
import Avatar from '../ui/Avatar';
import logoReach from '../../assets/logo_reach.webp';
interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { program } = useProgramStore();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between bg-[#0052B4]">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-md text-white hover:text-white/80 hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          
          {/* Logo for mobile */}
          <div className="md:hidden ml-2">
            <img src={logoReach} alt="Reach UAA" className="h-8 w-16" />
          </div>
          
          {/* Program name for mobile */}
          {program && (
            <div className="ml-3 sm:flex md:flex items-center">
              <div className="flex items-center bg-white/10 rounded-md px-2 py-1 border border-white/20">
                <Footprints size={14} className="text-white/80 mr-1.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate max-w-[100px] leading-tight">
                    {program.name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
       
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center space-x-1 sm:space-x-2 focus:outline-none"
            >
              <Avatar
                name={user?.name || ''}
                src={user?.profile_image_url || ''}
                size="sm"
                className="ring-2 ring-white/20 w-7 h-7 sm:w-8 sm:h-8"
              />
              <span className="hidden sm:inline-block text-sm font-medium text-white max-w-24 truncate">
                {user?.name}
              </span>
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                <NavLink
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setDropdownOpen(false);
                  }}
                >
                  <User size={16} className="mr-2" />
                  {t('profile.title')}
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <LogOut size={16} className="mr-2" />
                  {t('auth.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;