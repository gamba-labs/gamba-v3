import { core } from '@gamba/core'

export type SettledEvent = ReturnType<typeof core.getGameSettledDecoder> extends infer Decoder
  ? Decoder extends { decode: (bytes: Uint8Array) => infer Output }
    ? Output
    : never
  : never

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function decodeCandidates(bytes: Uint8Array): SettledEvent | null {
  const candidates = [bytes.subarray(8), bytes.subarray(16), bytes]
  for (const candidate of candidates) {
    try {
      return core.getGameSettledDecoder().decode(candidate) as SettledEvent
    } catch {
      // continue
    }
  }
  return null
}

export function decodeGameSettledFromLogs(logs?: readonly string[] | null): SettledEvent | null {
  if (!logs) return null

  for (const line of logs) {
    const inlineMarker = 'Program log: GameSettled: '
    const inlineIndex = line.indexOf(inlineMarker)
    if (inlineIndex >= 0) {
      const b64 = line.slice(inlineIndex + inlineMarker.length).trim()
      try {
        const event = decodeCandidates(base64ToBytes(b64))
        if (event) return event
      } catch {
        // continue
      }
    }

    const dataMarker = 'Program data: '
    const dataIndex = line.indexOf(dataMarker)
    if (dataIndex >= 0) {
      const b64 = line.slice(dataIndex + dataMarker.length).trim()
      try {
        const event = decodeCandidates(base64ToBytes(b64))
        if (event) return event
      } catch {
        // continue
      }
    }
  }

  return null
}
