"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { ChevronDown, X, AlertTriangle, Download, FileText, Printer, Wallet } from "lucide-react"
import { clsx } from "clsx"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Badge from "../../components/ui/Badge"
import { useUserStore } from "../../stores/userStore"
import { useTransactionStore } from "../../stores/transactionStore"
import { useChargeStore } from "../../stores/chargeStore"
import { useCashAdvanceStore } from "../../stores/cashAdvanceStore"
import { useProgramStore } from "../../stores/programStore"
import { isColportableDay } from "../../utils/programUtils"

interface ReportData {
  personId: string
  personName: string
  personType: "COLPORTER" | "LEADER"
  startDate: string
  endDate: string
  dailyEarnings: Record<string, number>
  totalEarnings: number
  charges: Array<{
    id: string
    date: string
    amount: number
    reason: string
  }>
  advances: Array<{
    id: string
    date: string
    weekStartDate: string
    weekEndDate: string
    amount: number
  }>
  netAmount: number
  percentage: number
}

// Helper function to format dates without timezone issues
const formatDateSafe = (dateString: string): string => {
  if (!dateString) return ""

  // Extract date part if it's an ISO string
  const datePart = dateString.includes("T") ? dateString.split("T")[0] : dateString
  const [year, month, day] = datePart.split("-")

  // Create date in local timezone to avoid UTC conversion issues
  const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  return date.toLocaleDateString('en-US', { timeZone: 'UTC' })
}

// Helper function to get day name without timezone issues
const getDayNameSafe = (dateString: string): string => {
  if (!dateString) return ""

  const datePart = dateString.includes("T") ? dateString.split("T")[0] : dateString
  const [year, month, day] = datePart.split("-")

  // Create date in local timezone to avoid UTC conversion issues
  const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: 'UTC' })
}

// Helper function to format date for week labels without timezone issues
const formatWeekLabelSafe = (dateString: string): string => {
  if (!dateString) return ""

  const datePart = dateString.includes("T") ? dateString.split("T")[0] : dateString
  const [year, month, day] = datePart.split("-")

  // Create date in local timezone to avoid UTC conversion issues
  const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: 'UTC' })
}

// Helper function to get day of week number without timezone issues
const getDayOfWeekSafe = (dateString: string): number => {
  if (!dateString) return 0

  const datePart = dateString.includes("T") ? dateString.split("T")[0] : dateString
  const [year, month, day] = datePart.split("-")

  // Create date in local timezone to avoid UTC conversion issues
  const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  return date.getDay()
}

