import CustomError from "./custom_error.js";

const addWeekdays = (date: Date, days: number) => {
  let result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);

    // Skip weekends
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  // Set a random time before 4:00 pm (16:00)
  result.setHours(0, 0, 0, 0);

  return result;
};

const getDateRange = (range: string, startDate?: string, endDate?: string) => {
  const currentDate = new Date();
  let fromDate: Date, toDate: Date;

  if (range === 'daily') {
    fromDate = new Date(currentDate.setHours(0, 0, 0, 0)); // start of today
    toDate = new Date();
  } else if (range === 'weekly') {
    fromDate = new Date(currentDate.setDate(currentDate.getDate() - 7)); // 7 days ago
    toDate = new Date();
  } else if (range === 'custom' && startDate && endDate) {
    fromDate = new Date(startDate);
    toDate = new Date(endDate);
  } else {
    throw new CustomError('Invalid range or missing date parameters', 400);
  }

  return { fromDate, toDate };
};

export { addWeekdays, getDateRange };