/**
 * StepsStone Ticketing System - Standardized 12-Hour Date & Time Formatting Utilities
 * 
 * Accurately parses UTC timestamps from PostgreSQL and converts them into the user's
 * local timezone in a clean 12-hour format with AM/PM (e.g. "11/24/2026, 10:16:52 AM").
 */

function toUtcDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  let s = String(dateStr).trim();
  // If the timestamp has no timezone offset (naive UTC), append 'Z'
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('Z')) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const date = new Date(s);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Full 12-hour timestamp with date, hour, minute, and second:
 * Example: "11/24/2026, 10:16:52 AM"
 */
export function formatDateTime12h(dateStr?: string | null): string {
  const date = toUtcDate(dateStr);
  if (!date) return dateStr ? String(dateStr) : '';

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Friendly timeline timestamp with short month name and 12-hour time:
 * Example: "Nov 24, 2026, 10:16 AM"
 */
export function formatTimelineDate(dateStr?: string | null): string {
  const date = toUtcDate(dateStr);
  if (!date) return dateStr ? String(dateStr) : '';

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * 12-hour time only:
 * Example: "10:16 AM"
 */
export function formatTime12h(dateStr?: string | null): string {
  const date = toUtcDate(dateStr);
  if (!date) return dateStr ? String(dateStr) : '';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Date only with short month:
 * Example: "Nov 24, 2026"
 */
export function formatDateMedium(dateStr?: string | null): string {
  const date = toUtcDate(dateStr);
  if (!date) return dateStr ? String(dateStr) : '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
