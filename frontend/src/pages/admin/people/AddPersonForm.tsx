import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle, User, UserCog } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Person } from '../../../types';
import ImageUpload from '../../../components/ui/ImageUpload';
import { useUserStore } from '../../../stores/userStore';

interface AddPersonFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Person;
  initialPersonType?: 'COLPORTER' | 'LEADER';
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({ 
  onClose, 
  onSubmit,
  initialData,
  initialPersonType
}) => {
  const { t } = useTranslation();
  const { createPerson, updatePerson, isLoading } = useUserStore();
  const [personType, setPersonType] = useState<'COLPORTER' | 'LEADER'>(
    initialData?.personType || initialPersonType || 'COLPORTER'
  );
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    apellido: initialData?.apellido || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    school: initialData?.school || '',
    institution: initialData?.institution || '',
    address: initialData?.address || '',
    age: initialData?.age || '',
    createUser: !initialData,
    profileImage: initialData?.profileImage,
    personType: initialData?.personType || initialPersonType || 'COLPORTER'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // If we have initialData, we're updating an existing person
      if (initialData) {
        await updatePerson(initialData.id, {
          ...formData,
          personType
        });
      } else {
        // Otherwise, we're creating a new person
        await createPerson({
          ...formData,
          personType
        });
      }
      
      // Call the parent's onSubmit handler
      onSubmit({
        ...formData,
        personType
      });
    } catch (error) {
      console.error('Error saving person:', error);
      // You could add error handling here, such as showing an error message
    }
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

  const handlePersonTypeChange = (type: 'COLPORTER' | 'LEADER') => {
    setPersonType(type);
    setFormData(prev => ({
      ...prev,
      personType: type
    }));
  };

  const defaultPassword = formData.name && formData.apellido 
    ? `${formData.name.toLowerCase()}.${formData.apellido.toLowerCase()}`
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? 'Edit Person' : 'Add New Person'}
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
                  <p className="font-medium">User Account Exists</p>
                  <p>Name, last name, and email cannot be modified while a user account exists. To modify these fields, please delete the user account first from the Users section.</p>
                </div>
              </div>
            )}

            {/* Person Type Selection */}
            {!initialData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Person Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handlePersonTypeChange('COLPORTER')}
                    className={clsx(
                      'flex items-center justify-center p-4 border-2 rounded-lg transition-colors',
                      personType === 'COLPORTER'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-primary-300 hover:bg-primary-50/50'
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <User size={24} className={personType === 'COLPORTER' ? 'text-primary-600' : 'text-gray-400'} />
                      <div className="mt-2 text-center">
                        <div className="font-medium">Colporter</div>
                        <div className="text-xs text-gray-500 mt-1">Student book seller</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handlePersonTypeChange('LEADER')}
                    className={clsx(
                      'flex items-center justify-center p-4 border-2 rounded-lg transition-colors',
                      personType === 'LEADER'
                        ? 'border-success-500 bg-success-50 text-success-700'
                        : 'border-gray-300 hover:border-success-300 hover:bg-success-50/50'
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <UserCog size={24} className={personType === 'LEADER' ? 'text-success-600' : 'text-gray-400'} />
                      <div className="mt-2 text-center">
                        <div className="font-medium">Leader</div>
                        <div className="text-xs text-gray-500 mt-1">Team supervisor</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Image
                </label>
                <ImageUpload
                  value={formData.profileImage}
                  onChange={handleImageChange}
                  className="max-w-sm mx-auto"
                />
              </div>

              <Input
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
              />

              <Input
                label="Last Name"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
              />

              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={initialData?.hasUser}
              />

              <Input
                label="Phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />

              {personType === 'COLPORTER' && (
                <>
                  <Input
                    label="Age"
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="16"
                    max="99"
                    required={personType === 'COLPORTER'}
                  />

                  <Input
                    label="School/Institution"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                    placeholder="e.g., Universidad Adventista de las Antillas"
                    required={personType === 'COLPORTER'}
                  />
                </>
              )}

              {personType === 'LEADER' && (
                <Input
                  label="Institution"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  placeholder="e.g., Universidad Adventista de las Antillas"
                  required={personType === 'LEADER'}
                  className="md:col-span-2"
                />
              )}

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
                    Create user account
                  </label>
                </div>
              )}

              <div className="md:col-span-2">
                <Input
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              {!initialData && formData.createUser && formData.name && formData.apellido && formData.email && (
                <div className="md:col-span-2 p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-700">
                    <strong>Note:</strong> A user account will be created with the following credentials:
                    <br />
                    <strong>Username/Email:</strong> {formData.email}
                    <br />
                    <strong>Password:</strong> {defaultPassword}
                    <br />
                    <strong>Role:</strong> {personType === 'COLPORTER' ? 'Viewer' : 'Supervisor'}
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
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
              >
                {initialData ? 'Save Changes' : `Add ${personType === 'COLPORTER' ? 'Colporter' : 'Leader'}`}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddPersonForm;