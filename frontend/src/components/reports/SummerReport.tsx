"use client"

import React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { clsx } from "clsx"
import { ChevronRight, Users, BarChart3, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, UserCog } from "lucide-react"
import { useTranslation } from "react-i18next"
import Card from "../ui/Card"
import Button from "../ui/Button"

interface SummerSale {
  colporterName: string
  leaderName?: string
  totalSales: number
  dailySales: {
    [date: string]: number
  }
}

interface SummerReportProps {
  sales: SummerSale[]
  showColporters?: boolean
  showLeaders?: boolean
  onToggleView?: () => void
  onToggleGrouping?: () => void
  timePeriod?: "day" | "week" | "month" | "all"
  selectedDate?: Date
}

type SortField = "name" | "total" | "average"
type SortDirection = "asc" | "desc"

// Utility functions for consistent date handling (same as parent component)
const parseDate = (dateStr: string): Date => {
  // Si es formato YYYY-MM-DD, crear fecha local
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }
  // Si es ISO string, extraer fecha UTC y convertir a local
  const utcDate = new Date(dateStr)
  return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate())
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

const isDateInWeek = (date: Date, weekStartDate: Date): boolean => {
  const startOfWeek = new Date(weekStartDate)
  const day = startOfWeek.getDay()
  startOfWeek.setDate(startOfWeek.getDate() - day)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return date >= startOfWeek && date <= endOfWeek
}

const isDateInMonth = (date: Date, monthDate: Date): boolean => {
  return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear()
}