const IndividualReports: React.FC = () => {
  const { t } = useTranslation()
  const { fetchUsers, getLeaders, getColporters, fetchPeople, werePeopleFetched, wereUsersFetched } = useUserStore()
  const { transactions, fetchAllTransactions, wereTransactionsFetched } = useTransactionStore()
  const { charges, fetchCharges, wereChargesFetched } = useChargeStore()
  const { advances, fetchAdvances, wereAdvancesFetched } = useCashAdvanceStore()
  const { program, fetchProgram, wasProgramFetched } = useProgramStore()

  const [personType, setPersonType] = useState<"COLPORTER" | "LEADER">("COLPORTER")
  const [personSearch, setPersonSearch] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null)
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [totalProgramSales, setTotalProgramSales] = useState(0)
  const [totalLeadersCount, setTotalLeadersCount] = useState(1)

  const personDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      const dataToFetch: any[] = []
      !wereUsersFetched && dataToFetch.push(fetchUsers())
      !werePeopleFetched && dataToFetch.push(fetchPeople())
      !wereChargesFetched && dataToFetch.push(fetchCharges())
      !wereAdvancesFetched && dataToFetch.push(fetchAdvances())
      !wasProgramFetched && dataToFetch.push(fetchProgram())
      try {
        await Promise.all(dataToFetch)

        // Set default date range to current month
        const today = new Date()
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        setStartDate(firstDay.toISOString().split("T")[0])
        setEndDate(lastDay.toISOString().split("T")[0])

        // Calculate total program sales and leader count
        const allTransactions = wereTransactionsFetched ? transactions : await fetchAllTransactions('APPROVED');
        const totalSales = allTransactions
          .filter(
            (t) =>
              new Date(t.date) >= new Date(firstDay) &&
              new Date(t.date) <= new Date(lastDay) &&
              t.status === "APPROVED",
          )
          .reduce((sum, t) => sum + t.total, 0)
        setTotalProgramSales(totalSales)

        const leaders = getLeaders()
        const activeLeaders = leaders.filter((l) => l.status === "ACTIVE")
        setTotalLeadersCount(activeLeaders.length || 1) // Ensure we don't divide by zero
      } catch (error) {
        console.error("Error loading initial data:", error)
        setError(t("common.error"))
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [
    fetchUsers,
    fetchPeople,
    fetchCharges,
    fetchAdvances,
    fetchProgram,
    wereTransactionsFetched,
    transactions,
    getLeaders,
    t,
  ])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(event.target as Node)) {
        setIsPersonDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (isPersonDropdownOpen) {
        setIsPersonDropdownOpen(false)
      }
    }

    const handleResize = () => {
      if (isPersonDropdownOpen) {
        setIsPersonDropdownOpen(false)
      }
    }

    if (isPersonDropdownOpen) {
      window.addEventListener("scroll", handleScroll, true)
      window.addEventListener("resize", handleResize)
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleResize)
    }
  }, [isPersonDropdownOpen])

  const generateDateRange = (start: string, end: string) => {
    const startDate = new Date(start + "T00:00:00")
    const endDate = new Date(end + "T23:59:59")
    const dateArray = []

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dateArray.push(date.toISOString().split("T")[0])
    }

    return dateArray
  }

  const generateReport = async () => {
    if (!selectedPerson || !startDate || !endDate) {
      setError(t("individualReports.errorMissingSelection"))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const fetchedTransactions = wereTransactionsFetched ? transactions : await fetchAllTransactions('APPROVED')
      !wereChargesFetched && (await fetchCharges())
      !wereAdvancesFetched && (await fetchAdvances())

      const dateRange = generateDateRange(startDate, endDate)
      const personTransactions = fetchedTransactions.filter((t) => {
        const transactionDate = t.date.split("T")[0] // Extract YYYY-MM-DD from ISO string
        const isInDateRange = transactionDate >= startDate && transactionDate <= endDate
        return (
          (personType === "COLPORTER"
            ? Number(t.studentId) === Number(selectedPerson.id)
            : Number(t.leaderId) === Number(selectedPerson.id)) &&
          isInDateRange &&
          t.status === "APPROVED"
        )
      })

      // Only include APPLIED charges (not PENDING or CANCELLED)
      const personCharges = charges.filter((c) => {
        const chargeDate = c.date.includes("T") ? c.date.split("T")[0] : c.date
        return (
          c.personId === selectedPerson.id && chargeDate >= startDate && chargeDate <= endDate && c.status === "APPLIED"
        )
      })

      // Only include APPROVED advances (not PENDING or REJECTED)
      const personAdvances = advances.filter((a) => {
        const weekStart = a.weekStartDate.includes("T") ? a.weekStartDate.split("T")[0] : a.weekStartDate
        const weekEnd = a.weekEndDate.includes("T") ? a.weekEndDate.split("T")[0] : a.weekEndDate
        return (
          a.personId === selectedPerson.id && weekStart >= startDate && weekEnd <= endDate && a.status === "APPROVED"
        )
      })

      const percentage =
        personType === "COLPORTER"
          ? program?.financialConfig?.colporter_percentage
            ? Number.parseFloat(program.financialConfig.colporter_percentage)
            : 50
          : program?.financialConfig?.leader_percentage
            ? Number.parseFloat(program.financialConfig.leader_percentage)
            : 15

      const dailyEarnings: Record<string, number> = {}

      // For colporters, calculate daily earnings based on their transactions
      if (personType === "COLPORTER") {
        dateRange.forEach((date) => {
          const dayTransactions = personTransactions.filter((t) => {
            const transactionDate = t.date.split("T")[0]
            return transactionDate === date
          })
          const dayTotal = dayTransactions.reduce((sum, t) => sum + t.total, 0)
          dailyEarnings[date] = dayTotal
        })
      } else {
        // For leaders, set placeholder value since we don't show daily breakdown
        dateRange.forEach((date) => {
          dailyEarnings[date] = 0
        })
      }

      // Calculate earnings
      let totalEarnings = 0
      if (personType === "COLPORTER") {
        totalEarnings = Object.values(dailyEarnings).reduce((sum, amount) => sum + amount, 0)
      } else {
        // For leaders, calculate earnings based on total program sales divided by number of leaders
        const allProgramTransactions = fetchedTransactions.filter(
          (t) =>
            new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate) && t.status === "APPROVED",
        )

        const totalSales = allProgramTransactions.reduce((sum, t) => sum + t.total, 0)
        totalEarnings = totalSales // Store total program sales for display
      }

      const totalCharges = personCharges.reduce((sum, charge) => sum + charge.amount, 0)
      const totalAdvances = personAdvances.reduce((sum, advance) => sum + advance.advanceAmount, 0)
      const netAmount =
        personType === "COLPORTER"
          ? totalEarnings * (percentage / 100) - totalCharges - totalAdvances
          : (totalProgramSales * (percentage / 100)) / totalLeadersCount - totalCharges - totalAdvances

      setReportData({
        personId: selectedPerson.id,
        personName: selectedPerson.name,
        personType,
        startDate,
        endDate,
        dailyEarnings,
        totalEarnings,
        charges: personCharges.map((c) => ({
          id: c.id,
          date: c.date,
          amount: c.amount,
          reason: c.reason,
        })),
        advances: personAdvances.map((a) => ({
          id: a.id,
          date: a.requestDate,
          weekStartDate: a.weekStartDate,
          weekEndDate: a.weekEndDate,
          amount: a.advanceAmount,
        })),
        netAmount,
        percentage,
      })
    } catch (error) {
      console.error("Error generating report:", error)
      setError(t("individualReports.errorGenerateReport"))
    } finally {
      setIsLoading(false)
    }
  }

  const people = personType === "COLPORTER" ? getColporters() : getLeaders()

  const filteredPeople = people.filter((person) => person.name.toLowerCase().includes(personSearch.toLowerCase()))

  const handlePersonTypeChange = (type: "COLPORTER" | "LEADER") => {
    setPersonType(type)
    setSelectedPerson(null)
    setPersonSearch("")
  }

  const groupEarningsByWeeks = (dailyEarnings: Record<string, number>) => {
    const weeks: Array<{
      startDate: string
      endDate: string
      weekLabel: string
      weekTotal: number
      days: Array<{ date: string; dayName: string; amount: number; isColportableDay: boolean }>
    }> = []

    const dates = Object.keys(dailyEarnings).sort()
    let currentWeek: Array<{ date: string; dayName: string; amount: number; isColportableDay: boolean }> = []

    dates.forEach((date, index) => {
      const dayName = getDayNameSafe(date)
      const dayOfWeek = getDayOfWeekSafe(date)

      if (dayOfWeek === 0 || index === 0) {
        if (currentWeek.length > 0) {
          const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0)
          const endDate = currentWeek[currentWeek.length - 1].date
          weeks.push({
            startDate: currentWeek[0].date,
            endDate,
            weekLabel: `${formatWeekLabelSafe(currentWeek[0].date)} - ${formatWeekLabelSafe(endDate)}`,
            weekTotal,
            days: currentWeek,
          })
          currentWeek = []
        }
      }

      // Create date safely for isColportableDay check
      const datePart = date.includes("T") ? date.split("T")[0] : date
      const [year, month, day] = datePart.split("-")
      const currentDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      const isColportable = program ? isColportableDay(currentDate) : true

      currentWeek.push({
        date,
        dayName,
        amount: dailyEarnings[date],
        isColportableDay: isColportable,
      })
    })

    if (currentWeek.length > 0) {
      const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0)
      const endDate = currentWeek[currentWeek.length - 1].date
      weeks.push({
        startDate: currentWeek[0].date,
        endDate,
        weekLabel: `${formatWeekLabelSafe(currentWeek[0].date)} - ${formatWeekLabelSafe(endDate)}`,
        weekTotal,
        days: currentWeek,
      })
    }

    return weeks
  }

  const printReport = () => {
    if (!reportData) return

    const weeks = groupEarningsByWeeks(reportData.dailyEarnings)

    if (weeks.length === 0 && reportData.personType === "COLPORTER") {
      setError(t("individualReports.errorNoData"))
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t("individualReports.title")} - ${reportData.personName}</title>
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
          .leader-note {
            background-color: #cce5ff;
            border: 1px solid #b8daff;
            color: #004085;
            padding: 10px;
            margin: 15px 0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t("individualReports.title")}</h1>
          <p><strong>${t("common.person")}:</strong> ${reportData.personName}</p>
          <p><strong>${t("common.type")}:</strong> ${t(`personForm.${reportData.personType.toLowerCase()}`)}</p>
          <p><strong>${t("reports.period")}:</strong> ${formatDateSafe(reportData.startDate)} - ${formatDateSafe(reportData.endDate)}</p>
        </div>

        ${
          reportData.personType === "LEADER"
            ? `
            <div class="leader-note">
              <p><strong>${t("common.note")}:</strong> ${t("individualReports.leaderEarningsNote", { percentage: reportData.percentage, count: totalLeadersCount })}</p>
              <p>${t("individualReports.totalProgramSales")}: $${reportData.totalEarnings.toFixed(2)}</p>
            </div>
          `
            : ""
        }

        ${
          reportData.personType === "COLPORTER"
            ? `
          <table>
            <thead>
              <tr>
                <th rowspan="2">${t("common.week")}</th>
                <th colspan="8">${t("dashboard.earningsBreakdown")}</th>
                <th rowspan="2" class="charges-header">${t("charges.title")}</th>
                <th rowspan="2" class="advances-header">${t("cashAdvance.title")}</th>
              </tr>
              <tr>
                ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                  .map((dayName) => `<th>${t(`programSettings.days.${dayName.toLowerCase()}`)}</th>`)
                  .join("")}
                <th>${t("common.total")}</th>
              </tr>
            </thead>
            <tbody>
              ${weeks
                .map(
                  (week, i) => `
                <tr class="week-row">
                  <td>${i + 1}) ${week.weekLabel}</td>
                  ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                    .map((dayName) => {
                      const dayData = week.days.find((d) => d.dayName === dayName)
                      if (!dayData) return `<td>-</td>`
                      const cellClass = dayData.isColportableDay ? "" : "non-colportable"
                      return `<td class="${cellClass}">${dayData.amount.toFixed(2)}${
                        !dayData.isColportableDay ? `<br><small>${t("individualReports.nonColportable")}</small>` : ""
                      }</td>`
                    })
                    .join("")}
                  <td>${week.weekTotal.toFixed(2)}</td>
                  <td class="charges-cell">
                    ${(() => {
                      const weekCharges = reportData.charges.filter((charge) => {
                        const chargeDate = charge.date.includes("T") ? charge.date.split("T")[0] : charge.date
                        return chargeDate >= week.startDate && chargeDate <= week.endDate
                      })
                      const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0)
                      return chargeTotal > 0 ? `-${chargeTotal.toFixed(2)}` : "-"
                    })()}
                  </td>
                  <td class="advances-cell">
                    ${(() => {
                      const weekAdvances = reportData.advances.filter((advance) => {
                        const advanceDate = advance.date.includes("T") ? advance.date.split("T")[0] : advance.date
                        return advanceDate >= week.startDate && advanceDate <= week.endDate
                      })
                      const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0)
                      return advanceTotal > 0 ? `-${advanceTotal.toFixed(2)}` : "-"
                    })()}
                  </td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total-row">
                <td>${t("common.totals")}</td>
                ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                  .map((dayName) => {
                    const dayTotal = weeks.reduce((sum, week) => {
                      const dayData = week.days.find((d) => d.dayName === dayName)
                      return sum + (dayData ? dayData.amount : 0)
                    }, 0)
                    return `<td>${dayTotal.toFixed(2)}</td>`
                  })
                  .join("")}
                <td>${reportData.totalEarnings.toFixed(2)}</td>
                <td class="charges-cell">
                  ${(() => {
                    const chargeTotal = reportData.charges.reduce((sum, c) => sum + c.amount, 0)
                    return chargeTotal > 0 ? `-${chargeTotal.toFixed(2)}` : "-"
                  })()}
                </td>
                <td class="advances-cell">
                  ${(() => {
                    const advanceTotal = reportData.advances.reduce((sum, a) => sum + a.amount, 0)
                    return advanceTotal > 0 ? `-${advanceTotal.toFixed(2)}` : "-"
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        `
            : ""
        }

        ${
          reportData.charges.length > 0
            ? `
          <div class="charges-section">
            <h2>${t("charges.title")}</h2>
            <table>
              <thead>
                <tr>
                  <th>${t("charges.date")}</th>
                  <th>${t("charges.reason")}</th>
                  <th>${t("charges.amount")}</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.charges
                  .map(
                    (charge) => `
                  <tr>
                    <td>${formatDateSafe(charge.date)}</td>
                    <td>${charge.reason}</td>
                    <td>${charge.amount.toFixed(2)}</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="2">${t("charges.totalCharges")}</td>
                  <td>${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `
            : ""
        }

        ${
          reportData.advances.length > 0
            ? `
          <div class="advances-section">
            <h2>${t("cashAdvance.title")}</h2>
            <table>
              <thead>
                <tr>
                  <th>${t("cashAdvance.requestDate")}</th>
                  <th>${t("cashAdvance.week")}</th>
                  <th>${t("cashAdvance.advanceAmount")}</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.advances
                  .map(
                    (advance) => `
                  <tr>
                    <td>${formatDateSafe(advance.date)}</td>
                    <td>${formatDateSafe(advance.weekStartDate)} - ${formatDateSafe(advance.weekEndDate)}</td>
                    <td>${advance.amount.toFixed(2)}</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="2">${t("cashAdvance.totalAdvances")}</td>
                  <td>${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `
            : ""
        }

        <div class="summary-section">
          <h2>${t("dashboard.financialSummary")}</h2>
          <div class="summary-item">
            <span>${reportData.personType === "LEADER" ? t("individualReports.totalProgramSales") : t("dashboard.totalSales")}:</span>
            <span>$${reportData.totalEarnings.toFixed(2)}</span>
          </div>
          <div class="summary-item">
            <span>${t("individualReports.percentageLabel", { personType: t(`personForm.${reportData.personType.toLowerCase()}`), percentage: reportData.percentage, count: totalLeadersCount })}:</span>
            <span>$${(
              reportData.personType === "COLPORTER"
                ? reportData.totalEarnings * (reportData.percentage / 100)
                : (reportData.totalEarnings * (reportData.percentage / 100)) / totalLeadersCount
            ).toFixed(2)}</span>
          </div>
          <div class="summary-item">
            <span>${t("charges.totalCharges")}:</span>
            <span>$${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</span>
          </div>
          <div class="summary-item">
            <span>${t("cashAdvance.totalAdvances")}:</span>
            <span>$${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}</span>
          </div>
          <div class="summary-item total">
            <span>${t("dashboard.finalAmount")}:</span>
            <span>$${reportData.netAmount.toFixed(2)}</span>
          </div>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    } else {
      setError(t("individualReports.errorPrintWindow"))
    }
  }

  const exportReportCSV = () => {
    if (!reportData) return

    let csvContent = "data:text/csv;charset=utf-8,"

    csvContent += `${t("individualReports.title")}\r\n`
    csvContent += `${t("common.person")},${reportData.personName}\r\n`
    csvContent += `${t("common.type")},${t(`personForm.${reportData.personType.toLowerCase()}`)}\r\n`
    csvContent += `${t("reports.period")},${formatDateSafe(reportData.startDate)} - ${formatDateSafe(reportData.endDate)}\r\n\r\n`

    if (reportData.personType === "COLPORTER") {
      csvContent += `${t("individualReports.weeklyBreakdown")}\r\n`
      csvContent += `${t("common.week")},${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => t(`programSettings.days.${day.toLowerCase()}`)).join(",")},${t("common.total")},${t("charges.title")},${t("cashAdvance.title")}\r\n`

      const weeks = groupEarningsByWeeks(reportData.dailyEarnings)
      weeks.forEach((week, i) => {
        csvContent += `${i + 1}) ${week.weekLabel},`
        ;["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((dayName) => {
          const dayData = week.days.find((d) => d.dayName === dayName)
          csvContent += `${dayData ? dayData.amount.toFixed(2) : "0.00"},`
        })
        csvContent += `${week.weekTotal.toFixed(2)},`
        const weekCharges = reportData.charges.filter((charge) => {
          const chargeDate = charge.date.includes("T") ? charge.date.split("T")[0] : charge.date
          return chargeDate >= week.startDate && chargeDate <= week.endDate
        })
        const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0)
        csvContent += `${chargeTotal > 0 ? "-" + chargeTotal.toFixed(2) : "-"},`
        const weekAdvances = reportData.advances.filter((advance) => {
          const advanceDate = advance.date.includes("T") ? advance.date.split("T")[0] : advance.date
          return advanceDate >= week.startDate && advanceDate <= week.endDate
        })
        const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0)
        csvContent += `${advanceTotal > 0 ? "-" + advanceTotal.toFixed(2) : "-"}\r\n`
      })

      csvContent += `${t("common.totals")},`
      ;["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((dayName) => {
        const dayTotal = weeks.reduce((sum, week) => {
          const dayData = week.days.find((d) => d.dayName === dayName)
          return sum + (dayData ? dayData.amount : 0)
        }, 0)
        csvContent += `${dayTotal.toFixed(2)},`
      })
      csvContent += `${reportData.totalEarnings.toFixed(2)},`
      const totalCharges = reportData.charges.reduce((sum, c) => sum + c.amount, 0)
      csvContent += `${totalCharges > 0 ? "-" + totalCharges.toFixed(2) : "-"},`
      const totalAdvances = reportData.advances.reduce((sum, a) => sum + a.amount, 0)
      csvContent += `${totalAdvances > 0 ? "-" + totalAdvances.toFixed(2) : "-"}\r\n\r\n`
    } else {
      csvContent += `${t("dashboard.programSales")}\r\n`
      csvContent += `${t("individualReports.totalProgramSales")},${reportData.totalEarnings.toFixed(2)}\r\n`
      csvContent += `${t("individualReports.percentageLabel", { personType: t(`personForm.leader`), percentage: reportData.percentage, count: totalLeadersCount })},${((reportData.totalEarnings * (reportData.percentage / 100)) / totalLeadersCount).toFixed(2)}\r\n\r\n`
    }

    if (reportData.charges.length > 0) {
      csvContent += `${t("charges.title")}\r\n`
      csvContent += `${t("charges.date")},${t("charges.reason")},${t("charges.amount")}\r\n`
      reportData.charges.forEach((charge) => {
        csvContent += `${formatDateSafe(charge.date)},${charge.reason},${charge.amount.toFixed(2)}\r\n`
      })
      csvContent += `${t("charges.totalCharges")},,${reportData.charges
        .reduce((sum, c) => sum + c.amount, 0)
        .toFixed(2)}\r\n`
      csvContent += "\r\n"
    }

    if (reportData.advances.length > 0) {
      csvContent += `${t("cashAdvance.title")}\r\n`
      csvContent += `${t("cashAdvance.requestDate")},${t("cashAdvance.week")},${t("cashAdvance.advanceAmount")}\r\n`
      reportData.advances.forEach((advance) => {
        csvContent += `${formatDateSafe(advance.date)},${formatDateSafe(advance.weekStartDate)} - ${formatDateSafe(advance.weekEndDate)},${advance.amount.toFixed(
          2,
        )}\r\n`
      })
      csvContent += `${t("cashAdvance.totalAdvances")},,${reportData.advances
        .reduce((sum, a) => sum + a.amount, 0)
        .toFixed(2)}\r\n`
      csvContent += "\r\n"
    }

    csvContent += `${t("dashboard.financialSummary")}\r\n`
    csvContent += `${reportData.personType === "LEADER" ? t("individualReports.totalProgramSales") : t("dashboard.totalSales")},,${reportData.totalEarnings.toFixed(2)}\r\n`
    csvContent += `${t("individualReports.percentageLabel", { personType: t(`personForm.${reportData.personType.toLowerCase()}`), percentage: reportData.percentage, count: totalLeadersCount })},,${(
      reportData.personType === "COLPORTER"
        ? reportData.totalEarnings * (reportData.percentage / 100)
        : (reportData.totalEarnings * (reportData.percentage / 100)) / totalLeadersCount
    ).toFixed(2)}\r\n`
    csvContent += `${t("charges.totalCharges")},,${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}\r\n`
    csvContent += `${t("cashAdvance.totalAdvances")},,${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}\r\n`
    csvContent += `${t("dashboard.finalAmount")},,${reportData.netAmount.toFixed(2)}\r\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${reportData.personName}_report_${reportData.startDate}_${reportData.endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("individualReports.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("individualReports.description")}</p>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">{t("common.error")}</p>
          <p>{error}</p>
        </div>
      )}

      <Card title={t("individualReports.generateReport")} icon={<FileText size={20} />}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t("personForm.personType")}</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handlePersonTypeChange("COLPORTER")}
                className={clsx(
                  "flex items-center justify-center p-4 border-2 rounded-lg transition-colors",
                  personType === "COLPORTER"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 hover:border-primary-300 hover:bg-primary-50/50",
                )}
              >
                <div className="text-center">
                  <div className="font-medium">{t("personForm.colporter")}</div>
                  <div className="text-xs text-gray-500 mt-1">{t("personForm.colporterDescription")}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePersonTypeChange("LEADER")}
                className={clsx(
                  "flex items-center justify-center p-4 border-2 rounded-lg transition-colors",
                  personType === "LEADER"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 hover:border-primary-300 hover:bg-primary-50/50",
                )}
              >
                <div className="text-center">
                  <div className="font-medium">{t("personForm.leader")}</div>
                  <div className="text-xs text-gray-500 mt-1">{t("personForm.leaderDescription")}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="relative" ref={personDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("userForm.selectPerson", { type: t(`personForm.${personType.toLowerCase()}`) })}
            </label>
            <div
              className={clsx(
                "relative border border-gray-300 rounded-md shadow-sm",
                isPersonDropdownOpen && "ring-2 ring-primary-500 ring-opacity-50",
              )}
            >
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder={t("userForm.searchPersonPlaceholder", {
                    type: t(`personForm.${personType.toLowerCase()}`),
                  })}
                  value={personSearch}
                  onChange={(e) => {
                    setPersonSearch(e.target.value)
                    setIsPersonDropdownOpen(true)
                    setSelectedPerson(null)
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
                      "w-5 h-5 text-gray-400 transition-transform duration-200",
                      isPersonDropdownOpen && "transform rotate-180",
                    )}
                  />
                </button>
              </div>
              {selectedPerson && (
                <div className="px-3 py-2 border-t border-gray-200 bg-primary-50">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-primary-900 text-sm">{selectedPerson.name}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPerson(null)
                        setPersonSearch("")
                      }}
                      className="p-1 hover:bg-primary-100 rounded-full"
                    >
                      <X className="w-4 h-4 text-primary-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            {isPersonDropdownOpen &&
              !selectedPerson &&
              personDropdownRef.current &&
              createPortal(
                <div
                  className="fixed bg-white rounded-md shadow-lg border border-gray-200 max-h-80 overflow-hidden z-[9999]"
                  style={{
                    top: personDropdownRef.current.getBoundingClientRect().bottom + window.scrollY + 4,
                    left: personDropdownRef.current.getBoundingClientRect().left + window.scrollX,
                    width: personDropdownRef.current.getBoundingClientRect().width,
                  }}
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                >
                  <div className="overflow-y-auto max-h-80">
                    <div className="py-1">
                      {filteredPeople.length > 0 ? (
                        filteredPeople.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-150"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setSelectedPerson({ id: person.id, name: person.name })
                              setPersonSearch("")
                              setIsPersonDropdownOpen(false)
                            }}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            <div className="font-medium text-sm text-gray-900">{person.name}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">{t("userForm.noMatchingPeople")}</div>
                      )}
                    </div>
                  </div>
                </div>,
                document.body,
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("programSettings.startDate")}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />

            <Input
              label={t("programSettings.endDate")}
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
              className="w-full sm:w-auto"
            >
              {t("individualReports.generateReport")}
            </Button>
          </div>
        </div>
      </Card>

      {reportData && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <Button variant="outline" leftIcon={<Download size={18} />} onClick={exportReportCSV}>
              {t("reports.export")}
            </Button>

            <Button variant="primary" leftIcon={<Printer size={18} />} onClick={printReport}>
              {t("reports.print")}
            </Button>
          </div>

          <Card>
            <div className="bg-white border border-gray-300">
              <div className="bg-gray-100 border-b border-gray-300 p-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">{t("individualReports.title")}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>{t("common.person")}:</strong> {reportData.personName} |<strong>{t("common.type")}:</strong>{" "}
                    {t(`personForm.${reportData.personType.toLowerCase()}`)} |<strong>{t("reports.period")}:</strong>{" "}
                    {formatDateSafe(reportData.startDate)} - {formatDateSafe(reportData.endDate)}
                  </p>
                </div>
              </div>

              {reportData.personType === "COLPORTER" ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th
                          rowSpan={2}
                          className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm align-middle"
                        >
                          {t("common.week")}
                        </th>
                        <th colSpan={8} className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm">
                          {t("dashboard.earningsBreakdown")}
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-gray-400 px-3 py-2 bg-red-700 text-white text-sm align-middle"
                        >
                          {t("charges.title")}
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-gray-400 px-3 py-2 bg-purple-700 text-white text-sm align-middle"
                        >
                          {t("cashAdvance.title")}
                        </th>
                      </tr>
                      <tr>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                          <th
                            key={dayName}
                            className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm"
                          >
                            {t(`programSettings.days.${dayName.toLowerCase()}`)}
                          </th>
                        ))}
                        <th className="border border-gray-400 px-3 py-2 bg-[#0052B4] text-white text-sm">
                          {t("common.total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupEarningsByWeeks(reportData.dailyEarnings).map((week, index) => (
                        <tr
                          key={week.startDate}
                          className={clsx(
                            "hover:bg-gray-50 transition-colors",
                            index % 2 === 0 ? "bg-yellow-50" : "bg-white",
                          )}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white bg-[#0052B4] sticky left-0 z-10">
                            {index + 1}) {week.weekLabel}
                          </td>
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => {
                            const dayData = week.days.find((d) => d.dayName === dayName)
                            return (
                              <td
                                key={dayName}
                                className={clsx(
                                  "px-4 py-3 text-sm text-center whitespace-nowrap",
                                  dayData && !dayData.isColportableDay ? "bg-red-50" : "",
                                )}
                              >
                                {dayData ? dayData.amount.toFixed(2) : "-"}
                                {dayData && !dayData.isColportableDay && (
                                  <div className="text-[9px] text-red-600">{t("individualReports.nonColportable")}</div>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-sm text-center font-medium whitespace-nowrap">
                            {week.weekTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-red-50">
                            {(() => {
                              const weekCharges = reportData.charges.filter((charge) => {
                                const chargeDate = charge.date.includes("T") ? charge.date.split("T")[0] : charge.date
                                return chargeDate >= week.startDate && chargeDate <= week.endDate
                              })
                              const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0)
                              return chargeTotal > 0 ? `-${chargeTotal.toFixed(2)}` : "-"
                            })()}
                          </td>
                          <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-purple-50">
                            {(() => {
                              const weekAdvances = reportData.advances.filter((advance) => {
                                const advanceDate = advance.date.includes("T")
                                  ? advance.date.split("T")[0]
                                  : advance.date
                                return advanceDate >= week.startDate && advanceDate <= week.endDate
                              })
                              const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0)
                              return advanceTotal > 0 ? `-${advanceTotal.toFixed(2)}` : "-"
                            })()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                          {t("common.totals")}
                        </td>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => {
                          const dayTotal = groupEarningsByWeeks(reportData.dailyEarnings).reduce((sum, week) => {
                            const dayData = week.days.find((d) => d.dayName === dayName)
                            return sum + (dayData ? dayData.amount : 0)
                          }, 0)
                          return (
                            <td key={dayName} className="px-4 py-3 text-sm text-center whitespace-nowrap">
                              {dayTotal.toFixed(2)}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                          {reportData.totalEarnings.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-red-100">
                          {(() => {
                            const chargeTotal = reportData.charges.reduce((sum, c) => sum + c.amount, 0)
                            return chargeTotal > 0 ? `-${chargeTotal.toFixed(2)}` : "-"
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-purple-100">
                          {(() => {
                            const advanceTotal = reportData.advances.reduce((sum, a) => sum + a.amount, 0)
                            return advanceTotal > 0 ? `-${advanceTotal.toFixed(2)}` : "-"
                          })()}
                        </td>
                      </tr>
                      <tr className="bg-success-100 font-bold">
                        <td colSpan={8} className="px-4 py-3 text-sm font-bold text-success-800">
                          {t("dashboard.finalAmount")} ({reportData.percentage}% {t("common.of")} {t("dashboard.sales")}
                          {reportData.personType === "LEADER" ? ` ÷ ${totalLeadersCount}` : ""} - {t("charges.title")} -{" "}
                          {t("cashAdvance.title")})
                        </td>
                        <td colSpan={3} className="px-4 py-3 text-center text-sm font-bold text-success-800">
                          {reportData.netAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium">
                      <strong>{t("common.note")}:</strong>{" "}
                      {t("individualReports.leaderEarningsNote", {
                        percentage: reportData.percentage,
                        count: totalLeadersCount,
                      })}
                    </p>
                    <p className="text-blue-800">
                      {t("individualReports.totalProgramSales")}: ${reportData.totalEarnings.toFixed(2)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                      <h3 className="text-lg font-semibold text-primary-800 mb-3">{t("dashboard.programSales")}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-primary-700">
                          {t("individualReports.totalProgramSales")}:
                        </span>
                        <span className="text-xl font-bold text-primary-900">
                          ${reportData.totalEarnings.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-medium text-primary-700">
                          {t("individualReports.percentageLabel", {
                            personType: t(`personForm.leader`),
                            percentage: reportData.percentage,
                            count: totalLeadersCount,
                          })}
                          :
                        </span>
                        <span className="text-xl font-bold text-primary-900">
                          ${((reportData.totalEarnings * (reportData.percentage / 100)) / totalLeadersCount).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">{t("individualReports.deductions")}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{t("charges.totalCharges")}:</span>
                        <span className="text-lg font-bold text-red-600">
                          -${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-medium text-gray-700">{t("cashAdvance.totalAdvances")}:</span>
                        <span className="text-lg font-bold text-purple-600">
                          -${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-success-50 rounded-lg border border-success-200 mb-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-success-800">{t("dashboard.finalAmount")}</h3>
                      <span className="text-2xl font-bold text-success-700">${reportData.netAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-success-600 mt-1">{t("dashboard.afterDeductions")}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reportData.charges.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">{t("charges.title")}</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("charges.date")}
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("charges.reason")}
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("charges.amount")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {reportData.charges.map((charge) => (
                                <tr key={charge.id}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {formatDateSafe(charge.date)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{charge.reason}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-red-600">
                                    ${charge.amount.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50">
                                <td colSpan={2} className="px-3 py-2 whitespace-nowrap text-sm font-bold text-gray-900">
                                  {t("charges.totalCharges")}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-bold text-red-600">
                                  ${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {reportData.advances.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">{t("cashAdvance.title")}</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("cashAdvance.requestDate")}
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("cashAdvance.week")}
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {t("cashAdvance.advanceAmount")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {reportData.advances.map((advance) => (
                                <tr key={advance.id}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {formatDateSafe(advance.date)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {formatDateSafe(advance.weekStartDate)} - {formatDateSafe(advance.weekEndDate)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-purple-600">
                                    ${advance.amount.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50">
                                <td colSpan={2} className="px-3 py-2 whitespace-nowrap text-sm font-bold text-gray-900">
                                  {t("cashAdvance.totalAdvances")}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                                  ${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {reportData.charges.length > 0 && reportData.personType === "COLPORTER" && (
            <Card title={t("charges.applied")} icon={<AlertTriangle size={20} />}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("charges.date")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("charges.reason")}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("charges.amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.charges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDateSafe(charge.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{charge.reason}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                          -${charge.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100">
                      <td colSpan={2} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {t("charges.totalCharges")}
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

          {reportData.advances.length > 0 && reportData.personType === "COLPORTER" && (
            <Card title={t("cashAdvance.title")} icon={<Wallet size={20} />}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("cashAdvance.requestDate")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("cashAdvance.week")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("cashAdvance.status")}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("cashAdvance.advanceAmount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.advances.map((advance) => (
                      <tr key={advance.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDateSafe(advance.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDateSafe(advance.weekStartDate)} - {formatDateSafe(advance.weekEndDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <Badge variant="success">{t("cashAdvance.approved")}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                          -${advance.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100">
                      <td colSpan={3} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {t("cashAdvance.totalAdvances")}
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

          <Card title={t("individualReports.reportSummary")} icon={<FileText size={20} />}>
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-primary-900 mb-4">{t("dashboard.financialSummary")}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="text-sm font-medium text-gray-600">
                        {reportData.personType === "LEADER"
                          ? t("individualReports.totalProgramSales")
                          : t("dashboard.totalSales")}
                      </span>
                      <span className="text-lg font-bold text-gray-900">${reportData.totalEarnings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="text-sm font-medium text-gray-600">
                        {t("individualReports.percentageLabel", {
                          personType: t(`personForm.${reportData.personType.toLowerCase()}`),
                          percentage: reportData.percentage,
                          count: totalLeadersCount,
                        })}
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        $
                        {(reportData.personType === "COLPORTER"
                          ? reportData.totalEarnings * (reportData.percentage / 100)
                          : (reportData.totalEarnings * (reportData.percentage / 100)) / totalLeadersCount
                        ).toFixed(2)}
                      </span>
                    </div>
                    {reportData.charges.length > 0 && (
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-sm font-medium text-gray-600">{t("charges.totalCharges")}</span>
                        <span className="text-lg font-bold text-red-600">
                          -${reportData.charges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {reportData.advances.length > 0 && (
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-sm font-medium text-gray-600">{t("cashAdvance.totalAdvances")}</span>
                        <span className="text-lg font-bold text-purple-600">
                          -${reportData.advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-3 bg-success-100 rounded-lg shadow-sm border border-success-200">
                      <span className="text-sm font-medium text-success-700">{t("dashboard.finalAmount")}</span>
                      <span className="text-xl font-bold text-success-700">${reportData.netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-900 mb-4">
                    {t("individualReports.reportDetails")}
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">{t("common.person")}</span>
                        <span className="text-sm font-medium text-gray-900">{reportData.personName}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">{t("common.type")}</span>
                        <Badge variant={reportData.personType === "COLPORTER" ? "primary" : "success"}>
                          {t(`personForm.${reportData.personType.toLowerCase()}`)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">{t("reports.period")}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDateSafe(reportData.startDate)} - {formatDateSafe(reportData.endDate)}
                        </span>
                      </div>
                    </div>

                    {reportData.personType === "COLPORTER" && (
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">{t("dashboard.workingDays")}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {groupEarningsByWeeks(reportData.dailyEarnings).reduce(
                              (sum, week) => sum + week.days.filter((d) => d.isColportableDay).length,
                              0,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">{t("dashboard.daysWithSales")}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {Object.values(reportData.dailyEarnings).filter((amount) => amount > 0).length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">{t("dashboard.dailyAverage")}</span>
                          <span className="text-sm font-medium text-gray-900">
                            $
                            {(
                              reportData.totalEarnings /
                              Math.max(1, Object.values(reportData.dailyEarnings).filter((amount) => amount > 0).length)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-success-50 rounded-lg shadow-sm">
                      <p className="text-sm text-success-700">
                        <strong>{t("dashboard.finalAmount")}:</strong> ${reportData.netAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{t("dashboard.afterDeductions")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default IndividualReports
