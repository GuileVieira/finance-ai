import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

export function formatCurrencyCompact(amount: number) {
  const absAmount = Math.abs(amount)

  if (absAmount >= 1000000000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(amount / 1000000000).replace('R$', 'R$ ') + 'B'
  }

  if (absAmount >= 1000000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(amount / 1000000).replace('R$', 'R$ ') + 'M'
  }

  if (absAmount >= 10000) { // Só compacta k se for maior que 10k
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 1000).replace('R$', 'R$ ') + 'k'
  }

  return formatCurrency(amount)
}