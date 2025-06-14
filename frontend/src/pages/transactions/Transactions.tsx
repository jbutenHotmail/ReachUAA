import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Calendar, DollarSign, BookText } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import DailyTransactions from '../../components/dashboard/DailyTransactions';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { clsx } from 'clsx';
import { useUserStore } from '../../stores/userStore';
import { getCurrentDate, formatDateToString } from '../../utils/dateUtils';

const Transactions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { people, fetchPeople } = useUserStore();
  const { transactions, isLoading, fetchTransactions } = useTransactionStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLeader, setSelectedLeader] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'finances' | 'delivered-books'>(() => {
    if (location.pathname === '/transactions/delivered-books') {
      return 'delivered-books';
    }
    return 'finances';
  });

  useEffect(() => {
    if (location.pathname === '/transactions') {
      navigate('/transactions/finances', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const newTab = location.pathname === '/transactions/delivered-books' ? 'delivered-books' : 'finances';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname, activeTab]);

  useEffect(() => {
    // Use the consistent date format
    const formattedDate = formatDateToString(selectedDate);
    console.log('Fetching transactions for date:', formattedDate);
    fetchTransactions(formattedDate);
    
  }, [fetchTransactions, selectedDate]);

  useEffect(() => {
    people && people.length > 0 && fetchPeople();

  }, [fetchPeople]);

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Filter out rejected transactions for leader totals and book counts
  const validTransactions = transactions.filter(t => t.status !== 'REJECTED');

  const leaderTotals = React.useMemo(() => {
    const totals = new Map();
    
    validTransactions.forEach(t => {
      const current = totals.get(t.leaderId) || {
        id: t.leaderId,
        name: t.leaderName,
        total: 0,
        transactions: 0
      };
      
      current.total += t.total;
      current.transactions += 1;
      totals.set(t.leaderId, current);
    });
    
    return Array.from(totals.values());
  }, [validTransactions]);

  const dayTotal = React.useMemo(() => {
    return validTransactions.reduce((sum, t) => Number(sum) + Number(t.total), 0);
  }, [validTransactions]);

  const filteredTransactions = React.useMemo(() => {
    if (!selectedLeader) return transactions;
    return transactions.filter(t => t.leaderId === selectedLeader);
  }, [transactions, selectedLeader]);

  // Calculate book totals from valid transactions
  const bookTotals = React.useMemo(() => {
    return validTransactions.reduce((acc, transaction) => {
      transaction.books?.forEach(book => {
        // Assuming books with price >= 20 are large books
        if (book.price >= 20) {
          acc.large += book.quantity;
        } else {
          acc.small += book.quantity;
        }
      });
      return acc;
    }, { large: 0, small: 0 });
  }, [validTransactions]);

  const tabs = [
    { id: 'finances', label: 'Finances', icon: <DollarSign size={18} />, path: '/transactions/finances' },
    { id: 'delivered-books', label: 'Delivered Books', icon: <BookText size={18} />, path: '/transactions/delivered-books' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.dailyTransactions')}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate(-1)}
                className="px-2"
              >
                <ChevronLeft size={20} />
              </Button>
              
              <div className="px-3 sm:px-4 py-2 flex items-center gap-2 border-l border-r border-gray-200">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-xs sm:text-sm font-medium">
                  {selectedDate.toLocaleDateString(undefined, { 
                    weekday: window.innerWidth < 640 ? 'short' : 'long', 
                    year: 'numeric', 
                    month: window.innerWidth < 640 ? 'short' : 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate(1)}
                className="px-2"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="w-full sm:w-auto"
            >
              Today
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {activeTab === 'finances' && (
            <select
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">{t('common.all')} {t('common.leader').toLowerCase()}s</option>
              {leaderTotals.map(leader => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="primary"
            leftIcon={<Plus size={18} />}
            onClick={() => navigate('/transactions/new')}
            className="w-full sm:w-auto"
          >
            New Transaction
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={clsx(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-3">
            {activeTab === 'finances' ? (
              <DailyTransactions 
                transactions={filteredTransactions} 
                date={formatDateToString(selectedDate)} 
              />
            ) : (
              <Card>
                {/* Books view */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0">
                          Colporter
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700">
                          Large Books
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600">
                          Small Books
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85]">
                          Total Books
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {validTransactions.map((transaction, index) => {
                        // Calculate book counts for this transaction
                        const largeBooks = transaction.books?.reduce((sum, book) => 
                          sum + (book.price >= 20 ? book.quantity : 0), 0) || 0;
                        const smallBooks = transaction.books?.reduce((sum, book) => 
                          sum + (book.price < 20 ? book.quantity : 0), 0) || 0;
                        const totalBooks = largeBooks + smallBooks;
                        
                        return (
                          <tr 
                            key={transaction.id}
                            className={index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white bg-[#0052B4] sticky left-0">
                              {transaction.studentName}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="primary">{largeBooks}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="success">{smallBooks}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="secondary">{totalBooks}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-white bg-[#0052B4] sticky left-0">
                          TOTALES
                        </td>
                        <td className="px-4 py-3 text-center bg-primary-900 text-white">
                          <Badge variant="primary" className="bg-white">
                            {bookTotals.large}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center bg-success-900 text-white">
                          <Badge variant="success" className="bg-white">
                            {bookTotals.small}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center bg-[#003D85] text-white">
                          <Badge variant="secondary" className="bg-white">
                            {bookTotals.large + bookTotals.small}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card title={t('common.totals')}>
              <div className="space-y-3 sm:space-y-4">
                {activeTab === 'finances' ? (
                  <>
                    {leaderTotals.map((leader) => (
                      <div 
                        key={leader.id}
                        className="flex justify-between items-center p-3 bg-primary-50 rounded-lg"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-primary-700 block truncate">{leader.name}</span>
                          <span className="text-xs text-primary-600 block">
                            {leader.transactions} {t('dashboard.dailyTransactions').toLowerCase()}
                          </span>
                        </div>
                        <Badge variant="primary" size="lg" className="ml-2 flex-shrink-0">
                          ${Number(leader.total).toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-t-2 border-blue-100 mt-4">
                      <span className="text-sm font-medium text-blue-700">{t('common.total')}</span>
                      <Badge variant="primary" size="lg">
                        ${Number(dayTotal).toFixed(2)}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                      <span className="text-sm font-medium text-primary-700">Large Books</span>
                      <Badge variant="primary" size="lg">{bookTotals.large}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
                      <span className="text-sm font-medium text-success-700">Small Books</span>
                      <Badge variant="success" size="lg">{bookTotals.small}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#0052B4] rounded-lg border-t-2 border-[#003D85]">
                      <span className="text-sm font-medium text-white">Total Books</span>
                      <Badge variant="primary" size="lg" className="bg-white text-[#0052B4]">
                        {bookTotals.large + bookTotals.small}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;