import type { Json } from './database.types'

export type FinanceFlagSeverity = 'orange' | 'red' | 'black'

type FinanceFlagInvoice = {
  patient_id: string
  invoice_status: string
  balance_due: number
  issued_at: string | null
}

type MonthlyFinanceFlagInput = {
  invoices: FinanceFlagInvoice[]
  billingMetadata: Json | null | undefined
  timeZone?: string
  now?: Date
}

function formatDateInTimeZone(date: Date, timeZone?: string) {
  if (!timeZone) return date.toISOString().slice(0, 10)
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function getMonthlyStatementCycleIndex(dateKey: string, statementDay: number, rollForward: boolean) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null
  return year * 12 + (month - 1) + (rollForward && day > statementDay ? 1 : 0)
}

function getPositiveMetadataNumber(metadata: Record<string, Json | undefined>, key: string, fallback: number) {
  const value = metadata[key]
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

export function getMonthlyFinanceFlagsByPatient({ invoices, billingMetadata, timeZone, now = new Date() }: MonthlyFinanceFlagInput) {
  const flags = new Map<string, FinanceFlagSeverity>()
  if (!billingMetadata || typeof billingMetadata !== 'object' || Array.isArray(billingMetadata)) return flags
  if (billingMetadata.billing_cycle !== 'per_statement' || billingMetadata.statement_schedule !== 'monthly') return flags

  const statementDay = 27
  const orangeCycles = getPositiveMetadataNumber(billingMetadata, 'orange_flag_cycles', 1)
  const redCycles = getPositiveMetadataNumber(billingMetadata, 'red_flag_cycles', 2)
  const blackCycles = getPositiveMetadataNumber(billingMetadata, 'black_flag_cycles', 3)
  const currentDate = formatDateInTimeZone(now, timeZone)
  const currentMonthIndex = getMonthlyStatementCycleIndex(currentDate, statementDay, false)
  const currentDay = Number(currentDate.slice(8, 10))
  const currentCycleIndex = currentMonthIndex === null ? null : currentMonthIndex - (currentDay < statementDay ? 1 : 0)
  if (currentCycleIndex === null) return flags

  const maxCyclesByPatient = new Map<string, number>()
  invoices.forEach((invoice) => {
    if (!invoice.issued_at || Number(invoice.balance_due) <= 0) return
    if (['paid', 'voided', 'cancelled', 'written_off'].includes(invoice.invoice_status)) return
    const issuedDate = formatDateInTimeZone(new Date(invoice.issued_at), timeZone)
    const firstStatementCycleIndex = getMonthlyStatementCycleIndex(issuedDate, statementDay, true)
    if (firstStatementCycleIndex === null) return
    const elapsedCycles = Math.max(0, currentCycleIndex - firstStatementCycleIndex)
    maxCyclesByPatient.set(invoice.patient_id, Math.max(maxCyclesByPatient.get(invoice.patient_id) ?? 0, elapsedCycles))
  })

  maxCyclesByPatient.forEach((cycles, patientId) => {
    if (cycles >= blackCycles) flags.set(patientId, 'black')
    else if (cycles >= redCycles) flags.set(patientId, 'red')
    else if (cycles >= orangeCycles) flags.set(patientId, 'orange')
  })
  return flags
}
