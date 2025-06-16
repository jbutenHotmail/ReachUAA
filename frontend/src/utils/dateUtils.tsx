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