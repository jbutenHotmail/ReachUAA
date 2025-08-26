import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Lock, Edit, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import ImageUpload from '../../components/ui/ImageUpload';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateProfile, getUserProfile, isLoading } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    profileImage: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load complete user profile on component mount
  useEffect(() => {
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        profileImage: user.profile_image_url || ''
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/upload/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return data.imageUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      let finalImageUrl = formData.profileImage;
      
      // If there's a file to upload (base64 data URL), upload it first
      if (formData.profileImage && formData.profileImage.startsWith('data:')) {
        // Convert base64 to file
        const response = await fetch(formData.profileImage);
        const blob = await response.blob();
        const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });
        
        finalImageUrl = await uploadImage(file);
      }
      
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        profileImage: finalImageUrl
      });
      
      setIsEditing(false);
      setSuccess(t('profile.updateSuccess'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.updateError'));
    }
  };

  const handleCancel = () => {
    // Reset form data to user data
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        profileImage: user.profile_image_url || ''
      });
    }
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">{t('profile.userNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="text-primary-600" size={28} />
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('profile.canEdit')}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title={t('profile.personalInfo')} icon={<User size={20} />}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image at the top */}
              <div className="flex justify-center">
                <div className="relative">
                  {formData.profileImage ? (
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-100 shadow-lg">
                      <img 
                        src={formData.profileImage} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-gray-100 shadow-lg flex items-center justify-center">
                      <User size={32} className="text-gray-400" />
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute -bottom-2 -right-2">
                      <div className="bg-primary-600 rounded-full p-2 shadow-lg">
                        <Edit size={14} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload Field - Only show when editing */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Image
                  </label>
                  <ImageUpload
                    value={formData.profileImage}
                    onChange={handleImageChange}
                    isUploading={isLoading}
                  />
                </div>
              )}

              <div className="space-y-4">
                {isEditing ? (
                  <>
                    <Input
                      label={t('profile.name')}
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                    
                    <Input
                      label={t('profile.phone')}
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder={t('profile.phonePlaceholder')}
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('profile.address')}
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder={t('profile.addressPlaceholder')}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('profile.name')}</p>
                      <p className="mt-1 text-lg font-medium text-gray-900">{user.name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('profile.email')}</p>
                      <div className="mt-1 flex items-center">
                        <Mail size={16} className="text-gray-400 mr-2" />
                        <p className="text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('profile.phone')}</p>
                      <div className="mt-1 flex items-center">
                        <Phone size={16} className="text-gray-400 mr-2" />
                        <p className="text-gray-900">{user.phone || '-'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('profile.address')}</p>
                      <div className="mt-1 flex items-start">
                        <MapPin size={16} className="text-gray-400 mr-2 mt-0.5" />
                        <p className="text-gray-900">{user.address || '-'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      leftIcon={<X size={16} />}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isLoading}
                      leftIcon={<Save size={16} />}
                    >
                      {t('profile.update')}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    leftIcon={<Edit size={16} />}
                  >
                    {t('common.edit')}
                  </Button>
                )}
              </div>
            </form>
          </Card>
          
          <Card title={t('profile.changePassword')} icon={<Lock size={20} />} className="mt-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Change your password to keep your account secure. Your password should be at least 6 characters long.
              </p>
              
              <Button
                variant="primary"
                onClick={() => navigate('/change-password')}
                leftIcon={<Lock size={16} />}
              >
                {t('profile.changePassword')}
              </Button>
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <Card title={t('profile.accountInfo')} icon={<User size={20} />}>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('profile.role.role')}</p>
                <div className="mt-1">
                  {user.role === 'ADMIN' && (
                    <Badge variant="danger">
                      {t('profile.role.admin')}
                    </Badge>
                  )}
                  {user.role === 'SUPERVISOR' && (
                    <Badge variant="primary">
                      {t('profile.role.supervisor')}
                    </Badge>
                  )}
                  {user.role === 'VIEWER' && (
                    <Badge variant="success">
                      {t('profile.role.viewer')}
                    </Badge>
                  )}
                </div>
              </div>
              {user.lastLogin && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Login</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(user.lastLogin).toLocaleString()}
                  </p>
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