import BigDecimal from 'js-big-decimal'

export const BPS_PER_WHOLE = 10_000

export function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.floor(value))
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return BigInt(value.trim())
  if (typeof value === 'object' && value && 'toString' in value) {
    const text = String(value)
    if (/^\d+$/.test(text)) return BigInt(text)
  }
  return 0n
}

export function toNumber(value: unknown): number {
  const n = Number(toBigInt(value))
  return Number.isFinite(n) ? n : 0
}

export function bpsToPercentString(bps: bigint | number, fractionDigits = 2): string {
  const n = typeof bps === 'bigint' ? Number(bps) : Number(bps)
  return `${(n / 100).toLocaleString(undefined, { maximumFractionDigits: fractionDigits })}%`
}

export function numberToBigIntUnits(input: string, decimals: number): bigint {
  const trimmed = input.trim()
  if (!trimmed) return 0n
  try {
    const value = new BigDecimal(trimmed).multiply(new BigDecimal(10 ** decimals)).round().getValue()
    return BigInt(value)
  } catch {
    return 0n
  }
}

export function bigIntUnitsToNumber(amount: bigint | number, decimals: number): number {
  const n = typeof amount === 'bigint' ? amount : BigInt(Math.floor(amount))
  const div = new BigDecimal(String(n)).divide(new BigDecimal(10 ** decimals))
  return Number(div.getValue())
}

export function formatCompactAmount(value: number, fractionDigits = 2) {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toLocaleString(undefined, { maximumFractionDigits: fractionDigits })}B`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toLocaleString(undefined, { maximumFractionDigits: fractionDigits })}M`
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toLocaleString(undefined, { maximumFractionDigits: fractionDigits })}K`
  return value.toLocaleString(undefined, { maximumFractionDigits: Math.max(2, fractionDigits) })
}

export function toPercent01(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 3 })}%`
}

export function nowAgoLabel(timeMs: number) {
  const diff = Date.now() - timeMs
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hrs = Math.floor(min / 60)
  if (hrs >= 24) return `${Math.floor(hrs / 24)}d ago`
  if (hrs >= 1) return `${hrs}h ago`
  if (min >= 1) return `${min}m ago`
  return 'Just now'
}
