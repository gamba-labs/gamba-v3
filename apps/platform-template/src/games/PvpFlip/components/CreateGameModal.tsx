import React from 'react'
import styled from 'styled-components'
import { AnimatePresence, motion } from 'framer-motion'
import { multiplayer, pdas } from '@gamba/core'
import { useConnector } from '@solana/connector'
import type { Address } from '@solana/kit'
import { useGambaRpc } from '@gamba/react'
import { useConnectWalletModal } from '../../../providers/ConnectWalletModalContext'
import { CompactInput } from '../../../ui/components/CompactInput'
import { NATIVE_MINT, usePlinkoRaceActions } from '../../PlinkoRace/multiplayer'
import { PVP_MAX_PLAYERS, PVP_WINNERS_TARGET } from '../config'

const LAMPORTS_PER_SOL = 1_000_000_000

type Side = 'heads' | 'tails'

const Backdrop = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const Modal = styled(motion.div)`
  background: #1c1c1c;
  padding: 24px;
  border-radius: 8px;
  width: 92%;
  max-width: 420px;
  color: #fff;
  border: 1px solid #333;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
`

const Title = styled.h2`
  margin: 0 0 16px;
  font-size: 1.4rem;
  font-weight: 700;
`

const Field = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  color: #a9a9b8;
`

const ToggleGroup = styled.div`
  display: flex;
  gap: 8px;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#fff' : '#333')};
  border-radius: 6px;
  background: ${({ $active }) => ($active ? '#fff' : '#222')};
  color: ${({ $active }) => ($active ? '#111' : '#fff')};
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ $active }) => ($active ? '#eee' : '#333')};
  }
`

const PresetGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`

const PresetButton = styled.button`
  flex: 1;
  padding: 8px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #222;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;

  &:hover {
    background: #333;
  }
`

const RangeRow = styled.div`
  display: flex;
  gap: 12px;
`

