"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { TrendingUp, Calendar, DollarSign, Target } from "lucide-react"
import Card from "../ui/Card"
import { useProgramStore } from "../../stores/programStore"
import { useTransactionStore } from "../../stores/transactionStore"
import { useLeaderPercentageStore } from "../../stores/leaderPercentageStore"
import { useUserStore } from "../../stores/userStore"
import { formatNumber } from "../../utils/numberUtils"

const ProgramProjections: React.FC = () => {
  const { t } = useTranslation()
  const { program } = useProgramStore()
  const { transactions, isLoading: transactionsLoading } = useTransactionStore()
  const { leaderPercentages, fetchLeaderPercentages, werePercentagesFetched } = useLeaderPercentageStore()
  const { people, fetchPeople, werePeopleFetched } = useUserStore()
  const [isCalculating, setIsCalculating] = useState(transactions.length > 0)
  const [projectionData, setProjectionData] = useState({
    totalMayJuneJuly: 0,
    dailyAverage: 0,
    endOfProgramProjection: 0,
    breakdown: {
      students50: 0,
      leaders: 0,
      globalLeaders: 0,
      customLeaders: 0,
      programProfit: 0,
    },
    leaderBreakdown: {
      globalLeadersCount: 0,
      customLeadersCount: 0,
      globalLeadersPercentage: 0,
      customLeadersPercentage: 0,
      totalLeaderPercentage: 0,
    },
  })

  // Fetch required data
  useEffect(() => {
    if (!werePercentagesFetched) {
      fetchLeaderPercentages()
    }
    if (!werePeopleFetched) {
      fetchPeople(program?.id)
    }
  }, [fetchLeaderPercentages, fetchPeople, werePercentagesFetched, werePeopleFetched, program])

  useEffect(() => {
    if (transactions.length > 0 && program && people.length > 0) {
      setIsCalculating(true)

      // Pequeño retraso para asegurar que el estado de carga se muestre
      const timer = setTimeout(() => {
        const validTransactions = transactions.filter((t) => t.status === "APPROVED")
        const totalSales = validTransactions.reduce((sum, t) => Number(sum) + Number(t.total), 0)
        const startDate = new Date(program.start_date)
        const endDate = new Date(program.end_date)
        const today = new Date()

        const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const totalProgramDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const dailyAverage = totalSales / Math.max(daysElapsed, 1)
        const endOfProgramProjection = dailyAverage * totalProgramDays

        const studentPercentage = program.financialConfig?.colporter_percentage
          ? Number.parseFloat(program.financialConfig.colporter_percentage)
          : 50
        
        // Get global leader percentage
        const globalLeaderPercentage = program.financialConfig?.leader_percentage
          ? Number.parseFloat(program.financialConfig.leader_percentage)
          : 15
        
        // Get all leaders
        const leaders = people.filter(p => p.personType === 'LEADER')
        
        // Separate leaders with custom vs global percentages
        const leadersWithCustom = leaders.filter(leader => 
          leaderPercentages.some(p => p.leaderId === leader.id && p.isActive)
        )
        
        const leadersWithGlobal = leaders.filter(leader => 
          !leaderPercentages.some(p => p.leaderId === leader.id && p.isActive)
        )
        
        // Calculate custom leaders earnings based on their supervised transactions
        const customLeadersAmount = leadersWithCustom.reduce((sum, leader) => {
          const individualPercentage = leaderPercentages.find(
            p => p.leaderId === leader.id && p.isActive
          );
          
          if (!individualPercentage) return sum;
          
          // Get transactions supervised by this specific leader
          const leaderTransactions = validTransactions.filter(t => t.leaderId === leader.id);
          const leaderTeamSales = leaderTransactions.reduce((teamSum, t) => teamSum + Number(t.total), 0);
          
          // Calculate this leader's earnings based on their team's sales
          const leaderEarnings = leaderTeamSales * (individualPercentage.percentage / 100);
          
          return sum + leaderEarnings;
        }, 0);
        
        // Calculate global leaders earnings based on their supervised transactions
        const globalLeadersAmount = leadersWithGlobal.reduce((sum, leader) => {
          // Get transactions supervised by this specific leader
          const leaderTransactions = validTransactions.filter(t => t.leaderId === leader.id);
          const leaderTeamSales = leaderTransactions.reduce((teamSum, t) => teamSum + Number(t.total), 0);
          
          // Calculate this leader's earnings based on their team's sales and global percentage
          const leaderEarnings = leaderTeamSales * (globalLeaderPercentage / 100);
          
          return sum + leaderEarnings;
        }, 0);
        
        // Calculate total custom leader percentage for display purposes
        const customLeaderPercentage = leadersWithCustom.reduce((sum, leader) => {
          const individualPercentage = leaderPercentages.find(
            p => p.leaderId === leader.id && p.isActive
          );
          return sum + (individualPercentage ? individualPercentage.percentage : 0);
        }, 0);
        
        // Calculate global leaders total percentage
        const globalLeadersTotalPercentage = leadersWithGlobal.length > 0 ? globalLeaderPercentage : 0;
        
        // Total leader percentage
        const totalLeaderPercentage = customLeaderPercentage + globalLeadersTotalPercentage
        
        const students50 = endOfProgramProjection * (studentPercentage / 100)
        
        // Calculate projected leader earnings based on current performance
        const projectedCustomLeadersAmount = customLeadersAmount * (endOfProgramProjection / totalSales);
        const projectedGlobalLeadersAmount = globalLeadersAmount * (endOfProgramProjection / totalSales);
        const leadersTotal = projectedCustomLeadersAmount + projectedGlobalLeadersAmount;
        
        const programGrossAmount = endOfProgramProjection - students50 - leadersTotal;
        const programProfit = programGrossAmount;

        setProjectionData({
          totalMayJuneJuly: totalSales,
          dailyAverage,
          endOfProgramProjection,
          breakdown: {
            students50,
            leaders: leadersTotal,
            globalLeaders: projectedGlobalLeadersAmount,
            customLeaders: projectedCustomLeadersAmount,
            programProfit,
          },
          leaderBreakdown: {
            globalLeadersCount: leadersWithGlobal.length,
            customLeadersCount: leadersWithCustom.length,
            globalLeadersPercentage: globalLeadersTotalPercentage,
            customLeadersPercentage: customLeaderPercentage,
            totalLeaderPercentage,
          },
        })

        setIsCalculating(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [transactions, program, people, leaderPercentages])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const renderLoadingState = () => (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      <div className="p-3 sm:p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-gray-300 rounded-full">
              <div className="w-4 h-4 sm:w-5 sm:h-5"></div>
            </div>
            <div>
              <div className="h-3 sm:h-4 bg-gray-300 rounded w-24 sm:w-32 mb-2"></div>
              <div className="h-5 sm:h-6 bg-gray-300 rounded w-20 sm:w-24"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-gray-300 rounded-full">
              <div className="w-4 h-4 sm:w-5 sm:h-5"></div>
            </div>
            <div>
              <div className="h-3 sm:h-4 bg-gray-300 rounded w-24 sm:w-32 mb-2"></div>
              <div className="h-5 sm:h-6 bg-gray-300 rounded w-20 sm:w-24"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-gray-300 rounded-full">
              <div className="w-4 h-4 sm:w-5 sm:h-5"></div>
            </div>
            <div>
              <div className="h-3 sm:h-4 bg-gray-300 rounded w-24 sm:w-32 mb-2"></div>
              <div className="h-5 sm:h-6 bg-gray-300 rounded w-20 sm:w-24"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 sm:h-4 bg-gray-300 rounded w-32 sm:w-48"></div>

        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-100 rounded-lg">
            <div className="h-3 sm:h-4 bg-gray-300 rounded w-24 sm:w-32"></div>
            <div className="h-3 sm:h-4 bg-gray-300 rounded w-12 sm:w-16"></div>
          </div>
          <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-100 rounded-lg">
            <div className="h-3 sm:h-4 bg-gray-300 rounded w-24 sm:w-32"></div>
            <div className="h-3 sm:h-4 bg-gray-300 rounded w-12 sm:w-16"></div>
          </div>
          <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-100 rounded-lg">
            <div className="h-3 sm:h-4 bg-gray-300 rounded w-24 sm:w-32"></div>
            <div className="h-3 sm:h-4 bg-gray-300 rounded w-12 sm:w-16"></div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Card
      title={t("dashboard.programProjections")}
      subtitle={t("dashboard.performanceForecast")}
      icon={<TrendingUp size={20} />}
      className="h-full"
    >
      {transactionsLoading || isCalculating ? (
        renderLoadingState()
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-600 rounded-full flex-shrink-0">
                  <DollarSign size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-green-800 truncate">
                    {t("dashboard.currentProgramTotal")}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-green-900 truncate">
                    {formatCurrency(projectionData.totalMayJuneJuly)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-blue-600 rounded-full flex-shrink-0">
                  <Calendar size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-blue-800 truncate">{t("dashboard.dailyAverage")}</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-900 truncate">
                    {formatCurrency(projectionData.dailyAverage)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-600 rounded-full flex-shrink-0">
                  <Target size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-purple-800 truncate">
                    {t("dashboard.endOfProgramProjection")}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-900 truncate">
                    {formatCurrency(projectionData.endOfProgramProjection)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {t("dashboard.projectionDistribution")}
            </h4>

            <div className="space-y-2 sm:space-y-3">
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium text-blue-700 truncate">
                        {t("common.student")} ({program?.financialConfig?.colporter_percentage || 50}%)
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-blue-900 ml-2 flex-shrink-0">
                        {formatCurrency(projectionData.breakdown.students50)}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${program?.financialConfig?.colporter_percentage || 50}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2 sm:p-3 bg-purple-50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium text-purple-700 truncate">
                        Líderes Globales ({projectionData.leaderBreakdown.globalLeadersCount} líderes comparten {formatNumber(projectionData.leaderBreakdown.globalLeadersPercentage, 1)}%)
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-purple-900 ml-2 flex-shrink-0">
                        {formatCurrency(projectionData.breakdown.globalLeaders || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-purple-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${projectionData.leaderBreakdown.globalLeadersPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {projectionData.leaderBreakdown.customLeadersCount > 0 && (
                <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-medium text-yellow-700 truncate">
                          Líderes Personalizados ({projectionData.leaderBreakdown.customLeadersCount} líderes)
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-yellow-900 ml-2 flex-shrink-0">
                          {formatCurrency(projectionData.breakdown.customLeaders || 0)}
                        </span>
                      </div>
                      <div className="w-full bg-yellow-200 rounded-full h-1.5 sm:h-2">
                        <div
                          className="bg-yellow-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                          style={{ width: `${projectionData.leaderBreakdown.customLeadersPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                        {t("common.program")}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 ml-2 flex-shrink-0">
                        {formatCurrency(projectionData.breakdown.programProfit)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-gray-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, (projectionData.breakdown.programProfit / projectionData.endOfProgramProjection) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default ProgramProjections;