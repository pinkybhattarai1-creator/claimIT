/**
 * Date Normalization Utility for Thai BE, Oracle, and ISO Date Formats
 */

const MONTH_NAMES = {
  'jan': 0, 'january': 0, 'ม.ค.': 0,
  'feb': 1, 'february': 1, 'ก.พ.': 1,
  'mar': 2, 'march': 2, 'มี.ค.': 2,
  'apr': 3, 'april': 3, 'เม.ย.': 3,
  'may': 4, 'พ.ค.': 4,
  'jun': 5, 'june': 5, 'มิ.ย.': 5,
  'jul': 6, 'july': 6, 'ก.ค.': 6,
  'aug': 7, 'august': 7, 'ส.ค.': 7,
  'sep': 8, 'sept': 8, 'september': 8, 'ก.ย.': 8,
  'oct': 9, 'october': 9, 'ต.ค.': 9,
  'nov': 10, 'november': 10, 'พ.ย.': 10,
  'dec': 11, 'december': 11, 'ธ.ค.': 11
};

/**
 * Normalizes any input date into a standard UTC Date object or null if invalid.
 * Handles:
 * - Thai Buddhist Era 4-digit: 21/8/2566 -> 2023-08-21
 * - Thai Buddhist Era 2-digit: 14/12/66 -> 2023-12-14, 12/1/67 -> 2024-01-12
 * - Oracle format: 9-Dec-22 -> 2022-12-09, 30-Aug-13 -> 2013-08-30
 * - Gregorian DD/MM/YYYY: 10/11/2023 -> 2023-11-10
 * - ISO YYYY-MM-DD: 2023-11-10 -> 2023-11-10
 */
function normalizeDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  const str = String(input).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return null;
  }

  // 1. Check Oracle format: e.g. 9-Dec-22, 30-Aug-13, 09-Dec-2022
  const oracleMatch = str.match(/^(\d{1,2})-([A-Za-zก-๙.]+)-(\d{2,4})$/);
  if (oracleMatch) {
    const day = parseInt(oracleMatch[1], 10);
    const monStr = oracleMatch[2].toLowerCase().replace('.', '');
    let year = parseInt(oracleMatch[3], 10);

    const month = MONTH_NAMES[monStr];
    if (month !== undefined) {
      if (year < 100) {
        year = year >= 50 ? 1900 + year : 2000 + year; // standard 2-digit CE (e.g. 13->2013, 22->2022)
      } else if (year >= 2400) {
        year = year - 543; // Thai BE
      }
      return new Date(Date.UTC(year, month, day));
    }
  }

  // 2. Check Slash/Dash format: DD/MM/YYYY, D/M/YY, YYYY-MM-DD
  // Check ISO format first: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (year >= 2400) year -= 543;
    return new Date(Date.UTC(year, month, day));
  }

  // Check DD/MM/YYYY or DD/MM/YY
  const slashMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = parseInt(slashMatch[3], 10);

    if (year >= 2400) {
      // 4-digit Thai BE (e.g. 2566 -> 2023, 2567 -> 2024)
      year = year - 543;
    } else if (year >= 50 && year < 100) {
      // 2-digit Thai BE (e.g. 66 -> 2566 -> 2023, 67 -> 2567 -> 2024)
      year = (2500 + year) - 543;
    } else if (year < 50) {
      // 2-digit CE (e.g. 23 -> 2023)
      year = 2000 + year;
    }

    return new Date(Date.UTC(year, month, day));
  }

  // Fallback to standard JS Date parsing
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Computes exact year fraction between two dates (Actual/Actual or Actual/365.25)
 */
function yearFraction(startDate, endDate) {
  const d1 = normalizeDate(startDate);
  const d2 = normalizeDate(endDate);
  if (!d1 || !d2) return null;

  const msDiff = d2.getTime() - d1.getTime();
  const daysDiff = msDiff / (1000 * 60 * 60 * 24);
  return Math.round((daysDiff / 365.25) * 100) / 100;
}

/**
 * Computes difference in calendar days
 */
function daysDifference(startDate, endDate) {
  const d1 = normalizeDate(startDate);
  const d2 = normalizeDate(endDate);
  if (!d1 || !d2) return null;

  const msDiff = d2.getTime() - d1.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Format date to standard ISO YYYY-MM-DD string
 */
function toIsoDate(date) {
  const d = normalizeDate(date);
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

module.exports = {
  normalizeDate,
  yearFraction,
  daysDifference,
  toIsoDate
};
