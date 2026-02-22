import React from 'react'
import styled from 'styled-components'
import { multiplayer, pdas } from '@gamba/core'
import type { Address } from '@solana/kit'
import { useGambaRpc } from '@gamba/react'
import { useConnector } from '@solana/connector'
import { useConnectWalletModal } from '../../../providers/ConnectWalletModalContext'
import { NATIVE_MINT, usePlinkoRaceGames } from '../../PlinkoRace/multiplayer'
import { PVP_MAX_PLAYERS, PVP_WINNERS_TARGET } from '../config'
import CreateGameModal from './CreateGameModal'
import HEADS_IMG from '../assets/heads.png'
import TAILS_IMG from '../assets/tails.png'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 20px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: #1f2332;
  color: #fff;

  &:hover {
    background: #2a3044;
  }
`

const ErrorCard = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 87, 87, 0.15);
  border: 1px solid rgba(255, 87, 87, 0.4);
`

const TableWrap = styled.div`
  overflow: auto;
  border-radius: 10px;
  background: rgba(6, 8, 14, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
`

const TH = styled.th`
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`

const TR = styled.tr<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  &:hover {
    background: ${({ $clickable }) => ($clickable ? 'rgba(255, 255, 255, 0.06)' : 'transparent')};
  }
`

const TD = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const SideBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

function decodeFixedUtf8(bytes: Readonly<Uint8Array>): string {
  let end = bytes.length
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      end = i
      break
    }
  }
  if (end === 0) return ''
  return new TextDecoder().decode(bytes.slice(0, end)).trim()
}

function parseSide(raw: string): 'heads' | 'tails' | undefined {
  const value = raw.toLowerCase().trim()
  if (value === 'heads' || value === 'head') return 'heads'
  if (value === 'tails' || value === 'tail') return 'tails'
  return undefined
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function shorten(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function toSol(lamports: bigint) {
  return (Number(lamports) / 1_000_000_000).toFixed(2)
}

export default function Lobby({ onSelect }: { onSelect: (gameAddress: Address) => void }) {
  const { rpc } = useGambaRpc()
  const { isConnected } = useConnector()
  const { openConnectModal } = useConnectWalletModal()

  const { games, loading, error, refresh } = usePlinkoRaceGames(
    {
      winnersTarget: PVP_WINNERS_TARGET,
      maxPlayers: PVP_MAX_PLAYERS,
      mint: NATIVE_MINT,
    },
    5000,
  )

  const [makerSides, setMakerSides] = React.useState<Record<string, 'heads' | 'tails' | undefined>>({})
  const [modalOpen, setModalOpen] = React.useState(false)
  const [now, setNow] = React.useState(Date.now())

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const loadMetadata = async () => {
      const entries = await Promise.all(
        games.map(async (entry) => {
          try {
            const metadataAddress = await pdas.deriveMultiplayerMetadataPda(entry.publicKey)
            const maybeMetadata = await multiplayer.fetchMaybePlayerMetadataAccount(rpc, metadataAddress)
            if (!maybeMetadata.exists || !maybeMetadata.data) return [entry.publicKey, undefined] as const

            const maker = String(entry.account.gameMaker)
            const makerEntry = maybeMetadata.data.entries.find((item) => String(item.player) === maker)
            if (!makerEntry) return [entry.publicKey, undefined] as const

            return [entry.publicKey, parseSide(decodeFixedUtf8(makerEntry.meta))] as const
          } catch {
            return [entry.publicKey, undefined] as const
          }
        }),
      )

      if (!cancelled) {
        setMakerSides(Object.fromEntries(entries))
      }
    }

    void loadMetadata()

    return () => {
      cancelled = true
    }
  }, [games, rpc])

  const handleCreate = () => {
    if (!isConnected) {
      openConnectModal()
      return
    }
    setModalOpen(true)
  }

  return (
    <Wrapper>
      <Header>
        <Button onClick={handleCreate}>+ Create 1v1</Button>
        <Button onClick={() => void refresh()}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </Header>

      {error && <ErrorCard>{error}</ErrorCard>}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>Maker</TH>
              <TH>Side</TH>
              <TH>Players</TH>
              <TH>Bet</TH>
              <TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {games.map((entry) => {
              const game = entry.account
              const makerSide = makerSides[entry.publicKey]

              let betLabel = 'Unknown'
              if (Number(game.wagerType) === Number(multiplayer.WagerType.SameWager)) {
                betLabel = `${toSol(game.wager)} SOL`
              } else if (Number(game.wagerType) === Number(multiplayer.WagerType.CustomWager)) {
                betLabel = 'Custom'
              } else {
                betLabel = `${toSol(game.minBet)} - ${toSol(game.maxBet)} SOL`
              }

              const startMs = Number(game.softExpirationTimestamp) * 1000
              const msLeft = startMs - now
              const waiting = Number(game.state) === Number(multiplayer.GameState.Waiting)
              const status = waiting
                ? msLeft > 0
                  ? `Starts in ${formatDuration(msLeft)}`
                  : 'Ready to start'
                : Number(game.state) === Number(multiplayer.GameState.Playing)
                  ? 'Playing'
                  : 'Settled'

              return (
                <TR key={entry.publicKey} $clickable onClick={() => onSelect(entry.publicKey)}>
                  <TD>{shorten(String(game.gameMaker))}</TD>
                  <TD>
                    {makerSide ? (
                      <SideBadge>
                        <img src={makerSide === 'heads' ? HEADS_IMG : TAILS_IMG} height={18} />
                        {makerSide === 'heads' ? 'Heads' : 'Tails'}
                      </SideBadge>
                    ) : (
                      'Unknown'
                    )}
                  </TD>
                  <TD>
                    {game.players.length}/{game.maxPlayers}
                  </TD>
                  <TD>{betLabel}</TD>
                  <TD>{status}</TD>
                </TR>
              )
            })}

            {!loading && games.length === 0 && (
              <TR>
                <TD colSpan={5} style={{ textAlign: 'center', opacity: 0.8 }}>
                  No open 1v1 games yet. Create one to start.
                </TD>
              </TR>
            )}
          </tbody>
        </Table>
      </TableWrap>

      <CreateGameModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(gameAddress) => {
          setModalOpen(false)
          onSelect(gameAddress)
        }}
      />
    </Wrapper>
  )
}
