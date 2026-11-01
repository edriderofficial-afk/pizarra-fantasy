import { formatMillions } from '@pizarra/core';
import { currentLocale } from '../i18n';

export const fmtNumber = (n: number, digits = 1) =>
  new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

/** Signed number; values that round to zero are shown without sign (no "-0,0"). */
export const fmtSigned = (n: number, digits = 1) => {
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return fmtNumber(0, digits);
  return `${rounded > 0 ? '+' : ''}${fmtNumber(rounded, digits)}`;
};

export const fmtPercent = (p: number) =>
  new Intl.NumberFormat(currentLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(p);

export const fmtMoney = (euros: number) => `${formatMillions(euros, currentLocale())} €`;

export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat(currentLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(iso));
