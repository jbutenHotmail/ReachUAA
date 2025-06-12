import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
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
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
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
          leftIcon={<Mail size={18} />}
          fullWidth
          error={errors.email?.message}
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            }
          })}
        />
      </div>
      
      <div>
        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          leftIcon={<Lock size={18} />}
          fullWidth
          error={errors.password?.message}
          {...register('password', { 
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            }
          })}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
            Remember me
          </label>
        </div>
        
        <div className="text-sm">
          <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </div>
      
      <div>
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          size="lg"
        >
          {t('auth.login')}
        </Button>
      </div>
      
      <p className="mt-8 text-center text-sm text-gray-500">
        <span>Demo credentials:</span>
        <br />
        <code className="mt-1 block p-2 bg-gray-100 rounded text-xs">
          Admin: admin@example.com / password
          <br />
          Supervisor: supervisor@example.com / password
          <br />
          Viewer: viewer@example.com / password
        </code>
      </p>
    </form>
  );
};

export default LoginForm;