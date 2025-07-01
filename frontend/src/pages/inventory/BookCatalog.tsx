import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Package, Edit, DollarSign, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddBookForm from './AddBookForm';
import { UserRole, Book, BookSize } from '../../types';
import LoadingScreen from '../../components/ui/LoadingScreen';

interface ConfirmationModal {
  isOpen: boolean;
  book: Book | null;
  action: 'activate' | 'deactivate';
}

const BookCatalog: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { books, isLoading, fetchBooks, createBook, updateBook, 
    toggleBookStatus, wereBooksLoaded } = useInventoryStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    isOpen: false,
    book: null,
    action: 'deactivate'
  });
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!wereBooksLoaded) {
      fetchBooks();
    }
  }, [fetchBooks, wereBooksLoaded]);

  const filteredBooks = searchTerm
    ? books.filter(book => 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.isbn?.includes(searchTerm)
      )
    : books;

  // Check if user can add books (Admin or Supervisor only)
  const canAddBooks = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERVISOR;
  
  // Check if user can toggle book status (Admin only)
  const canToggleBookStatus = user?.role === UserRole.ADMIN;

  const handleAddBook = async (data: Omit<Book, 'id'>) => {
    try {
      await createBook(data);
      setShowAddForm(false);
      setSuccess(t('inventory.successCreated'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error creating book:', error);
    }
  };

  const handleEditBook = async (data: Partial<Book>) => {
    if (!editingBook) return;
    try {
      await updateBook(editingBook.id, data);
      setEditingBook(null);
      setSuccess(t('inventory.successUpdated'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const handleStatusToggle = (book: Book) => {
    if (!canToggleBookStatus) return;
    
    const action = book.is_active ? 'deactivate' : 'activate';
    setConfirmationModal({
      isOpen: true,
      book,
      action
    });
  };

  const confirmStatusToggle = async () => {
    if (!confirmationModal.book) return;
    
    try {
      await toggleBookStatus(confirmationModal.book.id);
      setConfirmationModal({ isOpen: false, book: null, action: 'deactivate' });
      setSuccess(t(`inventory.success${confirmationModal.action === 'activate' ? 'Activated' : 'Deactivated'}`));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error toggling book status:', error);
    }
  };

  const cancelStatusToggle = () => {
    setConfirmationModal({ isOpen: false, book: null, action: 'deactivate' });
  };

  // Get book size badge
  const getBookSizeBadge = (book: Book) => {
    const size = book.size;
    return (
      <Badge 
        variant={size === BookSize.LARGE ? "primary" : "success"}
        size="sm"
      >
        {t(`inventory.size.${size.toLowerCase()}`)}
      </Badge>
    );
  };

  if(isLoading) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 md:pb-0">
      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-primary-600" size={28} />
            {t('inventory.title')}
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            {t('inventory.books')}: {books.length} ({books.filter(b => b.is_active).length} {t('inventory.active')}, {books.filter(b => !b.is_active).length} {t('inventory.inactive')})
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
            className="w-full sm:w-64"
          />
          
          {canAddBooks && (
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
              onClick={() => setShowAddForm(true)}
              className="w-full sm:w-auto"
            >
              {t('inventory.add')}
            </Button>
          )}
        </div>
      </div>

      {isLoading && books.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <LoadingScreen message={t('inventory.loading')} />
        </div>
      ) : filteredBooks.length > 0 ? (
        <Card>
          {/* Mobile view - Improved design */}
          <div className="block lg:hidden space-y-4">
            {filteredBooks.map((book, index) => (
              <div 
                key={book.id}
                className={`p-3 rounded-lg border ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } ${!book.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-12 flex-shrink-0">
                    <img
                      src={book.image_url || 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'}
                      alt={book.title}
                      className="h-16 w-12 object-cover rounded shadow-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {book.title}
                          {!book.is_active && (
                            <span className="ml-2 text-xs text-red-500 font-normal">({t('inventory.inactive')})</span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{book.author || t('inventory.unknownAuthor')}</p>
                      </div>
                      <div className="flex items-center ml-2">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">
                          {Number(book.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="primary" size="sm">
                        {t(`category.${book.category.toLowerCase()}`)}
                      </Badge>
                      {getBookSizeBadge(book)}
                      <Badge 
                        variant={book.stock > 10 ? "success" : book.stock > 0 ? "warning" : "danger"}
                        size="sm"
                      >
                        {book.stock}
                      </Badge>
                      <Badge variant="secondary" size="sm">
                        {t('inventory.sold')}: {book.sold}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <div>
                        {canToggleBookStatus ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={book.is_active}
                              onChange={() => handleStatusToggle(book)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                            <span className="ml-2 text-xs text-gray-500">
                              {book.is_active ? t('inventory.active') : t('inventory.inactive')}
                            </span>
                          </label>
                        ) : (
                          <Badge 
                            variant={book.is_active ? "success" : "danger"}
                            size="sm"
                          >
                            {t(`inventory.${book.is_active ? 'active' : 'inactive'}`)}
                          </Badge>
                        )}
                      </div>
                      
                      {canAddBooks && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBook(book)}
                          className="ml-auto"
                        >
                          <Edit size={16} className="text-primary-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.book')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.author')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.category')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.price')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.stock')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.sold')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('inventory.status')}
                  </th>
                  {canAddBooks && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('inventory.actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBooks.map((book, index) => (
                  <tr 
                    key={book.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${!book.is_active ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-8 flex-shrink-0 mr-3">
                          <img
                            src={book.image_url || 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'}
                            alt={book.title}
                            className="h-12 w-8 object-cover rounded shadow-sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {book.title}
                            {!book.is_active && (
                              <span className="ml-2 text-xs text-red-500 font-normal">({t('inventory.inactive')})</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            ISBN: {book.isbn}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {book.author}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant="primary" size="sm">
                        {t(`category.${book.category.toLowerCase()}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {getBookSizeBadge(book)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end">
                        <DollarSign size={14} className="text-gray-400 mr-1" />
                        <span className="text-sm font-semibold text-gray-900">
                          {Number(book.price).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge 
                        variant={book.stock > 10 ? "success" : book.stock > 0 ? "warning" : "danger"}
                        size="sm"
                      >
                        {book.stock}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant="primary" size="sm">
                        {book.sold}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {canToggleBookStatus ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={book.is_active}
                            onChange={() => handleStatusToggle(book)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      ) : (
                        <Badge 
                          variant={book.is_active ? "success" : "danger"}
                          size="sm"
                        >
                          {t(`inventory.${book.is_active ? 'active' : 'inactive'}`)}
                        </Badge>
                      )}
                    </td>
                    {canAddBooks && (
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => setEditingBook(book)}
                          >
                            <Edit size={14} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Package size={48} />
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            {searchTerm ? t('inventory.noResults') : t('inventory.noBooks')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? t('inventory.adjustSearch') : t('inventory.startAdd')}
          </p>
          {canAddBooks && (
            <div className="mt-6">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={18} />}
                onClick={() => setShowAddForm(true)}
              >
                {t('inventory.add')}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Confirmation Modal - Only show for admins */}
      {confirmationModal.isOpen && confirmationModal.book && canToggleBookStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-warning-500" size={24} />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t(`inventory.${confirmationModal.action}Book`)}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {t('inventory.confirmAction')} "{confirmationModal.book.title}"
                  </p>
                  
                  {confirmationModal.action === 'deactivate' && (
                    <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                      <p className="text-sm text-warning-700">
                        <strong>{t('inventory.warning')}:</strong> {t('inventory.deactivateWarning')}
                      </p>
                      <ul className="mt-2 text-sm text-warning-700 list-disc list-inside space-y-1">
                        <li>{t('inventory.deactivateImpact1')}</li>
                        <li>{t('inventory.deactivateImpact2')}</li>
                        <li>{t('inventory.deactivateImpact3')}</li>
                        <li>{t('inventory.deactivateImpact4')}</li>
                      </ul>
                    </div>
                  )}

                  {confirmationModal.action === 'activate' && (
                    <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                      <p className="text-sm text-success-700">
                        <strong>{t('inventory.activateInfo')}:</strong>
                      </p>
                      <ul className="mt-2 text-sm text-success-700 list-disc list-inside space-y-1">
                        <li>{t('inventory.activateImpact1')}</li>
                        <li>{t('inventory.activateImpact2')}</li>
                        <li>{t('inventory.activateImpact3')}</li>
                        <li>{t('inventory.activateImpact4')}</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={cancelStatusToggle}
                    leftIcon={<X size={16} />}
                    className="w-full sm:w-auto"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant={confirmationModal.action === 'deactivate' ? 'danger' : 'success'}
                    onClick={confirmStatusToggle}
                    leftIcon={confirmationModal.action === 'deactivate' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    className="w-full sm:w-auto"
                  >
                    {t(`inventory.${confirmationModal.action}Book`)}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {(showAddForm || editingBook) && (
        <AddBookForm
          onClose={() => {
            setShowAddForm(false);
            setEditingBook(null);
          }}
          onSubmit={editingBook ? handleEditBook : handleAddBook}
          initialData={editingBook || undefined}
        />
      )}
    </div>
  );
};

export default BookCatalog;