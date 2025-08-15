import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Phone, MapPin, MessageCircle, User, Camera } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ImageUpload from '../../components/ui/ImageUpload';
import { BibleStudy } from '../../types';
import { useBibleStudyStore } from '../../stores/bibleStudyStore';

interface AddBibleStudyFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: BibleStudy;
}

const AddBibleStudyForm: React.FC<AddBibleStudyFormProps> = ({ 
  onClose, 
  onSubmit,
  initialData 
}) => {
  const { t } = useTranslation();
  const { 
    municipalities, 
    fetchMunicipalities, 
    fetchCountries,
    wereMunicipalitiesFetched,
    wereCountriesFetched
  } = useBibleStudyStore();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    location: initialData?.location || '',
    municipalityId: initialData?.municipalityId || '',
    studyType: initialData?.studyType || 'Estudio Bíblico',
    interestTopic: initialData?.interestTopic || '',
    physicalDescription: initialData?.physicalDescription || '',
    photoUrl: initialData?.photoUrl || '',
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (!wereCountriesFetched) {
      fetchCountries();
    }
    if (!wereMunicipalitiesFetched) {
      // Fetch municipalities for Puerto Rico (country_id = 1)
      fetchMunicipalities(1);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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
          photoUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        photoUrl: ''
      }));
    }
  };

  const studyTypes = [
    { value: 'Estudio Bíblico', label: 'Estudio Bíblico' },
    { value: 'Grupo de Oración', label: 'Grupo de Oración' },
    { value: 'Matrimonio y Familia', label: 'Matrimonio y Familia' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="text-primary-600" size={24} />
                {initialData ? 'Editar Estudio Bíblico' : 'Nuevo Estudio Bíblico'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Photo Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto de la Persona (Opcional)
                </label>
                <ImageUpload
                  value={formData.photoUrl}
                  onChange={handleImageChange}
                  className="max-w-sm mx-auto"
                />
              </div>

              <Input
                label="Nombre de la Persona"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                leftIcon={<User size={18} />}
              />

              <Input
                label="Teléfono"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                leftIcon={<Phone size={18} />}
              />

              <div className="md:col-span-2">
                <Input
                  label="Dirección"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  leftIcon={<MapPin size={18} />}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Lugar de Trabajo (Ej: un negocio, una casa, etc.)"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Ej: Walmart, Casa de María, Oficina médica"
                  leftIcon={<MapPin size={18} />}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Municipio/Ciudad
                </label>
                <select
                  name="municipalityId"
                  value={formData.municipalityId}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Seleccionar municipio...</option>
                  {municipalities.map(municipality => (
                    <option key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Estudio
                </label>
                <select
                  name="studyType"
                  value={formData.studyType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  {studyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Tema de Interés"
                name="interestTopic"
                value={formData.interestTopic}
                onChange={handleChange}
                placeholder="Ej: Profecías, Salud, Familia"
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción Física de la Persona
                </label>
                <textarea
                  name="physicalDescription"
                  rows={3}
                  value={formData.physicalDescription}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Ej: Mujer joven, cabello largo, usa lentes, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas Adicionales
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Información adicional sobre la persona o el estudio..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 bg-white sticky bottom-0">
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
                {initialData ? 'Actualizar Estudio' : 'Crear Estudio'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddBibleStudyForm;