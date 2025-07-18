import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';

const ChangePasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { changePassword, isLoading } = useAuthStore();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate passwords
    if (newPassword.length < 6) {
      setError(t('profile.passwordLength'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }
    
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(t('profile.passwordSuccess'));
      
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.passwordError'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="text-primary-600" size={28} />
          {t('profile.changePassword')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('profile.securityDescription')}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-danger-700">
            <p className="font-medium">{t('profile.error')}</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-success-700">
            <p className="font-medium">{t('profile.success')}</p>
            <p>{success}</p>
          </div>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Input
                label={t('profile.currentPassword')}
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                showPasswordToggle
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>

            <div className="relative">
              <Input
                label={t('profile.newPassword')}
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                showPasswordToggle
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('profile.passwordLength')}
              </p>
            </div>

            <div className="relative">
              <Input
                label={t('profile.confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                showPasswordToggle
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Card>
      
      <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <h3 className="text-sm font-medium text-primary-700 mb-2">{t('profile.passwordSecurityTips')}</h3>
        <ul className="text-sm text-primary-600 space-y-1 list-disc list-inside">
          <li>{t('profile.tipCombination')}</li>
          <li>{t('profile.tipAvoidPersonalInfo')}</li>
          <li>{t('profile.tipUniquePassword')}</li>
          <li>{t('profile.tipPasswordManager')}</li>
        </ul>
      </div>
    </div>
  );
};

export default ChangePasswordPage;