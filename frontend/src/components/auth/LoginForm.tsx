import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock } from 'lucide-react';

import { useAuthStore } from '../../stores/authStore';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      navigate('/program-select', { state: { from: { pathname: '/login' } } });
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-danger-50 text-danger-700 text-sm">
          {error}
        </div>
      )}
      
      <div>
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          leftIcon={<Mail size={18} className="text-[#0052B4]" />}
          fullWidth
          error={errors.email?.message}
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            }
          })}
          className="focus:border-[#0052B4] focus:ring-[#0052B4] py-2"
        />
      </div>
      
      <div>
        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          leftIcon={<Lock size={18} className="text-[#0052B4]" />}
          fullWidth
          error={errors.password?.message}
          showPasswordToggle 
          {...register('password', { 
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            }
          })}
          className="focus:border-[#0052B4] focus:ring-[#0052B4] py-2"
        />
      </div>
      
      <div>
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          size="lg"
          className="bg-[#ED0000] hover:bg-[#cc0000] focus:ring-[#ED0000] border-none"
        >
          {t('auth.login')}
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;