const HalfField = styled(Field)`
  flex: 1;
  margin-bottom: 0;
`

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
`

const Button = styled.button<{ $variant?: 'primary' }>`
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ $variant }) => ($variant === 'primary' ? '#fff' : '#333')};
  color: ${({ $variant }) => ($variant === 'primary' ? '#111' : '#fff')};

  &:hover:not(:disabled) {
    background: ${({ $variant }) => ($variant === 'primary' ? '#eee' : '#444')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ErrorMessage = styled.p`
  color: #e74c3c;
  margin: 10px 0 0;
  text-align: center;
  font-size: 0.9rem;
`

function toLamports(sol: number) {
  if (!Number.isFinite(sol)) return 0
  return Math.max(0, Math.round(sol * LAMPORTS_PER_SOL))
}

async function waitForGameAccount(rpc: any, address: Address, timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const info = await rpc.getAccountInfo(address, { encoding: 'base64' }).send()
      if (info?.value) return true
    } catch {
      // Keep polling until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 450))
  }
  return false
}

export default function CreateGameModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated?: (gameAddress: Address) => void
}) {
  const { isConnected } = useConnector()
  const { openConnectModal } = useConnectWalletModal()
  const { createGame, joinGame } = usePlinkoRaceActions()
  const { rpc } = useGambaRpc()

  const [wagerType, setWagerType] = React.useState<'sameWager' | 'customWager' | 'betRange'>('sameWager')
  const [wagerSol, setWagerSol] = React.useState(0.1)
  const [minBetSol, setMinBetSol] = React.useState(0.1)
  const [maxBetSol, setMaxBetSol] = React.useState(1)
  const [side, setSide] = React.useState<Side>('heads')

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async () => {
    if (!isConnected) {
      openConnectModal()
      setError('Connect wallet first')
      return
    }

    setSubmitting(true)
    setError(null)

    const wagerLamports = toLamports(wagerSol)
    const minLamports = toLamports(minBetSol)
    const maxLamports = Math.max(minLamports, toLamports(maxBetSol))

    const wagerTypeValue =
      wagerType === 'sameWager'
        ? multiplayer.WagerType.SameWager
        : wagerType === 'customWager'
          ? multiplayer.WagerType.CustomWager
          : multiplayer.WagerType.BetRange

    const gameSeed = (BigInt(Date.now()) << 16n) | BigInt(Math.floor(Math.random() * 0xffff))

    const gameAddress = await pdas.deriveMultiplayerGamePda(gameSeed)

    const createWager = wagerType === 'sameWager' ? wagerLamports : wagerType === 'betRange' ? minLamports : 0

    try {
      await createGame({
        mint: NATIVE_MINT,
        gameSeed,
        maxPlayers: PVP_MAX_PLAYERS,
        preAllocPlayers: PVP_MAX_PLAYERS,
        winnersTarget: PVP_WINNERS_TARGET,
        wagerType: Number(wagerTypeValue),
        payoutType: Number(multiplayer.PayoutType.Same),
        wager: createWager,
        minBet: wagerType === 'customWager' ? 0 : wagerType === 'sameWager' ? wagerLamports : minLamports,
        maxBet: wagerType === 'customWager' ? 0 : wagerType === 'sameWager' ? wagerLamports : maxLamports,
        softDuration: 60,
        hardDuration: 180,
      })

      const exists = await waitForGameAccount(rpc, gameAddress)
      if (!exists) throw new Error('Game creation is still pending. Try again in a few seconds.')

      const initialWager =
        wagerType === 'sameWager'
          ? wagerLamports
          : wagerType === 'betRange'
            ? Math.max(minLamports, Math.min(maxLamports, wagerLamports))
            : Math.max(1, wagerLamports)

      await joinGame({
        gameAccount: gameAddress,
        mint: NATIVE_MINT,
        wager: initialWager,
        metadata: side,
      })

      onCreated?.(gameAddress)
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create game')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Backdrop initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Modal initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <Title>Create 1v1 Flip</Title>

            <Field>
              <Label>Wager Type</Label>
              <ToggleGroup>
                <ToggleButton $active={wagerType === 'sameWager'} onClick={() => setWagerType('sameWager')}>
                  Fixed
                </ToggleButton>
                <ToggleButton $active={wagerType === 'betRange'} onClick={() => setWagerType('betRange')}>
                  Range
                </ToggleButton>
                <ToggleButton $active={wagerType === 'customWager'} onClick={() => setWagerType('customWager')}>
                  Unlimited
                </ToggleButton>
              </ToggleGroup>
            </Field>

            <Field>
              <Label>Your Join Wager (SOL)</Label>
              <CompactInput
                type="number"
                min={0.01}
                step={0.01}
                value={wagerSol}
                onChange={(event) => setWagerSol(Number(event.target.value))}
                widthCh={8}
                tokenMint={String(NATIVE_MINT)}
                tokenSymbol="SOL"
              />
              <PresetGroup>
                {[0.1, 0.5, 1, 2].map((value) => (
                  <PresetButton key={value} onClick={() => setWagerSol(value)}>
                    {value} SOL
                  </PresetButton>
                ))}
              </PresetGroup>
            </Field>

            {wagerType === 'betRange' && (
              <RangeRow>
                <HalfField>
                  <Label>Min Bet (SOL)</Label>
                  <CompactInput
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={minBetSol}
                    onChange={(event) => setMinBetSol(Number(event.target.value))}
                    widthCh={7}
                    tokenMint={String(NATIVE_MINT)}
                    tokenSymbol="SOL"
                  />
                </HalfField>
                <HalfField>
                  <Label>Max Bet (SOL)</Label>
                  <CompactInput
                    type="number"
                    min={minBetSol}
                    step={0.01}
                    value={maxBetSol}
                    onChange={(event) => setMaxBetSol(Number(event.target.value))}
                    widthCh={7}
                    tokenMint={String(NATIVE_MINT)}
                    tokenSymbol="SOL"
                  />
                </HalfField>
              </RangeRow>
            )}

            <Field>
              <Label>Your Side</Label>
              <ToggleGroup>
                <ToggleButton $active={side === 'heads'} onClick={() => setSide('heads')}>
                  Heads
                </ToggleButton>
                <ToggleButton $active={side === 'tails'} onClick={() => setSide('tails')}>
                  Tails
                </ToggleButton>
              </ToggleGroup>
            </Field>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <ButtonRow>
              <Button onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button $variant="primary" onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </Button>
            </ButtonRow>
          </Modal>
        </Backdrop>
      )}
    </AnimatePresence>
  )
}
