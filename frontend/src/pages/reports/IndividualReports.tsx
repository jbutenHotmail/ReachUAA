"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Download, FileText, Printer, Wallet, ChevronDown, X, Receipt } from "lucide-react"
import { clsx } from "clsx"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Badge from "../../components/ui/Badge"
import { useUserStore } from "../../stores/userStore"
import { useProgramStore } from "../../stores/programStore"
import { isColportableDay } from "../../utils/programUtils"
import { getEndOfMonth, getStartOfMonth, isDateInRange, parseDate } from "../../utils/dateUtils"
import { formatNumber } from "../../utils/numberUtils"
import api from "../../api"

interface ReportData {
  personId: string
  personName: string
  personType: "COLPORTER" | "LEADER"
  startDate: string
  endDate: string
  dailyEarnings: Record<string, number>
  dailyHours: Record<string, number>
  totalHours: number
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
  expenses?: Array<{
    id: string
    date: string
    motivo: string
    category: string
    amount: number
    notes?: string
  }>
  earnings?: {
    expenses: number
    final: number
  }
  person?: {
    personType: "COLPORTER" | "LEADER"
  }
}

// Helper function to format dates consistently
const formatDateSafe = (dateString: string): string => {
  if (!dateString) return ""
  const date = parseDate(dateString)
  return date.toLocaleDateString("en-US")
}

// Helper function to get day name consistently
const getDayNameSafe = (dateString: string): string => {
  if (!dateString) return ""
  const date = parseDate(dateString)
  return date.toLocaleDateString("en-US", { weekday: "short" })
}

