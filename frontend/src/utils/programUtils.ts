import { useProgramStore } from "../stores/programStore"

const getDateFromUTC = (dateString: string): Date => {
  const utcDate = new Date(dateString)
  const year = utcDate.getUTCFullYear()
  const month = utcDate.getUTCMonth()
  const day = utcDate.getUTCDate()

  return new Date(year, month, day)
}

// Utility function to normalize any date to start of day
const normalizeToStartOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Utility function to compare dates ignoring time
const isSameDate = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * @param date The date to check
 * @param from Optional parameter for debugging/logging purposes
 * @returns Boolean indicating if the date is a colportable day
 */
export const isColportableDay = (date: Date): boolean => {
  const { program } = useProgramStore.getState()

  if (!program) {
    // If no program exists, default to allowing transactions
    return true
  }

  // Normalize the input date to start of day
  const checkDate = normalizeToStartOfDay(date)

  // Parse program dates consistently
  const programStart = getDateFromUTC(program.start_date)
  const programEnd = getDateFromUTC(program.end_date)

  // Check if date is within program period (inclusive)
  if (checkDate < programStart || checkDate > programEnd) {
    return false
  }

  // Check if there's a custom override for this specific date
  const customDay = program.customDays?.find((day) => {
    const customDayDate = getDateFromUTC(day.date)
    return isSameDate(customDayDate, checkDate)
  })

  if (customDay) {
    // Use a type-safe approach to check the is_working_day property
    return customDay.is_working_day === true || Number(customDay.is_working_day) === 1
  }

  // Check regular working days - convert day of week to lowercase string
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const dayOfWeek = daysOfWeek[checkDate.getDay()]

  const workingDay = program.workingDays?.find((day) => day.day_of_week === dayOfWeek)

  // Use a type-safe approach here as well
  const isWorking = workingDay ? workingDay.is_working_day === true || workingDay.is_working_day === 1 : false

  return isWorking
}

/**
 * Gets the next available colportable day
 * @param date Starting date to check from
 * @returns The next available colportable day
 */
export const getNextColportableDay = (date: Date): Date => {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)

  // Check up to 30 days in the future to avoid infinite loop
  for (let i = 0; i < 30; i++) {
    if (isColportableDay(nextDay)) {
      return nextDay
    }
    nextDay.setDate(nextDay.getDate() + 1)
  }

  // If no colportable day found in the next 30 days, return the original date
  return date
}

/**
 * Gets the previous available colportable day
 * @param date Starting date to check from
 * @returns The previous available colportable day
 */
export const getPreviousColportableDay = (date: Date): Date => {
  const prevDay = new Date(date)
  prevDay.setDate(prevDay.getDate() - 1)

  // Check up to 30 days in the past to avoid infinite loop
  for (let i = 0; i < 30; i++) {
    if (isColportableDay(prevDay)) {
      return prevDay
    }
    prevDay.setDate(prevDay.getDate() - 1)
  }

  // If no colportable day found in the previous 30 days, return the original date
  return date
}

/**
 * Checks if a date string represents today
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Boolean indicating if the date is today
 */
export const isToday = (dateString: string): boolean => {
  const today = new Date()
  const checkDate = getDateFromUTC(dateString + "T12:00:00.000Z") // Add time to avoid timezone issues
  return isSameDate(today, checkDate)
}

/**
 * Formats a date consistently for display
 * @param date Date to format
 * @param locale Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export const formatDateForDisplay = (date: Date, locale = "en-US"): string => {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })
}

/**
 * Converts a date to YYYY-MM-DD format consistently
 * @param date Date to convert
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
