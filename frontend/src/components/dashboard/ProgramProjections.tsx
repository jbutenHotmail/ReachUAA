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
      students50: 0,
      leaders15: 0,
      programProfit: 0
    }
  });

  useEffect(() => {
    if (transactions.length > 0 && program) {
      // Filter out rejected transactions
      const validTransactions = transactions.filter(t => t.status !== 'REJECTED');
      
      // Calculate total sales from transactions
      const totalSales = validTransactions.reduce((sum, t) => sum + t.total, 0);
      
      // Calculate working days
      const startDate = new Date(program.start_date);
      const endDate = new Date(program.end_date);
      const today = new Date();
      
      // Calculate days elapsed so far
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate total program days
      const totalProgramDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate daily average
      const dailyAverage = totalSales / Math.max(daysElapsed, 1);
      
      // Calculate end of program projection
      const endOfProgramProjection = dailyAverage * totalProgramDays;
      
      // Get financial percentages from program
      const studentPercentage = program.financialConfig?.colporter_percentage 
        ? parseFloat(program.financialConfig.colporter_percentage) 
        : 50;
      const leaderPercentage = program.financialConfig?.leader_percentage 
        ? parseFloat(program.financialConfig.leader_percentage) 
        : 15;
      const programPercentage = 100 - studentPercentage - leaderPercentage;
      
      // Calculate breakdown
      const students50 = endOfProgramProjection * (studentPercentage / 100);
      const leaders15 = endOfProgramProjection * (leaderPercentage / 100);
      const programProfit = endOfProgramProjection * (programPercentage / 100);
      
      setProjectionData({
        totalMayJuneJuly: totalSales,
        dailyAverage,
        endOfProgramProjection,
        breakdown: {
          students50,
          leaders15,
          programProfit
        }
      });
    }
  }, [transactions, program]);

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
    
    const startDate = new Date(program.start_date);
    const endDate = new Date(program.end_date);
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
            End of Program Projection - Distribution
          </h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-blue-700">
                  Students ({program?.financialConfig?.colporter_percentage || 50}%)
                </span>
                <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full" 
                    style={{ width: `${program?.financialConfig?.colporter_percentage || 50}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-bold text-blue-900">
                {formatCurrency(projectionData.breakdown.students50)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-purple-700">
                  Leaders ({program?.financialConfig?.leader_percentage || 15}%)
                </span>
                <div className="w-full bg-purple-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-purple-600 h-1.5 rounded-full" 
                    style={{ width: `${program?.financialConfig?.leader_percentage || 15}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-bold text-purple-900">
                {formatCurrency(projectionData.breakdown.leaders15)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Program ({100 - (program?.financialConfig?.colporter_percentage ? parseFloat(program.financialConfig.colporter_percentage) : 50) - (program?.financialConfig?.leader_percentage ? parseFloat(program.financialConfig.leader_percentage) : 15)}%)
                </span>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-gray-600 h-1.5 rounded-full" 
                    style={{ width: `${100 - (program?.financialConfig?.colporter_percentage ? parseFloat(program.financialConfig.colporter_percentage) : 50) - (program?.financialConfig?.leader_percentage ? parseFloat(program.financialConfig.leader_percentage) : 15)}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(projectionData.breakdown.programProfit)}
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