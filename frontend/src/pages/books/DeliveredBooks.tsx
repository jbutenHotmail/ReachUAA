import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { BookSize } from '../../types';

interface DeliveredBook {
  id: string;
  title: string;
  quantity: number;
  student: string;
  leader: string;
  date: string;
  price: number;
  size: string;
}

const mockData: DeliveredBook[] = [
  {
    id: '1',
    title: 'El Camino a Cristo',
    quantity: 3,
    student: 'Amy Buten',
    leader: 'Odrie Aponte',
    date: '2025-03-20',
    price: 15,
    size: 'LARGE',
  },
  {
    id: '2',
    title: 'El Deseado de Todas las Gentes',
    quantity: 2,
    student: 'Carlo Bravo',
    leader: 'Odrie Aponte',
    date: '2025-03-20',
    price: 25,
    size: 'SMALL',
  },
];

const DeliveredBooks: React.FC = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLeader, setSelectedLeader] = useState('');

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const leaders = [
    { id: '1', name: 'Odrie Aponte' },
    { id: '2', name: 'Another Leader' },
  ];

  // Calculate totals - only from APPROVED transactions
  const totals = mockData.reduce((acc, book) => {
    // Use the getBookSize function to determine if the book is large or small
    const bookSize = book.size;
    
    if (bookSize === BookSize.LARGE) {
      acc.large += book.quantity;
    } else {
      acc.small += book.quantity;
    }
    acc.total += book.quantity;
    return acc;
  }, { large: 0, small: 0, total: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('navigation.deliveredBooks')}</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate(-1)}
                className="px-2"
              >
                <ChevronLeft size={20} />
              </Button>
              
              <div className="px-4 py-2 flex items-center gap-2 border-l border-r border-gray-200">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium">
                  {selectedDate.toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: 'UTC'
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
            >
              Today
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedLeader}
            onChange={(e) => setSelectedLeader(e.target.value)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">{t('common.all')} {t('common.leader').toLowerCase()}s</option>
            {leaders.map(leader => (
              <option key={leader.id} value={leader.id}>
                {leader.name}
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('inventory.title')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('inventory.stock')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.student')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.leader')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('transactions.date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockData.map((book) => {
                    // Use the getBookSize function to determine if the book is large or small
                    const bookSize = book.size;
                    
                    return (
                      <tr key={book.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {book.title}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <Badge 
                            variant={bookSize === BookSize.LARGE ? "primary" : "success"} 
                            className="inline-flex justify-center min-w-[2.5rem]"
                          >
                            {book.quantity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {book.student}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {book.leader}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(book.date).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title={t('common.totals')}>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                <span className="text-sm font-medium text-primary-700">Libros Grandes</span>
                <Badge variant="primary" size="lg">{totals.large}</Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">Libros Pequeños</span>
                <Badge variant="success" size="lg">{totals.small}</Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">Total</span>
                <Badge variant="primary" size="lg">{totals.total}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DeliveredBooks;