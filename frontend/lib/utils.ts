import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency : string | undefined): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidCreditCard(cardNumber: string): boolean {
  // Remove spaces and dashes
  const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '')
  
  // Check if it's a valid length (13-19 digits)
  if (!/^\d{13,19}$/.test(cleanNumber)) {
    return false
  }
  
  // Luhn algorithm
  let sum = 0
  let isEven = false
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i))
    
    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    
    sum += digit
    isEven = !isEven
  }
  
  return sum % 10 === 0
}

export function getCardType(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '')
  
  // Visa
  if (/^4/.test(cleanNumber)) {
    return 'visa'
  }
  
  // Mastercard
  if (/^5[1-5]/.test(cleanNumber)) {
    return 'mastercard'
  }
  
  // American Express
  if (/^3[47]/.test(cleanNumber)) {
    return 'amex'
  }
  
  // Discover
  if (/^6(?:011|5)/.test(cleanNumber)) {
    return 'discover'
  }
  
  return 'unknown'
}

export function maskCreditCard(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '')
  const lastFour = cleanNumber.slice(-4)
  const masked = '*'.repeat(cleanNumber.length - 4)
  return masked + lastFour
}
