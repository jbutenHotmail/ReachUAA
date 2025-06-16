import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDown, 
  X, 
  AlertTriangle,
  Download,
  FileText,
  Printer,
  Wallet
} from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useUserStore } from '../../stores/userStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useChargeStore } from '../../stores/chargeStore';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { useProgramStore } from '../../stores/programStore';
import { isColportableDay } from '../../utils/programUtils';

interface ReportData {
  personId: string;
  personName: string;
  personType: 'COLPORTER' | 'LEADER';
  startDate: string;
  endDate: string;
  dailyEarnings: Record<string, number>;
  totalEarnings: number;
  charges: Array<{
    id: string;
    date: string;
    amount: number;
    reason: string;
  }>;
  advances: Array<{
    id: string;
    date: string;
    weekStartDate: string;
    weekEndDate: string;
    amount: number;
  }>;
  netAmount: number;
  percentage: number;
}

const IndividualReports: React.FC = () => {
  const { t } = useTranslation();
  const { fetchUsers, getLeaders, getColporters, fetchPeople } = useUserStore();
  const { transactions, fetchAllTransactions } = useTransactionStore();
  const { charges, fetchCharges } = useChargeStore();
  const { advances, fetchAdvances } = useCashAdvanceStore();
  const { program, fetchProgram } = useProgramStore();
  
  const [personType, setPersonType] = useState<'COLPORTER' | 'LEADER'>('COLPORTER');
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null);
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
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
        
        // Set default date range to current month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load initial data');
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
  
  setIsLoading(true);
  setError(null);
  
  try {
    await fetchAllTransactions('APPROVED');
    await fetchCharges();
    await fetchAdvances();
    
    const dateRange = generateDateRange(startDate, endDate);
    
    const personTransactions = transactions.filter(t => {
      const isInDateRange = new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate);
      return (personType === 'COLPORTER' 
        ? t.studentId === selectedPerson.id 
        : t.leaderId === selectedPerson.id) && 
        isInDateRange && 
        t.status === 'APPROVED';
    });
    
    console.log('Filtered transactions:', personTransactions.length);
    
    // Only include APPLIED charges (not PENDING or CANCELLED)
    const personCharges = charges.filter(c => 
      c.personId === selectedPerson.id &&
      new Date(c.date) >= new Date(startDate) && 
      new Date(c.date) <= new Date(endDate) &&
      c.status === 'APPLIED'
    );
    
    // Only include APPROVED advances (not PENDING or REJECTED)
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
      dailyEarnings,
      totalEarnings,
      charges: personCharges,
      advances: personAdvances,
      netAmount
    });

    setReportData({
      personId: selectedPerson.id,
      personName: selectedPerson.name,
      personType,
      startDate,
      endDate,
      dailyEarnings,
      totalEarnings,
      charges: personCharges.map(c => ({
        id: c.id,
        date: c.date,
        amount: c.amount,
        reason: c.reason
      })),
      advances: personAdvances.map(a => ({
        id: a.id,
        date: a.requestDate,
        weekStartDate: a.weekStartDate,
        weekEndDate: a.weekEndDate,
        amount: a.advanceAmount
      })),
      netAmount,
      percentage // Include percentage in reportData
    });
  } catch (error) {
    console.error('Error generating report:', error);
    setError('Failed to generate report');
  } finally {
    setIsLoading(false);
  }
};

  const people = personType === 'COLPORTER' ? getColporters() : getLeaders();
  
  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const handlePersonTypeChange = (type: 'COLPORTER' | 'LEADER') => {
    setPersonType(type);
    setSelectedPerson(null);
    setPersonSearch('');
  };

  const groupEarningsByWeeks = (dailyEarnings: Record<string, number>) => {
  const weeks: Array<{
    startDate: string;
    endDate: string;
    weekLabel: string;
    weekTotal: number;
    days: Array<{ date: string; dayName: string; amount: number; isColportableDay: boolean }>;
  }> = [];
  
  const dates = Object.keys(dailyEarnings).sort();
  let currentWeek: Array<{ date: string; dayName: string; amount: number; isColportableDay: boolean }> = [];
  
  dates.forEach((date, index) => {
    const currentDate = new Date(date);
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Start a new week on Sunday (day 0) or on the first date
    if (currentDate.getDay() === 0 || index === 0) {
      if (currentWeek.length > 0) {
        const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0);
        const endDate = currentWeek[currentWeek.length - 1].date;
        weeks.push({
          startDate: currentWeek[0].date,
          endDate,
          weekLabel: `${new Date(currentWeek[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          weekTotal,
          days: currentWeek
        });
        currentWeek = [];
      }
    }
    
    // Rename the variable to avoid shadowing the function
    const isColportable = program ? isColportableDay(currentDate) : true;
    
    currentWeek.push({
      date,
      dayName,
      amount: dailyEarnings[date],
      isColportableDay: isColportable
    });
  });

  if (currentWeek.length > 0) {
    const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0);
    const endDate = currentWeek[currentWeek.length - 1].date;
    weeks.push({
      startDate: currentWeek[0].date,
      endDate,
      weekLabel: `${new Date(currentWeek[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      weekTotal,
      days: currentWeek
    });
  }
  
  return weeks;
};

  const printReport = () => {
  if (!reportData) return;

  const weeks = groupEarningsByWeeks(reportData.dailyEarnings);

  if (weeks.length === 0) {
    setError('No data to print');
    return;
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Individual Financial Report - ${reportData.personName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #ddd;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          color: #0052B4;
        }
        .header p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .week-row {
          background-color: #f9f9f9;
        }
        .total-row {
          font-weight: bold;
          background-color: #e6e6e6;
        }
        .net-row {
          font-weight: bold;
          background-color: #d4edda;
          color: #155724;
        }
        .charges-header {
          background-color: #dc3545;
          color: white;
        }
        .advances-header {
          background-color: #6f42c1;
          color: white;
        }
        .charges-cell {
          background-color: #f8d7da;
        }
        .advances-cell {
          background-color: #e2d9f3;
        }
        .charges-section, .advances-section {
          margin-top: 30px;
        }
        .charges-section h2, .advances-section h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: #0052B4;
        }
        .summary-section {
          margin-top: 30px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        .summary-section h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: #0052B4;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .summary-item.total {
          font-weight: bold;
          border-top: 1px solid #ddd;
          padding-top: 5px;
          margin-top: 5px;
        }
        .non-colportable {
          background-color: #f8d7da;
          color: #721c24;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Individual Financial Report</h1>
        <p><strong>Name:</strong> ${reportData.personName}</p>
        <p><strong>Type:</strong> ${reportData.personType}</p>
        <p><strong>Period:</strong> ${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(
          reportData.endDate
        ).toLocaleDateString()}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2">Week</th>
            <th colspan="8">Earnings</th>
            <th rowspan="2" class="charges-header">Charges</th>
            <th rowspan="2" class="advances-header">Cash Advances</th>
          </tr>
          <tr>
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              .map((dayName) => `<th>${dayName}</th>`)
              .join('')}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${weeks
            .map(
              (week, i) => `
            <tr class="week-row">
              <td>${i + 1}) ${week.weekLabel}</td>
              ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                .map((dayName) => {
                  const dayData = week.days.find((d) => d.dayName === dayName);
                  if (!dayData) return `<td>-</td>`;
                  const cellClass = dayData.isColportableDay ? '' : 'non-colportable';
                  return `<td class="${cellClass}">${dayData.amount.toFixed(2)}${
                    !dayData.isColportableDay ? '<br><small>Non-colportable</small>' : ''
                  }</td>`;
                })
                .join('')}
              <td>${week.weekTotal.toFixed(2)}</td>
              <td class="charges-cell">${
                reportData.charges
                  .filter(
                    (charge) =>
                      new Date(charge.date) >= new Date(week.startDate) &&
                      new Date(charge.date) <= new Date(week.endDate)
                  )
                  .reduce((sum, c) => sum + c.amount, 0)
                  .toFixed(2) > '0.00'
                  ? '-' +
                    reportData.charges
                      .filter(
                        (charge) =>
                          new Date(charge.date) >= new Date(week.startDate) &&
                          new Date(charge.date) <= new Date(week.endDate)
                      )
                      .reduce((sum, c) => sum + c.amount, 0)
                      .toFixed(2)
                  : '-'
              }</td>
              <td class="advances-cell">${
                reportData.advances
                  .filter(
                    (advance) =>
                      new Date(advance.date) >= new Date(week.startDate) &&
                      new Date(advance.date) <= new Date(week.endDate)
                  )
                  .reduce((sum, a) => sum + a.amount, 0)
                  .toFixed(2) > '0.00'
                  ? '-' +
                    reportData.advances
                      .filter(
                        (advance) =>
                          new Date(advance.date) >= new Date(week.startDate) &&
                          new Date(advance.date) <= new Date(week.endDate)
                      )
                      .reduce((sum, a) => sum + a.amount, 0)
                      .toFixed(2)
                  : '-'
              }</td>
            </tr>
          `
            )
            .join('')}
          <tr class="total-row">
            <td>Total</td>
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              .map((dayName) => {
                const dayTotal = weeks.reduce((sum, week) => {
                  const dayData = week.days.find((d) => d.dayName === dayName);
                  return sum + (dayData ? dayData.amount : 0);
                }, 0);
                return `<td>${dayTotal.toFixed(2)}</td>`;
              })
              .join('')}
            <td>${reportData.totalEarnings.toFixed(2)}</td>
            <td class="charges-cell">${
              reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2) > '0.00'
                ? '-' + reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)
                : '-'
            }</td>
            <td class="advances-cell">${
              reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2) > '0.00'
                ? '-' + reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)
                : '-'
            }</td>
          </tr>
        </tbody>
      </table>

      ${
        reportData.charges.length > 0
          ? `
        <div class="charges-section">
          <h2>Charges</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.charges
                .map(
                  (charge) => `
                <tr>
                  <td>${new Date(charge.date).toLocaleDateString()}</td>
                  <td>${charge.reason}</td>
                  <td>${charge.amount.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
              <tr class="total-row">
                <td colspan="2">Total Charges</td>
                <td>${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
          : ''
      }

      ${
        reportData.advances.length > 0
          ? `
        <div class="advances-section">
          <h2>Cash Advances</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Week</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.advances
                .map(
                  (advance) => `
                <tr>
                  <td>${new Date(advance.date).toLocaleDateString()}</td>
                  <td>${new Date(advance.weekStartDate).toLocaleDateString()} - ${new Date(
                    advance.weekEndDate
                  ).toLocaleDateString()}</td>
                  <td>${advance.amount.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
              <tr class="total-row">
                <td colspan="2">Total Advances</td>
                <td>${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
          : ''
      }

      <div class="summary-section">
        <h2>Summary</h2>
        <div class="summary-item">
          <span>Total Sales:</span>
          <span>$${reportData.totalEarnings.toFixed(2)}</span>
        </div>
        <div class="summary-item">
          <span>${reportData.personType} Percentage (${reportData.percentage}%):</span>
          <span>$${(reportData.totalEarnings * (reportData.percentage / 100)).toFixed(2)}</span>
        </div>
        <div class="summary-item">
          <span>Total Charges:</span>
          <span>$${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</span>
        </div>
        <div class="summary-item">
          <span>Total Advances:</span>
          <span>$${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}</span>
        </div>
        <div class="summary-item total">
          <span>Net Amount:</span>
          <span>$${reportData.netAmount.toFixed(2)}</span>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } else {
    setError('Could not open print window. Please check your popup settings.');
  }
};

  const exportReportCSV = () => {
  if (!reportData) return;

  let csvContent = "data:text/csv;charset=utf-8,";

  csvContent += "Individual Financial Report\r\n";
  csvContent += `Name,${reportData.personName}\r\n`;
  csvContent += `Type,${reportData.personType}\r\n`;
  csvContent += `Period,${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(
    reportData.endDate
  ).toLocaleDateString()}\r\n\r\n`;

  csvContent += "Weekly Breakdown\r\n";
  csvContent += "Week,Sun,Mon,Tue,Wed,Thu,Fri,Sat,Total,Charges,Cash Advances\r\n";

  const weeks = groupEarningsByWeeks(reportData.dailyEarnings);
  weeks.forEach((week, i) => {
    csvContent += `${i + 1}) ${week.weekLabel},`;
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((dayName) => {
      const dayData = week.days.find((d) => d.dayName === dayName);
      csvContent += `${dayData ? dayData.amount.toFixed(2) : '0.00'},`;
    });
    csvContent += `${week.weekTotal.toFixed(2)},`;
    const weekCharges = reportData.charges.filter(
      (charge) =>
        new Date(charge.date) >= new Date(week.startDate) &&
        new Date(charge.date) <= new Date(week.endDate)
    );
    const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0);
    csvContent += `${chargeTotal > 0 ? '-' + chargeTotal.toFixed(2) : '-'},`;
    const weekAdvances = reportData.advances.filter(
      (advance) =>
        new Date(advance.date) >= new Date(week.startDate) &&
        new Date(advance.date) <= new Date(week.endDate)
    );
    const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0);
    csvContent += `${advanceTotal > 0 ? '-' + advanceTotal.toFixed(2) : '-'}\r\n`;
  });

  csvContent += "Total,";
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((dayName) => {
    const dayTotal = weeks.reduce((sum, week) => {
      const dayData = week.days.find((d) => d.dayName === dayName);
      return sum + (dayData ? dayData.amount : 0);
    }, 0);
    csvContent += `${dayTotal.toFixed(2)},`;
  });
  csvContent += `${reportData.totalEarnings.toFixed(2)},`;
  const totalCharges = reportData.charges.reduce((sum, c) => sum + c.amount, 0);
  csvContent += `${totalCharges > 0 ? '-' + totalCharges.toFixed(2) : '-'},`;
  const totalAdvances = reportData.advances.reduce((sum, a) => sum + a.amount, 0);
  csvContent += `${totalAdvances > 0 ? '-' + totalAdvances.toFixed(2) : '-'}\r\n\r\n`;

  if (reportData.charges.length > 0) {
    csvContent += "Charges\r\n";
    csvContent += "Date,Reason,Amount\r\n";
    reportData.charges.forEach((charge) => {
      csvContent += `${new Date(charge.date).toLocaleDateString()},${charge.reason},${charge.amount.toFixed(
        2
      )}\r\n`;
    });
    csvContent += `Total Charges,,${reportData.charges
      .reduce((sum, c) => sum + c.amount, 0)
      .toFixed(2)}\r\n`;
    csvContent += "\r\n";
  }

  if (reportData.advances.length > 0) {
    csvContent += "Cash Advances\r\n";
    csvContent += "Date,Week,Amount\r\n";
    reportData.advances.forEach((advance) => {
      csvContent += `${new Date(advance.date).toLocaleDateString()},${new Date(
        advance.weekStartDate
      ).toLocaleDateString()} - ${new Date(advance.weekEndDate).toLocaleDateString()},${advance.amount.toFixed(
        2
      )}\r\n`;
    });
    csvContent += `Total Advances,,${reportData.advances
      .reduce((sum, a) => sum + a.amount, 0)
      .toFixed(2)}\r\n`;
    csvContent += "\r\n";
  }

  csvContent += "Summary\r\n";
  csvContent += `Total Sales,,${reportData.totalEarnings.toFixed(2)}\r\n`;
  csvContent += `${reportData.personType} Percentage (${reportData.percentage}%),,${(
    reportData.totalEarnings *
    (reportData.percentage / 100)
  ).toFixed(2)}\r\n`;
  csvContent += `Total Charges,,${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}\r\n`;
  csvContent += `Total Advances,,${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}\r\n`;
  csvContent += `Net Amount,,${reportData.netAmount.toFixed(2)}\r\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${reportData.personName}_report_${reportData.startDate}_${reportData.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Individual Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate financial reports for individual colporters and leaders
        </p>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      <Card title="Generate Report" icon={<FileText size={20} />}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Person Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handlePersonTypeChange('COLPORTER')}
                className={clsx(
                  'flex items-center justify-center p-4 border-2 rounded-lg transition-colors',
                  personType === 'COLPORTER'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-primary-300 hover:bg-primary-50/50'
                )}
              >
                <div className="text-center">
                  <div className="font-medium">Colporter</div>
                  <div className="text-xs text-gray-500 mt-1">Individual student</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => handlePersonTypeChange('LEADER')}
                className={clsx(
                  'flex items-center justify-center p-4 border-2 rounded-lg transition-colors',
                  personType === 'LEADER'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-primary-300 hover:bg-primary-50/50'
                )}
              >
                <div className="text-center">
                  <div className="font-medium">Leader</div>
                  <div className="text-xs text-gray-500 mt-1">Team supervisor</div>
                </div>
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
              isLoading={isLoading}
              disabled={!selectedPerson || !startDate || !endDate}
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
              leftIcon={<Download size={18} />}
              onClick={exportReportCSV}
            >
              Export CSV
            </Button>
            
            <Button
              variant="primary"
              leftIcon={<Printer size={18} />}
              onClick={printReport}
            >
              Print Report
            </Button>
          </div>

          <Card>
  <div className="bg-white border border-gray-300">
    <div className="bg-gray-100 border-b border-gray-300 p-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Individual Financial Report</h2>
        <p className="text-sm text-gray-600 mt-1">
          <strong>Name:</strong> {reportData.personName} | 
          <strong> Type:</strong> {reportData.personType} | 
          <strong> Period:</strong> {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
        </p>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm align-middle">
              Week
            </th>
            <th colSpan={8} className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm">
              Earnings
            </th>
            <th rowSpan={2} className="border border-gray-400 px-3 py-2 bg-red-700 text-white text-sm align-middle">
              Charges
            </th>
            <th rowSpan={2} className="border border-gray-400 px-3 py-2 bg-purple-700 text-white text-sm align-middle">
              Cash Advances
            </th>
          </tr>
          <tr>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
              <th key={dayName} className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm">
                {dayName}
              </th>
            ))}
            <th className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {groupEarningsByWeeks(reportData.dailyEarnings).map((week, weekIndex) => (
            <tr key={week.startDate} className="bg-gray-50">
              <td className="border border-gray-400 px-3 py-2 text-sm font-medium">
                {weekIndex + 1}) {week.weekLabel}
              </td>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => {
                const dayData = week.days.find((d) => d.dayName === dayName);
                return (
                  <td
                    key={dayName}
                    className={`border border-gray-400 px-3 py-2 text-center text-sm ${
                      dayData && !dayData.isColportableDay ? 'bg-red-50' : ''
                    }`}
                  >
                    {dayData ? dayData.amount.toFixed(2) : '-'}
                    {dayData && !dayData.isColportableDay && (
                      <div className="text-[9px] text-red-600">Non-colportable</div>
                    )}
                  </td>
                );
              })}
              <td className="border border-gray-400 px-3 py-2 text-center text-sm font-medium">
                {week.weekTotal.toFixed(2)}
              </td>
              <td className="border border-gray-400 px-3 py-2 text-center text-sm bg-red-50">
                {(() => {
                  const weekCharges = reportData.charges.filter(
                    (charge) =>
                      new Date(charge.date) >= new Date(week.startDate) &&
                      new Date(charge.date) <= new Date(week.endDate)
                  );
                  const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0);
                  return chargeTotal > 0 ? `-${chargeTotal.toFixed(2)}` : '-';
                })()}
              </td>
              <td className="border border-gray-400 px-3 py-2 text-center text-sm bg-purple-50">
                {(() => {
                  const weekAdvances = reportData.advances.filter(
                    (advance) =>
                      new Date(advance.date) >= new Date(week.startDate) &&
                      new Date(advance.date) <= new Date(week.endDate)
                  );
                  const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0);
                  return advanceTotal > 0 ? `-${advanceTotal.toFixed(2)}` : '-';
                })()}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="border border-gray-400 px-3 py-2 text-sm font-bold">
              {personType === 'COLPORTER' ? 'Student' : 'Leader'} Total
            </td>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => {
              const dayTotal = groupEarningsByWeeks(reportData.dailyEarnings).reduce(
                (sum, week) => {
                  const dayData = week.days.find((d) => d.dayName === dayName);
                  return sum + (dayData ? dayData.amount : 0);
                },
                0
              );
              return (
                <td
                  key={dayName}
                  className="border border-gray-400 px-3 py-2 text-center text-sm font-bold"
                >
                  {dayTotal.toFixed(2)}
                </td>
              );
            })}
            <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold">
              {reportData.totalEarnings.toFixed(2)}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-red-100">
              {(() => {
                const chargeTotal = reportData.charges.reduce((sum, c) => sum + c.amount, 0);
                return chargeTotal > 0 ? `-${chargeTotal.toFixed(2)}` : '-';
              })()}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold bg-purple-100">
              {(() => {
                const advanceTotal = reportData.advances.reduce((sum, a) => sum + a.amount, 0);
                return advanceTotal > 0 ? `-${advanceTotal.toFixed(2)}` : '-';
              })()}
            </td>
          </tr>
          <tr className="bg-success-100 font-bold">
            <td
              colSpan={8}
              className="border border-gray-400 px-3 py-2 text-sm font-bold text-success-800"
            >
              Net Amount ({reportData.percentage}% of sales - charges - advances)
            </td>
            <td
              colSpan={3}
              className="border border-gray-400 px-3 py-2 text-center text-sm font-bold text-success-800"
            >
              {reportData.netAmount.toFixed(2)}
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                          -${charge.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100">
                      <td colSpan={2} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        Total Charges
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600">
                        -${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
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
                        Week
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
                          <Badge variant="success">APPROVED</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                          -${advance.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100">
                      <td colSpan={3} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        Total Advances
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                        -${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card title="Report Summary" icon={<FileText size={20} />}>
  <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-primary-900 mb-4">Financial Summary</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-600">Total Sales</span>
            <span className="text-lg font-bold text-gray-900">${reportData.totalEarnings.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-600">
              {reportData.personType} Percentage ({reportData.percentage}%)
            </span>
            <span className="text-lg font-bold text-primary-600">
              ${(reportData.totalEarnings * (reportData.percentage / 100)).toFixed(2)}
            </span>
          </div>
          {reportData.charges.length > 0 && (
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
              <span className="text-sm font-medium text-gray-600">Total Charges</span>
              <span className="text-lg font-bold text-red-600">
                -${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
              </span>
            </div>
          )}
          {reportData.advances.length > 0 && (
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
              <span className="text-sm font-medium text-gray-600">Total Advances</span>
              <span className="text-lg font-bold text-purple-600">
                -${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center p-3 bg-success-100 rounded-lg shadow-sm border border-success-200">
            <span className="text-sm font-medium text-success-700">Net Amount</span>
            <span className="text-xl font-bold text-success-700">
              ${reportData.netAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-primary-900 mb-4">Report Details</h3>
        <div className="space-y-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Person</span>
              <span className="text-sm font-medium text-gray-900">{reportData.personName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Type</span>
              <Badge variant={reportData.personType === 'COLPORTER' ? 'primary' : 'success'}>
                {reportData.personType}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Period</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Working Days</span>
              <span className="text-sm font-medium text-gray-900">
                {groupEarningsByWeeks(reportData.dailyEarnings)
                  .reduce((sum, week) => sum + week.days.filter(d => d.isColportableDay).length, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Days with Sales</span>
              <span className="text-sm font-medium text-gray-900">
                {Object.values(reportData.dailyEarnings).filter(amount => amount > 0).length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Daily Average</span>
              <span className="text-sm font-medium text-gray-900">
                ${(reportData.totalEarnings / Math.max(1, Object.values(reportData.dailyEarnings).filter(amount => amount > 0).length)).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-3 bg-success-50 rounded-lg shadow-sm">
            <p className="text-sm text-success-700">
              <strong>Net Amount:</strong> ${reportData.netAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Final amount after percentage, charges, and advances
            </p>
          </div>
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