const SummerReport: React.FC<SummerReportProps> = ({
  sales,
  showColporters = true,
  showLeaders = false,
  onToggleView,
  onToggleGrouping,
  timePeriod = "all",
  selectedDate = new Date(),
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(0)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const daysPerPage = 10

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const filteredDays = React.useMemo(() => {
    if (sales.length === 0) return []

    const allDates = new Set<string>()
    sales.forEach((sale) => {
      Object.keys(sale.dailySales).forEach((date) => {
        allDates.add(date)
      })
    })

    // Ordenar fechas correctamente (no como strings)
    const allDaysArray = Array.from(allDates).sort((a, b) => {
      const dateA = parseDate(a)
      const dateB = parseDate(b)
      return dateA.getTime() - dateB.getTime()
    })

    if (timePeriod === "all") {
      return allDaysArray
    }

    // Usar selectedDate directamente sin modificar
    const referenceDate = new Date(selectedDate)

    if (timePeriod === "day") {
      return allDaysArray.filter((dayStr) => {
        const dayDate = parseDate(dayStr)
        return isSameDay(dayDate, referenceDate)
      })
    }

    if (timePeriod === "week") {
      return allDaysArray.filter((dayStr) => {
        const dayDate = parseDate(dayStr)
        return isDateInWeek(dayDate, referenceDate)
      })
    }

    if (timePeriod === "month") {
      return allDaysArray.filter((dayStr) => {
        const dayDate = parseDate(dayStr)
        return isDateInMonth(dayDate, referenceDate)
      })
    }

    return allDaysArray
  }, [sales, timePeriod, selectedDate])

  const groupedSales = React.useMemo(() => {
    if (!showLeaders) return sales

    const leaderMap = new Map<string, SummerSale>()

    sales.forEach((sale) => {
      const leaderName = sale.leaderName || t("common.unknown")

      if (!leaderMap.has(leaderName)) {
        leaderMap.set(leaderName, {
          colporterName: leaderName,
          totalSales: 0,
          dailySales: {},
        })

        filteredDays.forEach((day) => {
          leaderMap.get(leaderName)!.dailySales[day] = 0
        })
      }

      const leaderData = leaderMap.get(leaderName)!

      filteredDays.forEach((day) => {
        if (sale.dailySales[day]) {
          leaderData.dailySales[day] = (leaderData.dailySales[day] || 0) + sale.dailySales[day]
          leaderData.totalSales += sale.dailySales[day]
        }
      })
    })

    return Array.from(leaderMap.values())
  }, [sales, showLeaders, filteredDays, t])

  const sortedSales = [...groupedSales].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case "name":
        aValue = a.colporterName.toLowerCase()
        bValue = b.colporterName.toLowerCase()
        break
      case "total":
        const aTotal = filteredDays.reduce((sum, day) => sum + (a.dailySales[day] || 0), 0)
        const bTotal = filteredDays.reduce((sum, day) => sum + (b.dailySales[day] || 0), 0)
        aValue = aTotal
        bValue = bTotal
        break
      case "average":
        const aDaysWithSales = filteredDays.filter((day) => a.dailySales[day] > 0).length
        const bDaysWithSales = filteredDays.filter((day) => b.dailySales[day] > 0).length
        aValue =
          aDaysWithSales > 0 ? filteredDays.reduce((sum, day) => sum + (a.dailySales[day] || 0), 0) / aDaysWithSales : 0
        bValue =
          bDaysWithSales > 0 ? filteredDays.reduce((sum, day) => sum + (b.dailySales[day] || 0), 0) / bDaysWithSales : 0
        break
      default:
        aValue = a.colporterName.toLowerCase()
        bValue = b.colporterName.toLowerCase()
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue)
      return sortDirection === "asc" ? comparison : -comparison
    } else {
      const comparison = (aValue as number) - (bValue as number)
      return sortDirection === "asc" ? comparison : -comparison
    }
  })

  const totalPages = Math.ceil(filteredDays.length / daysPerPage)
  const startIndex = currentPage * daysPerPage
  const endIndex = Math.min(startIndex + daysPerPage, filteredDays.length)
  const currentDays = filteredDays.slice(startIndex, endIndex)

  const totals = sortedSales.reduce(
    (acc, colporter) => {
      filteredDays.forEach((date) => {
        acc.dailyTotals[date] = (acc.dailyTotals[date] || 0) + (colporter.dailySales[date] || 0)
      })

      const colporterTotal = filteredDays.reduce((sum, day) => sum + (colporter.dailySales[day] || 0), 0)
      acc.totalSales += colporterTotal

      return acc
    },
    {
      dailyTotals: {} as Record<string, number>,
      totalSales: 0,
    },
  )

  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr)
    return {
      day: date.toLocaleDateString("es-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("es-US", { month: "short" }),
    }
  }

  const navigatePage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 0) {
      setCurrentPage(currentPage - 1)
    } else if (direction === "next" && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="text-primary-600" />
    ) : (
      <ArrowDown size={14} className="text-primary-600" />
    )
  }

  const averagePerDay = filteredDays.length > 0 ? totals.totalSales / filteredDays.length : 0

  const averagePerColporter = sortedSales.length > 0 ? totals.totalSales / sortedSales.length : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("reports.totalDonations")}</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{formatCurrency(totals.totalSales)}</p>
            <p className="text-xs text-gray-500">
              {timePeriod === "all"
                ? t("reports.completeProgram")
                : timePeriod === "month"
                  ? t("reports.currentMonth")
                  : timePeriod === "week"
                    ? t("reports.currentWeek")
                    : t("reports.today")}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("dashboard.dailyAverage")}</p>
            <p className="mt-2 text-3xl font-bold text-success-600">{formatCurrency(averagePerDay)}</p>
            <p className="text-xs text-gray-500">{t("reports.acrossDays", { count: filteredDays.length })}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("reports.perColporter")}</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">{formatCurrency(averagePerColporter)}</p>
            <p className="text-xs text-gray-500">{t("reports.perParticipant")}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t("reports.summerReport")}</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t("common.sortBy")}:</span>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-") as [SortField, SortDirection]
                  setSortField(field)
                  setSortDirection(direction)
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="name-asc">{t("reports.sortNameAsc")}</option>
                <option value="name-desc">{t("reports.sortNameDesc")}</option>
                <option value="total-desc">{t("reports.sortTotalDesc")}</option>
                <option value="total-asc">{t("reports.sortTotalAsc")}</option>
                <option value="average-desc">{t("reports.sortAverageDesc")}</option>
                <option value="average-asc">{t("reports.sortAverageAsc")}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigatePage("prev")} disabled={currentPage === 0}>
                <ChevronLeft size={16} />
              </Button>

              <span className="text-sm text-gray-600">
                {t("common.days")} {startIndex + 1}-{endIndex} {t("common.of")} {filteredDays.length}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigatePage("next")}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight size={16} />
              </Button>
            </div>

            {onToggleView && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleView}
                leftIcon={showColporters ? <BarChart3 size={16} /> : <Users size={16} />}
              >
                {showColporters ? t("reports.showTotalsOnly") : t("reports.showDetails")}
              </Button>
            )}

            {onToggleGrouping && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleGrouping}
                leftIcon={showLeaders ? <Users size={16} /> : <UserCog size={16} />}
              >
                {showLeaders ? t("reports.byColporters") : t("reports.byLeaders")}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {showColporters && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                    >
                      {showLeaders ? t("reports.byLeaders") : t("reports.byColporters")}
                      {getSortIcon("name")}
                    </button>
                  </th>
                )}
                {currentDays.map((date) => {
                  const { day, date: dayNum, month } = formatDate(date)
                  return (
                    <th
                      key={date}
                      className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b min-w-[80px]"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[10px]">{day}</span>
                        <span className="font-bold">{dayNum}</span>
                        <span className="text-[10px]">{month}</span>
                      </div>
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                  <button
                    onClick={() => handleSort("total")}
                    className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                  >
                    {t("common.total")}
                    {getSortIcon("total")}
                  </button>
                </th>
                {showColporters && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    {t("common.details")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {showColporters ? (
                sortedSales.map((colporter, index) => {
                  const colporterTotal = filteredDays.reduce((sum, day) => sum + (colporter.dailySales[day] || 0), 0)

                  return (
                    <tr
                      key={colporter.colporterName}
                      className={clsx(
                        "hover:bg-gray-50 transition-colors",
                        index % 2 === 0 ? "bg-yellow-50" : "bg-white",
                      )}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-white bg-[#0052B4] sticky left-0 z-10">
                        {colporter.colporterName}
                      </td>
                      {currentDays.map((date) => (
                        <td key={date} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                          {formatCurrency(colporter.dailySales[date] || 0)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                        {formatCurrency(colporterTotal)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(
                              showLeaders
                                ? `/reports/leader/${colporter.colporterName}`
                                : `/reports/summer-colporter/${colporter.colporterName}`,
                            )
                          }
                        >
                          <ChevronRight size={20} />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr className="bg-primary-50">
                  {currentDays.map((date) => (
                    <td
                      key={date}
                      className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap text-primary-900"
                    >
                      {formatCurrency(totals.dailyTotals[date] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-right font-bold whitespace-nowrap text-primary-900">
                    {formatCurrency(totals.totalSales)}
                  </td>
                </tr>
              )}

              {showColporters && (
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                    {t("common.totals")}
                  </td>
                  {currentDays.map((date) => (
                    <td key={date} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      {formatCurrency(totals.dailyTotals[date] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {formatCurrency(totals.totalSales)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center items-center mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={clsx(
                  "w-2 h-2 rounded-full transition-colors",
                  i === currentPage ? "bg-primary-600" : "bg-gray-300 hover:bg-gray-400",
                )}
              />
            ))}
          </div>
          <span className="ml-4 text-xs text-gray-500">
            {t("common.page")} {currentPage + 1} {t("common.of")} {totalPages}
          </span>
        </div>
      </Card>
    </div>
  )
}

export default SummerReport
