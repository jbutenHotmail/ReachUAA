/**
 * Utility functions for handling dates consistently between frontend and backend
 * @exports parseDate
 */

/**
 * Extracts date components from UTC string consistently
 */
const getDateFromUTC = (dateString: string): Date => {
  const utcDate = new Date(dateString)
  const year = utcDate.getUTCFullYear()
  const month = utcDate.getUTCMonth()
  const day = utcDate.getUTCDate()
  return new Date(year, month, day)
}

/**
 * Parses a date string consistently, handling both YYYY-MM-DD and ISO formats
 */
export const parseDate = (dateInput: string | Date): Date => {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate())
  }

  // If it's a simple YYYY-MM-DD format, parse as local date
  if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateInput.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  // If it's an ISO string with timezone info, extract UTC date
  return getDateFromUTC(dateInput)
}

/**
 * Gets the current date in YYYY-MM-DD format using the local timezone
 * This ensures the date is consistent between frontend and backend
 */
export const getCurrentDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Formats a date string to YYYY-MM-DD format
 * @param date Date object or date string
 */
export const formatDateToString = (date: Date | string): string => {
  const d = parseDate(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Adds days to a date and returns the result in YYYY-MM-DD format
 * @param date Starting date (Date object or string)
 * @param days Number of days to add (can be negative)
 */
export const addDays = (date: Date | string, days: number): string => {
  const d = parseDate(date)
  // Create a new date object to avoid mutating the original
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  result.setDate(result.getDate() + days)
  return formatDateToString(result)
}

/**
 * Gets the start of the current week (Sunday) in YYYY-MM-DD format
 * Modified to use Sunday as the start of the week
 */
export const getStartOfWeek = (referenceDate?: Date | string): string => {
  const now = referenceDate ? parseDate(referenceDate) : new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  // Create a new date object to avoid mutating the original
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  sunday.setDate(sunday.getDate() - day) // Go back to Sunday
  return formatDateToString(sunday)
}

/**
 * Gets the end of the current week (Saturday) in YYYY-MM-DD format
 * Modified to use Saturday as the end of the week
 */
export const getEndOfWeek = (referenceDate?: Date | string): string => {
  const now = referenceDate ? parseDate(referenceDate) : new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  // Create a new date object to avoid mutating the original
  const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  saturday.setDate(saturday.getDate() - day + 6) // Go forward to Saturday (Sunday + 6)
  return formatDateToString(saturday)
}

/**
 * Gets the start of the current month in YYYY-MM-DD format
 */
export const getStartOfMonth = (referenceDate?: Date | string): string => {
  const now = referenceDate ? parseDate(referenceDate) : new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  return formatDateToString(firstDay)
}

/**
 * Gets the end of the current month in YYYY-MM-DD format
 */
export const getEndOfMonth = (referenceDate?: Date | string): string => {
  const now = referenceDate ? parseDate(referenceDate) : new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return formatDateToString(lastDay)
}

/**
 * Checks if two dates are the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

/**
 * Checks if a date is within a range (inclusive)
 */
export const isDateInRange = (date: Date | string, startDate: Date | string, endDate: Date | string): boolean => {
  const d = parseDate(date)
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  return d >= start && d <= end
}

/**
 * Gets the difference in days between two dates
 */
export const getDaysDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  const timeDiff = d2.getTime() - d1.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

/**
 * Formats a date for display in a specific locale
 */
export const formatDateForDisplay = (date: Date | string, locale = "en-US"): string => {
  const d = parseDate(date)
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })
}

/**
 * Gets an array of dates between two dates (inclusive)
 */
export const getDateRange = (startDate: Date | string, endDate: Date | string): string[] => {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const dates: string[] = []

  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())

  while (current <= end) {
    dates.push(formatDateToString(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Checks if a date is today
 */
export const isToday = (date: Date | string): boolean => {
  return isSameDay(date, new Date())
}

/**
 * Checks if a date is in the past
 */
export const isPastDate = (date: Date | string): boolean => {
  const d = parseDate(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

/**
 * Checks if a date is in the future
 */
export const isFutureDate = (date: Date | string): boolean => {
  const d = parseDate(date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return d > today
}
