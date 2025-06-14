import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  ChevronDown, 
  X, 
  AlertTriangle,
  Download,
  User,
  Users,
  Check,
  Printer,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { useUserStore } from '../../stores/userStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useChargeStore } from '../../stores/chargeStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { useProgramStore } from '../../stores/programStore';

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
  advances: Array<{
    id: string;
    date: string;
    amount: number;
    weekStartDate: string;
    weekEndDate: string;
    status: string;
  }>;
  totalEarnings: number;
  totalCharges: number;
  totalAdvances: number;
  netAmount: number;
}

const IndividualReports: React.FC = () => {
  const { t } = useTranslation();
  const { fetchUsers, getLeaders, getColporters, fetchPeople } = useUserStore();
  const { transactions, fetchAllTransactions } = useTransactionStore();
  const { charges, fetchCharges } = useChargeStore();
  const { advances, fetchAdvances } = useCashAdvanceStore();
  const { program, fetchProgram } = useProgramStore();

  // Form state
  const [personType, setPersonType] = useState<'COLPORTER' | 'LEADER'>('COLPORTER');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Person selection state
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null);
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const personDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchUsers(),
          fetchPeople(),
          fetchCharges(),
          fetchAdvances(),
          fetchProgram()
        ]);
      } catch (err) {
        setError('Failed to load initial data');
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [fetchUsers, fetchPeople, fetchCharges, fetchAdvances, fetchProgram]);

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

  const filteredPeople = React.useMemo(() => {
    const peopleList = personType === 'COLPORTER' ? getColporters() : getLeaders();
    return peopleList.filter((person) =>
      person.name.toLowerCase().includes(personSearch.toLowerCase()) ||
      person.apellido.toLowerCase().includes(personSearch.toLowerCase())
    );
  }, [personType, personSearch, getColporters, getLeaders]);

  const handlePersonTypeChange = (newType: 'COLPORTER' | 'LEADER') => {
    setPersonType(newType);
    setSelectedPerson(null);
    setPersonSearch('');
    setReportData(null);
  };

  const generateDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dateArray = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dateArray.push(date.toISOString().split('T')[0]);
    }
    
    return dateArray;
  };

  const generateReport = async () => {
    if (!selectedPerson || !startDate || !endDate) {
      setError('Please select a person and date range');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      await fetchAllTransactions('APPROVED');
      await fetchCharges();
      await fetchAdvances();
      
      const dateRange = generateDateRange(startDate, endDate);
      
      const personTransactions = transactions.filter(t => {
        const isInDateRange = new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate);
        const isForPerson = personType === 'COLPORTER' 
          ? t.studentId === selectedPerson.id 
          : t.leaderId === selectedPerson.id;
        
        return isInDateRange && isForPerson;
      });
      
      console.log('Filtered transactions:', personTransactions.length);
      
      const personCharges = charges.filter(c => 
        c.personId === selectedPerson.id &&
        new Date(c.date) >= new Date(startDate) &&
        new Date(c.date) <= new Date(endDate) &&
        c.status === 'APPLIED'
      );
      
      const personAdvances = advances.filter(a => 
        a.personId === selectedPerson.id &&
        new Date(a.weekStartDate) >= new Date(startDate) &&
        new Date(a.weekEndDate) <= new Date(endDate) &&
        a.status === 'APPROVED'
      );
      
      const percentage = personType === 'COLPORTER'
        ? (program?.financialConfig?.colporter_percentage 
            ? parseFloat(program.financialConfig.colporter_percentage) 
            : 50)
        : (program?.financialConfig?.leader_percentage 
            ? parseFloat(program.financialConfig.leader_percentage) 
            : 15);
      
      const dailyEarnings: Record<string, number> = {};
      dateRange.forEach(date => {
        const dayTransactions = personTransactions.filter(t => {
          const transactionDate = new Date(t.date).toISOString().split('T')[0];
          return transactionDate === date;
        });
        const dayTotal = dayTransactions.reduce((sum, t) => sum + t.total, 0);
        dailyEarnings[date] = dayTotal;
      });

      const totalEarnings = Object.values(dailyEarnings).reduce((sum, amount) => sum + amount, 0);
      const totalCharges = personCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const totalAdvances = personAdvances.reduce((sum, advance) => sum + advance.advanceAmount, 0);
      const netAmount = (totalEarnings * (percentage / 100)) - totalCharges - totalAdvances;

      console.log('Report data:', {
        totalEarnings,
        totalCharges,
        totalAdvances,
        netAmount,
        dailyEarningsCount: Object.keys(dailyEarnings).length,
        chargesCount: personCharges.length,
        advancesCount: personAdvances.length,
        percentage
      });

      const report: ReportData = {
        personId: selectedPerson.id,
        personName: selectedPerson.name,
        personType,
        startDate,
        endDate,
        dailyEarnings,
        charges: personCharges.map(charge => ({
          id: charge.id,
          date: charge.date,
          amount: charge.amount,
          reason: charge.reason,
          category: charge.category,
          status: charge.status,
        })),
        advances: personAdvances.map(advance => ({
          id: advance.id,
          date: advance.requestDate,
          amount: advance.advanceAmount,
          weekStartDate: advance.weekStartDate,
          weekEndDate: advance.weekEndDate,
          status: advance.status,
        })),
        totalEarnings,
        totalCharges,
        totalAdvances,
        netAmount,
      };

      setReportData(report);
      setSuccess('Report generated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
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
      
      if (currentDate.getDay() === 1 || index === 0) {
        if (currentWeek.length > 0) {
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

  const printReport = () => {
    if (!reportData) return;
    
    const percentage = reportData.personType === 'COLPORTER'
      ? (program?.financialConfig?.colporter_percentage 
          ? parseFloat(program.financialConfig.colporter_percentage) 
          : 50)
      : (program?.financialConfig?.leader_percentage 
          ? parseFloat(program.financialConfig.leader_percentage) 
          : 15);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the report');
      return;
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Individual Report - ${reportData.personName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #0052B4; text-align: center; }
          h2 { color: #333; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #0052B4; color: white; }
          .total { font-weight: bold; background-color: #f0f0f0; }
          .summary { margin-top: 30px; border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9; }
          .charges { color: #dc2626; }
          .advances { color: #9333ea; }
          .earnings { color: #0052B4; }
          .net { color: #059669; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Individual Financial Report</h1>
        <div>
          <p><strong>Name:</strong> ${reportData.personName}</p>
          <p><strong>Type:</strong> ${reportData.personType}</p>
          <p><strong>Period:</strong> ${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(reportData.endDate).toLocaleDateString()}</p>
        </div>
        
        <h2>Weekly Earnings</h2>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${groupEarningsByWeeks(reportData.dailyEarnings).map(week => `
              <tr>
                <td>${week.weekLabel}</td>
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                  const dayData = week.days.find(d => d.dayName === day);
                  return `<td>${dayData ? '$' + dayData.amount.toFixed(2) : ''}</td>`;
                }).join('')}
                <td class="total">$${week.weekTotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total">
              <td>Total</td>
              ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                const total = groupEarningsByWeeks(reportData.dailyEarnings)
                  .reduce((sum, week) => {
                    const dayData = week.days.find(d => d.dayName === day);
                    return sum + (dayData ? dayData.amount : 0);
                  }, 0);
                return `<td>${total > 0 ? '$' + total.toFixed(2) : ''}</td>`;
              }).join('')}
              <td>$${reportData.totalEarnings.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        ${reportData.charges.length > 0 ? `
          <h2>Charges</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.charges.map(charge => `
                <tr>
                  <td>${new Date(charge.date).toLocaleDateString()}</td>
                  <td>${charge.reason}</td>
                  <td>${charge.category}</td>
                  <td class="charges">-$${charge.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total">
                <td colspan="3">Total Charges</td>
                <td class="charges">-$${reportData.totalCharges.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}
        
        ${reportData.advances.length > 0 ? `
          <h2>Cash Advances</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Week Period</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.advances.map(advance => `
                <tr>
                  <td>${new Date(advance.date).toLocaleDateString()}</td>
                  <td>${new Date(advance.weekStartDate).toLocaleDateString()} - ${new Date(advance.weekEndDate).toLocaleDateString()}</td>
                  <td class="advances">-$${advance.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total">
                <td colspan="2">Total Advances</td>
                <td class="advances">-$${reportData.totalAdvances.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}
        
        <div class="summary">
          <h2>Summary</h2>
          <p><span class="earnings">Total Sales: $${reportData.totalEarnings.toFixed(2)}</span></p>
          <p><span class="earnings">Earnings (${percentage}%): $${(reportData.totalEarnings * (percentage / 100)).toFixed(2)}</span></p>
          <p><span class="charges">Total Charges: -$${reportData.totalCharges.toFixed(2)}</span></p>
          <p><span class="advances">Total Advances: -$${reportData.totalAdvances.toFixed(2)}</span></p>
          <p><span class="net">Net Amount: $${reportData.netAmount.toFixed(2)}</span></p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const exportReportCSV = () => {
    if (!reportData) return;
    
    const percentage = reportData.personType === 'COLPORTER'
      ? (program?.financialConfig?.colporter_percentage 
          ? parseFloat(program.financialConfig.colporter_percentage) 
          : 50)
      : (program?.financialConfig?.leader_percentage 
          ? parseFloat(program.financialConfig.leader_percentage) 
          : 15);
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "Individual Financial Report\r\n";
    csvContent += `Name,${reportData.personName}\r\n`;
    csvContent += `Type,${reportData.personType}\r\n`;
    csvContent += `Period,${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(reportData.endDate).toLocaleDateString()}\r\n\r\n`;
    
    csvContent += "Weekly Earnings\r\n";
    csvContent += "Week,Mon,Tue,Wed,Thu,Fri,Sat,Total\r\n";
    
    groupEarningsByWeeks(reportData.dailyEarnings).forEach(week => {
      csvContent += `${week.weekLabel},`;
      
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        const dayData = week.days.find(d => d.dayName === day);
        csvContent += `${dayData ? dayData.amount.toFixed(2) : ''},`;
      });
      
      csvContent += `${week.weekTotal.toFixed(2)}\r\n`;
    });
    
    csvContent += "\r\n";
    
    if (reportData.charges.length > 0) {
      csvContent += "Charges\r\n";
      csvContent += "Date,Reason,Category,Amount\r\n";
      
      reportData.charges.forEach(charge => {
        csvContent += `${new Date(charge.date).toLocaleDateString()},${charge.reason},${charge.category},-${charge.amount.toFixed(2)}\r\n`;
      });
      
      csvContent += `Total Charges,,-,${reportData.totalCharges.toFixed(2)}\r\n\r\n`;
    }
    
    if (reportData.advances.length > 0) {
      csvContent += "Cash Advances\r\n";
      csvContent += "Date,Week Period,Amount\r\n";
      
      reportData.advances.forEach(advance => {
        csvContent += `${new Date(advance.date).toLocaleDateString()},${new Date(advance.weekStartDate).toLocaleDateString()} - ${new Date(advance.weekEndDate).toLocaleDateString()},-${advance.amount.toFixed(2)}\r\n`;
      });
      
      csvContent += `Total Advances,,-${reportData.totalAdvances.toFixed(2)}\r\n\r\n`;
    }
    
    csvContent += "Summary\r\n";
    csvContent += `Total Sales,,${reportData.totalEarnings.toFixed(2)}\r\n`;
    csvContent += `Earnings (${percentage}%),,${(reportData.totalEarnings * (percentage / 100)).toFixed(2)}\r\n`;
    csvContent += `Total Charges,,-${reportData.totalCharges.toFixed(2)}\r\n`;
    csvContent += `Total Advances,,-${reportData.totalAdvances.toFixed(2)}\r\n`;
    csvContent += `Net Amount,,${reportData.netAmount.toFixed(2)}\r\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportData.personName}_Report_${reportData.startDate}_${reportData.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

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

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-danger-700">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <Check className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-success-700">
            <p className="font-medium">Success</p>
            <p>{success}</p>
          </div>
        </div>
      )}

      <Card title="Generate Report" icon={<FileText size={20} />}>
        <div className="space-y-6">
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
                          setSelectedPerson({ 
                            id: person.id, 
                            name: `${person.name} ${person.apellido}`
                          });
                          setPersonSearch('');
                          setIsPersonDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium text-sm">{person.name} {person.apellido}</div>
                        <div className="text-xs text-gray-500">{person.email}</div>
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

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={generateReport}
              disabled={!selectedPerson || !startDate || !endDate || isGenerating}
              isLoading={isGenerating}
              leftIcon={<FileText size={18} />}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </Card>

      {reportData && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              leftIcon={<Printer size={18} />}
              onClick={printReport}
            >
              Print Report
            </Button>
            <Button
              variant="outline"
              leftIcon={<Download size={18} />}
              onClick={exportReportCSV}
            >
              Export CSV
            </Button>
            {personType === 'COLPORTER' && (
              <Button
                variant="primary"
                leftIcon={<ChevronRight size={18} />}
                onClick={() => window.open(`/reports/colporter/${reportData.personName}`, '_blank')}
              >
                View Detailed Report
              </Button>
            )}
            {personType === 'LEADER' && (
              <Button
                variant="primary"
                leftIcon={<ChevronRight size={18} />}
                onClick={() => window.open(`/reports/leader/${reportData.personName}`, '_blank')}
              >
                View Team Report
              </Button>
            )}
          </div>

          <Card>
            <div className="bg-white border border-gray-300">
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

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm font-bold">
                        Program Week
                      </th>
                      <th colSpan={6} className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-sm font-bold">
                        Donations Received
                      </th>
                      <th className="border border-gray-400 bg-primary-600 px-3 py-2 text-center text-sm font-bold text-white">
                        Weekly Total
                      </th>
                      <th colSpan={reportData.charges.length || 1} className="border border-gray-400 bg-red-600 px-3 py-2 text-center text-sm font-bold text-white">
                        Charges
                      </th>
                      <th colSpan={reportData.advances.length || 1} className="border border-gray-400 bg-purple-600 px-3 py-2 text-center text-sm font-bold text-white">
                        Advances
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium"></th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Mon</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Tue</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Wed</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Thu</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Fri</th>
                      <th className="border border-gray-400 bg-gray-100 px-3 py-2 text-center text-xs font-medium">Sat</th>
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
                      {reportData.advances.map((advance, index) => (
                        <th key={advance.id} className="border border-gray-400 bg-purple-600 px-3 py-2 text-center text-xs font-medium text-white min-w-[100px]">
                          <div className="flex flex-col">
                            <span className="text-[10px]">{new Date(advance.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</span>
                            <span className="text-[9px] truncate">{`${new Date(advance.weekStartDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} - ${new Date(advance.weekEndDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}`}</span>
                          </div>
                        </th>
                      ))}
                      {reportData.advances.length === 0 && (
                        <th className="border border-gray-400 bg-purple-600 px-3 py-2 text-center text-xs font-medium text-white">
                          No Advances
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
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => {
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
                        {reportData.advances.map((advance) => (
                          <td key={advance.id} className="border border-gray-400 px-3 py-2 text-center text-sm bg-purple-50">
                            -{advance.amount.toFixed(2)}
                          </td>
                        ))}
                        {reportData.advances.length === 0 && (
                          <td className="border border-gray-400 px-3 py-2 text-center text-sm bg-purple-50">
                            -
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-400 px-3 py-2 text-sm font-bold">
                        {personType === 'COLPORTER' ? 'Student' : 'Leader'} Total
                      </td>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => {
                        const dayTotal = groupEarningsByWeeks(reportData.dailyEarnings)
                          .reduce((sum, week) => {
                            const dayData = week.days.find(d => d.dayName === dayName);
                            return sum + (dayData ? dayData.amount : 0);
                          }, 0);
                        return (
                          <td key={dayName} className="border border-gray-400 px-3 py-2 text-center text-sm font-bold">
                            {dayTotal > 0 ? dayTotal.toFixed(2) : ''}
                          </td>
                        );
                      })}
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-primary-200 text-primary-900">
                        {reportData.totalEarnings.toFixed(2)}
                      </td>
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
                      {reportData.advances.map((advance) => (
                        <td key={advance.id} className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-purple-100">
                          -{advance.amount.toFixed(2)}
                        </td>
                      ))}
                      {reportData.advances.length === 0 && (
                        <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-purple-100">
                          -
                        </td>
                      )}
                    </tr>
                    <tr className="bg-success-100 font-bold">
                      <td colSpan={7} className="border border-gray-400 px-3 py-2 text-sm font-bold text-success-800">
                        NET TOTAL (After Charges & Advances)
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-success-200 text-success-900">
                        {reportData.netAmount.toFixed(2)}
                      </td>
                      <td colSpan={reportData.charges.length || 1} className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-success-200 text-success-900">
                        -{reportData.totalCharges.toFixed(2)}
                      </td>
                      <td colSpan={reportData.advances.length || 1} className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-success-200 text-success-900">
                        -{reportData.totalAdvances.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

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

          {reportData.advances.length > 0 && (
            <Card title="Cash Advances" icon={<Wallet size={20} />}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Week Period
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.advances.map((advance) => (
                      <tr key={advance.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(advance.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(advance.weekStartDate).toLocaleDateString()} - {new Date(advance.weekEndDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <Badge variant="success">{advance.status}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                          -{formatCurrency(advance.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-purple-50">
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-purple-900">
                        TOTAL ADVANCES
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-900">
                        -{formatCurrency(reportData.totalAdvances)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          <Card title="Report Summary" icon={<FileText size={20} />}>
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary-900 mb-2">
                  {reportData.personName} - {personType} Report
                </h3>
                <p className="text-sm text-primary-700 mb-4">
                  Period: {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-xl font-bold text-success-600">
                      {formatCurrency(reportData.totalEarnings)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Gross amount
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Earnings ({personType === 'COLPORTER' 
                        ? program?.financialConfig?.colporter_percentage || 50
                        : program?.financialConfig?.leader_percentage || 15}%)</p>
                    <p className="text-xl font-bold text-primary-600">
                      {formatCurrency(reportData.totalEarnings * (
                        personType === 'COLPORTER' 
                          ? (program?.financialConfig?.colporter_percentage 
                              ? parseFloat(program.financialConfig.colporter_percentage) / 100 
                              : 0.5)
                          : (program?.financialConfig?.leader_percentage 
                              ? parseFloat(program.financialConfig.leader_percentage) / 100 
                              : 0.15)
                      ))}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      After percentage applied
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Charges</p>
                    <p className="text-xl font-bold text-danger-600">
                      -{formatCurrency(reportData.totalCharges)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {reportData.charges.length} applied charges
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Advances</p>
                    <p className="text-xl font-bold text-purple-600">
                      -{formatCurrency(reportData.totalAdvances)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {reportData.advances.length} approved advances
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 bg-white rounded-lg p-4 border-2 border-primary-200 max-w-md mx-auto">
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className={clsx(
                    "text-2xl font-bold",
                    reportData.netAmount >= 0 ? "text-success-600" : "text-danger-600"
                  )}>
                    {formatCurrency(reportData.netAmount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Final amount after percentage, charges, and advances
                  </p>
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