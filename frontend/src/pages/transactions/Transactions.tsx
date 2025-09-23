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
  const [bookTitleFilter] = useState<string>("")
  const [colporterFilter, setColporterFilter] = useState<string>("")
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

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = event.target.value
    if (dateValue) {
      const newDate = new Date(dateValue + "T00:00:00")
      setSelectedDate(newDate)
    }
  }

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const validTransactions = transactions.filter(
    (t) => t.status !== "REJECTED" && t.date === formatDateToString(selectedDate),
  )

  const sortedTransactions = React.useMemo(() => {
    let filtered = transactions.filter((t) => t.date === formatDateToString(selectedDate))
    
    if (selectedLeader) {
      filtered = filtered.filter(
        (t) => Number(t.leaderId) === Number(selectedLeader)
      )
    }
    
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

    totals.forEach((leader) => {
      leader.earnings = leader.total * (leaderPercentage / 100)
    })

    return Array.from(totals.values())
  }, [validTransactions, program])

  const dayTotal = React.useMemo(() => {
    return validTransactions.reduce((sum, t) => Number(sum) + Number(t.total), 0)
  }, [validTransactions])

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

  const bookTotalsByTitle = React.useMemo(() => {
    const dayTransactions = transactions.filter(
      (t) => {
        const matchesDate = t.date === formatDateToString(selectedDate)
        const matchesStatus = t.status !== "REJECTED"
        const matchesLeader = !selectedLeader || Number(t.leaderId) === Number(selectedLeader)
        return matchesDate && matchesStatus && matchesLeader
      }
    )

    const bookMap = new Map<string, { 
      title: string; 
      quantity: number; 
      size: string; 
      price: number;
      colporters: Array<{ name: string; quantity: number; transactionId: string }>;
    }>()

    dayTransactions.forEach((transaction) => {
      transaction.books?.forEach((book) => {
        const existing = bookMap.get(book.id)
        if (existing) {
          existing.quantity += book.quantity
          const existingColporter = existing.colporters.find(c => c.name === transaction.studentName)
          if (existingColporter) {
            existingColporter.quantity += book.quantity
          } else {
            existing.colporters.push({
              name: transaction.studentName,
              quantity: book.quantity,
              transactionId: transaction.id
            })
          }
        } else {
          bookMap.set(book.id, {
            title: book.title,
            quantity: book.quantity,
            size: book.size,
            price: book.price,
            colporters: [{
              name: transaction.studentName,
              quantity: book.quantity,
              transactionId: transaction.id
            }]
          })
        }
      })
    })

    return Array.from(bookMap.values())
      .map(book => ({
        ...book,
        colporters: book.colporters.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter(book => {
        const matchesTitle = !bookTitleFilter || book.title.toLowerCase().includes(bookTitleFilter.toLowerCase())
        const matchesColporter = !colporterFilter || book.colporters.some(c => 
          c.name.toLowerCase().includes(colporterFilter.toLowerCase())
        )
        return matchesTitle && matchesColporter
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [transactions, selectedDate])


  // Get unique colporters for filter
  const uniqueColporters = React.useMemo(() => {
    const colporters = new Set<string>()
    transactions
      .filter(t => t.date === formatDateToString(selectedDate) && t.status !== "REJECTED")
      .forEach(transaction => {
        colporters.add(transaction.studentName)
      })
    return Array.from(colporters).sort()
  }, [transactions, selectedDate])

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
          {activeTab === "delivered-books" && (
            <select
              value={colporterFilter}
              onChange={(e) => setColporterFilter(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">Todos los colportores</option>
              {uniqueColporters.map((colporter) => (
                <option key={colporter} value={colporter}>
                  {colporter}
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
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] sticky left-0 cursor-pointer hover:bg-[#003d85]"
                        onClick={() => handleSortChange('name')}
                      >
                        <div className="flex items-center gap-1">
                          {t("transactions.colporter")}
                          <span className="text-xs">{getSortIcon('name')}</span>
                        </div>
                      </th>
                      {bookTotalsByTitle.map((book) => (
                        <th
                          key={book.title}
                          className="px-2 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#003D85] border-l border-white/20 min-w-[80px] cursor-pointer hover:bg-[#002a5c]"
                          onClick={() => handleSortChange('name')}
                        >
                          <div className="flex flex-col items-center">
                            <div className="text-[10px] leading-tight mb-1 max-w-[70px] break-words text-center">
                              {book.title.length > 20 ? `${book.title.substring(0, 20)}...` : book.title}
                            </div>
                            <span className="text-xs">{getSortIcon('name')}</span>
                          </div>
                        </th>
                      ))}
                      <th
                        className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#0052B4] border-l-2 border-white cursor-pointer hover:bg-[#003d85]"
                        onClick={() => handleSortChange('books')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {t("transactions.totalBooks")}
                          <span className="text-xs">{getSortIcon('books')}</span>
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-primary-700 cursor-pointer hover:bg-primary-800 border-l-2 border-white"
                        onClick={() => handleSortChange('books')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {t("transactions.largeBooks")}
                          <span className="text-xs">{getSortIcon('books')}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-success-600 border-l border-white">
                        {t("transactions.smallBooks")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const colporterMap = new Map<
                        string,
                        {
                          name: string;
                          studentId: string;
                          books: Map<string, { quantity: number; size: string }>;
                          largeTotal: number;
                          smallTotal: number;
                          total: number;
                        }
                      >();

                      sortedTransactions
                        .filter((t) => {
                          const matchesStatus = t.status !== 'REJECTED'
                          const matchesLeader = !selectedLeader || Number(t.leaderId) === Number(selectedLeader)
                          return matchesStatus && matchesLeader
                        })
                        .forEach((transaction) => {
                          if (!colporterMap.has(transaction.studentId)) {
                            colporterMap.set(transaction.studentId, {
                              name: transaction.studentName,
                              studentId: transaction.studentId,
                              books: new Map(),
                              largeTotal: 0,
                              smallTotal: 0,
                              total: 0,
                            });
                          }

                          const colporter = colporterMap.get(transaction.studentId)!;

                          transaction.books?.forEach((book) => {
                            // Apply book title filter
                            const matchesBookTitle = !bookTitleFilter || book.title.toLowerCase().includes(bookTitleFilter.toLowerCase())
                            if (!matchesBookTitle) return
                            
                            const currentBook = colporter.books.get(book.title);
                            const newQuantity = (currentBook?.quantity || 0) + book.quantity;
                            colporter.books.set(book.title, {
                              quantity: newQuantity,
                              size: book.size,
                            });

                            if (book.size === BookSize.LARGE) {
                              colporter.largeTotal += book.quantity;
                            } else {
                              colporter.smallTotal += book.quantity;
                            }
                            colporter.total += book.quantity;
                          });
                        });

                      const colporterArray = Array.from(colporterMap.values())
                        .filter(colporter => {
                          // Apply colporter filter
                          const matchesColporter = !colporterFilter || colporter.name.toLowerCase().includes(colporterFilter.toLowerCase())
                          return matchesColporter && colporter.total > 0
                        })
                        .sort((a, b) => {
                          switch (sortBy) {
                            case 'name':
                              const nameComparison = a.name.localeCompare(b.name);
                              return sortOrder === 'asc' ? nameComparison : -nameComparison;
                            case 'books':
                              const booksComparison = a.total - b.total;
                              return sortOrder === 'asc' ? booksComparison : -booksComparison;
                            default:
                              return a.name.localeCompare(b.name);
                          }
                        });

                      return colporterArray.map((colporter, index) => (
                        <tr key={colporter.studentId} className={index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}>
                          <td className="px-4 py-3 text-sm font-medium text-white bg-[#0052B4] sticky left-0">
                            <div className="max-w-[120px] truncate" title={colporter.name}>
                              {colporter.name}
                            </div>
                          </td>
                          {bookTotalsByTitle.map((book) => {
                            const bookData = colporter.books.get(book.title);
                            const quantity = bookData?.quantity || 0;
                            
                            // Apply book title filter if in title view mode
                            if  (bookTitleFilter && !book.title.toLowerCase().includes(bookTitleFilter.toLowerCase())) {
                              return null;
                            }
                            
                            return (
                              <td key={book.title} className="px-2 py-3 text-center border-l border-gray-200">
                                {quantity > 0 ? (
                                  <Badge variant={book.size === BookSize.LARGE ? 'primary' : 'success'} size="sm">
                                    {quantity}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-300 text-xs">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center border-l-2 border-[#0052B4]">
                            <Badge variant="secondary" size="lg">
                              {colporter.total}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center border-l-2 border-[#0052B4]">
                            <Badge variant="primary" size="sm">
                              {colporter.largeTotal}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center border-l border-[#0052B4]">
                            <Badge variant="success" size="sm">
                              {colporter.smallTotal}
                            </Badge>
                          </td>
                        </tr>
                      ));
                    })()}
                    <tr className="bg-gray-100">
                      <td className="px-4 py-3 text-sm font-bold text-white bg-[#0052B4] sticky left-0">
                        {t('common.totals')}
                      </td>
                      {bookTotalsByTitle
                        .filter(book => !bookTitleFilter || book.title.toLowerCase().includes(bookTitleFilter.toLowerCase()))
                        .map((book) => (
                        <td key={book.title} className="px-2 py-3 text-center border-l border-gray-200 bg-gray-50">
                          <Badge variant={book.size === BookSize.LARGE ? 'primary' : 'success'} className="bg-white">
                            {book.quantity}
                          </Badge>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center border-l-2 border-[#0052B4] bg-gray-50">
                        <Badge variant="secondary" className="bg-white" size="lg">
                          {
                            bookTotals.large + bookTotals.small
                          }
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center border-l-2 border-[#0052B4] bg-gray-50">
                        <Badge variant="primary" className="bg-white" size="sm">
                          {
                            bookTotals.large
                          }
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center border-l border-[#0052B4] bg-gray-50">
                        <Badge variant="success" className="bg-white" size="sm">
                          {
                            bookTotals.small
                          }
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
                <p className="text-sm font-medium text-primary-700">{t("transactions.uniqueTitles")}</p>
                <p className="mt-1 text-2xl font-bold text-primary-600">{bookTotalsByTitle.length}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-success-700">{t("transactions.totalQuantity")}</p>
                <p className="mt-1 text-2xl font-bold text-success-600">
                  {bookTotalsByTitle.reduce((sum, book) => sum + book.quantity, 0)}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-warning-700">{t("transactions.totalValue")}</p>
                <p className="mt-1 text-2xl font-bold text-warning-600">
                  ${formatNumber(bookTotalsByTitle.reduce((sum, book) => sum + (book.price * book.quantity), 0))}
                </p>
              </div>
            </Card>
            <Card className="p-4 bg-[#0052B4]">
              <div className="text-center">
                <p className="text-sm font-medium">{t("transactions.avgPerTitle")}</p>
                <p className="mt-1 text-2xl font-bold">
                  {bookTotalsByTitle.length > 0 
                    ? Math.round(bookTotalsByTitle.reduce((sum, book) => sum + book.quantity, 0) / bookTotalsByTitle.length)
                    : 0}
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default Transactions;