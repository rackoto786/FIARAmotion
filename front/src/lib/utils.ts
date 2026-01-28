import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateFr(date: string | Date | null | undefined): string {
  if (typeof date === 'string') {
    const parts = date.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'MGA', // Using MGA for Ariary
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('MGA', 'Ar');
}
