import { useProgramStore } from '../stores/programStore';

/**
 * Checks if a given date is a colportable day based on program settings
 * @param date The date to check
 * @returns Boolean indicating if the date is a colportable day
 */
export const isColportableDay = (date: Date): boolean => {
  const { program } = useProgramStore.getState();
  
  if (!program) {
    // If no program exists, default to allowing transactions
    return true;
  }
  
  // Format date to YYYY-MM-DD for comparison
  const dateStr = date.toISOString().split('T')[0];
  
  // Check if date is within program period
  const programStart = new Date(program.start_date);
  const programEnd = new Date(program.end_date);
  
  if (date < programStart || date > programEnd) {
    return false;
  }
  
  // Check if there's a custom override for this specific date
  const customDay = program.customDays?.find(day => {
    // Normalize the custom day date to YYYY-MM-DD
    const customDayStr = new Date(day.date).toISOString().split('T')[0];
    console.log(customDayStr, dateStr, customDayStr === dateStr);
    return customDayStr === dateStr;
  });
  
  if (customDay) {
    // Use a type-safe approach to check the is_working_day property
    // It could be a boolean or a number (1 or 0) depending on how it's stored in the database
    console.log(customDay, Number(customDay.is_working_day) === 1)
    return customDay.is_working_day === true || Number(customDay.is_working_day) === 1;
  }
  console.log('no custom day found');
  // Check regular working days - convert day of week to lowercase string
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = daysOfWeek[date.getDay()];
  
  const workingDay = program.workingDays?.find(day => day.day_of_week === dayOfWeek);
  
  // Use a type-safe approach here as well
  return workingDay ? (workingDay.is_working_day === true || workingDay.is_working_day === 1) : false;
};

/**
 * Gets the next available colportable day
 * @param date Starting date to check from
 * @returns The next available colportable day
 */
export const getNextColportableDay = (date: Date): Date => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Check up to 30 days in the future to avoid infinite loop
  for (let i = 0; i < 30; i++) {
    if (isColportableDay(nextDay)) {
      return nextDay;
    }
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  // If no colportable day found in the next 30 days, return the original date
  return date;
};