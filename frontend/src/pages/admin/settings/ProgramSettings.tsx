import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Clock, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Settings as SettingsIcon,
  CalendarDays,
  Timer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';

interface ProgramConfig {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  workDays: string[];
  restDays: string[];
  customRestDays: string[]; // Specific dates marked as rest days
  customWorkDays: string[]; // Specific dates marked as work days (overrides default rest days)
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface ConfirmationModal {
  isOpen: boolean;
  date: string;
  currentStatus: 'work' | 'rest';
  newStatus: 'work' | 'rest';
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ProgramSettings: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    isOpen: false,
    date: '',
    currentStatus: 'work',
    newStatus: 'work'
  });
  
  const [programConfig, setProgramConfig] = useState<ProgramConfig>({
    id: '1',
    name: 'Summer Colportage Program 2025',
    startDate: '2025-05-01',
    endDate: '2025-08-31',
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    restDays: ['sunday'],
    customRestDays: ['2025-05-15', '2025-06-01', '2025-07-04'], // Example custom rest days
    customWorkDays: ['2025-05-19'], // Example: Sunday marked as work day
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    isActive: true,
  });

  const getDayStatus = (date: Date): 'work' | 'rest' | 'outside' => {
    const dateStr = date.toISOString().split('T')[0];
    const programStart = new Date(programConfig.startDate);
    const programEnd = new Date(programConfig.endDate);
    
    // Check if date is outside program period
    if (date < programStart || date > programEnd) {
      return 'outside';
    }
    
    // Check custom overrides first
    if (programConfig.customRestDays.includes(dateStr)) {
      return 'rest';
    }
    
    if (programConfig.customWorkDays.includes(dateStr)) {
      return 'work';
    }
    
    // Check default schedule
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return programConfig.workDays.includes(dayName) ? 'work' : 'rest';
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const currentStatus = getDayStatus(date);
    
    if (currentStatus === 'outside') return;
    
    const newStatus = currentStatus === 'work' ? 'rest' : 'work';
    
    setConfirmationModal({
      isOpen: true,
      date: dateStr,
      currentStatus,
      newStatus
    });
  };

  const confirmDateChange = () => {
    const { date, currentStatus, newStatus } = confirmationModal;
    
    setProgramConfig(prev => {
      const newConfig = { ...prev };
      
      if (newStatus === 'rest') {
        // Mark as rest day
        newConfig.customRestDays = [...prev.customRestDays.filter(d => d !== date), date];
        newConfig.customWorkDays = prev.customWorkDays.filter(d => d !== date);
      } else {
        // Mark as work day
        newConfig.customWorkDays = [...prev.customWorkDays.filter(d => d !== date), date];
        newConfig.customRestDays = prev.customRestDays.filter(d => d !== date);
      }
      
      return {
        ...newConfig,
        updatedAt: new Date().toISOString(),
      };
    });
    
    setConfirmationModal({ isOpen: false, date: '', currentStatus: 'work', newStatus: 'work' });
    setIsSaved(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'next') {
        newDate.setMonth(prev.getMonth() + 1);
      } else {
        newDate.setMonth(prev.getMonth() - 1);
      }
      return newDate;
    });
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDateForLoop = new Date(startDate);
    
    // Generate 6 weeks (42 days) to ensure full calendar
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateForLoop));
      currentDateForLoop.setDate(currentDateForLoop.getDate() + 1);
    }
    
    return days;
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would save to the backend
      console.log('Saving program configuration:', programConfig);
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      setError('Failed to save program configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgramDuration = () => {
    const start = new Date(programConfig.startDate);
    const end = new Date(programConfig.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    return { days: diffDays, weeks: diffWeeks, months: diffMonths };
  };

  const calculateWorkDays = () => {
    const start = new Date(programConfig.startDate);
    const end = new Date(programConfig.endDate);
    let workDayCount = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (getDayStatus(d) === 'work') {
        workDayCount++;
      }
    }
    
    return workDayCount;
  };

  const duration = calculateProgramDuration();
  const totalWorkDays = calculateWorkDays();
  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Program Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          View program configuration and manage specific working days
        </p>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-danger-700">
            <p className="font-medium">Configuration Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {isSaved && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-success-700">
            <p className="font-medium">Settings Saved</p>
            <p>Program configuration has been updated successfully.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Information (Read-only) */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Program Information" icon={<SettingsIcon size={20} />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                <div className="p-3 bg-gray-50 rounded-md text-gray-900 font-medium">
                  {programConfig.name}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                    {new Date(programConfig.startDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                    {new Date(programConfig.endDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Working Schedule</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isWorkDay = programConfig.workDays.includes(day.id);
                    return (
                      <Badge 
                        key={day.id}
                        variant={isWorkDay ? "primary" : "secondary"}
                        size="sm"
                      >
                        {day.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Interactive Calendar */}
          <Card title="Working Days Calendar" icon={<CalendarDays size={20} />}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Click on any date to toggle between working day and rest day. 
                Changes will affect statistics calculations.
              </p>

              {/* Calendar Header */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft size={20} />
                </Button>
                
                <h3 className="text-lg font-semibold text-gray-900">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight size={20} />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const status = getDayStatus(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      disabled={status === 'outside'}
                      className={`
                        p-2 text-sm rounded-md transition-all duration-200 min-h-[40px] relative
                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                        ${status === 'outside' ? 'cursor-not-allowed bg-gray-100 text-gray-300' : ''}
                        ${status === 'work' && isCurrentMonth ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' : ''}
                        ${status === 'rest' && isCurrentMonth ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : ''}
                        ${isToday ? 'ring-2 ring-primary-500' : ''}
                      `}
                    >
                      <span className="relative z-10">{date.getDate()}</span>
                      {isToday && (
                        <div className="absolute inset-0 bg-primary-500 opacity-20 rounded-md"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary-100 rounded"></div>
                  <span className="text-sm text-gray-600">Working Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span className="text-sm text-gray-600">Rest Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-sm text-gray-600">Outside Program</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Program Statistics */}
        <div className="lg:col-span-1">
          <Card title="Program Statistics" icon={<Timer size={20} />}>
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-primary-600">Total Duration</p>
                  <p className="mt-1 text-2xl font-bold text-primary-700">{duration.days}</p>
                  <p className="text-xs text-primary-600">days</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-success-50 rounded-lg text-center">
                  <p className="text-xs font-medium text-success-600">Weeks</p>
                  <p className="text-lg font-bold text-success-700">{duration.weeks}</p>
                </div>
                
                <div className="p-3 bg-warning-50 rounded-lg text-center">
                  <p className="text-xs font-medium text-warning-600">Months</p>
                  <p className="text-lg font-bold text-warning-700">{duration.months}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600">Working Days</p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">{totalWorkDays}</p>
                  <p className="text-xs text-blue-600">total work days</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  <p><strong>Custom Rest Days:</strong> {programConfig.customRestDays.length}</p>
                  <p><strong>Custom Work Days:</strong> {programConfig.customWorkDays.length}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Created:</strong> {new Date(programConfig.createdAt).toLocaleDateString()}</p>
                  <p><strong>Last Updated:</strong> {new Date(programConfig.updatedAt).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> 
                    <Badge 
                      variant={programConfig.isActive ? "success" : "secondary"} 
                      size="sm" 
                      className="ml-1"
                    >
                      {programConfig.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isLoading}
              leftIcon={<Save size={18} />}
              fullWidth
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-warning-500" size={24} />
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Day Change</h3>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    You are about to change <strong>{new Date(confirmationModal.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}</strong> from a <strong>{confirmationModal.currentStatus} day</strong> to a <strong>{confirmationModal.newStatus} day</strong>.
                  </p>
                  
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-700">
                      <strong>⚠️ Important:</strong> This change will affect statistics calculations. 
                      {confirmationModal.newStatus === 'rest' 
                        ? ' Data from this day will not be counted in performance metrics.'
                        : ' Data from this day will be included in performance metrics.'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmationModal({ isOpen: false, date: '', currentStatus: 'work', newStatus: 'work' })}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmDateChange}
                  >
                    Confirm Change
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Important Notes */}
      <Card>
        <div className="flex items-start gap-4">
          <AlertCircle className="text-warning-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Notes</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <strong>Program Information:</strong> Basic program details are read-only and managed by administrators.</li>
              <li>• <strong>Calendar Interaction:</strong> Click on any date within the program period to toggle work/rest status.</li>
              <li>• <strong>Statistics Impact:</strong> Changes to working days affect all performance calculations and reports.</li>
              <li>• <strong>Custom Overrides:</strong> Specific dates can override the default weekly schedule.</li>
              <li>• <strong>Data Integrity:</strong> Rest days exclude transactions from daily averages but preserve the data.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProgramSettings;