export function formatTokenAmount(amount: number | bigint, decimals: number, maxFraction = 4): string {
  const numeric = typeof amount === 'bigint' ? Number(amount) : amount
  if (!Number.isFinite(numeric)) return '0'

  if (decimals <= 0) {
    return Math.round(numeric).toLocaleString()
  }

  const fractionDigits = Math.min(maxFraction, decimals)
  const value = numeric / Math.pow(10, decimals)
  const text = value.toFixed(fractionDigits)

  if (!text.includes('.')) return text
  return text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export function toLamports(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, Math.max(0, decimals)))
}
