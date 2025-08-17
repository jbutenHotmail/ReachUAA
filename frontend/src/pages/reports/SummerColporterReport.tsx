"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Calendar, TrendingUp, BookOpen, DollarSign, Users } from "lucide-react"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Badge from "../../components/ui/Badge"
import { useProgramStore } from "../../stores/programStore"
import { api } from "../../api"
import LoadingScreen from "../../components/ui/LoadingScreen"
import type { Colporter, Leader } from "../../types"

interface ColporterSummerStats {
  bruto: {
    total: number
    promedio: number
  }
  neto: {
    total: number
    promedio: number
  }
  libros: {
    grandes: number
    pequenos: number
  }
  workingDays: number
  bestDay: {
    date: string
    amount: number
  }
  worstDay: {
    date: string
    amount: number
  }
}

const SummerColporterReport: React.FC = () => {
  const { t } = useTranslation()
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { program } = useProgramStore()

  // State for colporter/leader data
  const [personId, setPersonId] = useState<string | null>(null)
  const [personType, setPersonType] = useState<"COLPORTER" | "LEADER">("COLPORTER")
  const [stats, setStats] = useState<ColporterSummerStats | null>(null)
  const [monthlyData, setMonthlyData] = useState<
    Record<string, { sales: number; days: number; books: { large: number; small: number } }>
  >({})
  const [dailySales, setDailySales] = useState<Record<string, number>>({})
  const [dailyBooks, setDailyBooks] = useState<Record<string, { large: number; small: number }>>({})
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [bibleStudies, setBibleStudies] = useState<any[]>([])
  const [topSellerBook, setTopSellerBook] = useState<any>(null)

  // Fetch person ID by name
  useEffect(() => {
    const getPersonId = async () => {
      try {
        // First try to find as a colporter
        const params = {
          programId: program?.id,
        }
        const colporters: Colporter[] = await api.get("/people/colporters", { params })
        const colporter = colporters.find((p: any) => `${p.name} ${p.apellido}` === name || p.name === name)
        if (colporter) {
          setPersonId(colporter.id)
          setPersonType("COLPORTER")
          return
        }

        // If not found as colporter, try as a leader
        const leaders: Leader[] = await api.get("/people/leaders", { params })
        const leader = leaders.find((p: any) => `${p.name} ${p.apellido}` === name || p.name === name)

        if (leader) {
          setPersonId(leader.id)
          setPersonType("LEADER")
          return
        }

        setError(t("summerColporterReport.noDataAvailable"))
      } catch (err) {
        console.error("Error fetching person:", err)
        setError(t("common.error"))
      }
    }

    if (name) {
      getPersonId()
    }
  }, [name, t])

  // Fetch transactions for this person
  useEffect(() => {
    const loadTransactionData = async () => {
      if (!personId) return

      setIsLoading(true)
      try {
        // Get colporter report data which includes transactions, bible studies, and top seller
        const reportData: any = await api.get(`/reports/colporter/${personId}`)

        // Set the data from the report
        setBibleStudies(reportData.bibleStudies || [])
        setTopSellerBook(reportData.topSellerBook || null)

        // Process the transactions to get statistics
        processTransactionData(reportData.transactions, personType)

        // If this is a leader, also fetch their team members
        if (personType === "LEADER") {
          await fetchTeamMembers(personId, reportData.transactions)
        }
      } catch (err) {
        console.error("Error fetching transaction data:", err)
        setError(t("common.error"))
      } finally {
        setIsLoading(false)
      }
    }

    if (personId) {
      loadTransactionData()
    }
  }, [personId, personType, t])

  // Fetch team members for a leader
  const fetchTeamMembers = async (leaderId: string, leaderTransactions: any[]) => {
    try {
      // Get unique colporter IDs from transactions
      const colporterIds = new Set<string>()
      leaderTransactions.forEach((t) => colporterIds.add(t.studentId))

      // Get colporter details
      const colporters: Colporter[] = await api.get("/people/colporters")

      // Filter to only include colporters in this leader's team
      const teamColporters = colporters.filter((c: any) => colporterIds.has(c.id))

      // Calculate stats for each team member
      const teamStats = teamColporters.map((colporter: any) => {
        // Get transactions for this colporter - ONLY APPROVED TRANSACTIONS
        const colporterTransactions = leaderTransactions.filter(
          (t) => t.studentId === colporter.id && t.status === "APPROVED",
        )

        // Calculate total sales
        const totalSales = colporterTransactions.reduce((sum, t) => sum + t.total, 0)

        // Calculate book counts
        const books = {
          large: 0,
          small: 0,
        }

        colporterTransactions.forEach((transaction) => {
          if (transaction.books && transaction.books.length > 0) {
            transaction.books.forEach((book: any) => {
              if (book.size === "LARGE") {
                books.large += book.quantity
              } else {
                books.small += book.quantity
              }
            })
          }
        })

        return {
          id: colporter.id,
          name: `${colporter.name} ${colporter.apellido}`,
          totalSales,
          books,
          transactionCount: colporterTransactions.length,
        }
      })

      setTeamMembers(teamStats)
    } catch (err) {
      console.error("Error fetching team members:", err)
    }
  }

  // Process transaction data to get statistics
  const processTransactionData = (personTransactions: any[], type: "COLPORTER" | "LEADER") => {
    if (!personTransactions.length) {
      setStats(null)
      setMonthlyData({})
      setDailySales({})
      setDailyBooks({})
      return
    }

    // Filter out rejected transactions - only include APPROVED transactions
    const validTransactions = personTransactions.filter((t) => t.status === "APPROVED")

    if (validTransactions.length === 0) {
      setStats(null)
      setMonthlyData({})
      setDailySales({})
      setDailyBooks({})
      return
    }

    // Get the appropriate percentage from program config
    const percentage =
      type === "COLPORTER"
        ? program?.financialConfig?.colporter_percentage
          ? Number.parseFloat(program.financialConfig.colporter_percentage)
          : 50
        : program?.financialConfig?.leader_percentage
          ? Number.parseFloat(program.financialConfig.leader_percentage)
          : 15

    // Calculate total sales
    const totalSales = validTransactions.reduce((sum, t) => sum + t.total, 0)
    const workingDays = validTransactions.length
    const averagePerDay = totalSales / workingDays

    // Process books
    const totalBooks = {
      grandes: 0,
      pequenos: 0,
    }

    // Process daily sales and books
    const dailySalesData: Record<string, number> = {}
    const dailyBooksData: Record<string, { large: number; small: number }> = {}

    validTransactions.forEach((transaction) => {
      // Add sales for this day
      console.log(transaction)
      dailySalesData[transaction.date] = (dailySalesData[transaction.date] || 0) + transaction.total

      // Initialize books for this day
      if (!dailyBooksData[transaction.date]) {
        dailyBooksData[transaction.date] = { large: 0, small: 0 }
      }

      // Process books for this transaction
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.size === "LARGE") {
            totalBooks.grandes += book.quantity
            dailyBooksData[transaction.date].large += book.quantity
          } else {
            totalBooks.pequenos += book.quantity
            dailyBooksData[transaction.date].small += book.quantity
          }
        })
      }
    })
    console.log(dailyBooksData)
    const salesEntries = Object.entries(dailySalesData)
    let bestDay = { date: "", amount: 0 }
    let worstDay = { date: "", amount: 0 }

    if (salesEntries.length > 0) {
      // Find best day (highest sales)
      bestDay = salesEntries.reduce((best, [date, amount]) => (amount > best.amount ? { date, amount } : best), {
        date: salesEntries[0][0],
        amount: salesEntries[0][1],
      })

      // Find worst day (lowest sales, but only days with sales > 0)
      const daysWithSales = salesEntries.filter(([_, amount]) => amount > 0)
      if (daysWithSales.length > 0) {
        worstDay = daysWithSales.reduce((worst, [date, amount]) => (amount < worst.amount ? { date, amount } : worst), {
          date: daysWithSales[0][0],
          amount: daysWithSales[0][1],
        })
      }
    }

    // Group data by months
    const monthlyDataObj: Record<string, { sales: number; days: number; books: { large: number; small: number } }> = {}

    validTransactions.forEach((transaction) => {
      const date = new Date(transaction.date)
      const month = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" })

      if (!monthlyDataObj[month]) {
        monthlyDataObj[month] = {
          sales: 0,
          days: 0,
          books: { large: 0, small: 0 },
        }
      }

      // Check if this is a new day for this month
      const dateStr = transaction.date
      const isNewDay = !validTransactions.some(
        (t) =>
          t.date === dateStr &&
          t.id !== transaction.id &&
          new Date(t.date).toLocaleDateString("es-ES", { month: "long", year: "numeric" }) === month,
      )

      if (isNewDay) {
        monthlyDataObj[month].days += 1
      }

      monthlyDataObj[month].sales += transaction.total

      // Process books for this transaction
      if (transaction.books && transaction.books.length > 0) {
        transaction.books.forEach((book: any) => {
          if (book.size === "LARGE") {
            monthlyDataObj[month].books.large += book.quantity
          } else {
            monthlyDataObj[month].books.small += book.quantity
          }
        })
      }
    })

    // Set state with processed data
    setStats({
      bruto: {
        total: totalSales,
        promedio: averagePerDay,
      },
      neto: {
        total: totalSales * (percentage / 100),
        promedio: averagePerDay * (percentage / 100),
      },
      libros: totalBooks,
      workingDays,
      bestDay,
      worstDay,
    })

    setMonthlyData(monthlyDataObj)
    setDailySales(dailySalesData)
    setDailyBooks(dailyBooksData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t("common.loading")} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t("common.error")}</p>
        <p>{error}</p>
      </div>
    )
  }

  if (!stats || Object.keys(monthlyData).length === 0) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">{t("summerColporterReport.noDataAvailable")}</p>
        <p>{t("summerColporterReport.noTransactionData", { type: personType.toLowerCase() })}</p>
        <Button
          variant="outline"
          className="mt-4 bg-transparent"
          onClick={() => navigate("/reports/donations/finances")}
        >
          {t("common.back")}
        </Button>
      </div>
    )
  }

  const totalBooks = stats.libros.grandes + stats.libros.pequenos
  const largeBooksPercentage = totalBooks > 0 ? ((stats.libros.grandes / totalBooks) * 100).toFixed(0) : 0
  const smallBooksPercentage = totalBooks > 0 ? ((stats.libros.pequenos / totalBooks) * 100).toFixed(0) : 0
  const percentage =
    personType === "COLPORTER"
      ? program?.financialConfig?.colporter_percentage || 50
      : program?.financialConfig?.leader_percentage || 15

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/reports/donations/finances")}>
          <ChevronLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-primary-600" size={28} />
            {name} - {t(`common.${personType.toLowerCase()}`)}
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <Calendar size={16} />
            {t("summerColporterReport.completeProgram")} • {stats.workingDays} días laborales
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("summerColporterReport.totalSalesBruto")}</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">${stats.bruto.total.toFixed(2)}</p>
            <p className="text-xs text-gray-500">100% de las ventas</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-success-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("summerColporterReport.netEarningsNeto")}</p>
            <p className="mt-1 text-2xl font-bold text-success-600">${stats.neto.total.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{percentage}% de las ventas</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="text-warning-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("summerColporterReport.totalBooks")}</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">{totalBooks}</p>
            <p className="text-xs text-gray-500">
              {stats.libros.grandes} grandes ({largeBooksPercentage}%), {stats.libros.pequenos} pequeños (
              {smallBooksPercentage}%)
            </p>
          </div>
        </Card>

        {topSellerBook && (
          <Card>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="relative">
                  <img
                    src={
                      topSellerBook.image_url ||
                      "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg"
                    }
                    alt={topSellerBook.title}
                    className="h-12 w-8 object-cover rounded shadow-sm"
                  />
                  <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    ★
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500">Top Seller</p>
              <p className="mt-1 text-lg font-bold text-purple-600 truncate max-w-full" title={topSellerBook.title}>
                {topSellerBook.title}
              </p>
              <div className="flex justify-center items-center gap-2 mt-1">
                <Badge variant="info" size="sm">
                  {topSellerBook.totalQuantity} libros
                </Badge>
                <Badge variant="secondary" size="sm">
                  ${topSellerBook.totalRevenue.toFixed(0)}
                </Badge>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bible Studies Section */}
      {bibleStudies.length > 0 && (
        <Card title="Estudios Bíblicos Registrados" icon={<BookOpen size={20} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-sm font-medium text-blue-600">Total Registrados</p>
                <p className="text-2xl font-bold text-blue-700">{bibleStudies.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-sm font-medium text-green-600">Estudios Bíblicos</p>
                <p className="text-2xl font-bold text-green-700">
                  {bibleStudies.filter((bs) => bs.study_type === "Estudio Bíblico").length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-sm font-medium text-purple-600">Grupos de Oración</p>
                <p className="text-2xl font-bold text-purple-700">
                  {bibleStudies.filter((bs) => bs.study_type === "Grupo de Oración").length}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bibleStudies.map((study, index) => (
                    <tr key={study.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {study.photo_url ? (
                            <img
                              src={study.photo_url || "/placeholder.svg"}
                              alt={study.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <BookOpen size={16} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{study.name}</div>
                            {study.physical_description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {study.physical_description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{study.phone}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {study.municipality_name || study.location || "No especificado"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge
                          variant={
                            study.study_type === "Estudio Bíblico"
                              ? "primary"
                              : study.study_type === "Grupo de Oración"
                                ? "success"
                                : "warning"
                          }
                          size="sm"
                        >
                          {study.study_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(study.created_at).toLocaleDateString("es-ES", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Performance Highlights - More Compact */}
      <Card title={t("summerColporterReport.performanceHighlights")} icon={<TrendingUp size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-success-50 rounded-lg">
            <h4 className="font-semibold text-success-700 text-sm">{t("summerColporterReport.bestDay")}</h4>
            <p className="text-xs text-success-600 mt-1">
              {stats.bestDay.date
                ? new Date(stats.bestDay.date).toLocaleDateString("es-ES", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })
                : "N/A"}
            </p>
            <p className="text-base font-bold text-success-700">${stats.bestDay.amount.toFixed(2)}</p>
          </div>

          <div className="p-3 bg-warning-50 rounded-lg">
            <h4 className="font-semibold text-warning-700 text-sm">{t("summerColporterReport.lowestDay")}</h4>
            <p className="text-xs text-warning-600 mt-1">
              {stats.worstDay.date
                ? new Date(stats.worstDay.date).toLocaleDateString("es-ES", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })
                : "N/A"}
            </p>
            <p className="text-base font-bold text-warning-700">
              ${stats.worstDay.amount > 0 ? stats.worstDay.amount.toFixed(2) : "0.00"}
            </p>
          </div>

          <div className="p-3 bg-info-50 rounded-lg">
            <h4 className="font-semibold text-info-700 text-sm">{t("summerColporterReport.dailyAverage")}</h4>
            <p className="text-xs text-info-600 mt-1">{t("summerColporterReport.perWorkingDay")}</p>
            <p className="text-base font-bold text-info-700">${stats.bruto.promedio.toFixed(2)}</p>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-700 text-sm">Estudios Bíblicos</h4>
            <p className="text-xs text-purple-600 mt-1">Registrados</p>
            <p className="text-base font-bold text-purple-700">{bibleStudies.length}</p>
          </div>
        </div>
      </Card>
      {/* Team Members (only for leaders) */}
      {personType === "LEADER" && teamMembers.length > 0 && (
        <Card title={t("summerColporterReport.teamPerformance")} icon={<Users size={20} />}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("summerColporterReport.colporter")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("summerColporterReport.totalSales")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("summerColporterReport.largeBooks")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("summerColporterReport.smallBooks")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("summerColporterReport.transactions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamMembers.map((member, index) => (
                  <tr key={member.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      ${member.totalSales.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge variant="primary">{member.books.large}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge variant="success">{member.books.small}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge variant="secondary">{member.transactionCount}</Badge>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{t("common.totals")}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    ${teamMembers.reduce((sum, m) => sum + m.totalSales, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                    <Badge variant="primary">{teamMembers.reduce((sum, m) => sum + m.books.large, 0)}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                    <Badge variant="success">{teamMembers.reduce((sum, m) => sum + m.books.small, 0)}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                    <Badge variant="secondary">{teamMembers.reduce((sum, m) => sum + m.transactionCount, 0)}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("summerColporterReport.salesDetail")}</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    {t(`summerColporterReport.${personType.toLowerCase()}`)}
                  </th>
                  {Object.keys(dailySales)
                    .sort()
                    .map((date) => (
                      <th
                        key={date}
                        className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b"
                      >
                        {new Date(date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          month: "2-digit",
                          day: "2-digit",
                          timeZone: "UTC",
                        })}
                      </th>
                    ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    {t("common.total")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-yellow-50">
                  <td className="px-4 py-3 text-sm font-medium text-white bg-[#0052B4] sticky left-0 z-10">{name}</td>
                  {Object.keys(dailySales)
                    .sort()
                    .map((date) => (
                      <td key={date} className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        ${dailySales[date].toFixed(2)}
                      </td>
                    ))}
                  <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                    ${stats.bruto.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Books Table */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("summerColporterReport.booksByMonthDetail")}</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    {t("summerColporterReport.month")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700 border-b">
                    {t("summerColporterReport.largeBooks")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600 border-b">
                    {t("summerColporterReport.smallBooks")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    {t("summerColporterReport.totalBooksLabel")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    {t("summerColporterReport.sales")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(monthlyData).map(([month, data]) => (
                  <tr key={month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-white">{month}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="primary">{data.books.large}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge variant="success">{data.books.small}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      <Badge variant="secondary">{data.books.large + data.books.small}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">${data.sales.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100">
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 sticky left-0 z-10 bg-gray-100">
                    {t("common.totals")}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold">
                    <Badge variant="primary">{stats.libros.grandes}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold">
                    <Badge variant="success">{stats.libros.pequenos}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold">
                    <Badge variant="secondary">{totalBooks}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold">${stats.bruto.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Daily Books Breakdown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("summerColporterReport.booksByDayDetail")}</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 z-10 border-b">
                    {t("summerColporterReport.date")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700 border-b">
                    {t("summerColporterReport.largeBooks")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600 border-b">
                    {t("summerColporterReport.smallBooks")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    {t("summerColporterReport.totalBooksLabel")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-b">
                    {t("summerColporterReport.sales")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.keys(dailySales)
                  .sort()
                  .map((date) => (
                    <tr key={date} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-white">
                        {new Date(date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant="primary">{dailyBooks[date]?.large || 0}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant="success">{dailyBooks[date]?.small || 0}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-medium">
                        <Badge variant="secondary">
                          {(dailyBooks[date]?.large || 0) + (dailyBooks[date]?.small || 0)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">${dailySales[date].toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SummerColporterReport
