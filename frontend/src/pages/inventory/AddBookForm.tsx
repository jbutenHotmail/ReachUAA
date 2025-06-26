import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Book, BookSize } from '../../types';
import ImageUpload from '../../components/ui/ImageUpload';

interface AddBookFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Book;
  isProgramSetup?: boolean;
}

const AddBookForm: React.FC<AddBookFormProps> = ({ 
  onClose, 
  onSubmit,
  initialData,
  isProgramSetup = false
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    isbn: initialData?.isbn || '',
    title: initialData?.title || '',
    author: initialData?.author || '',
    publisher: initialData?.publisher || '',
    price: initialData?.price || 0,
    size: initialData?.size || (initialData?.price && initialData.price >= 20 ? BookSize.LARGE : BookSize.SMALL),
    category: initialData?.category || '',
    description: initialData?.description || '',
    image_url: initialData?.image_url || '',
    stock: initialData?.stock || 0,
    is_active: initialData?.is_active !== false, // Default to true if not provided
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine size based on price if not explicitly set
    const size = formData.size || (formData.price >= 12 ? BookSize.LARGE : BookSize.SMALL);
    
    onSubmit({
      ...formData,
      size,
      price: Number(formData.price),
      stock: Number(formData.stock),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle numeric inputs
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : Number(value),
      }));
    } 
    // Handle checkbox inputs
    else if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked,
      }));
    } 
    // Handle all other inputs
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Auto-update size when price changes
    if (name === 'price') {
      const newPrice = Number(value);
      setFormData(prev => ({
        ...prev,
        size: newPrice >= 20 ? BookSize.LARGE : BookSize.SMALL,
      }));
    }
  };

  const handleImageChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image_url: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        image_url: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? t('inventory.editBook') : t('inventory.addBook')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.image')}
                </label>
                <ImageUpload
                  value={formData.image_url}
                  onChange={handleImageChange}
                  className="max-w-sm mx-auto"
                />
              </div>

              <Input
                label={t('inventory.bookTitle')}
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />

              <Input
                label={t('inventory.author')}
                name="author"
                value={formData.author}
                onChange={handleChange}
              />

              <Input
                label={t('inventory.isbn')}
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
              />

              <Input
                label={t('inventory.publisher')}
                name="publisher"
                value={formData.publisher}
                onChange={handleChange}
              />

              <Input
                label={t('inventory.price')}
                type="number"
                name="price"
                value={formData.price || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.size.size')}
                </label>
                <select
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  <option value={BookSize.LARGE}>{t('inventory.size.large')}</option>
                  <option value={BookSize.SMALL}>{t('inventory.size.small')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.category')}
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  <option value="">Select category</option>
                  <option value="religious">Religious</option>
                  <option value="Health">Health</option>
                  <option value="family">Family</option>
                  <option value="children">Children</option>
                  <option value="Devotional">Devotional</option>
                  <option value="educational">Educational</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Input
                label={t('inventory.stock')}
                type="number"
                name="stock"
                value={formData.stock || ''}
                onChange={handleChange}
                min="0"
                required={isProgramSetup}
              />

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  {t('inventory.active')}
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.description')}
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
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
                {initialData ? t('common.save') : t('inventory.addBook')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddBookForm;