import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookText, Plus, Edit, Trash2, DollarSign, Package } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import { Book } from '../../../types';
import { defaultBooks } from '../../../data/defaultBooks';
import AddBookForm from '../../inventory/AddBookForm';

interface BookSetupStepProps {
  books: Book[];
  onBooksChange: (books: Book[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const BookSetupStep: React.FC<BookSetupStepProps> = ({ 
  books, 
  onBooksChange, 
  onNext, 
  onBack 
}) => {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (books.length === 0) {
      const initialBooks = defaultBooks.map((book, index) => ({
        ...book,
        id: `temp-${index + 1}`,
        stock: 100,
        sold: 0,
      }));
      onBooksChange(initialBooks);
    }
  }, [books, onBooksChange]);

  const handleAddBook = (bookData: Omit<Book, 'id'>) => {
    const newBook: Book = {
      ...bookData,
      id: `temp-${Date.now()}`,
      stock: 0,
      sold: 0,
    };
    onBooksChange([...books, newBook]);
    setShowAddForm(false);
  };

  const handleEditBook = (bookData: Partial<Book>) => {
    if (!editingBook) return;
    
    onBooksChange(
      books.map(book => 
        book.id === editingBook.id 
          ? { ...book, ...bookData }
          : book
      )
    );
    
    setEditingBook(null);
    setShowAddForm(false);
  };

  const handleDeleteBook = (id: string) => {
    onBooksChange(books.filter(book => book.id !== id));
  };

  const filteredBooks = searchTerm
    ? books.filter(book => 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (book.isbn && book.isbn.includes(searchTerm))
      )
    : books;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BookText className="text-primary-600" size={24} />
          {t('bookSetup.title')}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
          >
            {t('common.back')}
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            disabled={books.length === 0}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        {t('bookSetup.description')}
      </p>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Input
          placeholder={t('bookSetup.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<BookText size={18} />}
          className="w-full sm:w-64"
        />
        
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowAddForm(true)}
        >
          {t('bookSetup.addBook')}
        </Button>
      </div>

      {filteredBooks.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('bookSetup.book')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('bookSetup.category')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('bookSetup.price')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('bookSetup.initialStock')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('bookSetup.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition-colors">
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
                          </div>
                          <div className="text-xs text-gray-500">
                            {book.author || t('bookSetup.unknownAuthor')}
                          </div>
                        </div>
                      </div>
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
                          {book.price.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant="success" size="sm">
                        {book.stock}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => {
                            setEditingBook(book);
                            setShowAddForm(true);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => handleDeleteBook(book.id)}
                        >
                          <Trash2 size={14} className="text-danger-600" />
                        </Button>
                      </div>
                    </td>
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
            {searchTerm ? t('bookSetup.noBooksFound') : t('bookSetup.noBooksAdded')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? t('bookSetup.searchNoResults') : t('bookSetup.noBooksPrompt')}
          </p>
          <div className="mt-6">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={18} />}
              onClick={() => setShowAddForm(true)}
            >
              {t('bookSetup.addBook')}
            </Button>
          </div>
        </Card>
      )}

      {(showAddForm || editingBook) && (
        <AddBookForm
          onClose={() => {
            setShowAddForm(false);
            setEditingBook(null);
          }}
          onSubmit={editingBook ? handleEditBook : handleAddBook}
          initialData={editingBook || undefined}
          isProgramSetup={true}
        />
      )}
    </div>
  );
};

export default BookSetupStep;