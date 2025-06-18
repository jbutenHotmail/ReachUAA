import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../ui/Avatar';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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
            <img src="/src/assets/logo_reach.webp" alt="Reach UAA" className="h-8 w-16" />
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell size={18} className="sm:w-5 sm:h-5" />
          </button>
          
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
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                >
                  <User size={16} className="mr-2" />
                  {t('profile.title')}
                </a>
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