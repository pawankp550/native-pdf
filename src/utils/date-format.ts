const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_LONG    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function pad2(n: number): string { return String(n).padStart(2, '0'); }

/**
 * Format a Date using a token-based format string.
 *
 * Supported tokens (replaced in order, longest first to avoid partial matches):
 *   dddd  → full weekday name      (Monday)
 *   ddd   → short weekday name     (Mon)
 *   MMMM  → full month name        (January)
 *   MMM   → short month name       (Jan)
 *   YYYY  → 4-digit year           (2026)
 *   YY    → 2-digit year           (26)
 *   MM    → 2-digit month          (03)
 *   M     → numeric month          (3)
 *   DD    → 2-digit day            (07)
 *   D     → numeric day            (7)
 */
export function formatDate(date: Date, format: string): string {
  const y4  = String(date.getFullYear());
  const y2  = y4.slice(2);
  const mo  = date.getMonth();    // 0-based
  const d   = date.getDate();
  const dow = date.getDay();      // 0=Sun

  return format
    .replace(/dddd/g, DAYS_LONG[dow] ?? '')
    .replace(/ddd/g,  DAYS_SHORT[dow] ?? '')
    .replace(/MMMM/g, MONTHS_LONG[mo] ?? '')
    .replace(/MMM/g,  MONTHS_SHORT[mo] ?? '')
    .replace(/YYYY/g, y4)
    .replace(/YY/g,   y2)
    .replace(/MM/g,   pad2(mo + 1))
    .replace(/M/g,    String(mo + 1))
    .replace(/DD/g,   pad2(d))
    .replace(/D/g,    String(d));
}

/** Parse an ISO date string "YYYY-MM-DD" into a local Date (midnight). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
}

/** Today's date string in ISO format */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}
