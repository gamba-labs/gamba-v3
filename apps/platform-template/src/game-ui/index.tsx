import React from 'react'
import { useConnector } from '@solana/connector'
import { Button, type ButtonProps } from './components/Button'
import { GambaCanvas } from './components/Canvas'
import { ResponsiveSize } from './components/Responsive'
import { Select } from './components/Select'
import { Switch } from './components/Switch'
import { TokenValue } from './components/TokenValue'
import { WagerInput } from './components/WagerInput'
import { EffectTest } from './EffectTest'
import { useCurrentPool } from './hooks/useCurrentPool'
import { useCurrentToken } from './hooks/useCurrentToken'
import { useSound } from './hooks/useSound'
import { useUserBalance } from './hooks/useUserBalance'
import { useWagerInput } from './hooks/useWagerInput'
import { GameRuntimeProvider, useGame, useGamba, useGameRuntime } from './GameRuntimeContext'
import { Portal, PortalProvider, PortalTarget } from './PortalContext'
import { useSoundStore } from './soundStore'
import { useConnectWalletModal } from '../providers/ConnectWalletModalContext'

export type { GameBundle, GameResult, PlayInput } from './types'
export { BPS_PER_WHOLE } from './types'
export { useSoundStore, GameRuntimeProvider, useGameRuntime }
export { useCurrentPool, useCurrentToken, useUserBalance, useWagerInput, useSound, useGamba, useGame, TokenValue }
export { EffectTest }

export function PlayButton(props: ButtonProps) {
  const { isConnected } = useConnector()
  const { openConnectModal } = useConnectWalletModal()

  if (!isConnected) {
    return (
      <Portal target="play">
        <Button main onClick={openConnectModal}>
          Connect Wallet
        </Button>
      </Portal>
    )
  }

  return (
    <Portal target="play">
      <Button {...props} main>
        {props.children}
      </Button>
    </Portal>
  )
}

export const GambaUi = {
  useGame,
  useSound,
  Portal,
  PortalTarget,
  Effect: EffectTest,
  Button,
  Responsive: ResponsiveSize,
  Canvas: GambaCanvas,
  WagerInput,
  Switch,
  PlayButton,
  Select,
} as const

export { PortalProvider }
