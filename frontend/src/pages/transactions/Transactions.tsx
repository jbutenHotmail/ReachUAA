"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation } from "react-router-dom"
import { Plus, ChevronLeft, ChevronRight, Calendar, DollarSign, BookText } from "lucide-react"
import { useTransactionStore } from "../../stores/transactionStore"
import { useProgramStore } from "../../stores/programStore"
import DailyTransactions from "../../components/dashboard/DailyTransactions"
import Button from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import { clsx } from "clsx"
import { useUserStore } from "../../stores/userStore"
import { formatDateToString } from "../../utils/dateUtils"
import { BookSize } from "../../types"
import { formatNumber } from "../../utils/numberUtils"

const Transactions: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { fetchPeople, werePeopleFetched } = useUserStore()
  const { transactions, fetchTransactions } = useTransactionStore()
  const { program, fetchProgram, wasProgramFetched } = useProgramStore()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedLeader, setSelectedLeader] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"finances" | "delivered-books">(() => {
    if (location.pathname === "/transactions/delivered-books") {
      return "delivered-books"
    }
    return "finances"
  })
  useEffect(() => {
    if (location.pathname === "/transactions") {
      navigate("/transactions/finances", { replace: true })
    }
  }, [location.pathname, navigate])
  useEffect(() => {
    const newTab = location.pathname === "/transactions/delivered-books" ? "delivered-books" : "finances"
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [location.pathname, activeTab])
  console.log("location.pathname", location.pathname)
  useEffect(() => {
    const formattedDate = formatDateToString(selectedDate)
    fetchTransactions(formattedDate)
  }, [fetchTransactions, selectedDate])

  useEffect(() => {
    !werePeopleFetched && fetchPeople()
  }, [])

  useEffect(() => {
    !wasProgramFetched && fetchProgram()
  }, [])

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Nueva función para manejar el cambio de fecha desde el input
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = event.target.value
    if (dateValue) {
      const newDate = new Date(dateValue + "T00:00:00") // Agregar tiempo para evitar problemas de zona horaria
      setSelectedDate(newDate)
    }
  }

  // Función para formatear la fecha para el input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const validTransactions = transactions.filter(
    (t) => t.status !== "REJECTED" && t.date === formatDateToString(selectedDate),
  )

  const leaderTotals = React.useMemo(() => {
    const totals = new Map()
    const leaderPercentage = program?.financialConfig?.leader_percentage
      ? Number.parseFloat(program.financialConfig.leader_percentage)
      : 15

    validTransactions.forEach((t) => {
      const current = totals.get(t.leaderId) || {
        id: t.leaderId,
        name: t.leaderName,
        total: 0,
        transactions: 0,
        earnings: 0,
      }

      current.total += Number(t.total)
      current.transactions += 1
      totals.set(t.leaderId, current)
    })

    // Calculate earnings for each leader based on their team sales
    totals.forEach((leader) => {
      leader.earnings = leader.total * (leaderPercentage / 100)
    })

    return Array.from(totals.values())
  }, [validTransactions, program])

  const dayTotal = React.useMemo(() => {
    return validTransactions.reduce((sum, t) => Number(sum) + Number(t.total), 0)
  }, [validTransactions])

  const filteredTransactions = React.useMemo(() => {
    if (!selectedLeader) return transactions.filter((t) => t.date === formatDateToString(selectedDate))
    return transactions.filter(
      (t) => Number(t.leaderId) === Number(selectedLeader) && t.date === formatDateToString(selectedDate),
    )
  }, [transactions, selectedLeader, selectedDate])

  const bookTotals = React.useMemo(() => {
    const dayTransactions = transactions.filter(
      (t) => t.date === formatDateToString(selectedDate) && t.status !== "REJECTED",
    )

    return dayTransactions.reduce(
      (acc, transaction) => {
        transaction.books?.forEach((book) => {
          const bookSize = book.size
          if (bookSize === BookSize.LARGE) {
            acc.large += book.quantity
          } else {
            acc.small += book.quantity
          }
        })
        return acc
      },
      { large: 0, small: 0 },
    )
  }, [validTransactions])

  const tabs = [
    {
      id: "finances",
      label: t("transactions.finances"),
      icon: <DollarSign size={18} />,
      path: "/transactions/finances",
    },
    {
      id: "delivered-books",
      label: t("transactions.deliveredBooks"),
      icon: <BookText size={18} />,
      path: "/transactions/delivered-books",
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("transactions.title")}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
              <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)} className="px-2">
                <ChevronLeft size={20} />
              </Button>
              <div className="px-3 sm:px-4 py-2 flex items-center gap-2 border-l border-r border-gray-200 relative">
                <Calendar size={16} className="text-gray-500 pointer-events-none" />
                <input
                  type="date"
                  value={formatDateForInput(selectedDate)}
                  onChange={handleDateChange}
                  className="text-xs sm:text-sm font-medium bg-transparent border-none outline-none cursor-pointer min-w-0 flex-1"
                  style={{
                    colorScheme: "light",
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                {/* Fallback display para navegadores que no soporten input date */}
                <noscript>
                  <span className="text-xs sm:text-sm font-medium">
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: window.innerWidth < 640 ? "short" : "long",
                      year: "numeric",
                      month: window.innerWidth < 640 ? "short" : "long",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </noscript>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigateDate(1)} className="px-2">
                <ChevronRight size={20} />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday} className="w-full sm:w-auto bg-transparent">
              {t("transactions.today")}
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {activeTab === "finances" && (
            <select
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">
                {t("common.all")} {t("common.leader")}s
              </option>
              {leaderTotals.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="primary"
            leftIcon={<Plus size={18} />}
            onClick={() => navigate("/transactions/new")}
            className="w-full sm:w-auto"
          >
            {t("transactions.newTransaction")}
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={clsx(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2",
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-3">
          {activeTab === "finances" ? (
            <DailyTransactions transactions={filteredTransactions} date={formatDateToString(selectedDate)} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0">
                        {t("transactions.colporter")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700">
                        {t("transactions.largeBooks")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600">
                        {t("transactions.smallBooks")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85]">
                        {t("transactions.totalBooks")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validTransactions.map((transaction, index) => {
                      const largeBooks =
                        transaction.books?.reduce((sum, book) => {
                          const bookSize = book.size
                          return sum + (bookSize === BookSize.LARGE ? book.quantity : 0)
                        }, 0) || 0
                      const smallBooks =
                        transaction.books?.reduce((sum, book) => {
                          const bookSize = book.size
                          return sum + (bookSize === BookSize.SMALL ? book.quantity : 0)
                        }, 0) || 0
                      const totalBooks = largeBooks + smallBooks

                      return (
                        <tr key={transaction.id} className={index % 2 === 0 ? "bg-yellow-50" : "bg-white"}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white bg-[#0052B4] sticky left-0">
                            {transaction.studentName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="primary">{largeBooks}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="success">{smallBooks}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary">{totalBooks}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-white bg-[#0052B4] sticky left-0">
                        {t("common.totals")}
                      </td>
                      <td className="px-4 py-3 text-center bg-primary-900 text-white">
                        <Badge variant="primary" className="bg-white">
                          {bookTotals.large}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center bg-success-900 text-white">
                        <Badge variant="success" className="bg-white">
                          {bookTotals.small}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center bg-[#003D85] text-white">
                        <Badge variant="secondary" className="bg-white">
                          {bookTotals.large + bookTotals.small}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card title={t("common.totals")}>
            <div className="space-y-3 sm:space-y-4">
              {activeTab === "finances" ? (
                <>
                  {leaderTotals.map((leader) => (
                    <div key={leader.id} className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-primary-700 block truncate">{leader.name}</span>
                        <span className="text-xs text-primary-600 block">
                          {leader.transactions} {t("transactions.transactionsCount")}
                        </span>
                        <span className="text-xs text-purple-600 block font-medium">
                          {program?.financialConfig?.leader_percentage + "%"}: ${formatNumber(leader.earnings)}
                        </span>
                      </div>
                      <Badge variant="primary" size="lg" className="ml-2 flex-shrink-0">
                        ${formatNumber(leader.total)}
                      </Badge>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-t-2 border-blue-100 mt-4">
                    <span className="text-sm font-medium text-blue-700">{t("common.total")}</span>
                    <Badge variant="primary" size="lg">
                      ${formatNumber(dayTotal)}
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                    <span className="text-sm font-medium text-primary-700">{t("transactions.largeBooks")}</span>
                    <Badge variant="primary" size="lg">
                      {bookTotals.large}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
                    <span className="text-sm font-medium text-success-700">{t("transactions.smallBooks")}</span>
                    <Badge variant="success" size="lg">
                      {bookTotals.small}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#0052B4] rounded-lg border-t-2 border-[#003D85]">
                    <span className="text-sm font-medium text-white">{t("transactions.totalBooks")}</span>
                    <Badge variant="primary" size="lg" className="bg-white text-[#0052B4]">
                      {bookTotals.large + bookTotals.small}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Transactions
