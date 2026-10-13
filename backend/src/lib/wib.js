// Asia/Jakarta is UTC+7 year round, so a fixed offset beats Intl here.
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (value) => String(value).padStart(2, '0');
const shifted = (at) => new Date(at.getTime() + WIB_OFFSET_MS);

export function businessDate(at = new Date()) {
  const wib = shifted(at);
  return `${wib.getUTCFullYear()}-${pad2(wib.getUTCMonth() + 1)}-${pad2(wib.getUTCDate())}`;
}

export function businessDayStart(date) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) - WIB_OFFSET_MS);
}

export function businessDayEnd(date) {
  return new Date(businessDayStart(date).getTime() + DAY_MS);
}

export function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function lastNDates(date, n) {
  return Array.from({ length: n }, (_, index) => addDays(date, index - (n - 1)));
}

export function shiftIndexOf(time) {
  return Number.parseInt(time.slice(0, 2), 10) < 15 ? 0 : 1;
}
