"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  BookText,
  Heart,
  Calendar,
  UserCog,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SummerReport from "../../components/reports/SummerReport";
import SummerBooksReport from "../../components/reports/SummerBooksReport";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { clsx } from "clsx";
import { useTransactionStore } from "../../stores/transactionStore";
import LoadingScreen from "../../components/ui/LoadingScreen";

type TimePeriod = "day" | "week" | "month" | "all";

// Utility functions for consistent date handling
const getDateFromUTC = (dateString: string): Date => {
  const utcDate = new Date(dateString);
  // Extraer año, mes, día de la fecha UTC y crear una fecha local
  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth();
  const day = utcDate.getUTCDate();

  // Crear nueva fecha en zona horaria local con los mismos año, mes, día
  return new Date(year, month, day);
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isDateInWeek = (date: Date, weekStartDate: Date): boolean => {
  const startOfWeek = new Date(weekStartDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
};

const isDateInMonth = (date: Date, monthDate: Date): boolean => {
  return (
    date.getMonth() === monthDate.getMonth() &&
    date.getFullYear() === monthDate.getFullYear()
  );
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DonationsReport: React.FC = () => {
  const { t } = useTranslation();
  const [showColporters, setShowColporters] = useState(true);
  const [showLeaders, setShowLeaders] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const {
    transactions,
    isLoading,
    error,
    fetchAllTransactions,
    wereTransactionsFetched,
  } = useTransactionStore();

  const isFinancesRoute = location.pathname.includes("/finances");

  useEffect(() => {
    const loadTransactionData = async () => {
      try {
        if (!wereTransactionsFetched) {
          await fetchAllTransactions("APPROVED");
        }
      } catch (err) {
        console.error("Error fetching transaction data:", err);
      }
    };

    loadTransactionData();
  }, [fetchAllTransactions, wereTransactionsFetched]);

  const handleToggleView = () => {
    setShowColporters(!showColporters);
  };

  const handleToggleGrouping = () => {
    setShowLeaders(!showLeaders);
  };

  const navigateDate = (direction: "prev" | "next") => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);

      if (timePeriod === "day") {
        newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1));
      } else if (timePeriod === "week") {
        newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
      } else if (timePeriod === "month") {
        newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      }

      return newDate;
    });
  };

  const tabs = [
    {
      id: "finances",
      label: t("donationsReport.donations"),
      icon: <Heart size={18} />,
      path: "/reports/donations/finances",
    },
    {
      id: "delivered-books",
      label: t("reports.deliveredBooks"),
      icon: <BookText size={18} />,
      path: "/reports/donations/delivered-books",
    },
  ];

  const getFilteredTransactions = () => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const approvedTransactions = transactions.filter(
      (t) => t.status === "APPROVED"
    );

    if (timePeriod === "all") {
      return approvedTransactions;
    }

    return approvedTransactions.filter((transaction) => {
      const transactionDate = getDateFromUTC(transaction.date);

      if (timePeriod === "day") {
        return isSameDay(transactionDate, selectedDate);
      } else if (timePeriod === "week") {
        return isDateInWeek(transactionDate, selectedDate);
      } else if (timePeriod === "month") {
        return isDateInMonth(transactionDate, selectedDate);
      }

      return true;
    });
  };

  const transformTransactionsToSalesData = () => {
    const filteredTransactions = getFilteredTransactions();

    if (showLeaders) {
      // When grouping by leaders, group transactions by the leader who was in charge that day
      const leaderMap = new Map();

      filteredTransactions.forEach((transaction) => {
        const leaderName = transaction.leaderName;
        
        if (!leaderMap.has(leaderName)) {
          leaderMap.set(leaderName, {
            colporterName: leaderName, // El nombre del líder como "colporter" para el reporte
            leaderName: leaderName,
            allLeaders: [leaderName],
            dailySales: {},
            totalSales: 0,
          });
        }

        const leaderData = leaderMap.get(leaderName);

        // Usar fecha consistente como clave
        const transactionDate = getDateFromUTC(transaction.date);
        const dateKey = formatDateKey(transactionDate);

        if (!leaderData.dailySales[dateKey]) {
          leaderData.dailySales[dateKey] = 0;
        }

        leaderData.dailySales[dateKey] += Number(transaction.total);
        leaderData.totalSales += Number(transaction.total);
      });

      return Array.from(leaderMap.values());
    } else {
      // When grouping by colporters, use the existing logic
      const colporterMap = new Map();

      filteredTransactions.forEach((transaction) => {
        if (!colporterMap.has(transaction.studentId)) {
          colporterMap.set(transaction.studentId, {
            colporterName: transaction.studentName,
            leaderName: transaction.leaderName, // Primer líder encontrado
            allLeaders: new Set([transaction.leaderName]), // Todos los líderes
            dailySales: {},
            totalSales: 0,
          });
        } else {
          // Si el colportor ya existe, agregar el líder al set
          const colporterData = colporterMap.get(transaction.studentId);
          colporterData.allLeaders.add(transaction.leaderName);
          
          // Si hay múltiples líderes, mostrar "Multiple Leaders"
          if (colporterData.allLeaders.size > 1) {
            colporterData.leaderName = "Multiple Leaders";
          }
        }

        const colporterData = colporterMap.get(transaction.studentId);

        // Usar fecha consistente como clave
        const transactionDate = getDateFromUTC(transaction.date);
        const dateKey = formatDateKey(transactionDate);

        if (!colporterData.dailySales[dateKey]) {
          colporterData.dailySales[dateKey] = 0;
        }

        colporterData.dailySales[dateKey] += Number(transaction.total);
        colporterData.totalSales += Number(transaction.total);
      });

      // Convertir el Set de líderes a array para el resultado final
      return Array.from(colporterMap.values()).map(colporter => ({
        ...colporter,
        allLeaders: Array.from(colporter.allLeaders) // Convertir Set a Array
      }));
    }
  };

  const transformTransactionsToBookData = () => {
    const filteredTransactions = getFilteredTransactions();

    if (showLeaders) {
      // When grouping by leaders, group transactions by the leader who was in charge that day
      const leaderMap = new Map();

      filteredTransactions.forEach((transaction) => {
        const leaderName = transaction.leaderName;
        
        if (!leaderMap.has(leaderName)) {
          leaderMap.set(leaderName, {
            colporterName: leaderName, // El nombre del líder como "colporter" para el reporte
            leaderName: leaderName,
            allLeaders: [leaderName],
            dailyBooks: {},
            totalBooks: { large: 0, small: 0 },
          });
        }

        const leaderData = leaderMap.get(leaderName);

        if (transaction.books && transaction.books.length > 0) {
          // Usar fecha consistente como clave
          const transactionDate = getDateFromUTC(transaction.date);
          const dateKey = formatDateKey(transactionDate);

          if (!leaderData.dailyBooks[dateKey]) {
            leaderData.dailyBooks[dateKey] = { large: 0, small: 0 };
          }

          transaction.books.forEach((book) => {
            if (book.size === "LARGE") {
              leaderData.dailyBooks[dateKey].large += book.quantity;
              leaderData.totalBooks.large += book.quantity;
            } else {
              leaderData.dailyBooks[dateKey].small += book.quantity;
              leaderData.totalBooks.small += book.quantity;
            }
          });
        }
      });

      return Array.from(leaderMap.values());
    } else {
      // When grouping by colporters, use the existing logic
      const colporterMap = new Map();

      filteredTransactions.forEach((transaction) => {
        if (!colporterMap.has(transaction.studentId)) {
          colporterMap.set(transaction.studentId, {
            colporterName: transaction.studentName,
            leaderName: transaction.leaderName, // Primer líder encontrado
            allLeaders: new Set([transaction.leaderName]), // Todos los líderes
            dailyBooks: {},
            totalBooks: { large: 0, small: 0 },
          });
        } else {
          // Si el colportor ya existe, agregar el líder al set
          const colporterData = colporterMap.get(transaction.studentId);
          colporterData.allLeaders.add(transaction.leaderName);
          
          // Si hay múltiples líderes, mostrar "Multiple Leaders"
          if (colporterData.allLeaders.size > 1) {
            colporterData.leaderName = "Multiple Leaders";
          }
        }

        const colporterData = colporterMap.get(transaction.studentId);

        if (transaction.books && transaction.books.length > 0) {
          // Usar fecha consistente como clave
          const transactionDate = getDateFromUTC(transaction.date);
          const dateKey = formatDateKey(transactionDate);

          if (!colporterData.dailyBooks[dateKey]) {
            colporterData.dailyBooks[dateKey] = { large: 0, small: 0 };
          }

          transaction.books.forEach((book) => {
            if (book.size === "LARGE") {
              colporterData.dailyBooks[dateKey].large += book.quantity;
              colporterData.totalBooks.large += book.quantity;
            } else {
              colporterData.dailyBooks[dateKey].small += book.quantity;
              colporterData.totalBooks.small += book.quantity;
            }
          });
        }
      });

      // Convertir el Set de líderes a array para el resultado final
      return Array.from(colporterMap.values()).map(colporter => ({
        ...colporter,
        allLeaders: Array.from(colporter.allLeaders) // Convertir Set a Array
      }));
    }
  };

  const formatDateRange = () => {
    if (timePeriod === "all") {
      return t("donationsReport.completeProgram");
    }

    const startDate = selectedDate;

    if (timePeriod === "day") {
      return startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: 'UTC'
      });
    } else if (timePeriod === "week") {
      const day = startDate.getDay();
      const sunday = new Date(startDate);
      sunday.setDate(startDate.getDate() - day);

      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);

      return `${sunday.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        timeZone: "UTC"
      })} - ${saturday.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })}`;
    } else if (timePeriod === "month") {
      return startDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
        
      });
    }

    return "";
  };

  const salesData = transformTransactionsToSalesData();
  const booksData = transformTransactionsToBookData();

  if (isLoading) {
    return <LoadingScreen message={t("donationsReport.loading")} />;
  }

  if (error) {
    return (
      <Card>
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">{t("common.error")}</p>
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="text-red-500" size={28} />
            {t("donationsReport.title")}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              {formatDateRange()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Card className="p-0 shadow-sm">
            <div className="flex items-center divide-x">
              {(["day", "week", "month", "all"] as TimePeriod[]).map(
                (period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={clsx(
                      "px-3 py-2 text-sm font-medium transition-colors",
                      timePeriod === period
                        ? "bg-primary-50 text-primary-700"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {t(`donationsReport.${period}`)}
                  </button>
                )
              )}
            </div>
          </Card>

          {timePeriod !== "all" && (
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="px-2"
              >
                <ChevronLeft size={20} />
              </Button>

              <div className="px-4 py-2 flex items-center gap-2 border-l border-r border-gray-200">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium">
                  {timePeriod === "day" &&
                    selectedDate.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      timeZone: 'UTC'
                    })}
                  {timePeriod === "week" &&
                    t("donationsReport.weekOf", {
                      date: selectedDate.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        timeZone: 'UTC'
                      }),
                    })}
                  {timePeriod === "month" &&
                    selectedDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                      timeZone: 'UTC'
                    })}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("next")}
                className="px-2"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleGrouping}
            leftIcon={showLeaders ? <Users size={16} /> : <UserCog size={16} />}
          >
            {showLeaders
              ? t("donationsReport.byColporters")
              : t("donationsReport.byLeaders")}
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={clsx(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2",
                location.pathname.includes(tab.id)
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isFinancesRoute ? (
        <SummerReport
          sales={salesData}
          showColporters={showColporters}
          showLeaders={showLeaders}
          onToggleView={handleToggleView}
          onToggleGrouping={handleToggleGrouping}
          timePeriod={timePeriod}
          selectedDate={selectedDate}
        />
      ) : (
        <SummerBooksReport
          booksData={booksData}
          showColporters={showColporters}
          showLeaders={showLeaders}
          onToggleView={handleToggleView}
          onToggleGrouping={handleToggleGrouping}
          timePeriod={timePeriod}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

export default DonationsReport;