// Helper function to format date for week labels consistently
const formatWeekLabelSafe = (dateString: string): string => {
  if (!dateString) return ""
  const date = parseDate(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Helper function to get day of week number consistently
const getDayOfWeekSafe = (dateString: string): number => {
  if (!dateString) return 0
  const date = parseDate(dateString)
  return date.getDay()
}

// Helper function to generate all dates in a range
const generateDateRange = (start: string, end: string): string[] => {
  const dates: string[] = []
  const currentDate = new Date(start)
  const endDateObj = new Date(end)

  while (currentDate <= endDateObj) {
    dates.push(currentDate.toISOString().split("T")[0])
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

const IndividualReports: React.FC = () => {
  const { t } = useTranslation()
  const { fetchUsers, getLeaders, getColporters, fetchPeople, werePeopleFetched, wereUsersFetched } = useUserStore()
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
  const personDropdownRef = useRef<HTMLDivElement>(null)

  // Initial data loading useEffect
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      const dataToFetch = []
      if (!wereUsersFetched) dataToFetch.push(fetchUsers())
      if (!werePeopleFetched) dataToFetch.push(fetchPeople())
      if (!wasProgramFetched) dataToFetch.push(fetchProgram())

      try {
        await Promise.all(dataToFetch)
        // Set default date range to current month using consistent date utilities
        const startOfMonth = getStartOfMonth()
        const endOfMonth = getEndOfMonth()
        setStartDate(startOfMonth)
        setEndDate(endOfMonth)
      } catch (error) {
        console.error("Error loading initial data:", error)
        setError(t("common.error"))
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [wereUsersFetched, werePeopleFetched, wasProgramFetched, fetchUsers, fetchPeople, fetchProgram, getLeaders, t])

  // Handle outside clicks to close dropdown
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

  const generateReport = async () => {
    if (!selectedPerson || !startDate || !endDate) {
      setError(t("individualReports.errorMissingSelection"))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response: ReportData = await api.get(`/reports/earnings/${selectedPerson.id}`, {
        params: { startDate, endDate },
      })

      const data: ReportData = response // Assuming the API returns data in this format
      // Filter charges for this person from local data
      const personCharges = data.charges

      // Filter advances for this person from local data
      const personAdvances = data.advances
      console.log(selectedPerson)
      console.log(data)
      console.log(personAdvances)
      // Construct dailyEarnings from API response (assuming data.dailyEarnings exists)
      const dailyEarnings: Record<string, number> = data.dailyEarnings || {}

      setReportData({
        personId: selectedPerson.id,
        personName: selectedPerson.name,
        personType,
        startDate,
        endDate,
        dailyEarnings,
        dailyHours: data.dailyHours,
        totalHours: data.totalHours,
        totalEarnings: Object.values(dailyEarnings).reduce((sum, amount) => sum + amount, 0),
        charges: personCharges.map((c) => ({
          id: c.id,
          date: c.date,
          amount: c.amount,
          reason: c.reason,
        })),
        advances: personAdvances.map((a) => ({
          id: a.id,
          date: a.date,
          weekStartDate: a.week_start_date,
          weekEndDate: a.week_end_date,
          amount: a.amount,
        })),
        netAmount: data.earnings?.final || 0,
        percentage: data.earnings?.percentage || 0,
        expenses:
          data.expenses?.map((e: any) => ({
            id: e.id,
            date: e.date,
            motivo: e.motivo,
            category: e.category,
            amount: e.amount,
            notes: e.notes,
          })) || [],
        earnings: {
          expenses: data.earnings?.expenses || 0,
          final: data.earnings?.final || 0,
        },
        person: {
          personType: data.person?.personType || personType,
        },
      })
    } catch (error) {
      console.error("Error generating report:", error)
      setError(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const people = personType === "COLPORTER" ? getColporters() : getLeaders()
  const filteredPeople = people.filter(
    (person) =>
      person.name.toLowerCase().includes(personSearch.toLowerCase()) ||
      person.apellido?.toLowerCase().includes(personSearch.toLowerCase()),
  )

  const handlePersonTypeChange = (type: "COLPORTER" | "LEADER") => {
    setPersonType(type)
    setSelectedPerson(null)
    setPersonSearch("")
  }

  const groupEarningsByWeeks = (dailyEarnings: Record<string, number>, startDate: string, endDate: string) => {
    const weeks: Array<{
      startDate: string
      endDate: string
      weekLabel: string
      weekTotal: number
      days: Array<{ date: string; dayName: string; amount: number; isColportableDay: boolean }>
    }> = []

    // Generate all dates in the range
    const allDates = generateDateRange(startDate, endDate)
    let currentWeek: Array<{ date: string; dayName: string; amount: number; isColportableDay: boolean }> = []
    let weekStartDate: string | null = null

    allDates.forEach((date, index) => {
      const dayName = getDayNameSafe(date)
      const dayOfWeek = getDayOfWeekSafe(date)

      // Start a new week on Sunday (dayOfWeek === 0) or first date
      if (dayOfWeek === 0 || index === 0) {
        if (currentWeek.length > 0 && weekStartDate) {
          const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0)
          const endDate = currentWeek[currentWeek.length - 1].date
          weeks.push({
            startDate: weekStartDate,
            endDate,
            weekLabel: `${formatWeekLabelSafe(weekStartDate)} - ${formatWeekLabelSafe(endDate)}`,
            weekTotal,
            days: currentWeek,
          })
          currentWeek = []
        }
        weekStartDate = date
      }

      // Check if the date is colportable
      const currentDate = parseDate(date)
      const isColportable = program ? isColportableDay(currentDate) : true

      // Use the earnings from dailyEarnings if available, otherwise 0
      const amount = dailyEarnings[date] || 0

      currentWeek.push({
        date,
        dayName,
        amount,
        isColportableDay: isColportable,
      })
    })

    // Push the last week if it has any days
    if (currentWeek.length > 0 && weekStartDate) {
      const weekTotal = currentWeek.reduce((sum, day) => sum + day.amount, 0)
      const endDate = currentWeek[currentWeek.length - 1].date
      weeks.push({
        startDate: weekStartDate,
        endDate,
        weekLabel: `${formatWeekLabelSafe(weekStartDate)} - ${formatWeekLabelSafe(endDate)}`,
        weekTotal,
        days: currentWeek,
      })
    }

    return weeks
  }

  const printReport = () => {
    if (!reportData) return

    const weeks = groupEarningsByWeeks(reportData.dailyEarnings, reportData.startDate, reportData.endDate)

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
              <p><strong>${t("common.note")}:</strong> ${t("individualReports.leaderEarningsBasedOnTeam", { percentage: reportData.percentage })}</p>
              <p>${t("individualReports.teamSales")}: $${formatNumber(reportData.totalEarnings)}</p>
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
                      return `<td class="${cellClass}">${formatNumber(dayData.amount)}${
                        !dayData.isColportableDay ? `<br><small>${t("individualReports.nonColportable")}</small>` : ""
                      }</td>`
                    })
                    .join("")}
                  <td>${formatNumber(week.weekTotal)}</td>
                  <td class="charges-cell">
                    ${(() => {
                      const weekCharges = reportData.charges.filter((charge) => {
                        return isDateInRange(charge.date, week.startDate, week.endDate)
                      })
                      const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0)
                      return chargeTotal > 0 ? `-${formatNumber(chargeTotal)}` : "-"
                    })()}
                  </td>
                  <td class="advances-cell">
                    ${(() => {
                      const weekAdvances = reportData.advances
                      const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0)
                      return advanceTotal > 0 ? `-${formatNumber(advanceTotal)}` : "-"
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
                    return `<td>${formatNumber(dayTotal)}</td>`
                  })
                  .join("")}
                <td>${formatNumber(Number(reportData.totalEarnings))}</td>
                <td class="charges-cell">
                  ${(() => {
                    const chargeTotal = reportData.charges.reduce((sum, c) => sum + c.amount, 0)
                    return chargeTotal > 0 ? `-${formatNumber(chargeTotal)}` : "-"
                  })()}
                </td>
                <td class="advances-cell">
                  ${(() => {
                    const advanceTotal = reportData.advances.reduce((sum, a) => sum + a.amount, 0)
                    return advanceTotal > 0 ? `-${formatNumber(advanceTotal)}` : "-"
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
                    <td>${formatNumber(charge.amount)}</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="2">${t("charges.totalCharges")}</td>
                  <td>${formatNumber(reportData.charges.reduce((sum, c) => sum + c.amount, 0))}</td>
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
                    <td>${formatNumber(advance.amount)}</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="2">${t("cashAdvance.totalAdvances")}</td>
                  <td>${formatNumber(reportData.advances.reduce((sum, a) => sum + a.amount, 0))}</td>
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
            <span>${reportData.personType === "LEADER" ? t("individualReports.teamSales") : t("dashboard.totalSales")}:</span>
            <span>$${formatNumber(Number(reportData.totalEarnings))}</span>
          </div>
          <div class="summary-item">
            <span>${t("dashboard.totalHours")}:</span>
            <span>${formatNumber(reportData.totalHours)}</span>
          </div>
          <div class="summary-item">
            <span>${t("individualReports.percentageLabel", { personType: t(`personForm.${reportData.personType.toLowerCase()}`), percentage: reportData.percentage })}:</span>
            <span>$${formatNumber(reportData.totalEarnings * (reportData.percentage / 100))}</span>
          </div>
          <div class="summary-item">
            <span>${t("charges.totalCharges")}:</span>
            <span>$${formatNumber(reportData.charges.reduce((sum, c) => Number(sum) + Number(c.amount), 0))}</span>
          </div>
          <div class="summary-item">
            <span>${t("cashAdvance.totalAdvances")}:</span>
            <span>$${formatNumber(reportData.advances.reduce((sum, a) => Number(sum) + Number(a.amount), 0))}</span>
          </div>
          <div class="summary-item total">
            <span>${t("dashboard.finalAmount")}:</span>
            <span>$${formatNumber(reportData.netAmount)}</span>
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

      const weeks = groupEarningsByWeeks(reportData.dailyEarnings, reportData.startDate, reportData.endDate)
      weeks.forEach((week, i) => {
        csvContent += `${i + 1}) ${week.weekLabel},`
        ;["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((dayName) => {
          const dayData = week.days.find((d) => d.dayName === dayName)
          csvContent += `${dayData ? formatNumber(dayData.amount) : "0.00"},`
        })
        csvContent += `${formatNumber(week.weekTotal)},`

        const weekCharges = reportData.charges.filter((charge) => {
          return isDateInRange(charge.date, week.startDate, week.endDate)
        })
        const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0)
        csvContent += `${chargeTotal > 0 ? "-" + formatNumber(chargeTotal) : "-"},`

        const weekAdvances = reportData.advances
        const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0)
        csvContent += `${advanceTotal > 0 ? "-" + formatNumber(advanceTotal) : "-"}\r\n`
      })

      csvContent += `${t("common.totals")},`
      ;["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((dayName) => {
        const dayTotal = weeks.reduce((sum, week) => {
          const dayData = week.days.find((d) => d.dayName === dayName)
          return sum + (dayData ? dayData.amount : 0)
        }, 0)
        csvContent += `${formatNumber(dayTotal)},`
      })
      csvContent += `${formatNumber(Number(reportData.totalEarnings))},`

      const totalCharges = reportData.charges.reduce((sum, c) => sum + c.amount, 0)
      csvContent += `${totalCharges > 0 ? "-" + formatNumber(totalCharges) : "-"},`

      const totalAdvances = reportData.advances.reduce((sum, a) => sum + a.amount, 0)
      csvContent += `${totalAdvances > 0 ? "-" + formatNumber(totalAdvances) : "-"}\r\n\r\n`
    } else {
      csvContent += `${t("dashboard.teamSales")}\r\n`
      csvContent += `${t("individualReports.teamSales")},${formatNumber(Number(reportData.totalEarnings))}\r\n`
      csvContent += `${t("individualReports.percentageEarnings", { personType: t(`personForm.leader`), percentage: reportData.percentage })},${formatNumber(reportData.totalEarnings * (reportData.percentage / 100))}\r\n\r\n`
    }

    if (reportData.charges.length > 0) {
      csvContent += `${t("charges.title")}\r\n`
      csvContent += `${t("charges.date")},${t("charges.reason")},${t("charges.amount")}\r\n`
      reportData.charges.forEach((charge) => {
        csvContent += `${formatDateSafe(charge.date)},${charge.reason},${formatNumber(charge.amount)}\r\n`
      })
      csvContent += `${t("charges.totalCharges")},,${formatNumber(
        reportData.charges.reduce((sum, c) => sum + c.amount, 0),
      )}\r\n`
      csvContent += "\r\n"
    }

    if (reportData.advances.length > 0) {
      csvContent += `${t("cashAdvance.title")}\r\n`
      csvContent += `${t("cashAdvance.requestDate")},${t("cashAdvance.week")},${t("cashAdvance.advanceAmount")}\r\n`
      reportData.advances.forEach((advance) => {
        csvContent += `${formatDateSafe(advance.date)},${formatDateSafe(advance.weekStartDate)} - ${formatDateSafe(advance.weekEndDate)},${formatNumber(advance.amount)}\r\n`
      })
      csvContent += `${t("cashAdvance.totalAdvances")},,${formatNumber(
        reportData.advances.reduce((sum, a) => sum + a.amount, 0),
      )}\r\n`
      csvContent += "\r\n"
    }

    csvContent += `${t("dashboard.financialSummary")}\r\n`
    csvContent += `${reportData.personType === "LEADER" ? t("individualReports.teamSales") : t("dashboard.totalSales")},,${formatNumber(Number(reportData.totalEarnings))}\r\n`
    csvContent += `${t("individualReports.percentageEarnings", { personType: t(`personForm.${reportData.personType.toLowerCase()}`), percentage: reportData.percentage })},,${formatNumber(reportData.totalEarnings * (reportData.percentage / 100))}\r\n`
    csvContent += `${t("charges.totalCharges")},,${formatNumber(reportData.charges.reduce((sum, c) => sum + c.amount, 0))}\r\n`
    csvContent += `${t("cashAdvance.totalAdvances")},,${formatNumber(reportData.advances.reduce((sum, a) => sum + a.amount, 0))}\r\n`
    csvContent += `${t("dashboard.finalAmount")},,${formatNumber(reportData.netAmount)}\r\n`

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
        <div className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t("personForm.personType")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => handlePersonTypeChange("COLPORTER")}
                className={clsx(
                  "flex items-center justify-center p-3 sm:p-4 border-2 rounded-lg transition-colors",
                  personType === "COLPORTER"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 hover:border-primary-300 hover:bg-primary-50/50",
                )}
              >
                <div className="text-center">
                  <div className="font-medium text-sm sm:text-base">{t("personForm.colporter")}</div>
                  <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                    {t("personForm.colporterDescription")}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handlePersonTypeChange("LEADER")}
                className={clsx(
                  "flex items-center justify-center p-3 sm:p-4 border-2 rounded-lg transition-colors",
                  personType === "LEADER"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 hover:border-primary-300 hover:bg-primary-50/50",
                )}
              >
                <div className="text-center">
                  <div className="font-medium text-sm sm:text-base">{t("personForm.leader")}</div>
                  <div className="text-xs text-gray-500 mt-1 hidden sm:block">{t("personForm.leaderDescription")}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="relative" ref={personDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {personType === "COLPORTER" ? t("personForm.selectColporter") : t("expenses.selectLeader")}
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
                  placeholder={t("userForm.searchPersonPlaceholder", { type: personType.toLowerCase() })}
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
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-primary-900 text-sm">{selectedPerson.name}</div>
                      <Badge variant={personType === "COLPORTER" ? "primary" : "success"} size="sm">
                        {t(`personForm.${personType.toLowerCase()}`)}
                      </Badge>
                    </div>
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
            {isPersonDropdownOpen && !selectedPerson && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        onClick={() => {
                          setSelectedPerson({
                            id: person.id,
                            name: `${person.name} ${person.apellido || ""}`.trim(),
                          })
                          setPersonSearch("")
                          setIsPersonDropdownOpen(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">
                            {person.name} {person.apellido || ""}
                          </div>
                          <Badge variant={personType === "COLPORTER" ? "primary" : "success"} size="sm">
                            {t(`personForm.${personType.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">{t("common.noResults")}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
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

          <div className="w-full">
            <Button
              variant="primary"
              onClick={generateReport}
              isLoading={isLoading}
              disabled={!selectedPerson || !startDate || !endDate}
              className="w-full"
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
                      {groupEarningsByWeeks(reportData.dailyEarnings, reportData.startDate, reportData.endDate).map(
                        (week, index) => (
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
                                  {dayData ? formatNumber(dayData.amount) : "-"}
                                  {dayData && !dayData.isColportableDay && (
                                    <div className="text-[9px] text-red-600">
                                      {t("individualReports.nonColportable")}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 text-sm text-center font-medium whitespace-nowrap">
                              {formatNumber(week.weekTotal)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-red-50">
                              {(() => {
                                const weekCharges = reportData.charges.filter((charge) =>
                                  isDateInRange(charge.date, week.startDate, week.endDate),
                                )
                                const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0)
                                return chargeTotal > 0 ? `-${formatNumber(chargeTotal)}` : "-"
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-purple-50">
                              {(() => {
                                const weekAdvances = reportData.advances.filter(
                                  (advance) =>
                                    parseDate(advance.weekStartDate).toISOString().split("T")[0] === week.startDate,
                                )
                                const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0)
                                return advanceTotal > 0 ? `-${formatNumber(advanceTotal)}` : "-"
                              })()}
                            </td>
                          </tr>
                        ),
                      )}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                          {t("common.totals")}
                        </td>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => {
                          const dayTotal = groupEarningsByWeeks(
                            reportData.dailyEarnings,
                            reportData.startDate,
                            reportData.endDate,
                          ).reduce((sum, week) => {
                            const dayData = week.days.find((d) => d.dayName === dayName)
                            return sum + (dayData ? dayData.amount : 0)
                          }, 0)
                          return (
                            <td key={dayName} className="px-4 py-3 text-sm text-center whitespace-nowrap">
                              {formatNumber(dayTotal)}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                          {formatNumber(Number(reportData.totalEarnings))}
                        </td>
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-red-100">
                          {(() => {
                            const chargeTotal = reportData.charges.reduce((sum, c) => sum + c.amount, 0)
                            return chargeTotal > 0 ? `-${formatNumber(chargeTotal)}` : "-"
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-purple-100">
                          {(() => {
                            const advanceTotal = reportData.advances.reduce((sum, a) => sum + a.amount, 0)
                            return advanceTotal > 0 ? `-${formatNumber(advanceTotal)}` : "-"
                          })()}
                        </td>
                      </tr>
                      <tr className="bg-success-100 font-bold">
                        <td colSpan={8} className="px-4 py-3 text-sm font-bold text-success-800">
                          {t("dashboard.finalAmount")} ({reportData.percentage}% {t("common.of")} {t("dashboard.sales")}{" "}
                          - {t("charges.title")} - {t("cashAdvance.title")})
                        </td>
                        <td colSpan={3} className="px-4 py-3 text-center text-sm font-bold text-success-800">
                          {formatNumber(reportData.netAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
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
                          {t("dashboard.teamEarnings")}
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
                      {groupEarningsByWeeks(reportData.dailyEarnings, reportData.startDate, reportData.endDate).map(
                        (week, index) => (
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
                                <td key={dayName} className="px-4 py-3 text-sm text-center whitespace-nowrap">
                                  {dayData ? formatNumber(dayData.amount) : "-"}
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 text-sm text-center font-medium whitespace-nowrap">
                              {formatNumber(week.weekTotal)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-red-50">
                              {(() => {
                                const weekCharges = reportData.charges.filter((charge) =>
                                  isDateInRange(charge.date, week.startDate, week.endDate),
                                )
                                const chargeTotal = weekCharges.reduce((sum, c) => sum + c.amount, 0)
                                return chargeTotal > 0 ? `-${formatNumber(chargeTotal)}` : "-"
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-purple-50">
                              {(() => {
                                const weekAdvances = reportData.advances.filter((advance) =>
                                  isDateInRange(advance.date, week.startDate, week.endDate),
                                )
                                const advanceTotal = weekAdvances.reduce((sum, a) => sum + a.amount, 0)
                                return advanceTotal > 0 ? `-${formatNumber(advanceTotal)}` : "-"
                              })()}
                            </td>
                          </tr>
                        ),
                      )}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0 z-10">
                          {t("common.totals")}
                        </td>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => {
                          const dayTotal = groupEarningsByWeeks(
                            reportData.dailyEarnings,
                            reportData.startDate,
                            reportData.endDate,
                          ).reduce((sum, week) => {
                            const dayData = week.days.find((d) => d.dayName === dayName)
                            return sum + (dayData ? dayData.amount : 0)
                          }, 0)
                          return (
                            <td key={dayName} className="px-4 py-3 text-sm text-center whitespace-nowrap">
                              {formatNumber(dayTotal)}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                          {Number(reportData.totalEarnings).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-red-100">
                          {(() => {
                            const chargeTotal = reportData.charges.reduce((sum, c) => sum + c.amount, 0)
                            return chargeTotal > 0 ? `-${formatNumber(chargeTotal)}` : "-"
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap bg-purple-100">
                          {(() => {
                            const advanceTotal = reportData.advances.reduce((sum, a) => sum + a.amount, 0)
                            return advanceTotal > 0 ? `-${formatNumber(advanceTotal)}` : "-"
                          })()}
                        </td>
                      </tr>
                      <tr className="bg-success-100 font-bold">
                        <td colSpan={8} className="px-4 py-3 text-sm font-bold text-success-800">
                          {t("dashboard.finalAmount")} ({reportData.percentage}% {t("common.of")}{" "}
                          {t("reports.teamSales")} - {t("charges.title")} - {t("cashAdvance.title")})
                        </td>
                        <td colSpan={3} className="px-4 py-3 text-center text-sm font-bold text-success-800">
                          {formatNumber(reportData.netAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
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
                          -${formatNumber(charge.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100">
                      <td colSpan={2} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {t("charges.totalCharges")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600">
                        -${formatNumber(reportData.charges.reduce((sum, c) => sum + c.amount, 0))}
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
                          -${formatNumber(advance.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100">
                      <td colSpan={3} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {t("cashAdvance.totalAdvances")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                        -${formatNumber(reportData.advances.reduce((sum, a) => sum + a.amount, 0))}
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
                        {reportData.personType === "LEADER" ? t("reports.teamSales") : t("dashboard.totalSales")}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        ${formatNumber(Number(reportData.totalEarnings))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="text-sm font-medium text-gray-600">
                        {t("individualReports.percentageLabel", {
                          personType: t(`personForm.${reportData.personType.toLowerCase()}`),
                          percentage: reportData.percentage,
                        })}
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        ${formatNumber(reportData.totalEarnings * (reportData.percentage / 100))}
                      </span>
                    </div>
                    {reportData.charges.length > 0 && (
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-sm font-medium text-gray-600">{t("charges.totalCharges")}</span>
                        <span className="text-lg font-bold text-red-600">
                          -${formatNumber(reportData.charges.reduce((sum, c) => sum + c.amount, 0))}
                        </span>
                      </div>
                    )}
                    {reportData.advances.length > 0 && (
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-sm font-medium text-gray-600">{t("cashAdvance.totalAdvances")}</span>
                        <span className="text-lg font-bold text-purple-600">
                          -${formatNumber(reportData.advances.reduce((sum, a) => Number(sum) + Number(a.amount), 0))}
                        </span>
                      </div>
                    )}

                    {/* Leader Expenses - Only for leaders */}
                    {reportData.person?.personType === "LEADER" &&
                      reportData.expenses &&
                      reportData.expenses.length > 0 && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-orange-600">{t("expenses.totalExpenses")}</span>
                            <span className="text-lg font-bold text-orange-700">
                              -${formatNumber(reportData.earnings?.expenses || 0)}
                            </span>
                          </div>
                          {reportData.expenses.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {reportData.expenses.map((expense: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center text-xs bg-white p-2 rounded border border-orange-100"
                                >
                                  <div>
                                    <span className="text-orange-600 font-medium">{expense.motivo}</span>
                                    <span className="text-orange-500 ml-2">({t(`expenses.${expense.category}`)})</span>
                                  </div>
                                  <span className="font-medium text-orange-700">-${formatNumber(expense.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    <div className="flex justify-between items-center p-3 bg-success-100 rounded-lg shadow-sm border border-success-200">
                      <span className="text-sm font-medium text-success-700">{t("dashboard.finalAmount")}</span>
                      <span className="text-xl font-bold text-success-700">
                        ${formatNumber(Number(reportData.netAmount))}
                      </span>
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
                            {groupEarningsByWeeks(
                              reportData.dailyEarnings,
                              reportData.startDate,
                              reportData.endDate,
                            ).reduce((sum, week) => sum + week.days.filter((d) => d.isColportableDay).length, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">{t("dashboard.daysWithSales")}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {Object.values(reportData.dailyEarnings).filter((amount) => amount > 0).length}
                          </span>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">{t("dashboard.totalHours")}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatNumber(reportData.totalHours)}h
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
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
                        <strong>{t("dashboard.finalAmount")}:</strong> ${formatNumber(Number(reportData.netAmount))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{t("dashboard.afterDeductions")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Leader Expenses Details - Only for leaders */}
          {reportData.person?.personType === "LEADER" && reportData.expenses && reportData.expenses.length > 0 && (
            <Card title={t("expenses.title")} icon={<Receipt size={20} />} className="mt-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("expenses.date")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("expenses.motivo")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("expenses.category")}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("expenses.amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.expenses.map((expense: any) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {expense.motivo}
                          {expense.notes && <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Badge variant="warning" size="sm">
                            {t(`expenses.${expense.category}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-orange-600">
                          -${formatNumber(expense.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-orange-50">
                      <td colSpan={3} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-orange-800">
                        {t("expenses.totalExpenses")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-orange-700">
                        -${formatNumber(reportData.earnings?.expenses || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default IndividualReports
