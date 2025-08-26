import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, X, DollarSign, BookText, Calendar, AlertTriangle, Settings, ChevronRight, CheckCircle } from 'lucide-react';
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
import LoadingScreen from '../../components/ui/LoadingScreen';
import { getCurrentDate } from '../../utils/dateUtils';
import { isColportableDay, getNextColportableDay } from '../../utils/programUtils';
import { UserRole, BookSize } from '../../types';

const NewTransaction: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchUsers, fetchPeople, people, werePeopleFetched, wereUsersFetched } = useUserStore();
  const { createTransaction } = useTransactionStore();
  const { books, fetchBooks, wereBooksLoaded } = useInventoryStore();
  const { fetchProgram, wasProgramFetched } = useProgramStore();
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
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [error, setError] = useState<string | null>(null);
  const [bookTotal, setBookTotal] = useState<number>(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!wereBooksLoaded || !wasProgramFetched || !werePeopleFetched);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const leaderDropdownRef = useRef<HTMLDivElement>(null);
  const colporterDropdownRef = useRef<HTMLDivElement>(null);

  // Check if today is a colportable day
  const selectedDateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);
  const isSelectedDateColportable = useMemo(() => isColportableDay(selectedDateObj), [selectedDateObj]);
  const nextColportableDay = useMemo(() => getNextColportableDay(selectedDateObj), [selectedDateObj]);
  const today = useMemo(() => new Date(), []);
  const isToday = selectedDate === getCurrentDate();

  useEffect(() => {
    const loadData = async () => {
      try {
        !wereBooksLoaded && await fetchBooks();
        !wasProgramFetched && await fetchProgram();
        !werePeopleFetched && await fetchPeople();
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        // Add a small delay to ensure the loading screen is visible
        setTimeout(() => setIsLoading(false), 800);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchUsers, fetchBooks, fetchProgram, fetchPeople, wereUsersFetched, wereBooksLoaded, wasProgramFetched, werePeopleFetched]);

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

  const leaders = people.filter(person => person.personType === 'LEADER');
  const colporters = people.filter(person => person.personType === 'COLPORTER');

  const filteredLeaders = leaders.filter((leader) =>
    leader.name.toLowerCase().includes(leaderSearch.toLowerCase()) ||
    leader.apellido.toLocaleLowerCase().includes(leaderSearch.toLowerCase())
  );

  const filteredColporters = colporters.filter((colporter) =>
    colporter.name.toLowerCase().includes(colporterSearch.toLowerCase()) ||
    colporter.apellido.toLocaleLowerCase().includes(colporterSearch.toLowerCase())
  );

  const total = cash + checks + atmMobile + paypal;
  const totalBooks = Object.values(bookQuantities).reduce((sum, qty) => sum + qty, 0);

  // Calculate total value of books
  useEffect(() => {
    let total = 0;
    activeBooks.forEach(book => {
      const quantity = bookQuantities[book.id] || 0;
      total += book.price * quantity;
    });
    setBookTotal(total);
  }, [bookQuantities]);

  const formattedDate = selectedDateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeader || !selectedColporter) return;
    
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    setIsLoading(true);
    try {
      // Use the consistent date format for today
      const todayFormatted = getCurrentDate();
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
        date: selectedDate,
        books: Object.entries(bookQuantities)
          .filter(([_, quantity]) => quantity > 0)
          .map(([id, quantity]) => {
            const book = books.find(b => Number(b.id) === Number(id));
            return {
              id,
              quantity,
              title: book?.title || '',
              price: book?.price || 0,
              size: book?.size || (book?.price && book.price >= 20 ? BookSize.LARGE : BookSize.SMALL),
            };
          }),
      });

      setSuccess(t('transactions.successCreated'));

      if (stayOnPage) {
        // Reset form for a new transaction
        setSelectedColporter(null);
        setColporterSearch('');
        setCash(0);
        setChecks(0);
        setAtmMobile(0);
        setPaypal(0);
        setBookQuantities({});
        
        // Keep success message visible for 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        // Navigate after a short delay to show the success message
        setTimeout(() => navigate('/transactions'), 1500);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      setError(error instanceof Error ? error.message : t('transactions.errorCreating'));
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
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

  // If loading, show loading screen
  if (isLoading) {
    return (
      <LoadingScreen message={t('transactions.preparingTransactionForm')} />
    );
  }
  
  // If selected date is not a colportable day, show restriction screen
  if (!isSelectedDateColportable) {
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
              {t('transactions.nonColportableDay')}
            </h2>
            
            <p className="text-gray-600 max-w-lg mb-6">
              {t('transactions.nonColportableDayMessage')}
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8 w-full max-w-md">
              <p className="text-sm text-gray-700 mb-2">
                <strong>{t('transactions.nextColportableDay')}</strong>
              </p>
              <p className="text-lg font-medium text-primary-700">
                {nextColportableDay.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC'
                })}
              </p>
            </div>
            
            <div className="space-y-4 w-full max-w-md">
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/transactions')}
                  leftIcon={<ChevronRight size={16} className="rotate-180" />}
                >
                  {t('transactions.returnToTransactions')}
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/settings')}
                  leftIcon={<Settings size={16} />}
                >
                  {t('programSettings.title')}
                </Button>
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
            {!isToday && (
              <Badge variant="warning" size="sm">
                {t('transactions.pastDate')}
              </Badge>
            )}
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
            <span className="text-gray-600">{t('transactions.stayOnPage')}</span>
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
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-danger-700">
            <p className="font-medium">{t('common.error')}</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-success-700">
            <p className="font-medium">{t('common.success')}</p>
            <p>{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Date Selection */}
          <div className="md:col-span-2">
            <Card>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t('transactions.transactionDate')}
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={getCurrentDate()}
                    className="w-auto"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(getCurrentDate())}
                    disabled={isToday}
                  >
                    {t('transactions.today')}
                  </Button>
                </div>
                
                {!isSelectedDateColportable && (
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="text-warning-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="text-sm text-warning-700">
                      <p className="font-medium">
                        {t('transactions.nonColportableDay')}
                      </p>
                      <p>
                        {t('transactions.nonColportableDayMessage')}
                      </p>
                    </div>
                  </div>
                )}
                
                {!isToday && isSelectedDateColportable && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <Calendar className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">{t('transactions.pastDateTransaction')}</p>
                      <p>{t('transactions.pastDateTransactionDescription')}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Leader Selection */}
          <div className="relative" ref={leaderDropdownRef}>
            <Card className="overflow-visible">
              <div className="space-y-3 sm:space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.leader')} ({t('transactions.todaySupervisor')})
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
                        placeholder={t('transactions.selectLeaderPlaceholder')}
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
                              <div className="font-medium text-sm">{leader.name} {leader.apellido}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {t('transactions.noLeadersFound')}
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
                  {t('common.student')} ({t('common.colporter')})
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
                        placeholder={t('transactions.selectColporterPlaceholder')}
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
                              <div className="font-medium text-sm">{colporter.name} {colporter.apellido}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {t('transactions.noColportersFound')}
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
          <Card title={t('inventory.books')} icon={<BookText size={20} />}>
            <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {activeBooks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">{t('transactions.noActiveBooks')}</p>
                </div>
              ) : (
                activeBooks.map((book) => (
                  <div key={book.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{book.title}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">${Number(book.price).toFixed(2)}</p>
                        <Badge 
                          variant={book.size === BookSize.LARGE ? "primary" : "success"}
                          size="sm"
                        >
                          {book.size === BookSize.LARGE ? t('inventory.size.large') : t('inventory.size.small')}
                        </Badge>
                      </div>
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
                <div>
                  <span className="font-medium text-gray-700">{t('transactions.totalBooks')}</span>
                  <span className="text-sm text-gray-500 ml-2">({totalBooks})</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="primary" size="lg">${bookTotal.toFixed(2)}</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card title={t('deposits.title')} icon={<DollarSign size={20} />}>
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
            isLoading={isSubmitting}
            disabled={!selectedLeader || !selectedColporter || total <= 0 || totalBooks <= 0 || isSubmitting}
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