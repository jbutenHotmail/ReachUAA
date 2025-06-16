import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, X, DollarSign, BookText, Calendar, AlertTriangle, Settings, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useUserStore } from '../../stores/userStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useProgramStore } from '../../stores/programStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { getCurrentDate } from '../../utils/dateUtils';
import { isColportableDay, getNextColportableDay } from '../../utils/programUtils';
import { UserRole } from '../../types';

const NewTransaction: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchUsers, fetchPeople, getLeaders, getColporters, people } = useUserStore();
  const { createTransaction } = useTransactionStore();
  const { books, fetchBooks } = useInventoryStore();
  const { program, fetchProgram } = useProgramStore();
  const { user } = useAuthStore();

  const [leaderSearch, setLeaderSearch] = useState('');
  const [colporterSearch, setColporterSearch] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<{ id: string; name: string } | null>(null);
  const [selectedColporter, setSelectedColporter] = useState<{ id: string; name: string } | null>(null);
  const [isLeaderDropdownOpen, setIsLeaderDropdownOpen] = useState(false);
  const [isColporterDropdownOpen, setIsColporterDropdownOpen] = useState(false);
  const [cash, setCash] = useState(0);
  const [checks, setChecks] = useState(0);
  const [atmMobile, setAtmMobile] = useState(0);
  const [paypal, setPaypal] = useState(0);
  const [bookQuantities, setBookQuantities] = useState<Record<string, number>>({});
  const [stayOnPage, setStayOnPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leaderDropdownRef = useRef<HTMLDivElement>(null);
  const colporterDropdownRef = useRef<HTMLDivElement>(null);

  // Check if today is a colportable day
  const today = new Date();
  const isToday = isColportableDay(today);
  const nextColportableDay = getNextColportableDay(today);
  const isAdmin = user?.role === UserRole.ADMIN;

  React.useEffect(() => {
    fetchUsers();
    fetchBooks();
    fetchProgram();
    people && people.length === 0 && fetchPeople();
  }, [fetchUsers, fetchBooks, fetchProgram, fetchPeople, people]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leaderDropdownRef.current && !leaderDropdownRef.current.contains(event.target as Node)) {
        setIsLeaderDropdownOpen(false);
      }
      if (colporterDropdownRef.current && !colporterDropdownRef.current.contains(event.target as Node)) {
        setIsColporterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const leaders = getLeaders();
  const colporters = getColporters();

  const filteredLeaders = leaders.filter((leader) =>
    leader.name.toLowerCase().includes(leaderSearch.toLowerCase())
  );

  const filteredColporters = colporters.filter((colporter) =>
    colporter.name.toLowerCase().includes(colporterSearch.toLowerCase())
  );

  const total = cash + checks + atmMobile + paypal;
  const totalBooks = Object.values(bookQuantities).reduce((sum, qty) => sum + qty, 0);

  const formattedDate = today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeader || !selectedColporter) return;
    setError(null);

    try {
      // Use the consistent date format for today
      const todayFormatted = getCurrentDate();
      console.log('Creating transaction with date:', todayFormatted);
      
      await createTransaction({
        leaderId: selectedLeader.id,
        leaderName: selectedLeader.name,
        studentId: selectedColporter.id,
        studentName: selectedColporter.name,
        cash,
        checks,
        atmMobile,
        paypal,
        total,
        date: todayFormatted,
        books: Object.entries(bookQuantities)
          .filter(([_, quantity]) => quantity > 0)
          .map(([id, quantity]) => ({
            id,
            quantity,
            title: books.find(b => b.id === id)?.title || '',
            price: books.find(b => b.id === id)?.price || 0,
          })),
      });

      if (stayOnPage) {
        setSelectedColporter(null);
        setColporterSearch('');
        setCash(0);
        setChecks(0);
        setAtmMobile(0);
        setPaypal(0);
        setBookQuantities({});
      } else {
        navigate('/transactions');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while creating the transaction');
    }
  };

  const handleQuantityChange = (bookId: string, value: string | number) => {
    const quantity = typeof value === 'string' ? parseInt(value, 10) || 0 : value;
    if (quantity < 0) return;

    setBookQuantities((prev) => ({
      ...prev,
      [bookId]: quantity,
    }));
  };

  // Filter only active books
  const activeBooks = books.filter(book => book.is_active);

  console.log('Active books:', isToday);
  // If today is not a colportable day and user is not admin, show restriction screen
  if (!isToday) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('transactions.newTransaction')}</h1>
            <div className="flex items-center gap-2 mt-2 text-gray-600">
              <Calendar size={16} />
              <span className="text-sm">{formattedDate}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/transactions')}
          >
            {t('common.back')}
          </Button>
        </div>

        <Card>
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-warning-100 p-4 rounded-full mb-6">
              <AlertTriangle size={48} className="text-warning-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Non-Colportable Day
            </h2>
            
            <p className="text-gray-600 max-w-lg mb-6">
              Today is not designated as a colportable day in the program settings. 
              Transactions can only be created on designated working days.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8 w-full max-w-md">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Next available colportable day:</strong>
              </p>
              <p className="text-lg font-medium text-primary-700">
                {nextColportableDay.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            
            <div className="space-y-4 w-full max-w-md">
              <p className="text-sm text-gray-500">
                If you need to create a transaction for today, please contact an administrator to mark this day as colportable in the program settings.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/transactions')}
                  leftIcon={<ChevronRight size={16} className="rotate-180" />}
                >
                  Return to Transactions
                </Button>
                
                {isAdmin && (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/admin/settings')}
                    leftIcon={<Settings size={16} />}
                  >
                    Program Settings
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('transactions.newTransaction')}</h1>
          <div className="flex items-center gap-2 mt-2 text-gray-600">
            <Calendar size={16} />
            <span className="text-sm">{formattedDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stayOnPage}
              onChange={(e) => setStayOnPage(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-gray-600">Stay on this page</span>
          </label>
          <Button 
            variant="outline" 
            onClick={() => navigate('/transactions')}
            className="ml-auto sm:ml-0"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Leader Selection */}
          <div className="relative" ref={leaderDropdownRef}>
            <Card className="overflow-visible">
              <div className="space-y-3 sm:space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.leader')} (Today's Supervisor)
                </label>
                <div className="relative">
                  <div
                    className={clsx(
                      'relative border border-gray-300 rounded-md shadow-sm',
                      isLeaderDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
                    )}
                  >
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder="Select today's supervising leader"
                        value={leaderSearch}
                        onChange={(e) => {
                          setLeaderSearch(e.target.value);
                          setIsLeaderDropdownOpen(true);
                          setSelectedLeader(null);
                        }}
                        onFocus={() => setIsLeaderDropdownOpen(true)}
                        className="w-full px-3 py-2 rounded-md border-0 focus:outline-none text-sm"
                      />
                      <button
                        type="button"
                        className="pr-2 flex items-center"
                        onClick={() => setIsLeaderDropdownOpen(!isLeaderDropdownOpen)}
                      >
                        <ChevronDown
                          className={clsx(
                            'w-5 h-5 text-gray-400 transition-transform duration-200',
                            isLeaderDropdownOpen && 'transform rotate-180'
                          )}
                        />
                      </button>
                    </div>
                    {selectedLeader && (
                      <div className="px-3 py-2 border-t border-gray-200 bg-primary-50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-primary-900 text-sm">
                            {selectedLeader.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeader(null);
                              setLeaderSearch('');
                            }}
                            className="p-1 hover:bg-primary-100 rounded-full"
                          >
                            <X className="w-4 h-4 text-primary-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isLeaderDropdownOpen && !selectedLeader && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 top-full left-0">
                      <div className="max-h-60 overflow-y-auto py-1">
                        {filteredLeaders.length > 0 ? (
                          filteredLeaders.map((leader) => (
                            <button
                              key={leader.id}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                              onClick={() => {
                                setSelectedLeader({ id: leader.id, name: leader.name });
                                setLeaderSearch('');
                                setIsLeaderDropdownOpen(false);
                              }}
                            >
                              <div className="font-medium text-sm">{leader.name}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No leaders found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Colporter Selection */}
          <div className="relative" ref={colporterDropdownRef}>
            <Card className="overflow-visible">
              <div className="space-y-3 sm:space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.student')} (Colporter)
                </label>
                <div className="relative">
                  <div
                    className={clsx(
                      'relative border border-gray-300 rounded-md shadow-sm',
                      isColporterDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
                    )}
                  >
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder="Select colporter"
                        value={colporterSearch}
                        onChange={(e) => {
                          setColporterSearch(e.target.value);
                          setIsColporterDropdownOpen(true);
                          setSelectedColporter(null);
                        }}
                        onFocus={() => setIsColporterDropdownOpen(true)}
                        className="w-full px-3 py-2 rounded-md border-0 focus:outline-none text-sm"
                      />
                      <button
                        type="button"
                        className="pr-2 flex items-center"
                        onClick={() => setIsColporterDropdownOpen(!isColporterDropdownOpen)}
                      >
                        <ChevronDown
                          className={clsx(
                            'w-5 h-5 text-gray-400 transition-transform duration-200',
                            isColporterDropdownOpen && 'transform rotate-180'
                          )}
                        />
                      </button>
                    </div>
                    {selectedColporter && (
                      <div className="px-3 py-2 border-t border-gray-200 bg-primary-50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-primary-900 text-sm">
                            {selectedColporter.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedColporter(null);
                              setColporterSearch('');
                            }}
                            className="p-1 hover:bg-primary-100 rounded-full"
                          >
                            <X className="w-4 h-4 text-primary-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isColporterDropdownOpen && !selectedColporter && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 top-full left-0">
                      <div className="max-h-60 overflow-y-auto py-1">
                        {filteredColporters.length > 0 ? (
                          filteredColporters.map((colporter) => (
                            <button
                              key={colporter.id}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                              onClick={() => {
                                setSelectedColporter({ id: colporter.id, name: colporter.name });
                                setColporterSearch('');
                                setIsColporterDropdownOpen(false);
                              }}
                            >
                              <div className="font-medium text-sm">{colporter.name}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No colporters found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card title="Books" icon={<BookText size={20} />}>
            <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {activeBooks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No active books available</p>
                </div>
              ) : (
                activeBooks.map((book) => (
                  <div key={book.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{book.title}</p>
                      <p className="text-xs text-gray-500">${Number(book.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(book.id, (bookQuantities[book.id] || 0) - 1)}
                        className="p-1 sm:p-1.5"
                      >
                        -
                      </Button>
                      <input
                        type="number"
                        min="0"
                        value={bookQuantities[book.id] || 0}
                        onChange={(e) => handleQuantityChange(book.id, e.target.value)}
                        className="w-12 sm:w-16 text-center px-1 sm:px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(book.id, (bookQuantities[book.id] || 0) + 1)}
                        className="p-1 sm:p-1.5"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="font-medium text-gray-700">Total Books:</span>
                <Badge variant="primary" size="lg">{totalBooks}</Badge>
              </div>
            </div>
          </Card>

          <Card title="Payment" icon={<DollarSign size={20} />}>
            <div className="space-y-3 sm:space-y-4">
              <Input
                label={t('transactions.cash')}
                type="number"
                min="0"
                step="0.01"
                value={cash || ''}
                onChange={(e) => setCash(Number(e.target.value))}
              />
              <Input
                label={t('transactions.checks')}
                type="number"
                min="0"
                step="0.01"
                value={checks || ''}
                onChange={(e) => setChecks(Number(e.target.value))}
              />
              <Input
                label={t('transactions.atmMobile')}
                type="number"
                min="0"
                step="0.01"
                value={atmMobile || ''}
                onChange={(e) => setAtmMobile(Number(e.target.value))}
              />
              <Input
                label={t('transactions.paypal')}
                type="number"
                min="0"
                step="0.01"
                value={paypal || ''}
                onChange={(e) => setPaypal(Number(e.target.value))}
              />
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="font-medium text-gray-700">{t('common.total')}:</span>
                <Badge variant="primary" size="lg">${total.toFixed(2)}</Badge>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            type="submit"
            disabled={!selectedLeader || !selectedColporter || total <= 0 || totalBooks <= 0}
            className="w-full sm:w-auto"
          >
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewTransaction;