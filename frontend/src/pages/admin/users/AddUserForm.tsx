import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, AlertCircle, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { UserRole } from '../../../types';
import { useUserStore } from '../../../stores/userStore';
import { useProgramStore } from '../../../stores/programStore';

interface AddUserFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

const AddUserForm: React.FC<AddUserFormProps> = ({ 
  onClose, 
  onSubmit,
  initialData 
}) => {
  const { t } = useTranslation();
  const { people, fetchPeople, werePeopleFetched, resetPassword } = useUserStore();
  const { program } = useProgramStore();
  // Form state
  const [formData, setFormData] = useState({
    personId: initialData?.personId || '',
    personName: initialData?.personName || '',
    personType: initialData?.personType || 'COLPORTER',
    email: initialData?.email || '',
    role: initialData?.role || UserRole.VIEWER,
    status: initialData?.status || 'ACTIVE',
  });

  // Person selection state
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string; email: string; type: string } | null>(
    initialData?.personId && initialData?.personName 
      ? { id: initialData.personId, name: initialData.personName, email: initialData.email || '', type: initialData.personType }
      : null
  );
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const personDropdownRef = useRef<HTMLDivElement>(null);
  
  // Reset password state
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  // Fetch people data if not already loaded
  useEffect(() => {
    if (!werePeopleFetched) {
      fetchPeople(program?.id);
    }
  }, [fetchPeople, werePeopleFetched]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(event.target as Node)) {
        setIsPersonDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter people based on search and type
  const filteredPeople = people
    .filter(person => 
      (person.name.toLowerCase().includes(personSearch.toLowerCase()) ||
       person.apellido.toLowerCase().includes(personSearch.toLowerCase())) &&
      person.personType === formData.personType &&
      !person.hasUser // Only show people without users if creating new
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      personId: selectedPerson?.id,
      personName: selectedPerson?.name,
      email: selectedPerson?.email,
      // Generate default password based on name
      password: !initialData ? getDefaultPassword(selectedPerson?.name || '') : undefined
    };
    
    onSubmit(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Reset person selection when type changes
    if (name === 'personType') {
      setSelectedPerson(null);
      setPersonSearch('');
    }
  };

  // Generate default password based on name
  const getDefaultPassword = (name: string) => {
    if (!name) return '';
    
    const nameParts = name.split(' ');
    if (nameParts.length < 2) return name.toLowerCase();
    
    const firstName = nameParts[0].toLowerCase();
    const lastName = nameParts[1].toLowerCase();
    
    return `${firstName}.${lastName}`;
  };
  
  // Handle password reset
  const handleResetPassword = async () => {
    if (!initialData || !initialData.id) return;
    
    setIsResettingPassword(true);
    setResetPasswordSuccess(null);
    setResetPasswordError(null);
    
    try {
      // Call API to reset password
      await resetPassword(initialData.id);
      
      // Show success message
      setResetPasswordSuccess(t('userForm.passwordResetConfirmation') + ' ' + getDefaultPassword(initialData.personName));
      
      // Clear success message after 5 seconds
      setTimeout(() => setResetPasswordSuccess(null), 5000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setResetPasswordError('Failed to reset password. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setResetPasswordError(null), 5000);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? t('userForm.editUser') : t('userForm.createUser')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Person Type Selection */}
              {!initialData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('userForm.personType')}
                  </label>
                  <select
                    name="personType"
                    value={formData.personType}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    required
                  >
                    <option value="COLPORTER">{t('userForm.types.colporter')}</option>
                    <option value="LEADER">{t('userForm.types.leader')}</option>
                  </select>
                </div>
              )}

              {/* Person Selection Dropdown */}
              {!initialData && (
                <div className="relative" ref={personDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('userForm.selectPerson')}
                  </label>
                  <div
                    className={clsx(
                      'relative border border-gray-300 rounded-md shadow-sm',
                      isPersonDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
                    )}
                  >
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder={t('userForm.searchPersonPlaceholder', { type: formData.personType.toLowerCase() })}
                        value={personSearch}
                        onChange={(e) => {
                          setPersonSearch(e.target.value);
                          setIsPersonDropdownOpen(true);
                          setSelectedPerson(null);
                        }}
                        onFocus={() => setIsPersonDropdownOpen(true)}
                        className="w-full px-3 py-2 rounded-md border-0 focus:outline-none text-sm"
                      />
                      <button
                        type="button"
                        className="pr-2 flex items-center"
                        onClick={() => setIsPersonDropdownOpen(!isPersonDropdownOpen)}
                      >
                        <ChevronDown
                          className={clsx(
                            'w-5 h-5 text-gray-400 transition-transform duration-200',
                            isPersonDropdownOpen && 'transform rotate-180'
                          )}
                        />
                      </button>
                    </div>
                    {selectedPerson && (
                      <div className="px-3 py-2 border-t border-gray-200 bg-primary-50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-primary-900 text-sm">
                            {selectedPerson.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPerson(null);
                              setPersonSearch('');
                            }}
                            className="p-1 hover:bg-primary-100 rounded-full"
                          >
                            <X className="w-4 h-4 text-primary-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isPersonDropdownOpen && !selectedPerson && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                      <div className="max-h-60 overflow-y-auto py-1">
                        {filteredPeople.length > 0 ? (
                          filteredPeople.map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                              onClick={() => {
                                setSelectedPerson({ 
                                  id: person.id, 
                                  name: `${person.name} ${person.apellido}`, 
                                  email: person.email,
                                  type: person.personType
                                });
                                setPersonSearch('');
                                setIsPersonDropdownOpen(false);
                              }}
                            >
                              <div className="font-medium text-sm">{person.name} {person.apellido}</div>
                              <div className="text-xs text-gray-500">{person.email}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {personSearch ? 
                              t('userForm.noMatchingPeople') : 
                              t('userForm.noPeopleWithoutAccounts', { type: formData.personType.toLowerCase() })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Display selected person info for editing */}
              {initialData && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{initialData.personName}</p>
                      <p className="text-xs text-gray-500">{initialData.email}</p>
                    </div>
                    <Badge 
                      variant={initialData.personType === 'COLPORTER' ? 'primary' : 'success'}
                      size="sm"
                    >
                      {t(`common.${initialData.personType.toLowerCase()}`)}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('userForm.userRole')}
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  <option value={UserRole.ADMIN}>{t('userForm.roles.admin')}</option>
                  <option value={UserRole.SUPERVISOR}>{t('userForm.roles.supervisor')}</option>
                  <option value={UserRole.VIEWER}>{t('userForm.roles.viewer')}</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.role === UserRole.ADMIN && t('userForm.roleDescriptions.admin')}
                  {formData.role === UserRole.SUPERVISOR && t('userForm.roleDescriptions.supervisor')}
                  {formData.role === UserRole.VIEWER && t('userForm.roleDescriptions.viewer')}
                </p>
              </div>

              {/* Status Selection - Only for editing */}
              {initialData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('userForm.accountStatus')}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    required
                  >
                    <option value="ACTIVE">{t('userForm.status.active')}</option>
                    <option value="INACTIVE">{t('userForm.status.inactive')}</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.status === 'ACTIVE' 
                      ? t('userForm.statusDescriptions.active') 
                      : t('userForm.statusDescriptions.inactive')}
                  </p>
                </div>
              )}

              {/* Password Information - Only for new users */}
              {!initialData && selectedPerson && (
                <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
                  <div className="flex items-start gap-3">
                    <Lock size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary-700">{t('userForm.defaultPassword')}</p>
                      <p className="text-xs text-primary-600 mt-1">
                        {t('userForm.accountCreationNote')}
                      </p>
                      <div className="mt-2 p-2 bg-white rounded border border-primary-200">
                        <p className="text-xs">
                          <span className="font-medium">{t('auth.email')}:</span> {selectedPerson.email}
                        </p>
                        <p className="text-xs">
                          <span className="font-medium">{t('auth.password')}:</span> {getDefaultPassword(selectedPerson.name)}
                        </p>
                      </div>
                      <p className="text-xs text-primary-600 mt-2">
                        {t('userForm.passwordChangePrompt')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset Password Option - Only for editing */}
              {initialData && (
                <div className="p-4 bg-warning-50 rounded-lg border border-warning-100">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning-700">{t('userForm.resetPassword')}</p>
                      <p className="text-xs text-warning-600 mt-1">
                        {t('userForm.resetPasswordNote', { password: getDefaultPassword(initialData.personName) })}
                      </p>
                      
                      {resetPasswordSuccess && (
                        <div className="mt-2 p-2 bg-success-50 rounded border border-success-200">
                          <p className="text-xs text-success-700">{resetPasswordSuccess}</p>
                        </div>
                      )}
                      
                      {resetPasswordError && (
                        <div className="mt-2 p-2 bg-danger-50 rounded border border-danger-200">
                          <p className="text-xs text-danger-700">{resetPasswordError}</p>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="warning"
                          size="sm"
                          onClick={handleResetPassword}
                          isLoading={isResettingPassword}
                        >
                          {t('userForm.resetPasswordButton')}
                        </Button>
                      </div>
                    </div>
                  </div>
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
                disabled={!initialData && !selectedPerson}
              >
                {initialData ? t('leaderForm.saveChanges') : t('userForm.createUser')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddUserForm;