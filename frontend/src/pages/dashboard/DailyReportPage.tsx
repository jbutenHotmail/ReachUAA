"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronLeft, Calendar, DollarSign, BookText, BookOpen, Phone, MapPin, User, Eye, Clock } from "lucide-react"
import { useTransactionStore } from "../../stores/transactionStore"
import { useBibleStudyStore } from "../../stores/bibleStudyStore"
import { useDashboardStore } from "../../stores/dashboardStore"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Badge from "../../components/ui/Badge"
import LoadingScreen from "../../components/ui/LoadingScreen"
import { BookSize } from "../../types"
import { normalizeDateString } from "../../utils/dateUtils"
import { formatNumber } from "../../utils/numberUtils"

const DailyReportPage: React.FC = () => {
  const { t } = useTranslation()
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const { transactions } = useTransactionStore()
  const { bibleStudies } = useBibleStudyStore()
  const { personalStats } = useDashboardStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Small delay to ensure data is loaded
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (!date || !personalStats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("dashboard.invalidDateOrData")}</p>
        <Button variant="outline" className="mt-4 bg-transparent" onClick={() => navigate("/dashboard")}>
          {t("dashboard.backToDashboard")}
        </Button>
      </div>
    )
  }

  // Filter data for this specific date and user
  const dayTransactions = transactions.filter(
    (t) => normalizeDateString(t.date) === date && t.studentId === personalStats.person.id && t.status === "APPROVED",
  )

  const dayBibleStudies = bibleStudies.filter((bs) => {
    return normalizeDateString(bs.createdAt) === date && bs.colporterId === personalStats.person.id
  })

  // Calculate totals for this day
  const dayTotals = {
    sales: dayTransactions.reduce((sum, t) => Number(sum) + Number(t.total), 0),
    books: dayTransactions.reduce((sum, t) => {
      return sum + (t.books?.reduce((bookSum, book) => bookSum + book.quantity, 0) || 0)
    }, 0),
    largeBooks: dayTransactions.reduce((sum, t) => {
      return (
        sum + (t.books?.reduce((bookSum, book) => bookSum + (book.size === BookSize.LARGE ? book.quantity : 0), 0) || 0)
      )
    }, 0),
    smallBooks: dayTransactions.reduce((sum, t) => {
      return (
        sum + (t.books?.reduce((bookSum, book) => bookSum + (book.size === BookSize.SMALL ? book.quantity : 0), 0) || 0)
      )
    }, 0),
    studies: dayBibleStudies.length,
    hoursWorked: dayTransactions.reduce((sum, t) => Number(sum) + (Number(t.hoursWorked) || 0), 0),
  }

  // Get all books delivered this day with details
  const booksDelivered = dayTransactions.reduce((acc, transaction) => {
    transaction.books?.forEach((book) => {
      const existing = acc.find((b) => b.id === book.id)
      if (existing) {
        existing.quantity += book.quantity
      } else {
        acc.push({
          id: book.id,
          title: book.title,
          quantity: book.quantity,
          price: book.price,
          size: book.size,
          transactionId: transaction.id,
        })
      }
    })
    return acc
  }, [] as any[])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      "Bible Study": "primary",
      "Prayer Group": "success",
      "Marriage and Family": "warning",
    } as const

    return <Badge variant={variants[type as keyof typeof variants] || "secondary"}>{type}</Badge>
  }

  if (isLoading) {
    return <LoadingScreen message={t("dashboard.loadingDailyReport")} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ChevronLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-primary-600" size={28} />
            {t("dashboard.dailyReport")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(date)}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("dashboard.dailySales")}</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">${formatNumber(dayTotals.sales)}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookText className="text-success-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("dashboard.booksDelivered")}</p>
            <p className="mt-1 text-2xl font-bold text-success-600">{dayTotals.books}</p>
            <p className="text-xs text-gray-500">
              {t("dashboard.bookBreakdown", { large: dayTotals.largeBooks, small: dayTotals.smallBooks })}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="text-warning-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("dashboard.bibleStudies")}</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">{dayTotals.studies}</p>
            <p className="text-xs text-gray-500">{t("dashboard.registered")}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="text-info-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t("dashboard.hoursWorked")}</p>
            <p className="mt-1 text-2xl font-bold text-info-600">{dayTotals.hoursWorked}h</p>
            <p className="text-xs text-gray-500">{t("dashboard.totalHours")}</p>
          </div>
        </Card>
      </div>

      {/* Activity Details */}
      {(dayTransactions.length > 0 || dayBibleStudies.length > 0) && (
        <Card title={t("dashboard.dayActivity")} icon={<Calendar size={20} />}>
          <div className="space-y-6">
            {/* Transactions Details */}
            {dayTransactions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="text-primary-600" size={20} />
                  {t("transactions.title")}
                </h3>
                <div className="space-y-4">
                  {dayTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {t("common.leader")}: {transaction.leaderName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {t("common.date")}: {new Date(transaction.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="primary" size="lg">
                          ${formatNumber(transaction.total)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t("dashboard.cash")}:</span>
                          <span>${formatNumber(transaction.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t("dashboard.checks")}:</span>
                          <span>${formatNumber(transaction.checks)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t("dashboard.atm")}:</span>
                          <span>${formatNumber(transaction.atmMobile)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t("dashboard.paypal")}:</span>
                          <span>${formatNumber(transaction.paypal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Books Details */}
            {booksDelivered.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookText className="text-success-600" size={20} />
                  {t("dashboard.booksDelivered", { count: dayTotals.books })}
                </h3>
                <div className="space-y-3">
                  {booksDelivered.map((book) => (
                    <div key={book.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{book.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={book.size === BookSize.LARGE ? "primary" : "success"} size="sm">
                            {t(`inventory.size.${book.size.toLowerCase()}`)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            ${formatNumber(book.price)} {t("dashboard.perUnit")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" size="lg">
                          {book.quantity}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">${formatNumber(book.price * book.quantity)}</p>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{t("common.total")}:</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="primary">
                          {t("inventory.size.large")} {dayTotals.largeBooks}
                        </Badge>
                        <Badge variant="success">
                          {t("inventory.size.small")} {dayTotals.smallBooks}
                        </Badge>
                        <Badge variant="secondary" size="lg">
                          {t("common.total")} {dayTotals.books}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bible Studies Details */}
            {dayBibleStudies.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="text-warning-600" size={20} />
                  {t("dashboard.bibleStudies")} ({dayBibleStudies.length})
                </h3>

                <div className="space-y-4">
                  {dayBibleStudies.map((study) => (
                    <div
                      key={study.id}
                      className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() =>
                        navigate(`/bible-studies/${study.id}`, {
                          state: { from: `/daily-report/${date}` },
                        })
                      }
                    >
                      <div className="flex items-start gap-3">
                        {study.photoUrl ? (
                          <img
                            src={study.photoUrl || "/placeholder.svg"}
                            alt={study.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900">{study.name}</h3>
                            {getTypeBadge(study.studyType)}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone size={14} />
                              <span>{study.phone}</span>
                            </div>

                            {study.municipalityName && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MapPin size={14} />
                                <span>{study.municipalityName}</span>
                              </div>
                            )}

                            {study.location && (
                              <p className="text-sm text-gray-500">
                                {t("dashboard.location")}: {study.location}
                              </p>
                            )}

                            {study.interestTopic && (
                              <p className="text-sm text-gray-500">
                                {t("dashboard.interest")}: {study.interestTopic}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center mt-3">
                            <span className="text-xs text-gray-400"></span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/bible-studies/${study.id}`, {
                                  state: { from: `/daily-report/${date}` },
                                })
                              }}
                            >
                              <Eye size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {dayTransactions.length === 0 && dayBibleStudies.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t("dashboard.noActivityRegistered")}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("dashboard.noTransactionsOrStudies")}</p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/transactions/new")}
                leftIcon={<DollarSign size={16} />}
              >
                {t("dashboard.createTransaction")}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/bible-studies/new")}
                leftIcon={<BookOpen size={16} />}
              >
                {t("dashboard.registerStudy")}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DailyReportPage