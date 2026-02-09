import React from 'react'
import { soundStore, useSoundStore } from '../soundStore'

type PlaySoundParams = {
  playbackRate?: number
  gain?: number
}

type SoundPlayer = {
  start: () => void
  stop: () => void
  pause: () => void
  loop: boolean
  playbackRate: number
}

class Sound {
  private audio: HTMLAudioElement
  ready = false

  player: SoundPlayer

  constructor(url: string, autoPlay = false) {
    this.audio = new Audio(url)
    this.audio.preload = 'auto'
    this.audio.loop = autoPlay
    const audio = this.audio

    this.player = {
      start: () => {
        audio.currentTime = 0
        void audio.play().catch(() => {})
      },
      stop: () => {
        audio.pause()
        audio.currentTime = 0
      },
      pause: () => {
        audio.pause()
      },
      get loop() {
        return audio.loop
      },
      set loop(value: boolean) {
        audio.loop = value
      },
      get playbackRate() {
        return audio.playbackRate
      },
      set playbackRate(value: number) {
        audio.playbackRate = value
      },
    }

    this.audio.oncanplaythrough = () => {
      this.ready = true
      if (autoPlay) {
        this.player.start()
      }
    }
  }

  play({ playbackRate = 1, gain = 0.1 }: PlaySoundParams = {}) {
    this.player.playbackRate = playbackRate
    this.audio.volume = Math.max(0, Math.min(1, gain))
    this.player.start()
  }

  setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }

  dispose() {
    this.player.stop()
    this.audio.src = ''
  }
}

export function useSound<T extends Record<string, string>>(definition: T, options?: { disposeOnUnmount?: boolean }) {
  const store = useSoundStore()
  const keys = Object.keys(definition)
  const soundKey = keys.map((key) => `${key}:${definition[key]}`).join('|')

  const soundById = React.useMemo(() => {
    return keys.reduce(
      (acc, id) => {
        acc[id as keyof T] = new Sound(definition[id])
        return acc
      },
      {} as Record<keyof T, Sound>,
    )
  }, [soundKey])

  const sounds = React.useMemo(() => Object.values(soundById), [soundById])

  React.useEffect(() => {
    if (options?.disposeOnUnmount === false) return
    return () => {
      sounds.forEach((sound) => sound.dispose())
    }
  }, [sounds, options?.disposeOnUnmount])

  React.useEffect(() => {
    sounds.forEach((sound) => sound.setVolume(store.volume))
  }, [store.volume, sounds])

  const play = React.useCallback(
    (id: keyof T, params?: PlaySoundParams) => {
      const base = params?.gain ?? 1
      const gain = base * soundStore.getState().volume
      soundById[id].play({ ...params, gain })
    },
    [soundById],
  )

  return {
    play,
    sounds: soundById,
  }
}
