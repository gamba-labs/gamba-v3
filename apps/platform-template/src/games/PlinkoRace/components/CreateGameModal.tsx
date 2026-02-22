import React from 'react'
import styled from 'styled-components'
import { AnimatePresence, motion } from 'framer-motion'
import { multiplayer } from '@gamba/core'
import { useConnector } from '@solana/connector'
import { GambaUi } from '../../../game-ui'
import { CompactInput } from '../../../ui/components/CompactInput'
import { useConnectWalletModal } from '../../../providers/ConnectWalletModalContext'
import { NATIVE_MINT, usePlinkoRaceActions } from '../multiplayer'

const LAMPORTS_PER_SOL = 1_000_000_000

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

const ToggleButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 10px;
  border: 1px solid ${({ active }) => (active ? '#fff' : '#333')};
  border-radius: 6px;
  background: ${({ active }) => (active ? '#fff' : '#222')};
  color: ${({ active }) => (active ? '#111' : '#fff')};
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ active }) => (active ? '#eee' : '#333')};
  }
`

const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #222;
  color: #fff;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #555;
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

const Warning = styled.p`
  font-size: 0.85rem;
  color: #bbb;
  margin: 12px 0 0;
  line-height: 1.3;
`

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
`

const Button = styled.button<{ variant?: 'primary' }>`
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ variant }) => (variant === 'primary' ? '#fff' : '#333')};
  color: ${({ variant }) => (variant === 'primary' ? '#111' : '#fff')};

  &:hover:not(:disabled) {
    background: ${({ variant }) => (variant === 'primary' ? '#eee' : '#444')};
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

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function CreateGameModal({ isOpen, onClose }: Props) {
  const { isConnected } = useConnector()
  const { openConnectModal } = useConnectWalletModal()
  const { createGame } = usePlinkoRaceActions()

  const [maxPlayers, setMaxPlayers] = React.useState(10)
  const [wagerType, setWagerType] = React.useState<'sameWager' | 'customWager' | 'betRange'>('sameWager')
  const [fixedWager, setFixedWager] = React.useState(1)
  const [minBet, setMinBet] = React.useState(0.1)
  const [maxBet, setMaxBet] = React.useState(5)

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

    const clampedMaxPlayers = Math.min(1000, Math.max(2, Math.floor(maxPlayers)))
    const softDuration = 60
    const preAlloc = Math.min(clampedMaxPlayers, 5)

    const wagerTypeValue = wagerType === 'sameWager'
      ? multiplayer.WagerType.SameWager
      : wagerType === 'customWager'
        ? multiplayer.WagerType.CustomWager
        : multiplayer.WagerType.BetRange

    let wager = 0
    let minWager = 0
    let maxWager = 0

    if (wagerType === 'sameWager') {
      const lamports = Math.max(0, Math.floor(fixedWager * LAMPORTS_PER_SOL))
      wager = lamports
      minWager = lamports
      maxWager = lamports
    } else if (wagerType === 'customWager') {
      wager = 0
      minWager = 0
      maxWager = 0
    } else {
      const minLamports = Math.max(0, Math.floor(minBet * LAMPORTS_PER_SOL))
      const maxLamports = Math.max(minLamports, Math.floor(maxBet * LAMPORTS_PER_SOL))
      wager = minLamports
      minWager = minLamports
      maxWager = maxLamports
    }

    try {
      await createGame({
        mint: NATIVE_MINT,
        maxPlayers: clampedMaxPlayers,
        softDuration,
        preAllocPlayers: preAlloc,
        winnersTarget: 1,
        wagerType: Number(wagerTypeValue),
        payoutType: Number(multiplayer.PayoutType.Same),
        wager,
        minBet: minWager,
        maxBet: maxWager,
      })

      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create game')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GambaUi.Portal target="screen">
      <AnimatePresence>
        {isOpen && (
          <Backdrop initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Modal
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Title>Create Plinko Race</Title>

              <Field>
                <Label>Max Players</Label>
                <Input type="number" min={2} max={1000} value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))} />
              </Field>

              <Field>
                <Label>Wager Type</Label>
                <ToggleGroup>
                  <ToggleButton active={wagerType === 'sameWager'} onClick={() => setWagerType('sameWager')}>
                    Same
                  </ToggleButton>
                  <ToggleButton active={wagerType === 'betRange'} onClick={() => setWagerType('betRange')}>
                    Range
                  </ToggleButton>
                  <ToggleButton active={wagerType === 'customWager'} onClick={() => setWagerType('customWager')}>
                    Unlimited
                  </ToggleButton>
                </ToggleGroup>
              </Field>

              {wagerType === 'sameWager' && (
                <Field>
                  <Label>Wager (SOL)</Label>
                  <CompactInput
                    type="number"
                    lang="en-US"
                    inputMode="decimal"
                    min={0.05}
                    step={0.01}
                    value={fixedWager}
                    onChange={(event) => setFixedWager(Number(event.target.value))}
                    widthCh={8}
                    tokenMint={String(NATIVE_MINT)}
                    tokenSymbol="SOL"
                  />
                  <PresetGroup>
                    {[0.1, 0.5, 1].map((value) => (
                      <PresetButton key={value} onClick={() => setFixedWager(value)}>
                        {value} SOL
                      </PresetButton>
                    ))}
                  </PresetGroup>
                </Field>
              )}

              {wagerType === 'betRange' && (
                <RangeRow>
                  <HalfField>
                    <Label>Min Bet (SOL)</Label>
                    <CompactInput
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={minBet}
                      onChange={(event) => setMinBet(Number(event.target.value))}
                      widthCh={7}
                      tokenMint={String(NATIVE_MINT)}
                      tokenSymbol="SOL"
                    />
                  </HalfField>
                  <HalfField>
                    <Label>Max Bet (SOL)</Label>
                    <CompactInput
                      type="number"
                      min={minBet}
                      step={0.01}
                      value={maxBet}
                      onChange={(event) => setMaxBet(Number(event.target.value))}
                      widthCh={7}
                      tokenMint={String(NATIVE_MINT)}
                      tokenSymbol="SOL"
                    />
                  </HalfField>
                </RangeRow>
              )}

              <Warning>
                Creating a multiplayer game allocates temporary on-chain storage. Rent is returned after the game is closed.
              </Warning>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <ButtonRow>
                <Button onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </ButtonRow>
            </Modal>
          </Backdrop>
        )}
      </AnimatePresence>
    </GambaUi.Portal>
  )
}
