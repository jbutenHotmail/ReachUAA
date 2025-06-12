import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookText } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-0 right-0 p-4">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-md text-sm font-medium bg-white shadow-sm text-gray-700 hover:bg-gray-50"
        >
          {i18n.language === 'en' ? 'Español' : 'English'}
        </button>
      </div>
    
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
            <BookText size={32} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reach UAA
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('auth.login')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Login;