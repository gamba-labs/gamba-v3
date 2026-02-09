import React from 'react'

export type SoundStoreState = {
  volume: number
  masterGain: number
}

type Listener = () => void

const listeners = new Set<Listener>()
let state: SoundStoreState = {
  volume: 0.5,
  masterGain: 0.5,
}

function emit() {
  for (const listener of listeners) listener()
}

export const soundStore = {
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getState(): SoundStoreState {
    return state
  },
  set(volume: number) {
    const safe = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : state.volume
    state = { volume: safe, masterGain: safe }
    emit()
  },
}

export function useSoundStore() {
  const snapshot = React.useSyncExternalStore(soundStore.subscribe, soundStore.getState, soundStore.getState)

  return React.useMemo(
    () => ({
      ...snapshot,
      set: soundStore.set,
      get: soundStore.getState,
    }),
    [snapshot],
  )
}
