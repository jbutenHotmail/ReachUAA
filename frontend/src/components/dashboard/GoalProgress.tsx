"use client"

import type React from "react"
import { useTranslation } from "react-i18next"
import { format, parseISO, isValid } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { TrendingUp, Calendar } from "lucide-react"
import Card from "../ui/Card"
import ProgressBar from "../ui/ProgressBar"
import { formatNumber } from "../../utils/numberUtils"

interface GoalProgressProps {
  goal: {
    amount: number
    achieved: number
    startDate: string
    endDate: string
  }
}

const GoalProgress: React.FC<GoalProgressProps> = ({ goal }) => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === "es" ? es : enUS

  const percentage = Math.round((goal.achieved / goal.amount) * 100)
  const remaining = goal.amount - goal.achieved

  const formatDate = (date: string) => {
    try {
      if (!date || typeof date !== "string") {
        console.error("Invalid date input:", date)
        return "Invalid Date"
      }
      const parsedDate = parseISO(date) // Use parseISO instead of parseDate
      if (!isValid(parsedDate)) {
        console.error("Parsed date is invalid:", date)
        return "Invalid Date"
      }
      return format(parsedDate, "PP", { locale })
    } catch (error) {
      console.error(`Error formatting date: ${date}`, error)
      return "Invalid Date"
    }
  }

  const formatDateShort = (date: string) => {
    try {
      if (!date || typeof date !== "string") {
        console.error("Invalid date input:", date)
        return "Invalid Date"
      }
      const parsedDate = parseISO(date)
      if (!isValid(parsedDate)) {
        console.error("Parsed date is invalid:", date)
        return "Invalid Date"
      }
      return format(parsedDate, locale === enUS ? "MMM dd" : "dd MMM", { locale })
    } catch (error) {
      console.error(`Error formatting short date: ${date}`, error)
      return "Invalid Date"
    }
  }

  let progressVariant: "primary" | "success" | "warning" | "danger" = "primary"

  if (percentage >= 100) {
    progressVariant = "success"
  } else if (percentage >= 75) {
    progressVariant = "primary"
  } else if (percentage >= 50) {
    progressVariant = "warning"
  } else {
    progressVariant = "danger"
  }

  return (
    <Card title={t("dashboard.goal")} icon={<TrendingUp size={20} />} className="h-full">
      <div className="space-y-4 sm:space-y-6">
        {/* Main content - responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Achievement section */}
          <div className="flex-1 min-w-0">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">${formatNumber(goal.achieved)}</p>
            <div className="flex items-center mt-1 text-xs sm:text-sm text-gray-500">
              <Calendar size={12} className="mr-1 flex-shrink-0 sm:w-3.5 sm:h-3.5" />
              {/* Show short dates on mobile, full dates on desktop */}
              <span className="truncate sm:hidden">
                {formatDateShort(goal.startDate)} - {formatDateShort(goal.endDate)}
              </span>
              <span className="hidden sm:inline truncate">
                {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
              </span>
            </div>
          </div>

          {/* Goal and remaining section */}
          <div className="flex flex-col sm:text-right gap-1 sm:gap-0">
            <div className="flex justify-between sm:block">
              <span className="text-sm sm:text-base text-gray-500">{t("dashboard.goal")}:</span>
              <span className="font-semibold text-sm sm:text-lg text-gray-900">${formatNumber(goal.amount)}</span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-xs sm:text-sm text-gray-500">{t("dashboard.remaining")}:</span>
              <span className="font-semibold text-xs sm:text-sm text-gray-700">${formatNumber(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Progress section */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex justify-between text-xs sm:text-sm text-gray-600">
            <span>{t("dashboard.achieved")}</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <div className="relative">
            <ProgressBar value={goal.achieved} max={goal.amount} height={8} variant={progressVariant} />
            {/* Progress indicator for mobile */}
            <div className="sm:hidden mt-2 text-center">
              <span className="text-xs text-gray-500">
                ${formatNumber(goal.achieved)} / ${formatNumber(goal.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center sm:justify-start">
          <div
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              percentage >= 100
                ? "bg-green-100 text-green-800"
                : percentage >= 75
                ? "bg-blue-100 text-blue-800"
                : percentage >= 50
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-1.5 ${
                percentage >= 100
                  ? "bg-green-500"
                  : percentage >= 75
                  ? "bg-blue-500"
                  : percentage >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            />
            {percentage >= 100
              ? t("dashboard.goalAchieved")
              : percentage >= 75
              ? t("dashboard.onTrack")
              : t("dashboard.behindTarget")}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default GoalProgress