import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ImageUpload from '../../components/ui/ImageUpload';
import { Book, BookSize } from '../../types';

interface AddBookFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Book;
  isProgramSetup?: boolean; // New prop to indicate if this is being used in program setup
}

const AddBookForm: React.FC<AddBookFormProps> = ({ 
  onClose, 
  onSubmit,
  initialData,
  isProgramSetup = false
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = React.useState({
    isbn: initialData?.isbn || '',
    title: initialData?.title || '',
    author: initialData?.author || '',
    publisher: initialData?.publisher || '',
    price: initialData?.price || 0,
    size: initialData?.size || BookSize.SMALL, // Default to SMALL if not specified
    category: initialData?.category || '',
    description: initialData?.description || '',
    stock: initialData?.stock || 0,
    sold: initialData?.sold || 0,
    imageUrl: initialData?.image_url || '',
    is_active: initialData?.is_active ?? true, // Default to active for new books
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' || name === 'sold' 
        ? parseFloat(value) || 0 
        : type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : value,
    }));
  };

  const handleImageChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        imageUrl: ''
      }));
    }
  };

  const categories = [
    'Devotional',
    'Health',
    'Family',
    'Prophecy',
    'History',
    'Education',
    'Cooking',
    'Children',
    'Youth',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? 'Edit Book' : 'Add New Book'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Book Image */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Book Cover
                </label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={handleImageChange}
                  className="w-full"
                />
              </div>

              {/* Book Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="ISBN (Optional)"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    placeholder="978-3-16-148410-0"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Book title"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Author (Optional)"
                    name="author"
                    value={formData.author}
                    onChange={handleChange}
                    placeholder="Author name"
                  />

                  <Input
                    label="Publisher (Optional)"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleChange}
                    placeholder="Publisher name"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Input
                    label="Price ($)"
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
                      Book Size
                    </label>
                    <select
                      name="size"
                      value={formData.size}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      required
                    >
                      <option value={BookSize.LARGE}>Large</option>
                      <option value={BookSize.SMALL}>Small</option>
                    </select>
                  </div>

                  {isProgramSetup ? (
                    <Input
                      label="Initial Stock"
                      type="number"
                      name="stock"
                      value={formData.stock || ''}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                  ) : (
                    <>
                      <Input
                        label="Stock"
                        type="number"
                        name="stock"
                        value={formData.stock || ''}
                        onChange={handleChange}
                        min="0"
                        required
                      />

                      <Input
                        label="Sold"
                        type="number"
                        name="sold"
                        value={formData.sold || ''}
                        onChange={handleChange}
                        min="0"
                      />
                    </>
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Book is active (available for transactions and statistics)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Book description..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
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
              >
                {initialData ? 'Save Changes' : 'Add Book'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddBookForm;