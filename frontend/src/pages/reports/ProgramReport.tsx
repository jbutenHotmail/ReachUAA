"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js"
import { Pie, Bar } from "react-chartjs-2"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Badge from "../../components/ui/Badge"
import { useTransactionStore } from "../../stores/transactionStore"
import { useExpenseStore } from "../../stores/expenseStore"
import { useCashAdvanceStore } from "../../stores/cashAdvanceStore"
import { useProgramStore } from "../../stores/programStore"
import LoadingScreen from "../../components/ui/LoadingScreen"
import { formatNumber } from "../../utils/numberUtils"

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const ProgramReport: React.FC = () => {
  const { t } = useTranslation()
  const { transactions, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore()
  const { expenses, fetchExpenses, wereExpensesFetched } = useExpenseStore()
  const { advances, fetchAdvances, wereAdvancesFetched } = useCashAdvanceStore()
  const { program } = useProgramStore()

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        !wereTransactionsFetched && (await fetchAllTransactions("APPROVED"))
        !wereExpensesFetched && (await fetchExpenses())
        !wereAdvancesFetched && (await fetchAdvances())
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [fetchAllTransactions, fetchExpenses, fetchAdvances, wereTransactionsFetched, wereExpensesFetched, wereAdvancesFetched])

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "next") {
      if (selectedMonth === 11) {
        setSelectedMonth(0)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    } else {
      if (selectedMonth === 0) {
        setSelectedMonth(11)
        setSelectedYear(selectedYear - 1)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    }
  }

  // Filter data for selected month
  const filteredTransactions = transactions.filter((t) => {
    const date = new Date(t.date)
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear && t.status === "APPROVED"
  })

  const filteredExpenses = expenses.filter((e) => {
    const date = new Date(e.date)
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear && e.status === "APPROVED"
  })

  const filteredAdvances = advances.filter((a) => {
    const date = new Date(a.weekStartDate)
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear && a.status === "APPROVED"
  })

  // Calculate totals
  const totalRevenue = filteredTransactions.reduce((sum, t) => Number(sum) + Number(t.total), 0)
  const totalExpenses = filteredExpenses
    .filter((e) => e.leaderName === "Program") // Only program expenses
    .reduce((sum, e) => Number(sum) + Number(e.amount), 0)
  const totalAdvances = filteredAdvances.reduce((sum, a) => Number(sum) + Number(a.advanceAmount), 0)

  // Calculate distribution
  const colporterPercentage = program?.financialConfig?.colporter_percentage
    ? Number.parseFloat(program.financialConfig.colporter_percentage)
    : 50
  const leaderPercentage = program?.financialConfig?.leader_percentage
    ? Number.parseFloat(program.financialConfig.leader_percentage)
    : 15
  const programPercentage = 100 - colporterPercentage - leaderPercentage

  const distribution = {
    colporters: totalRevenue * (colporterPercentage / 100),
    leaders: totalRevenue * (leaderPercentage / 100),
    program: totalRevenue * (programPercentage / 100),
  }

  // Calculate net profit (program share minus only program expenses, not advances)
  const netProfit = distribution.program - totalExpenses

  // Calculate book totals
  const bookTotals = filteredTransactions.reduce(
    (acc, transaction) => {
      transaction.books?.forEach((book) => {
        if (book.size === "LARGE") {
          acc.large += book.quantity
        } else {
          acc.small += book.quantity
        }
      })
      return acc
    },
    { large: 0, small: 0, total: 0 }
  )
  bookTotals.total = bookTotals.large + bookTotals.small

  // Prepare chart data
  const pieChartData = {
    labels: [t("common.student"), t("common.leaders"), t("expenses.programCosts"), t("dashboard.programSurplus")],
    datasets: [
      {
        data: [distribution.colporters, distribution.leaders, totalExpenses, netProfit],
        backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#6b7280"],
        borderColor: ["#2563eb", "#059669", "#d97706", "#4b5563"],
        borderWidth: 2,
      },
    ],
  }

  const barChartData = {
    labels: [t("dashboard.revenue"), t("expenses.title"), t("dashboard.netProfit")],
    datasets: [
      {
        label: t("dashboard.amount"),
        data: [totalRevenue, totalExpenses, netProfit],
        backgroundColor: ["#3b82f6", "#f59e0b", "#10b981"],
        borderColor: ["#2563eb", "#d97706", "#059669"],
        borderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed || context.raw
            return `${context.label}: $${Number(value).toLocaleString()}`
          },
        },
      },
    },
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y || context.raw
            return `$${Number(value).toLocaleString()}`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `$${value.toLocaleString()}`,
        },
      },
    },
  }

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  if (isLoading) {
    return <LoadingScreen message={t("reports.loadingProgramReport")} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-primary-600" size={28} />
            {t("reports.programReport")}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600">{monthNames[selectedMonth]} {selectedYear}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")} className="px-2">
              <ChevronLeft size={20} />
            </Button>

            <div className="px-4 py-2 flex items-center gap-2 border-l border-r border-gray-200">
              <Calendar size={16} className="text-gray-500" />
              <span className="text-sm font-medium">
                {monthNames[selectedMonth]} {selectedYear}
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")} className="px-2">
              <ChevronRight size={20} />
            </Button>
          </div>

          <Button variant="primary" leftIcon={<Download size={18} />}>
            {t("common.export")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("dashboard.totalRevenue")}</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">${formatNumber(totalRevenue)}</p>
            <p className="text-xs text-gray-500">{filteredTransactions.length} {t("transactions.title")}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="text-warning-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("expenses.programCosts")}</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">${formatNumber(totalExpenses)}</p>
            <p className="text-xs text-gray-500">
              {filteredExpenses.filter((e) => e.leaderName === "Program").length} {t("expenses.title")}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="text-info-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("cashAdvance.totalAdvances")}</p>
            <p className="mt-1 text-2xl font-bold text-info-600">${formatNumber(totalAdvances)}</p>
            <p className="text-xs text-gray-500">{filteredAdvances.length} {t("cashAdvance.title")}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="text-success-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("dashboard.programSurplus")}</p>
            <p className="mt-1 text-2xl font-bold text-success-600">${formatNumber(netProfit)}</p>
            <p className="text-xs text-gray-500">{t("dashboard.afterExpenses")}</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t("dashboard.revenueDistribution")} className="h-96">
          <div className="h-full">
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </Card>

        <Card title={t("dashboard.financialOverview")} className="h-96">
          <div className="h-full">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <Card title={t("dashboard.financialBreakdown")} icon={<DollarSign size={20} />}>
        <div className="space-y-6">
          {/* Revenue Distribution */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{t("dashboard.revenueDistribution")}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-blue-700">
                      {t("common.student")} ({colporterPercentage}%)
                    </span>
                    <span className="text-sm font-bold text-blue-900">${formatNumber(distribution.colporters)}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${colporterPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-green-700">
                      {t("common.leaders")} ({leaderPercentage}%)
                    </span>
                    <span className="text-sm font-bold text-green-900">${formatNumber(distribution.leaders)}</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${leaderPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {t("common.program")} ({programPercentage.toFixed(1)}%)
                    </span>
                    <span className="text-sm font-bold text-gray-900">${formatNumber(distribution.program)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${programPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Program Finances */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{t("dashboard.programFinances")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-600">{t("dashboard.programShare")}</p>
                <p className="text-2xl font-bold text-blue-700">${formatNumber(distribution.program)}</p>
                <p className="text-xs text-blue-600">{programPercentage.toFixed(1)}% {t("dashboard.ofRevenue")}</p>
              </div>

              <div className="p-4 bg-warning-50 rounded-lg">
                <p className="text-sm font-medium text-warning-600">{t("expenses.programCosts")}</p>
                <p className="text-2xl font-bold text-warning-700">${formatNumber(totalExpenses)}</p>
                <p className="text-xs text-warning-600">
                  {filteredExpenses.filter((e) => e.leaderName === "Program").length} {t("expenses.title")}
                </p>
              </div>

              <div className="p-4 bg-success-50 rounded-lg">
                <p className="text-sm font-medium text-success-600">{t("dashboard.netProfit")}</p>
                <p className="text-2xl font-bold text-success-700">${formatNumber(netProfit)}</p>
                <p className="text-xs text-success-600">{t("dashboard.afterExpenses")}</p>
              </div>
            </div>
          </div>

          {/* Cash Advances Information (Separate section) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{t("cashAdvance.title")} ({t("dashboard.informational")})</h3>
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-teal-700">{t("cashAdvance.totalAdvances")}</p>
                  <p className="text-xs text-teal-600 mt-1">
                    {t("cashAdvance.advancesNote")} - {t("cashAdvance.deductedFromEarnings")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-teal-800">${formatNumber(totalAdvances)}</p>
                  <p className="text-xs text-teal-600">{filteredAdvances.length} {t("cashAdvance.title")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{t("expenses.byCategory")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(
                filteredExpenses
                  .filter((e) => e.leaderName === "Program")
                  .reduce((acc, expense) => {
                    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount)
                    return acc
                  }, {} as Record<string, number>)
              ).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {t(`expenses.${category}`)}
                  </span>
                  <Badge variant="warning">${formatNumber(amount)}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Books Summary */}
      <Card title={t("reports.booksDelivered")} icon={<Target size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("inventory.large")}</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{bookTotals.large}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("inventory.small")}</p>
            <p className="mt-2 text-3xl font-bold text-success-600">{bookTotals.small}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("common.total")}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{bookTotals.total}</p>
          </div>
        </div>
      </Card>

      {/* Goal Progress */}
      {program && (
        <Card title={t("dashboard.goalProgress")} icon={<Target size={20} />}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{t("dashboard.monthlyProgress")}</p>
                <p className="text-2xl font-bold text-gray-900">${formatNumber(totalRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{t("dashboard.programGoal")}</p>
                <p className="text-lg font-semibold text-gray-700">${formatNumber(Number(program.financial_goal))}</p>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((totalRevenue / Number(program.financial_goal)) * 100, 100)}%`,
                }}
              ></div>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>{((totalRevenue / Number(program.financial_goal)) * 100).toFixed(1)}% {t("dashboard.achieved")}</span>
              <span>
                ${formatNumber(Number(program.financial_goal) - totalRevenue)} {t("dashboard.remaining")}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ProgramReport