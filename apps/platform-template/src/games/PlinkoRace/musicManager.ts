import { soundStore } from '../../game-ui/soundStore'

type Unsub = () => void
type ManagedSound = {
  player?: { stop?: () => void; pause?: () => void; start?: () => void; loop?: boolean }
  setVolume?: (volume: number) => void
  dispose?: () => void
}

export const musicManager = {
  sound: null as ManagedSound | null,
  count:  0,
  timer:  0 as any,
  sub:    null as Unsub | null,
  muted:  false,
}

try {
  const saved = localStorage.getItem('plinkorace_music_muted')
  if (saved != null) musicManager.muted = saved === '1'
} catch {}

function setSoundVolume(sound: ManagedSound | null, muted: boolean, volume: number) {
  if (!sound || !sound.setVolume) return
  sound.setVolume(muted ? 0 : volume)
}

export function attachMusic(snd: ManagedSound) {
  musicManager.sound = snd

  const vol = soundStore.getState().volume
  setSoundVolume(snd, musicManager.muted, vol)

  if (!musicManager.sub) {
    musicManager.sub = soundStore.subscribe(() => {
      setSoundVolume(musicManager.sound, musicManager.muted, soundStore.getState().volume)
    })
  }
}

export function stopAndDispose() {
  try { musicManager.sound?.player.stop() } catch {}
  try { musicManager.sound?.dispose?.() } catch {}
  musicManager.sound = null

  musicManager.sub?.()
  musicManager.sub = null
}

export function setMuted(muted: boolean) {
  musicManager.muted = muted
  try { localStorage.setItem('plinkorace_music_muted', muted ? '1' : '0') } catch {}
  const vol = soundStore.getState().volume
  setSoundVolume(musicManager.sound, muted, vol)
}

export function toggleMuted() {
  setMuted(!musicManager.muted)
}
