import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Calendar, DollarSign, Target } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useProgramStore } from '../../stores/programStore';
import { useTransactionStore } from '../../stores/transactionStore';

const ProgramProjections: React.FC = () => {
  const { t } = useTranslation();
  const { program } = useProgramStore();
  const { transactions } = useTransactionStore();
  const [projectionData, setProjectionData] = useState({
    totalMayJuneJuly: 0,
    dailyAverage: 0,
    endOfProgramProjection: 0,
    breakdown: {
      bookPayment35: 0,
      students50: 0,
      leaders15: 0
    }
  });

  useEffect(() => {
    if (program && transactions.length > 0) {
      // Calculate total sales from transactions
      const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
      
      // Calculate working days
      const startDate = new Date(program.startDate);
      const endDate = new Date(program.endDate);
      const today = new Date();
      
      // Calculate days elapsed so far
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate total program days
      const totalProgramDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate daily average
      const dailyAverage = totalSales / Math.max(daysElapsed, 1);
      
      // Calculate end of program projection
      const endOfProgramProjection = dailyAverage * totalProgramDays;
      
      // Calculate breakdown
      const bookPayment35 = endOfProgramProjection * 0.35;
      const students50 = endOfProgramProjection * 0.5;
      const leaders15 = endOfProgramProjection * 0.15;
      
      setProjectionData({
        totalMayJuneJuly: totalSales,
        dailyAverage,
        endOfProgramProjection,
        breakdown: {
          bookPayment35,
          students50,
          leaders15
        }
      });
    }
  }, [program, transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate program progress percentage
  const calculateProgramProgress = () => {
    if (!program) return 0;
    
    const startDate = new Date(program.startDate);
    const endDate = new Date(program.endDate);
    const today = new Date();
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = today.getTime() - startDate.getTime();
    
    const progressPercentage = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
    
    return Math.round(progressPercentage);
  };

  const programProgress = calculateProgramProgress();

  return (
    <Card
      title="Program Projections"
      subtitle="Current Performance & End of Program Forecast"
      icon={<TrendingUp size={20} />}
      className="h-full"
    >
      <div className="space-y-6">
        {/* Current Period Performance */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-full">
                <DollarSign size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Total (Current Program)</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(projectionData.totalMayJuneJuly)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Average */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-full">
                <Calendar size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">Average per day</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(projectionData.dailyAverage)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* End of Program Projection */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-full">
                <Target size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-800">End of Program Projection</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(projectionData.endOfProgramProjection)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            End of Program Projection - Income
          </h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" size="sm">35%</Badge>
                <span className="text-sm font-medium text-gray-700">Book Payment</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(projectionData.breakdown.bookPayment35)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">50%</Badge>
                <span className="text-sm font-medium text-primary-700">Students</span>
              </div>
              <span className="text-sm font-bold text-primary-900">
                {formatCurrency(projectionData.breakdown.students50)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">15%</Badge>
                <span className="text-sm font-medium text-success-700">Leaders</span>
              </div>
              <span className="text-sm font-bold text-success-900">
                {formatCurrency(projectionData.breakdown.leaders15)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Program Progress</span>
            <span>~{programProgress || 0}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${programProgress || 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProgramProjections;