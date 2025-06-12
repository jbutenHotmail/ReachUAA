import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  ChevronDown, 
  X, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  Download,
  User,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useUserStore } from '../../stores/userStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useChargeStore } from '../../stores/chargeStore';

interface ReportData {
  personId: string;
  personName: string;
  personType: 'COLPORTER' | 'LEADER';
  startDate: string;
  endDate: string;
  dailyEarnings: Record<string, number>;
  charges: Array<{
    id: string;
    date: string;
    amount: number;
    reason: string;
    category: string;
    status: string;
  }>;
  totalEarnings: number;
  totalCharges: number;
  netAmount: number;
}

const IndividualReports: React.FC = () => {
  const { t } = useTranslation();
  const { users, fetchUsers, getLeaders, getColporters } = useUserStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { charges, fetchCharges } = useChargeStore();

  // Form state
  const [personType, setPersonType] = useState<'COLPORTER' | 'LEADER'>('COLPORTER');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Person selection state
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null);
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const personDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
    fetchCharges();
  }, [fetchUsers, fetchCharges]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(event.target as Node)) {
        setIsPersonDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const people = personType === 'COLPORTER' ? getColporters() : getLeaders();
  
  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const handlePersonTypeChange = (newType: 'COLPORTER' | 'LEADER') => {
    setPersonType(newType);
    setSelectedPerson(null);
    setPersonSearch('');
    setReportData(null);
  };

  const generateDateRange = (start: string, end: string) => {
    const dates = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip Sundays (day 0) as they are typically rest days
      if (d.getDay() !== 0) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  const generateReport = async () => {
    if (!selectedPerson || !startDate || !endDate) return;

    setIsGenerating(true);
    try {
      // Fetch transactions for the date range
      const dateRange = generateDateRange(startDate, endDate);
      const allTransactions = [];
      
      // In a real app, you'd make a single API call with date range
      for (const date of dateRange) {
        await fetchTransactions(date);
        allTransactions.push(...transactions);
      }

      // Filter transactions for the selected person
      const personTransactions = allTransactions.filter(t => {
        if (personType === 'COLPORTER') {
          return t.studentId === selectedPerson.id;
        } else {
          return t.leaderId === selectedPerson.id;
        }
      });

      // Calculate daily earnings
      const dailyEarnings: Record<string, number> = {};
      dateRange.forEach(date => {
        const dayTransactions = personTransactions.filter(t => t.date === date);
        const dayTotal = dayTransactions.reduce((sum, t) => sum + t.total, 0);
        
        // Calculate earnings based on person type
        if (personType === 'COLPORTER') {
          dailyEarnings[date] = dayTotal * 0.5; // 50% for colporters
        } else {
          // For leaders, calculate based on their team's performance
          const leaderEarnings = dayTransactions.reduce((sum, t) => {
            return sum + (t.total * 0.1); // 10% for leaders
          }, 0);
          dailyEarnings[date] = leaderEarnings;
        }
      });

      // Filter charges for the selected person and date range
      const personCharges = charges.filter(charge => {
        return charge.personId === selectedPerson.id &&
               charge.date >= startDate &&
               charge.date <= endDate &&
               charge.status === 'APPLIED';
      }).map(charge => ({
        id: charge.id,
        date: charge.date,
        amount: charge.amount,
        reason: charge.reason,
        category: charge.category,
        status: charge.status,
      }));

      // Calculate totals
      const totalEarnings = Object.values(dailyEarnings).reduce((sum, amount) => sum + amount, 0);
      const totalCharges = personCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const netAmount = totalEarnings - totalCharges;

      const report: ReportData = {
        personId: selectedPerson.id,
        personName: selectedPerson.name,
        personType,
        startDate,
        endDate,
        dailyEarnings,
        charges: personCharges,
        totalEarnings,
        totalCharges,
        netAmount,
      };

      setReportData(report);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      'FINE': 'danger',
      'DEDUCTION': 'warning',
      'PENALTY': 'danger',
      'OTHER': 'secondary'
    } as const;
    
    return <Badge variant={variants[category as keyof typeof variants] || 'secondary'}>{category}</Badge>;
  };

  // Group daily earnings by weeks
  const groupEarningsByWeeks = (dailyEarnings: Record<string, number>) => {
    const weeks: Array<{
      weekLabel: string;
      days: Array<{ date: string; dayName: string; amount: number }>;
      weekTotal: number;
    }> = [];

    const sortedDates = Object.keys(dailyEarnings).sort();
    let currentWeek: Array<{ date: string; dayName: string; amount: number }> = [];
    let weekStartDate = '';

    sortedDates.forEach((date, index) => {
      const currentDate = new Date(date);
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Start a new week on Monday or if it's the first date
      if (currentDate.getDay() === 1 || index === 0) {
        if (currentWeek.length > 0) {
          // Save the previous week
          const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0);
          const endDate = currentWeek[currentWeek.length - 1].date;
          weeks.push({
            weekLabel: `${new Date(weekStartDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} thru ${new Date(endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}`,
            days: [...currentWeek],
            weekTotal,
          });
        }
        currentWeek = [];
        weekStartDate = date;
      }

      currentWeek.push({
        date,
        dayName,
        amount: dailyEarnings[date] || 0,
      });
    });

    // Add the last week
    if (currentWeek.length > 0) {
      const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0);
      const endDate = currentWeek[currentWeek.length - 1].date;
      weeks.push({
        weekLabel: `${new Date(weekStartDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} thru ${new Date(endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}`,
        days: [...currentWeek],
        weekTotal,
      });
    }

    return weeks;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-primary-600" size={28} />
          Individual Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate detailed financial reports for individual colporters and leaders
        </p>
      </div>

      {/* Report Generation Form */}
      <Card title="Generate Report" icon={<FileText size={20} />}>
        <div className="space-y-6">
          {/* Person Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Type
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handlePersonTypeChange('COLPORTER')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                  personType === 'COLPORTER'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200'
                )}
              >
                <User size={18} />
                Colporter Report
              </button>
              <button
                type="button"
                onClick={() => handlePersonTypeChange('LEADER')}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                  personType === 'LEADER'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200'
                )}
              >
                <Users size={18} />
                Leader Report
              </button>
            </div>
          </div>

          {/* Person Selection */}
          <div className="relative" ref={personDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select {personType === 'COLPORTER' ? 'Colporter' : 'Leader'}
            </label>
            <div
              className={clsx(
                'relative border border-gray-300 rounded-md shadow-sm',
                isPersonDropdownOpen && 'ring-2 ring-primary-500 ring-opacity-50'
              )}
            >
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder={`Search ${personType.toLowerCase()}...`}
                  value={personSearch}
                  onChange={(e) => {
                    setPersonSearch(e.target.value);
                    setIsPersonDropdownOpen(true);
                    setSelectedPerson(null);
                  }}
                  onFocus={() => setIsPersonDropdownOpen(true)}
                  className="w-full px-3 py-2 rounded-md border-0 focus:outline-none text-sm"
                />
                <button
                  type="button"
                  className="pr-2 flex items-center"
                  onClick={() => setIsPersonDropdownOpen(!isPersonDropdownOpen)}
                >
                  <ChevronDown
                    className={clsx(
                      'w-5 h-5 text-gray-400 transition-transform duration-200',
                      isPersonDropdownOpen && 'transform rotate-180'
                    )}
                  />
                </button>
              </div>
              {selectedPerson && (
                <div className="px-3 py-2 border-t border-gray-200 bg-primary-50">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-primary-900 text-sm">
                      {selectedPerson.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPerson(null);
                        setPersonSearch('');
                        setReportData(null);
                      }}
                      className="p-1 hover:bg-primary-100 rounded-full"
                    >
                      <X className="w-4 h-4 text-primary-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            {isPersonDropdownOpen && !selectedPerson && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        onClick={() => {
                          setSelectedPerson({ id: person.id, name: person.name });
                          setPersonSearch('');
                          setIsPersonDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium text-sm">{person.name}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No {personType.toLowerCase()}s found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={generateReport}
              disabled={!selectedPerson || !startDate || !endDate}
              isLoading={isGenerating}
              leftIcon={<FileText size={18} />}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Daily Earnings Table - Styled like the image */}
          <Card>
            <div className="bg-white border border-gray-300">
              {/* Header */}
              <div className="bg-gray-100 border-b border-gray-300 p-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {personType === 'COLPORTER' ? 'Student' : 'Leader'} Donation and Advance Summary
                  </h2>
                  <div className="text-sm text-gray-600">
                    <p>Program Location: Reach UAA</p>
                    <p className="mt-1">Current thru: {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg font-semibold">Name: {reportData.personName.toUpperCase()}</p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm font-bold">
                        Program Week
                      </th>
                      <th colSpan={5} className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm font-bold">
                        Donations Received
                      </th>
                      <th className="border border-gray-400 bg-primary-600 px-3 py-2 text-center text-sm font-bold text-white">
                        Weekly Total
                      </th>
                      <th colSpan={reportData.charges.length || 1} className="border border-gray-400 bg-red-600 px-3 py-2 text-center text-sm font-bold text-white">
                        Charges
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium"></th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Sun</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Mon</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Tue</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Wed</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Thu</th>
                      <th className="border border-gray-400 bg-primary-600 px-3 py-2 text-center text-xs font-medium text-white"></th>
                      {reportData.charges.map((charge, index) => (
                        <th key={charge.id} className="border border-gray-400 bg-red-600 px-3 py-2 text-center text-xs font-medium text-white min-w-[100px]">
                          <div className="flex flex-col">
                            <span className="text-[10px]">{new Date(charge.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</span>
                            <span className="text-[9px] truncate">{charge.reason}</span>
                          </div>
                        </th>
                      ))}
                      {reportData.charges.length === 0 && (
                        <th className="border border-gray-400 bg-red-600 px-3 py-2 text-center text-xs font-medium text-white">
                          No Charges
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {groupEarningsByWeeks(reportData.dailyEarnings).map((week, weekIndex) => (
                      <tr key={weekIndex}>
                        <td className="border border-gray-400 px-3 py-2 text-sm font-medium bg-gray-50">
                          {weekIndex + 1}) {week.weekLabel}
                        </td>
                        {/* Days of the week */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((dayName) => {
                          const dayData = week.days.find(d => d.dayName === dayName);
                          return (
                            <td key={dayName} className="border border-gray-400 px-3 py-2 text-center text-sm">
                              {dayData ? dayData.amount.toFixed(2) : ''}
                            </td>
                          );
                        })}
                        <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-primary-100 text-primary-900">
                          {week.weekTotal.toFixed(2)}
                        </td>
                        {/* Charges columns */}
                        {reportData.charges.map((charge) => (
                          <td key={charge.id} className="border border-gray-400 px-3 py-2 text-center text-sm bg-red-50">
                            -{charge.amount.toFixed(2)}
                          </td>
                        ))}
                        {reportData.charges.length === 0 && (
                          <td className="border border-gray-400 px-3 py-2 text-center text-sm bg-red-50">
                            -
                          </td>
                        )}
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-400 px-3 py-2 text-sm font-bold">
                        {personType === 'COLPORTER' ? 'Student' : 'Leader'} Total
                      </td>
                      {/* Calculate totals for each day */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((dayName) => {
                        const dayTotal = groupEarningsByWeeks(reportData.dailyEarnings)
                          .reduce((sum, week) => {
                            const dayData = week.days.find(d => d.dayName === dayName);
                            return sum + (dayData ? dayData.amount : 0);
                          }, 0);
                        return (
                          <td key={dayName} className="border border-gray-400 px-3 py-2 text-center text-sm font-bold">
                            {dayTotal > 0 ? Number(dayTotal).toFixed(2) : ''}
                          </td>
                        );
                      })}
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-primary-200 text-primary-900">
                        {reportData.totalEarnings.toFixed(2)}
                      </td>
                      {/* Total charges */}
                      {reportData.charges.map((charge) => (
                        <td key={charge.id} className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-red-100">
                          -{charge.amount.toFixed(2)}
                        </td>
                      ))}
                      {reportData.charges.length === 0 && (
                        <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-red-100">
                          -
                        </td>
                      )}
                    </tr>
                    {/* Final Net Total Row */}
                    <tr className="bg-success-100 font-bold">
                      <td colSpan={6} className="border border-gray-400 px-3 py-2 text-sm font-bold text-success-800">
                        NET TOTAL (After Charges)
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-success-200 text-success-900">
                        {reportData.netAmount.toFixed(2)}
                      </td>
                      <td colSpan={reportData.charges.length || 1} className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-success-200 text-success-900">
                        -{reportData.totalCharges.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Charges Table */}
          {reportData.charges.length > 0 && (
            <Card title="Applied Charges" icon={<AlertTriangle size={20} />}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.charges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(charge.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {charge.reason}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {getCategoryBadge(charge.category)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-danger-600">
                          -{formatCurrency(charge.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50">
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-danger-900">
                        TOTAL CHARGES
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-danger-900">
                        -{formatCurrency(reportData.totalCharges)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* Final Summary */}
          <Card title="Report Summary" icon={<FileText size={20} />}>
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary-900 mb-2">
                  {reportData.personName} - {personType} Report
                </h3>
                <p className="text-sm text-primary-700 mb-4">
                  Period: {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="text-xl font-bold text-success-600">
                      {formatCurrency(reportData.totalEarnings)}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Charges</p>
                    <p className="text-xl font-bold text-danger-600">
                      -{formatCurrency(reportData.totalCharges)}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border-2 border-primary-200">
                    <p className="text-sm text-gray-600">Net Amount</p>
                    <p className={clsx(
                      "text-xl font-bold",
                      reportData.netAmount >= 0 ? "text-success-600" : "text-danger-600"
                    )}>
                      {formatCurrency(reportData.netAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default IndividualReports;