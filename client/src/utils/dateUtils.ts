import moment from 'moment';

/**
 * Format date as 'Mon, Jan 1'
 */
export const formatDate = (date: Date | string): string => {
    return moment(date).format('ddd, MMM D');
};

/**
 * Format time as '9:30 AM'
 */
export const formatTime = (date: Date | string): string => {
    return moment(date).format('h:mm A');
};

/**
 * Format date and time together: 'Mon, Jan 1 at 9:30 AM'
 */
export const formatDateTime = (date: Date | string): string => {
    return moment(date).format('ddd, MMM D [at] h:mm A');
};

/**
 * Format just the month and year: 'January 2025'
 */
export const formatMonthYear = (date: Date | string): string => {
    return moment(date).format('MMMM YYYY');
};

/**
 * Get start and end of current week
 */
export const getCurrentWeekRange = (): { start: Date; end: Date } => {
    const start = moment().startOf('week').toDate();
    const end = moment().endOf('week').toDate();
    return { start, end };
};

/**
 * Get start and end of current month
 */
export const getCurrentMonthRange = (): { start: Date; end: Date } => {
    const start = moment().startOf('month').toDate();
    const end = moment().endOf('month').toDate();
    return { start, end };
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
    return moment(date1).isSame(moment(date2), 'day');
};

/**
 * Format a date range
 * If dates are on same day: 'Mon, Jan 1, 9:30 AM - 11:30 AM'
 * If different days: 'Mon, Jan 1, 9:30 AM - Tue, Jan 2, 11:30 AM'
 */
export const formatDateRange = (
    startDate: Date | string,
    endDate: Date | string,
    isAllDay = false
): string => {
    if (isAllDay) {
        if (isSameDay(startDate, endDate)) {
            return formatDate(startDate);
        }
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    if (isSameDay(startDate, endDate)) {
        return `${formatDate(startDate)}, ${formatTime(startDate)} - ${formatTime(endDate)}`;
    }

    return `${formatDateTime(startDate)} - ${formatDateTime(endDate)}`;
};