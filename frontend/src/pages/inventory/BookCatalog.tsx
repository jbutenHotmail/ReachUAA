import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Package, Edit, DollarSign, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import AddBookForm from './AddBookForm';
import { UserRole, Book } from '../../types';

interface ConfirmationModal {
  isOpen: boolean;
  book: Book | null;
  action: 'activate' | 'deactivate';
}

const BookCatalog: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { books, isLoading, fetchBooks, createBook, updateBook, deleteBook, toggleBookStatus } = useInventoryStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    isOpen: false,
    book: null,
    action: 'deactivate'
  });

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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
    } catch (error) {
      console.error('Error creating book:', error);
    }
  };

  const handleEditBook = async (data: Partial<Book>) => {
    if (!editingBook) return;
    try {
      await updateBook(editingBook.id, data);
      setEditingBook(null);
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await deleteBook(id);
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const handleStatusToggle = (book: Book) => {
    // Only allow admins to toggle book status
    if (!canToggleBookStatus) return;
    

    const action = book.is_active ? 'deactivate' : 'activate';
    setConfirmationModal({
      isOpen: true,
      book,
      action
    });
  };

  const confirmStatusToggle = async () => {
    console.log(confirmationModal.book)
    if (!confirmationModal.book) return;
    
    try {
      await toggleBookStatus(confirmationModal.book.id);
      setConfirmationModal({ isOpen: false, book: null, action: 'deactivate' });
    } catch (error) {
      console.error('Error toggling book status:', error);
    }
  };

  const cancelStatusToggle = () => {
    setConfirmationModal({ isOpen: false, book: null, action: 'deactivate' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <p className="text-gray-600 mt-1 text-sm">
            {t('inventory.books')}: {books.length} ({books.filter(b => b.is_active).length} active, {books.filter(b => !b.is_active).length} inactive)
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
              {t('inventory.addBook')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : filteredBooks.length > 0 ? (
        <Card>
          {/* Mobile view */}
          <div className="block lg:hidden space-y-4">
            {filteredBooks.map((book, index) => (
              <div 
                key={book.id}
                className={`p-4 rounded-lg border ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } ${!book.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="h-16 w-12 flex-shrink-0">
                    <img
                      src={book.imageUrl || 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'}
                      alt={book.title}
                      className="h-16 w-12 object-cover rounded shadow-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {book.title}
                          {!book.is_active && (
                            <span className="ml-2 text-xs text-red-500 font-normal">(Inactive)</span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-500">{book.author}</p>
                        <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">
                          {Number(book.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="primary" size="sm">
                          {book.category}
                        </Badge>
                        <Badge 
                          variant={book.stock > 10 ? "success" : book.stock > 0 ? "warning" : "danger"}
                          size="sm"
                        >
                          Stock: {book.stock}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {canToggleBookStatus ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={book.is_active}
                              onChange={() => handleStatusToggle(book)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        ) : (
                          <Badge 
                            variant={book.is_active ? "success" : "danger"}
                            size="sm"
                          >
                            {book.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                        
                        {canAddBooks && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingBook(book)}
                          >
                            <Edit size={14} />
                          </Button>
                        )}
                      </div>
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
                    Book
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sold
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {canAddBooks && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
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
                            src={book.imageUrl || 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'}
                            alt={book.title}
                            className="h-12 w-8 object-cover rounded shadow-sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {book.title}
                            {!book.is_active && (
                              <span className="ml-2 text-xs text-red-500 font-normal">(Inactive)</span>
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
                        {book.category}
                      </Badge>
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
                          {book.is_active ? 'Active' : 'Inactive'}
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
            {searchTerm ? 'No results found' : 'No books in inventory'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding a new book.'}
          </p>
          {canAddBooks && (
            <div className="mt-6">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={18} />}
                onClick={() => setShowAddForm(true)}
              >
                {t('inventory.addBook')}
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
                    {confirmationModal.action === 'deactivate' ? 'Deactivate Book' : 'Activate Book'}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    You are about to <strong>{confirmationModal.action}</strong> the book:{' '}
                    <strong>"{confirmationModal.book.title}"</strong>
                  </p>
                  
                  {confirmationModal.action === 'deactivate' && (
                    <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                      <p className="text-sm text-warning-700">
                        <strong>⚠️ Important:</strong> If you deactivate this book:
                      </p>
                      <ul className="mt-2 text-sm text-warning-700 list-disc list-inside space-y-1">
                        <li>It will <strong>NOT be counted</strong> in statistics and reports</li>
                        <li>It will <strong>NOT be available</strong> for selection in new transactions</li>
                        <li>Inventory tracking will be <strong>disabled</strong> while inactive</li>
                        <li>Existing transaction data will be preserved but excluded from calculations</li>
                      </ul>
                    </div>
                  )}

                  {confirmationModal.action === 'activate' && (
                    <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                      <p className="text-sm text-success-700">
                        <strong>✅ Activating this book will:</strong>
                      </p>
                      <ul className="mt-2 text-sm text-success-700 list-disc list-inside space-y-1">
                        <li>Include it in statistics and reports</li>
                        <li>Make it available for selection in new transactions</li>
                        <li>Enable inventory tracking</li>
                        <li>Restore its visibility in the system</li>
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
                    Cancel
                  </Button>
                  <Button
                    variant={confirmationModal.action === 'deactivate' ? 'danger' : 'success'}
                    onClick={confirmStatusToggle}
                    leftIcon={confirmationModal.action === 'deactivate' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    className="w-full sm:w-auto"
                  >
                    {confirmationModal.action === 'deactivate' ? 'Deactivate Book' : 'Activate Book'}
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