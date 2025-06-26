import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Calendar, DollarSign, Target } from 'lucide-react';
import Card from '../ui/Card';
import { useProgramStore } from '../../stores/programStore';
import { useTransactionStore } from '../../stores/transactionStore';

const ProgramProjections: React.FC = () => {
  const { t } = useTranslation();
  const { program } = useProgramStore();
  const { transactions, isLoading: transactionsLoading } = useTransactionStore();
  const [isCalculating, setIsCalculating] = useState(transactions.length > 0);
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
      setIsCalculating(true);
      
      // Pequeño retraso para asegurar que el estado de carga se muestre
      const timer = setTimeout(() => {
        const validTransactions = transactions.filter(t => t.status === 'APPROVED');
        const totalSales = validTransactions.reduce((sum, t) => sum + t.total, 0);
        
        const startDate = new Date(program.start_date);
        const endDate = new Date(program.end_date);
        const today = new Date();
        
        const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalProgramDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyAverage = totalSales / Math.max(daysElapsed, 1);
        const endOfProgramProjection = dailyAverage * totalProgramDays;
        
        const studentPercentage = program.financialConfig?.colporter_percentage 
          ? parseFloat(program.financialConfig.colporter_percentage) 
          : 50;
        const leaderPercentage = program.financialConfig?.leader_percentage 
          ? parseFloat(program.financialConfig.leader_percentage) 
          : 15;
        const programPercentage = 100 - studentPercentage - leaderPercentage;
        
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
        
        setIsCalculating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [transactions, program]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const renderLoadingState = () => (
    <div className="space-y-6 animate-pulse">
      <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-300 rounded-full">
              <div className="w-5 h-5"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
              <div className="h-6 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-300 rounded-full">
              <div className="w-5 h-5"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
              <div className="h-6 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-300 rounded-full">
              <div className="w-5 h-5"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
              <div className="h-6 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-gray-300 rounded w-48"></div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title={t('dashboard.programProjections')}
      subtitle={t('dashboard.performanceForecast')}
      icon={<TrendingUp size={20} />}
      className="h-full"
    >
      {transactionsLoading || isCalculating ? (
        renderLoadingState()
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-full">
                  <DollarSign size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">{t('dashboard.currentProgramTotal')}</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(projectionData.totalMayJuneJuly)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-full">
                  <Calendar size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">{t('dashboard.dailyAverage')}</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(projectionData.dailyAverage)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-full">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">{t('dashboard.endOfProgramProjection')}</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(projectionData.endOfProgramProjection)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {t('dashboard.projectionDistribution')}
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-blue-700">
                    {t('common.student')} ({program?.financialConfig?.colporter_percentage || 50}%)
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
                    {t('common.leader')} ({program?.financialConfig?.leader_percentage || 15}%)
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
                    {t('common.program')} ({100 - (program?.financialConfig?.colporter_percentage ? parseFloat(program.financialConfig.colporter_percentage) : 50) - (program?.financialConfig?.leader_percentage ? parseFloat(program.financialConfig.leader_percentage) : 15)}%)
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
        </div>
      )}
    </Card>
  );
};

export default ProgramProjections;