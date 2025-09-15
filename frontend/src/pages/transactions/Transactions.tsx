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
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'books'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [activeTab, setActiveTab] = useState<"finances" | "delivered-books">(() => {
    if (location.pathname === "/transactions/delivered-books") {
      return "delivered-books"
    }
    return "finances"
  })
  
  const handleSortChange = (newSortBy: 'name' | 'amount' | 'books') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder(newSortBy === 'name' ? 'asc' : 'desc')
    }
  }
  
  const getSortIcon = (field: 'name' | 'amount' | 'books') => {
    if (sortBy !== field) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

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

  // Apply sorting to filtered transactions
  const sortedTransactions = React.useMemo(() => {
    let filtered = transactions.filter((t) => t.date === formatDateToString(selectedDate))
    
    if (selectedLeader) {
      filtered = filtered.filter(
        (t) => Number(t.leaderId) === Number(selectedLeader)
      )
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number
      
      switch (sortBy) {
        case 'name':
          aValue = a.studentName.toLowerCase()
          bValue = b.studentName.toLowerCase()
          break
        case 'amount':
          aValue = Number(a.total)
          bValue = Number(b.total)
          break
        case 'books':
          const aTotalBooks = a.books?.reduce((sum, book) => sum + book.quantity, 0) || 0
          const bTotalBooks = b.books?.reduce((sum, book) => sum + book.quantity, 0) || 0
          aValue = aTotalBooks
          bValue = bTotalBooks
          break
        default:
          aValue = a.studentName.toLowerCase()
          bValue = b.studentName.toLowerCase()
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortOrder === 'asc' ? comparison : -comparison
      } else {
        const comparison = (aValue as number) - (bValue as number)
        return sortOrder === 'asc' ? comparison : -comparison
      }
    })
  }, [transactions, selectedLeader, selectedDate, sortBy, sortOrder])
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

  // Sort leader totals
  const sortedLeaderTotals = React.useMemo(() => {
    return [...leaderTotals].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'amount':
          aValue = a.total
          bValue = b.total
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortOrder === 'asc' ? comparison : -comparison
      } else {
        const comparison = (aValue as number) - (bValue as number)
        return sortOrder === 'asc' ? comparison : -comparison
      }
    })
  }, [leaderTotals, sortBy, sortOrder])
  
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">{t('common.sortBy')}:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as ['name' | 'amount' | 'books', 'asc' | 'desc']
                setSortBy(field)
                setSortOrder(order)
              }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="name-asc">{t('transactions.sortNameAsc')}</option>
              <option value="name-desc">{t('transactions.sortNameDesc')}</option>
              <option value="amount-desc">{t('transactions.sortAmountDesc')}</option>
              <option value="amount-asc">{t('transactions.sortAmountAsc')}</option>
              {activeTab === "delivered-books" && (
                <>
                  <option value="books-desc">{t('transactions.sortBooksDesc')}</option>
                  <option value="books-asc">{t('transactions.sortBooksAsc')}</option>
                </>
              )}
            </select>
          </div>
          {activeTab === "finances" && (
            <select
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">
                All leaders
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
        <div className="lg:col-span-4 w-full">
          {activeTab === "finances" ? (
            <DailyTransactions 
              transactions={sortedTransactions} 
              date={formatDateToString(selectedDate)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 cursor-pointer hover:bg-[#003d85]"
                          onClick={() => handleSortChange('name')}>
                        <div className="flex items-center gap-1">
                          {t("transactions.colporter")}
                          <span className="text-xs">{getSortIcon('name')}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700 cursor-pointer hover:bg-primary-800"
                          onClick={() => handleSortChange('books')}>
                        <div className="flex items-center justify-center gap-1">
                          {t("transactions.largeBooks")}
                          <span className="text-xs">{getSortIcon('books')}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600">
                        {t("transactions.smallBooks")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] cursor-pointer hover:bg-[#002952]"
                          onClick={() => handleSortChange('books')}>
                        <div className="flex items-center justify-center gap-1">
                          {t("transactions.totalBooks")}
                          <span className="text-xs">{getSortIcon('books')}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTransactions.filter(t => t.status !== 'REJECTED').map((transaction, index) => {
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
      </div>

      {/* Summary Section - Now below the main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {activeTab === "finances" ? (
          <>
            {sortedLeaderTotals.map((leader) => (
              <Card key={leader.id} className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-primary-700 truncate">{leader.name}</p>
                  <p className="mt-1 text-xl font-bold text-primary-600">${formatNumber(leader.total)}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-primary-600">
                      {leader.transactions} {t("transactions.transactionsCount")}
                    </p>
                    <p className="text-xs text-purple-600 font-medium">
                      {program?.financialConfig?.leader_percentage}%: ${formatNumber(leader.earnings)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="text-center">
                <p className="text-sm font-medium text-blue-700">{t("common.total")}</p>
                <p className="mt-1 text-4xl font-bold text-blue-800">${formatNumber(dayTotal)}</p>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-primary-700">{t("transactions.largeBooks")}</p>
                <p className="mt-1 text-2xl font-bold text-primary-600">{bookTotals.large}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-success-700">{t("transactions.smallBooks")}</p>
                <p className="mt-1 text-2xl font-bold text-success-600">{bookTotals.small}</p>
              </div>
            </Card>
            <Card className="p-4 bg-[#0052B4]">
              <div className="text-center">
                <p className="text-sm font-medium">{t("transactions.totalBooks")}</p>
                <p className="mt-1 text-4xl font-bold">{bookTotals.large + bookTotals.small}</p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default Transactions
