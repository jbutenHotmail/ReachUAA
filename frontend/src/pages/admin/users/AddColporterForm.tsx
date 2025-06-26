import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Colporter } from '../../../types';
import ImageUpload from '../../../components/ui/ImageUpload';
import { useProgramStore } from '../../../stores/programStore';

interface AddColporterFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Colporter;
}

const AddColporterForm: React.FC<AddColporterFormProps> = ({ 
  onClose, 
  onSubmit,
  initialData 
}) => {
  const { t } = useTranslation();
  const { program } = useProgramStore();
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    apellido: initialData?.apellido || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    school: initialData?.school || '',
    address: initialData?.address || '',
    age: initialData?.age || '',
    createUser: !initialData,
    profileImage: initialData?.profile_image_url || initialData?.profile_image_url,
    programId: initialData?.programId || program?.id || null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
        profileImage: undefined
      }));
    }
  };

  const defaultPassword = formData.name && formData.apellido 
    ? `${formData.name.toLowerCase()}.${formData.apellido.toLowerCase()}`
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? t('personForm.editPerson') : t('personForm.addNewPerson')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {initialData?.hasUser && (
              <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-warning-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-warning-700">
                  <p className="font-medium">{t('leaderForm.userAccountExists')}</p>
                  <p>{t('leaderForm.userAccountExistsWarning')}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('leaderForm.profileImage')}
                </label>
                <ImageUpload
                  value={formData.profileImage}
                  onChange={handleImageChange}
                  className="max-w-sm mx-auto"
                />
              </div>

              <Input
                label={t('leaderForm.name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
              />

              <Input
                label={t('leaderForm.lastName')}
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
              />

              <Input
                label={t('personForm.age')}
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="16"
                max="99"
                required
              />

              <Input
                label={t('leaderForm.email')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
              />

              <Input
                label={t('leaderForm.phone')}
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />

              <Input
                label={t('personForm.schoolInstitution')}
                name="school"
                value={formData.school}
                onChange={handleChange}
                placeholder={t('personForm.schoolInstitutionPlaceholder')}
                required
              />

              {!initialData && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="createUser"
                    name="createUser"
                    checked={formData.createUser}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="createUser" className="text-sm font-medium text-gray-700">
                    {t('leaderForm.createUserAccount')}
                  </label>
                </div>
              )}

              <div className="md:col-span-2">
                <Input
                  label={t('leaderForm.address')}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              {!initialData && formData.createUser && formData.name && formData.apellido && formData.email && (
                <div className="md:col-span-2 p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-700">
                    <strong>{t('programSettings.importantNotes')}:</strong> {t('leaderForm.accountCreationNote')}
                    <br />
                    <strong>{t('auth.email')}:</strong> {formData.email}
                    <br />
                    <strong>{t('auth.password')}:</strong> {defaultPassword}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
              >
                {initialData ? t('leaderForm.saveChanges') : t('personForm.addNewPerson')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddColporterForm;