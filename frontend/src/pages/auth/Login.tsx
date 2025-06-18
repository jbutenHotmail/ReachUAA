import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginForm from '../../components/auth/LoginForm';
import { useAuthStore } from '../../stores/authStore';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background with diffused gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0052B4] via-[#0059cc] to-[#003D85] z-0">
        <div className="absolute inset-0 bg-[url('/src/assets/logo_reach.webp')] opacity-5 bg-no-repeat bg-center bg-contain blur-3xl"></div>
      </div>
      
      <div className="absolute top-0 right-0 p-4 z-10">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-md text-sm font-medium bg-white/90 shadow-lg text-[#0052B4] hover:bg-white transition-colors"
        >
          {i18n.language === 'en' ? 'Español' : 'English'}
        </button>
      </div>
    
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <img 
            src="/src/assets/logo_reach.webp" 
            alt="Reach UAA" 
            className="h-34 w-auto drop-shadow-xl"
          />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-white/30">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Login;