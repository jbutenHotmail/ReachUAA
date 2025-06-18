import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Edit3, 
  Save, 
  X, 
  Camera,
  Lock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
// import ImageUpload from '../../components/ui/ImageUpload';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    profileImage: user?.profile_image_url || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN;
  const canEdit = isAdmin; // Only admins can edit for now

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profileImage: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        profileImage: ''
      }));
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateProfile(formData);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // In a real app, this would call an API to change password
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      profileImage: user?.profile_image_url || '',
    });
    setIsEditing(false);
    setErrorMessage('');
  };

  const getRoleBadge = (role: UserRole) => {
    const variants = {
      [UserRole.ADMIN]: 'danger',
      [UserRole.SUPERVISOR]: 'primary',
      [UserRole.VIEWER]: 'success'
    } as const;
    
    const icons = {
      [UserRole.ADMIN]: <Shield size={14} />,
      [UserRole.SUPERVISOR]: <Shield size={14} />,
      [UserRole.VIEWER]: <User size={14} />
    };
    
    return (
      <Badge 
        variant={variants[role]} 
        leftIcon={icons[role]}
        className="capitalize"
      >
        {role.toLowerCase()}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="text-primary-600" size={28} />
            {t('profile.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {canEdit ? 'Manage your account settings and preferences' : 'View your account information'}
          </p>
        </div>
        
        {canEdit && !isEditing && (
          <Button
            variant="primary"
            leftIcon={<Edit3 size={18} />}
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-success-700">
            <p className="font-medium">Success!</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-danger-700">
            <p className="font-medium">Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <div className="lg:col-span-1">
          <Card>
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {formData.profileImage ? (
                    <img
                      src={formData.profileImage}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={48} className="text-gray-400" />
                  )}
                </div>
                
                {isEditing && canEdit && (
                  <div className="absolute bottom-0 right-0">
                    <label className="bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
                      <Camera size={16} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleImageChange(file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                <p className="text-gray-500">{user.email}</p>
                <div className="mt-2">
                  {getRoleBadge(user.role)}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Calendar size={14} />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Calendar size={14} />
                  <span>Last updated {new Date(user.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Change Password Card */}
          {canEdit && (
            <Card title="Security" icon={<Lock size={20} />} className="mt-6">
              <div className="space-y-4">
                {!showPasswordForm ? (
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<Lock size={18} />}
                    onClick={() => setShowPasswordForm(true)}
                  >
                    Change Password
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    
                    <Input
                      label="New Password"
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    
                    <Input
                      label="Confirm New Password"
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleChangePassword}
                        isLoading={isLoading}
                        disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      >
                        Update
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                          });
                          setErrorMessage('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Personal Information */}
        <div className="lg:col-span-2">
          <Card title={t('profile.personalInfo')} icon={<User size={20} />}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label={t('profile.name')}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  leftIcon={<User size={18} />}
                  disabled={!isEditing || !canEdit}
                  required
                />

                <Input
                  label={t('profile.email')}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  leftIcon={<Mail size={18} />}
                  disabled={!isEditing || !canEdit}
                  required
                />

                <Input
                  label={t('profile.phone')}
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  leftIcon={<Phone size={18} />}
                  disabled={!isEditing || !canEdit}
                  placeholder="Enter phone number"
                />

                <div className="md:col-span-2">
                  <Input
                    label={t('profile.address')}
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    leftIcon={<MapPin size={18} />}
                    disabled={!isEditing || !canEdit}
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Role Information (Read-only) */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <div className="flex items-center">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Status
                    </label>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && canEdit && (
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    <X size={18} className="mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    isLoading={isLoading}
                    disabled={!formData.name || !formData.email}
                  >
                    <Save size={18} className="mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}

              {/* Read-only notice for non-admins */}
              {!canEdit && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-gray-500 flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">Read-Only Profile</p>
                      <p>Contact an administrator to make changes to your profile information.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;