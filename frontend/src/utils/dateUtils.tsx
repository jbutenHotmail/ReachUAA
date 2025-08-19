/**
 * Utility functions for handling dates consistently between frontend and backend
 */

/**
 * Gets the current date in YYYY-MM-DD format using the local timezone
 * This ensures the date is consistent between frontend and backend
 */
export const getCurrentDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date string to YYYY-MM-DD format
 * @param date Date object or date string
 */
export const formatDateToString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Adds days to a date and returns the result in YYYY-MM-DD format
 * @param date Starting date (Date object or string)
 * @param days Number of days to add (can be negative)
 */
export const addDays = (date: Date | string, days: number): string => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return formatDateToString(d);
};

/**
 * Gets the start of the current week (Sunday) in YYYY-MM-DD format
 * Modified to use Sunday as the start of the week
 */
export const getStartOfWeek = (): string => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = now.getDate() - day; // Go back to Sunday
  const sunday = new Date(now.setDate(diff));
  return formatDateToString(sunday);
};

/**
 * Gets the end of the current week (Saturday) in YYYY-MM-DD format
 * Modified to use Saturday as the end of the week
 */
export const getEndOfWeek = (): string => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = now.getDate() - day + 6; // Go forward to Saturday (Sunday + 6)
  const saturday = new Date(now.setDate(diff));
  return formatDateToString(saturday);
};

/**
 * Gets the start of the current month in YYYY-MM-DD format
 */
export const getStartOfMonth = (): string => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return formatDateToString(firstDay);
};

/**
 * Gets the end of the current month in YYYY-MM-DD format
 */
export const getEndOfMonth = (): string => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return formatDateToString(lastDay);
};

/**
 * Creates a date object that preserves the local date regardless of timezone
 * This fixes the issue where dates are shifted by one day due to timezone conversion
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object with the time set to noon to avoid timezone issues
 */
export const createLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date with time set to noon (12:00) to avoid timezone issues
  return new Date(year, month - 1, day, 12, 0, 0);
};

/**
 * Compares two dates (strings or Date objects) to check if they represent the same day
 * This handles timezone issues by comparing only the year, month, and day components
 * @param date1 First date to compare
 * @param date2 Second date to compare
 * @returns True if the dates represent the same day, false otherwise
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  // If both are strings in YYYY-MM-DD format, compare directly
  if (typeof date1 === 'string' && typeof date2 === 'string') {
    const dateStr1 = date1.split('T')[0]; // Extract date part if datetime
    const dateStr2 = date2.split('T')[0]; // Extract date part if datetime
    return dateStr1 === dateStr2;
  }
  
  const d1 = typeof date1 === 'string' ? createLocalDate(date1.split('T')[0]) : date1;
  const d2 = typeof date2 === 'string' ? createLocalDate(date2.split('T')[0]) : date2;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Checks if a date is within a given range (inclusive)
 * @param date The date to check
 * @param startDate The start of the range
 * @param endDate The end of the range
 * @returns True if the date is within the range, false otherwise
 */
export const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  const d = createLocalDate(date);
  const start = createLocalDate(startDate);
  const end = createLocalDate(endDate);
  
  return d >= start && d <= end;
};

/**
 * Extracts the date part from a datetime string, handling timezone issues
 * This ensures we get the actual date that was intended, not shifted by timezone
 * @param dateTimeString DateTime string (e.g., "2025-08-16T01:27:43.000Z")
 * @returns Date string in YYYY-MM-DD format representing the local date
 */
export const extractLocalDateFromDateTime = (dateTimeString: string): string => {
  // If it's already in YYYY-MM-DD format, return as is
  if (dateTimeString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateTimeString;
  }
  
  // Extract date directly from the ISO string without timezone conversion
  // This prevents JavaScript from shifting the date due to timezone differences
  const datePart = dateTimeString.split('T')[0];
  
  // Validate that it's a proper date format
  if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return datePart;
  }
  
  // Fallback: if the format is unexpected, try to parse it
  console.warn('Unexpected date format:', dateTimeString);
  const date = new Date(dateTimeString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Normalizes a date to YYYY-MM-DD format, handling both date strings and datetime strings
 * @param dateInput Date string or datetime string
 * @returns Normalized date string in YYYY-MM-DD format
 */
export const normalizeDateString = (dateInput: string): string => {
  // If it contains 'T', it's a datetime string
  if (dateInput.includes('T')) {
    return extractLocalDateFromDateTime(dateInput);
  }
  
  // If it's already a date string, return as is
  return dateInput;
};

/**
 * Generates an array of date strings for each day in a range
 * @param startDate The start date of the range
 * @param endDate The end date of the range
 * @returns Array of date strings in YYYY-MM-DD format
 */
export const getDateRange = (startDate: string, endDate: string): string[] => {
  const start = createLocalDate(startDate);
  const end = createLocalDate(endDate);
  const dates: string[] = [];
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateToString(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * Parses a date string to a Date object, handling timezone issues
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object
 */
export const parseDate = (dateStr: string): Date => {
  return createLocalDate(dateStr);
};