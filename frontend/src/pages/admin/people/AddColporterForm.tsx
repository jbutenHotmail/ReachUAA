import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Person } from '../../../types';
import ImageUpload from '../../../components/ui/ImageUpload';

interface AddColporterFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Person;
}

const AddColporterForm: React.FC<AddColporterFormProps> = ({
  onClose,
  onSubmit,
  initialData,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    apellido: initialData?.apellido || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    school: initialData?.school || '',
    address: initialData?.address || '',
    age: initialData?.age || '',
    createUser: !initialData,
    profileImage: initialData?.profile_image_url,
    personType: 'COLPORTER',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          profileImage: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({
        ...prev,
        profileImage: undefined,
      }));
    }
  };

  const defaultPassword = formData.name && formData.apellido
    ? `${formData.name.toLowerCase()}.${formData.apellido.toLowerCase()}`
    : '';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="colporter-form-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2
                id="colporter-form-title"
                className="text-xl font-semibold text-gray-900"
              >
                {initialData
                  ? t('colporter.editColporter')
                  : t('colporter.addColporter')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            </div>

            {initialData?.hasUser && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertCircle
                  className="text-yellow-500 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">{t('colporter.userExistsTitle')}</p>
                  <p>{t('colporter.userExistsMessage')}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  htmlFor="profileImage"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t('colporter.profileImage')}
                </label>
                <ImageUpload
                  value={formData.profileImage}
                  onChange={handleImageChange}
                  className="max-w-sm mx-auto"
                  id="profileImage"
                  aria-describedby="profileImage-help"
                />
                <p id="profileImage-help" className="text-xs text-gray-500 mt-1">
                  {t('colporter.profileImageHelp')}
                </p>
              </div>

              <Input
                label={t('common.name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
                placeholder={t('colporter.namePlaceholder')}
              />

              <Input
                label={t('common.lastName')}
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
                placeholder={t('colporter.lastNamePlaceholder')}
              />

              <Input
                label={t('common.age')}
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="16"
                max="99"
                required
                placeholder={t('colporter.agePlaceholder')}
              />

              <Input
                label={t('common.email')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
                placeholder={t('colporter.emailPlaceholder')}
              />

              <Input
                label={t('common.phone')}
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder={t('colporter.phonePlaceholder')}
              />

              <Input
                label={t('colporter.school')}
                name="school"
                value={formData.school}
                onChange={handleChange}
                required
                placeholder={t('colporter.schoolPlaceholder')}
              />

              {!initialData && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="createUser"
                    name="createUser"
                    checked={formData.createUser}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="createUser"
                    className="text-sm font-medium text-gray-700"
                  >
                    {t('colporter.createUser')}
                  </label>
                </div>
              )}

              <div className="md:col-span-2">
                <Input
                  label={t('common.address')}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder={t('colporter.addressPlaceholder')}
                />
              </div>

              {!initialData &&
                formData.createUser &&
                formData.name &&
                formData.apellido &&
                formData.email && (
                  <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>{t('common.note')}:</strong>{' '}
                      {t('colporter.userCredentialsNote')}
                      <br />
                      <strong>{t('auth.username')}:</strong> {formData.email}
                      <br />
                      <strong>{t('auth.password')}:</strong> {defaultPassword}
                    </p>
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary">
                {initialData ? t('common.save') : t('colporter.addColporter')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddColporterForm;