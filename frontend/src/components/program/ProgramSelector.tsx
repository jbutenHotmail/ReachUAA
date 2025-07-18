import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, Calendar, Building } from 'lucide-react';
import { clsx } from 'clsx';
import { useProgramStore } from '../../stores/programStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../ui/Card';
import Button from '../ui/Button';

const ProgramSelector: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { program, availablePrograms, fetchAvailablePrograms, switchProgram } = useProgramStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch available programs when component mounts for any authenticated user
    if (user) {
      fetchAvailablePrograms();
    }
  }, [fetchAvailablePrograms]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProgramSwitch = async (programId: number) => {
    try {
      await switchProgram(programId);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error switching program:', error);
    }
  };

  // If there's only one program, no programs, or user is not authenticated, don't show the selector
  if (!user || !availablePrograms || availablePrograms.length <= 1) {
    return null;
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 text-sm text-white border-white/30 hover:bg-white/10"
        leftIcon={<Building size={16} className="text-white" />}
        rightIcon={<ChevronDown size={16} className={clsx(
          'transition-transform text-white',
          isDropdownOpen && 'transform rotate-180'
        )} />}
      >
        <span className="max-w-[150px] truncate">{program?.name || t('common.selectProgram')}</span>
      </Button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-50">
          <Card className="p-0">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">{t('common.selectProgram')}</h3>
              <p className="text-xs text-gray-500">{t('common.switchProgram')}</p>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {availablePrograms.map((prog) => (
                <button
                  key={prog.id}
                  className={clsx(
                    'w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none',
                    program?.id === prog.id && 'bg-primary-50'
                  )}
                  onClick={() => handleProgramSwitch(prog.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-900 flex items-center gap-1">
                        {prog.name}
                        {Boolean(prog.is_active) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('common.active')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center mt-0.5">
                        <Calendar size={12} className="mr-1" />
                        {formatDateRange(prog.start_date, prog.end_date)}
                      </div>
                    </div>
                    {program?.id === prog.id && (
                      <Check size={16} className="text-primary-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProgramSelector;