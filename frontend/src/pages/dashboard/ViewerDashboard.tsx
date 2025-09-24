import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { clsx } from "clsx"
import { useAuthStore } from "../../stores/authStore"
import { useProgramStore } from "../../stores/programStore"
import { useDashboardStore } from "../../stores/dashboardStore"
import { useBibleStudyStore } from "../../stores/bibleStudyStore"
import { useTransactionStore } from "../../stores/transactionStore"
import Card from "../../components/ui/Card"
import { FileText, DollarSign, BookText, RefreshCw, Grid3X3, BookOpen, Target } from "lucide-react"
import Button from "../../components/ui/Button"
import LoadingScreen from "../../components/ui/LoadingScreen"
import { formatNumber } from "../../utils/numberUtils"
import { normalizeDateString } from "../../utils/dateUtils"
import { useNavigate } from "react-router-dom"
import { BookSize } from "../../types"
import Badge from "../../components/ui/Badge"

const ViewerDashboard: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { program, fetchProgram } = useProgramStore()
  const { transactions, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore()
  const { bibleStudies, fetchBibleStudies, wereBibleStudiesFetched } = useBibleStudyStore()
  const {
    personalStats,
    isLoadingPersonalStats,
    personalStatsError,
    fetchPersonalStats,
    fetchDashboardStats,
    werePersonalStatsFetched,
  } = useDashboardStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"summary" | "daily">("summary")

  // Fetch initial data
  useEffect(() => {
    fetchDashboardStats()
    if (!wereTransactionsFetched) {
      fetchAllTransactions("APPROVED")
    }
    if (!wereBibleStudiesFetched) {
      fetchBibleStudies()
    }
  }, [fetchDashboardStats, fetchAllTransactions, fetchBibleStudies, wereTransactionsFetched, wereBibleStudiesFetched])

  // Handle data refresh
  const handleRefresh = async () => {
    if (!user?.id) return

    setIsRefreshing(true)
    try {
      await fetchPersonalStats(user.id, true, "user")
      await fetchProgram();
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch personal stats for the user
  useEffect(() => {
    if (user?.id && !werePersonalStatsFetched) {
      fetchPersonalStats(user.id, false, "user")
    }
  }, [user, fetchPersonalStats, werePersonalStatsFetched])

  // Filter user-specific transactions
  const userTransactions = useMemo(() => {
    if (!personalStats || !personalStats.person) return []
    return transactions.filter((t) => t.studentId === personalStats.person.id && t.status === "APPROVED")
  }, [transactions, personalStats])

  // Filter user-specific Bible studies
  const userBibleStudies = useMemo(() => {
    if (!personalStats || !personalStats.person) return []
    return bibleStudies.filter((bs) => bs.colporterId === personalStats.person.id)
  }, [bibleStudies, personalStats])

  // Compute daily report data
  const dailyReportData = useMemo(() => {
    if (!userTransactions.length && !userBibleStudies.length) return []

    const allDates = new Set<string>()

    // Normalize transaction dates
    userTransactions.forEach((t) => {
      const normalizedDate = normalizeDateString(t.date)
      allDates.add(normalizedDate)
    })

    // Normalize Bible study dates
    userBibleStudies.forEach((bs) => {
      const normalizedDate = normalizeDateString(bs.createdAt)
      allDates.add(normalizedDate)
    })

    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    return sortedDates
      .slice(0, 30)
      .map((date) => {
        const dayTransactions = userTransactions.filter((t) => normalizeDateString(t.date) === date)
        const dayStudies = userBibleStudies.filter((bs) => normalizeDateString(bs.createdAt) === date)

        const totalSales = dayTransactions.reduce((sum, t) => sum + t.total, 0)
        const totalBooks = dayTransactions.reduce(
          (sum, t) => sum + (t.books?.reduce((bookSum, book) => bookSum + book.quantity, 0) || 0),
          0,
        )
        const largeBooks = dayTransactions.reduce(
          (sum, t) =>
            sum +
            (t.books?.reduce((bookSum, book) => bookSum + (book.size === BookSize.LARGE ? book.quantity : 0), 0) || 0),
          0,
        )
        const smallBooks = dayTransactions.reduce(
          (sum, t) =>
            sum +
            (t.books?.reduce((bookSum, book) => bookSum + (book.size === BookSize.SMALL ? book.quantity : 0), 0) || 0),
          0,
        )

        return {
          date,
          transactions: dayTransactions,
          bibleStudies: dayStudies,
          totals: {
            sales: totalSales,
            books: totalBooks,
            largeBooks,
            smallBooks,
            studies: dayStudies.length,
          },
        }
      })
      .filter((day) => day.totals.sales > 0 || day.totals.studies > 0)
  }, [userTransactions, userBibleStudies])

  // Book totals calculation
  const bookTotals = useMemo(() => {
    if (!personalStats || !personalStats.transactions) return { large: 0, small: 0, total: 0 }

    return personalStats.transactions.reduce(
      (acc, transaction) => {
        transaction.books?.forEach((book: any) => {
          if (book.size === BookSize.LARGE) {
            acc.large += book.quantity
          } else if (book.size === BookSize.SMALL) {
            acc.small += book.quantity
          }
        })
        acc.total = acc.large + acc.small
        return acc
      },
      { large: 0, small: 0, total: 0 },
    )
  }, [personalStats])

  // Total hours calculation
  const totalHours = useMemo(() => {
    if (!personalStats || !personalStats.transactions) return 0
    return personalStats.transactions.reduce((sum, t) => Number(sum) + (Number(t.hours_worked) || 0), 0)
  }, [personalStats])

  // Loading state
  if (isLoadingPersonalStats || !personalStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t("dashboard.loading")} />
      </div>
    )
  }

  // Error state
  if (personalStatsError) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="text-danger-500 mb-4">
            <FileText size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("dashboard.errorTitle")}</h2>
          <p className="text-gray-600 mb-4">{personalStatsError}</p>
          <Button variant="primary" onClick={handleRefresh}>
            {t("dashboard.tryAgain")}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={clsx(isRefreshing && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={clsx(
            "py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2",
            activeTab === "summary"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
          )}
          onClick={() => setActiveTab("summary")}
        >
          <DollarSign size={16} />
          {t("dashboard.summary")}
        </button>
        <button
          className={clsx(
            "py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2",
            activeTab === "daily"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
          )}
          onClick={() => setActiveTab("daily")}
        >
          <Grid3X3 size={16} />
          {t("dashboard.dailyReport")}
        </button>
      </div>

      {/* Dashboard Content */}
      {personalStats && (
        <div className="space-y-6">
          {activeTab === "summary" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="text-primary-600" size={24} />
                  {t("dashboard.personalReport")}
                </h2>
                <span className="text-sm text-gray-500">
                  {new Date(personalStats.startDate).toLocaleDateString()} -{" "}
                  {new Date(personalStats.endDate).toLocaleDateString()}
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign className="text-primary-600" size={24} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">{t("dashboard.totalSales")}</p>
                    <p className="mt-1 text-2xl font-bold text-primary-600">
                      ${formatNumber(personalStats.totals.total)}
                    </p>
                  </div>
                </Card>

                <Card>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <BookText className="text-warning-600" size={24} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">{t("dashboard.totalBooks")}</p>
                    <p className="mt-1 text-2xl font-bold text-warning-600">{bookTotals.total}</p>
                    <p className="text-xs text-gray-500">
                      {bookTotals.large} {t("dashboard.largeBooks")}, {bookTotals.small} {t("dashboard.smallBooks")}
                    </p>
                  </div>
                </Card>

                {personalStats.topSellerBook && (
                  <Card>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <div className="relative">
                          <img
                            src={
                              personalStats.topSellerBook.image_url ||
                              "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg"
                            }
                            alt={personalStats.topSellerBook.title}
                            className="h-12 w-8 object-cover rounded shadow-sm"
                          />
                          <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            ★
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500">{t("dashboard.topSeller")}</p>
                      <p
                        className="mt-1 text-lg font-bold text-purple-600 truncate max-w-full"
                        title={personalStats.topSellerBook.title}
                      >
                        {personalStats.topSellerBook.title}
                      </p>
                      <div className="flex justify-center items-center gap-2 mt-1">
                        <Badge variant="info" size="sm">
                          {personalStats.topSellerBook.totalQuantity} {t("common.books")}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          ${personalStats.topSellerBook.totalRevenue.toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )}

                <Card>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign className="text-cta-600" size={24} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">{t("dashboard.dailyAverage")}</p>
                    <p className="mt-1 text-2xl font-bold text-cta-600">
                      $
                      {formatNumber(
                        personalStats.totals.total / Math.max(1, Object.keys(personalStats.dailyEarnings).length),
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{t("dashboard.perWorkingDay")}</p>
                  </div>
                </Card>
              </div>

              {/* Earnings Breakdown */}
              <Card title={t("dashboard.earningsBreakdown")} icon={<DollarSign size={20} />}>
                <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600">
                        {t("dashboard.yourEarnings", { percentage: personalStats.earnings.percentage })}
                      </p>
                      <p className="text-2xl font-bold text-primary-700 mt-1">
                        ${formatNumber(personalStats.earnings.net)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-primary-600">{t("dashboard.basedOnSales")}</p>
                      <p className="text-lg font-semibold text-primary-700">
                        ${formatNumber(personalStats.totals.total)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-success-50 rounded-lg">
                    <p className="text-sm font-medium text-success-700">{t("dashboard.workingDays")}</p>
                    <p className="text-lg font-bold text-success-700">
                      {Object.keys(personalStats.dailyEarnings).length}
                    </p>
                    <p className="text-xs text-success-600">{t("dashboard.daysWithSales")}</p>
                    <p className="text-sm font-medium text-success-700 mt-2">{t("dashboard.totalHours")}</p>
                    <p className="text-lg font-bold text-success-700">{totalHours}h</p>
                    <p className="text-xs text-success-600">{t("dashboard.hoursWorked")}</p>
                  </div>
                </div>

                {(personalStats.earnings.charges > 0 || personalStats.earnings.advances > 0) && (
                  <div className="space-y-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t("individualReports.deductions")}</h4>
                    <div className="space-y-2">
                      {personalStats.earnings.charges > 0 && (
                        <div className="p-3 bg-danger-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-danger-700">{t("dashboard.chargesFines")}</p>
                              <p className="text-xs text-danger-600">
                                {personalStats.charges.length} {t("dashboard.activeCharges")}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-danger-700">
                              -${formatNumber(personalStats.earnings.charges)}
                            </p>
                          </div>
                          {personalStats.charges.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {personalStats.charges.map((charge: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center text-xs bg-white p-2 rounded border border-danger-100"
                                >
                                  <span className="text-danger-600">{charge.reason}</span>
                                  <span className="font-medium text-danger-700">-${charge.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {personalStats.earnings.advances > 0 && (
                        <div className="p-3 bg-warning-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-warning-700">{t("dashboard.cashAdvances")}</p>
                              <p className="text-xs text-warning-600">
                                {personalStats.advances.length} {t("dashboard.approvedAdvances")}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-warning-700">
                              -${formatNumber(personalStats.earnings.advances)}
                            </p>
                          </div>
                          {personalStats.advances.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {personalStats.advances.map((advance: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center text-xs bg-white p-2 rounded border border-warning-100"
                                >
                                  <span className="text-warning-600">
                                    Semana{" "}
                                    {new Date(advance.week_start_date).toLocaleDateString("es-ES", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      timeZone: "UTC",
                                    })}{" "}
                                    -{" "}
                                    {new Date(advance.week_end_date).toLocaleDateString("es-ES", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      timeZone: "UTC",
                                    })}
                                  </span>
                                  <span className="font-medium text-warning-700">
                                    -${Number(advance.amount).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-lg border border-success-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-success-700">{t("dashboard.finalAmount")}</p>
                      <p className="text-xs text-success-600">{t("dashboard.afterDeductions")}</p>
                    </div>
                    <p className="text-2xl font-bold text-success-800">${formatNumber(personalStats.earnings.final)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{t("dashboard.dailySales")}</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(personalStats.dailyEarnings)
                      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                      .slice(-7)
                      .map(([date, amount]) => {
                        const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" })
                        const dayNum = new Date(date).getDate()
                        const maxAmount = Math.max(...Object.values(Number(personalStats.dailyEarnings)))
                        const heightPercentage = Math.max(10, Math.min(100, (Number(amount) / maxAmount) * 100))

                        return (
                          <div key={date} className="flex flex-col items-center">
                            <div className="text-xs text-gray-500">{dayName}</div>
                            <div className="w-full flex justify-center items-end h-24">
                              <div
                                className="w-5 sm:w-8 bg-primary-200 hover:bg-primary-300 rounded-t transition-all"
                                style={{ height: `${heightPercentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs font-medium">{dayNum}</div>
                            <div className="text-xs text-gray-600">${formatNumber(Number(amount), 0)}</div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </Card>

              {/* Personal Program Projection */}
              <Card title={t("dashboard.personalProgramProjection")} icon={<Target className="text-purple-600" size={20} />}>
                <div className="space-y-4">
                  {(() => {
                    // Calculate projection based on current performance
                    const workingDaysWithSales = Object.keys(personalStats.dailyEarnings).length
                    const totalSales = personalStats.totals.total
                    const dailyAverage = totalSales / Math.max(workingDaysWithSales, 1)

                    // Calculate program duration and remaining days
                    const programStart = new Date(personalStats.startDate)
                    const programEnd = new Date(personalStats.endDate)
                    const today = new Date()

                    // Calculate working days using program configuration
                    const calculateWorkingDays = (startDate: Date, endDate: Date) => {
                      let workingDaysCount = 0
                      const currentDate = new Date(startDate)
                      
                      while (currentDate <= endDate) {
                        // Check if this date is a working day according to program config
                        const dateStr = currentDate.toISOString().split('T')[0]
                        
                        // Check custom days first
                        const customDay = program?.customDays?.find(day => {
                          const customDayStr = new Date(day.date).toISOString().split('T')[0]
                          return customDayStr === dateStr
                        })
                        
                        let isWorkingDay = false
                        if (customDay) {
                          // Use custom day setting - only count if it's marked as working day
                          isWorkingDay = customDay.is_working_day === true || Number(customDay.is_working_day) === 1
                        } else {
                          // Use default working days
                          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                          const workingDay = program?.workingDays?.find(day => day.day_of_week === dayName)
                          isWorkingDay = workingDay?.is_working_day === true || Number(workingDay?.is_working_day) === 1
                        }
                        
                        if (isWorkingDay) {
                          workingDaysCount++
                        }
                        
                        currentDate.setDate(currentDate.getDate() + 1)
                      }
                      
                      return workingDaysCount
                    }
                    
                    const totalWorkingDays = calculateWorkingDays(programStart, programEnd)
                    
                    // Check if today is a working day
                    const todayIsWorkingDay = (() => {
                      if (today < programStart || today > programEnd) return false
                      
                      const todayStr = today.toISOString().split('T')[0]
                      const customDay = program?.customDays?.find(day => {
                        const customDayStr = new Date(day.date).toISOString().split('T')[0]
                        
                        return customDayStr === todayStr
                      })
                      
                      if (customDay) {
                        // Only count as working day if explicitly marked as such
                        return customDay.is_working_day === true || Number(customDay.is_working_day) === 1
                      }
                      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                      const workingDay = program?.workingDays?.find(day => day.day_of_week === dayName)
                      return workingDay?.is_working_day === true || Number(workingDay?.is_working_day) === 1
                    })()

                    // Calculate elapsed working days including today if it's a working day
                    const elapsedWorkingDays = calculateWorkingDays(programStart, today)
                    const remainingWorkingDays = Math.max(0, totalWorkingDays - elapsedWorkingDays) + (todayIsWorkingDay ? 0 : -1)

                    // Calculate projections
                    const projectedTotalSales = dailyAverage * totalWorkingDays
                    const projectedRemainingEarnings = dailyAverage * remainingWorkingDays
                    const projectedFinalEarnings = projectedTotalSales * (personalStats.earnings.percentage / 100)

                    // Calculate progress percentage
                    const progressPercentage = Math.min(100, (elapsedWorkingDays / totalWorkingDays) * 100)

                    return (
                      <>
                        {/* Current vs Projected */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                            <div className="text-center">
                              <p className="text-sm font-medium text-blue-600">{t("dashboard.currentSales")}</p>
                              <p className="text-2xl font-bold text-blue-700">${formatNumber(totalSales)}</p>
                              <p className="text-xs text-blue-600 mt-1">
                                {t("dashboard.workingDaysProgress", { workingDaysWithSales, elapsedWorkingDays })}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                            <div className="text-center">
                              <p className="text-sm font-medium text-purple-600">{t("dashboard.finalProjection")}</p>
                              <p className="text-2xl font-bold text-purple-700">${formatNumber(projectedTotalSales)}</p>
                              <p className="text-xs text-purple-600 mt-1">
                                {t("dashboard.totalWorkingDays", { count: totalWorkingDays })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t("dashboard.programProgress")}</span>
                            <span className="font-medium">{t("dashboard.progressPercentage", { percentage: progressPercentage.toFixed(1) })}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{programStart.toLocaleDateString()}</span>
                            <span>{t("dashboard.remainingWorkingDays", { count: remainingWorkingDays })}</span>
                            <span>{programEnd.toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Earnings Projection */}
                        <div className="p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-lg border border-success-200">
                          <div className="space-y-3">
                            <div className="text-center">
                              <p className="text-sm font-medium text-success-600">{t("dashboard.projectedEarnings")}</p>
                              <p className="text-3xl font-bold text-success-700">${formatNumber(projectedFinalEarnings)}</p>
                              <p className="text-xs text-success-600">
                                {t("dashboard.earningsPercentage", { percentage: personalStats.earnings.percentage, total: formatNumber(projectedTotalSales) })}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="text-center p-2 bg-white/60 rounded">
                                <p className="text-success-600">{t("dashboard.dailyAverageProjection")}</p>
                                <p className="font-bold text-success-700">${formatNumber(dailyAverage)}</p>
                              </div>
                              <div className="text-center p-2 bg-white/60 rounded">
                                <p className="text-success-600">{t("dashboard.remainingPotential")}</p>
                                <p className="font-bold text-success-700">${formatNumber(projectedRemainingEarnings)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Performance Insights */}
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t("dashboard.performanceInsights")}</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            {dailyAverage > 100 && (
                              <div className="flex items-center gap-2 text-success-600">
                                <span>🎯</span>
                                <span>{t("dashboard.highPerformanceInsight")}</span>
                              </div>
                            )}
                            {dailyAverage <= 100 && dailyAverage > 50 && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <span>📈</span>
                                <span>{t("dashboard.moderatePerformanceInsight")}</span>
                              </div>
                            )}
                            {dailyAverage <= 50 && (
                              <div className="flex items-center gap-2 text-warning-600">
                                <span>⚡</span>
                                <span>{t("dashboard.lowPerformanceInsight")}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span>📅</span>
                              <span>
                                {t("dashboard.earningsGoalInsight", {
                                  earnings: formatNumber(projectedFinalEarnings),
                                  average: formatNumber(dailyAverage)
                                })}
                              </span>
                            </div>
                            {remainingWorkingDays > 0 && (
                              <div className="flex items-center gap-2">
                                <span>⏰</span>
                                <span>
                                  {t("dashboard.remainingEarningsInsight", {
                                    remainingDays: remainingWorkingDays,
                                    earnings: formatNumber(projectedRemainingEarnings)
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </Card>
            </>
          )}

          {activeTab === "daily" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Grid3X3 className="text-primary-600" size={24} />
                  {t("dashboard.dailyReport")}
                </h2>
                <span className="text-sm text-gray-500">
                  {t("dashboard.lastDaysWithActivity", { count: dailyReportData.length })}
                </span>
              </div>

              {dailyReportData.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {dailyReportData.map((day) => (
                    <div
                      key={day.date}
                      onClick={() => navigate(`/daily-report/${day.date}`)}
                      className="cursor-pointer"
                    >
                      <Card className="hover:shadow-md transition-shadow border-2 hover:border-primary-300">
                        <div className="text-center p-2">
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            {new Date(day.date).toLocaleDateString("es-ES", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })}
                          </div>

                          <div className="space-y-2">
                            {day.totals.sales > 0 && (
                              <div className="flex items-center justify-center gap-1">
                                <DollarSign size={12} className="text-primary-600" />
                                <span className="text-sm font-bold text-primary-600">
                                  ${formatNumber(day.totals.sales)}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-center gap-1 flex-wrap">
                              {day.totals.largeBooks > 0 && (
                                <Badge variant="primary" size="sm" className="text-xs px-1">
                                  {day.totals.largeBooks}G
                                </Badge>
                              )}
                              {day.totals.smallBooks > 0 && (
                                <Badge variant="success" size="sm" className="text-xs px-1">
                                  {day.totals.smallBooks}P
                                </Badge>
                              )}
                              {day.totals.studies > 0 && (
                                <Badge variant="warning" size="sm" className="text-xs px-1 flex items-center gap-1">
                                  <BookOpen size={10} />
                                  {day.totals.studies}
                                </Badge>
                              )}
                            </div>

                            {day.totals.sales === 0 && day.totals.books === 0 && day.totals.studies === 0 && (
                              <div className="text-xs text-gray-400">{t("dashboard.noActivity")}</div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Grid3X3 size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t("dashboard.noActivityRegistered")}</h3>
                  <p className="text-sm text-gray-500">{t("dashboard.startCreatingTransactions")}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ViewerDashboard
