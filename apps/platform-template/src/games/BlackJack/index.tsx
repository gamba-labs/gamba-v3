import { GambaUi, TokenValue, useCurrentPool, useSound, useUserBalance, useWagerInput } from '../../game-ui'
import { useGamba } from '../../game-ui'
import React from 'react'
import { CARD_VALUES, RANKS, RANK_SYMBOLS, SUIT_COLORS, SUIT_SYMBOLS, SUITS, SOUND_CARD, SOUND_JACKPOT, SOUND_LOSE, SOUND_PLAY, SOUND_WIN } from './constants'
import { Board, Card, CardArea, CardContainer, CardsTrack, Container, EmptyCards, HandHeader, HandScore, HandTitle, HandsGrid, MetaRow, MetaValue, OutcomeBanner, StatusBadge, StatusRow, StyledHandPanel } from './styles'

const DEAL_DELAY_MS = 260
const SCORE_BLACKJACK = 21
const ACE_HIGH_VALUE = 11
const BLACKJACK_PAYOUT = 2.5
const REGULAR_WIN_PAYOUT = 2
const TEN_VALUE_RANKS = [8, 9, 10, 11]
const ACE_RANK = 12

const randomRank = () => Math.floor(Math.random() * RANKS)
const randomSuit = () => Math.floor(Math.random() * SUITS)
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface CardData {
  key: string
  rank: number
  suit: number
}

type Phase = 'idle' | 'dealing' | 'settled'
type RoundOutcome = 'blackjack' | 'win' | 'lose'

const createCard = (rank = randomRank(), suit = randomSuit()): CardData => ({
  key: `${Date.now()}-${Math.random()}`,
  rank,
  suit,
})

const getHandValue = (hand: CardData[]): number => {
  let total = 0
  let aces = 0

  for (const card of hand) {
    if (card.rank === ACE_RANK) {
      total += ACE_HIGH_VALUE
      aces += 1
    } else {
      total += CARD_VALUES[card.rank]
    }
  }

  while (total > SCORE_BLACKJACK && aces > 0) {
    total -= 10
    aces -= 1
  }

  return total
}

const isBlackjack = (hand: CardData[]) => hand.length === 2 && getHandValue(hand) === SCORE_BLACKJACK

const randomCardCount = (minCards: number, maxCards: number) => {
  if (minCards === maxCards) return minCards
  return minCards + Math.floor(Math.random() * (maxCards - minCards + 1))
}

const generateHandMatching = (
  predicate: (hand: CardData[], total: number) => boolean,
  {
    minCards = 2,
    maxCards = 3,
    attempts = 3500,
  }: {
    minCards?: number
    maxCards?: number
    attempts?: number
  } = {},
) => {
  for (let i = 0; i < attempts; i++) {
    const cardCount = randomCardCount(minCards, maxCards)
    const hand = Array.from({ length: cardCount }).map(() => createCard())
    const total = getHandValue(hand)
    if (predicate(hand, total)) return hand
  }

  return [createCard(0), createCard(1)]
}

const generateBlackjackHand = () => {
  const tenRank = TEN_VALUE_RANKS[Math.floor(Math.random() * TEN_VALUE_RANKS.length)]
  return [createCard(ACE_RANK), createCard(tenRank)]
}

const generateRoundHands = (outcome: RoundOutcome) => {
  if (outcome === 'blackjack') {
    const player = generateBlackjackHand()
    const dealer = generateHandMatching((hand, total) => total < SCORE_BLACKJACK && !isBlackjack(hand))
    return { player, dealer }
  }

  if (outcome === 'win') {
    const player = generateHandMatching((hand, total) => total >= 18 && total <= SCORE_BLACKJACK && !isBlackjack(hand))
    const playerTotal = getHandValue(player)
    const dealer = generateHandMatching((hand, total) => total < playerTotal && total <= SCORE_BLACKJACK && !isBlackjack(hand))
    return { player, dealer }
  }

  const playerBust = Math.random() < 0.35

  if (playerBust) {
    const player = generateHandMatching((_, total) => total > SCORE_BLACKJACK, { minCards: 3, maxCards: 3 })
    const dealer = generateHandMatching((_, total) => total >= 17 && total <= SCORE_BLACKJACK)
    return { player, dealer }
  }

  const player = generateHandMatching((hand, total) => total >= 16 && total <= 20 && !isBlackjack(hand))
  const playerTotal = getHandValue(player)
  const dealer = generateHandMatching((hand, total) => total > playerTotal && total <= SCORE_BLACKJACK && !isBlackjack(hand))
  return { player, dealer }
}

const classifyOutcome = (payoutMultiplier: number): RoundOutcome => {
  if (payoutMultiplier >= BLACKJACK_PAYOUT - 0.001) return 'blackjack'
  if (payoutMultiplier >= REGULAR_WIN_PAYOUT - 0.001) return 'win'
  return 'lose'
}

const getOutcomeText = (outcome: RoundOutcome) => {
  if (outcome === 'blackjack') return 'Blackjack win'
  if (outcome === 'win') return 'You win this hand'
  return 'Dealer takes this round'
}

const getProfitText = (payout: number, wager: number) => {
  if (payout <= 0 || wager <= 0) return 'No payout'
  const edge = Math.round((payout / wager) * 100 - 100)
  return `+${edge}%`
}

export interface BlackjackConfig {
  logo: string
}

export default function Blackjack(_props: BlackjackConfig) {
  const game = GambaUi.useGame()
  const gamba = useGamba()
  const pool = useCurrentPool()
  const balance = useUserBalance()
  const [wager, setWager] = useWagerInput()

  const [phase, setPhase] = React.useState<Phase>('idle')
  const [playerCards, setPlayerCards] = React.useState<CardData[]>([])
  const [dealerCards, setDealerCards] = React.useState<CardData[]>([])
  const [revealDealerHoleCard, setRevealDealerHoleCard] = React.useState(false)
  const [payout, setPayout] = React.useState<number | null>(null)
  const [outcome, setOutcome] = React.useState<RoundOutcome | null>(null)
  const [status, setStatus] = React.useState('Ready to deal')

  const roundIdRef = React.useRef(0)

  const sounds = useSound({
    win: SOUND_WIN,
    lose: SOUND_LOSE,
    play: SOUND_PLAY,
    card: SOUND_CARD,
    jackpot: SOUND_JACKPOT,
  })

  React.useEffect(() => {
    return () => {
      roundIdRef.current += 1
    }
  }, [])

  const maxPayout = wager * BLACKJACK_PAYOUT
  const maxPayoutExceeded = maxPayout > pool.maxPayout
  const balanceExceeded = wager > (balance.balance + balance.bonusBalance)
  const gameBusy = gamba.isPlaying || phase === 'dealing'
  const canPlay = wager > 0 && !gameBusy && !maxPayoutExceeded && !balanceExceeded
  const playLabel = phase === 'dealing'
    ? 'Dealing...'
    : maxPayoutExceeded
      ? 'Max payout too high'
      : balanceExceeded
        ? 'Insufficient balance'
        : 'Deal Cards'

  const dealerScore = React.useMemo(() => {
    if (dealerCards.length === 0) return '-'
    if (!revealDealerHoleCard && dealerCards.length > 1) {
      return `${getHandValue([dealerCards[0]])}+?`
    }
    return String(getHandValue(dealerCards))
  }, [dealerCards, revealDealerHoleCard])

  const playerScore = playerCards.length ? String(getHandValue(playerCards)) : '-'

  const clearTable = () => {
    setPlayerCards([])
    setDealerCards([])
    setRevealDealerHoleCard(false)
    setPayout(null)
    setOutcome(null)
  }

  const dealCard = async (
    card: CardData | undefined,
    appendCard: React.Dispatch<React.SetStateAction<CardData[]>>,
    roundId: number,
  ) => {
    if (!card || roundIdRef.current !== roundId) return
    appendCard((previous) => [...previous, card])
    sounds.play('card')
    await wait(DEAL_DELAY_MS)
  }

  const dealHands = async (hands: { player: CardData[]; dealer: CardData[] }, roundId: number) => {
    const { player, dealer } = hands
    const maxCards = Math.max(player.length, dealer.length)

    for (let i = 0; i < maxCards; i++) {
      await dealCard(player[i], setPlayerCards, roundId)
      await dealCard(dealer[i], setDealerCards, roundId)
    }
  }

  const play = async () => {
    if (!canPlay) return

    const roundId = roundIdRef.current + 1
    roundIdRef.current = roundId

    clearTable()
    setPhase('dealing')
    setStatus('Shuffling...')
    sounds.play('play')

    try {
      await game.play({
        bet: [2.5, 2.5, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        wager,
      })

      const result = await game.result()
      if (roundIdRef.current !== roundId) return

      const payoutMultiplier = result.payout / wager
      const resolvedOutcome = classifyOutcome(payoutMultiplier)
      const hands = generateRoundHands(resolvedOutcome)

      setStatus('Dealing cards...')
      await dealHands(hands, roundId)
      if (roundIdRef.current !== roundId) return

      setRevealDealerHoleCard(true)
      await wait(180)
      if (roundIdRef.current !== roundId) return

      setPayout(result.payout)
      setOutcome(resolvedOutcome)
      setStatus('Round complete')
      setPhase('settled')

      if (resolvedOutcome === 'blackjack') {
        sounds.play('jackpot')
      } else if (result.payout > 0) {
        sounds.play('win')
      } else {
        sounds.play('lose')
      }
    } catch (error) {
      if (roundIdRef.current === roundId) {
        setPhase('idle')
        setStatus('Round cancelled')
      }
      throw error
    }
  }

  return (
    <>
      <GambaUi.Portal target="screen">
        <GambaUi.Responsive>
          <Container $disabled={gameBusy}>
            <Board>
              <StatusRow>
                {phase !== 'settled' && (
                  <StatusBadge $phase={phase}>{status}</StatusBadge>
                )}
                <MetaRow>
                  <MetaValue>Wager: <TokenValue amount={wager} /></MetaValue>
                  <MetaValue>Max Payout: <TokenValue amount={maxPayout} /></MetaValue>
                </MetaRow>
              </StatusRow>
              <HandsGrid>
                <StyledHandPanel>
                  <HandHeader>
                    <HandTitle>Dealer</HandTitle>
                    <HandScore>{dealerScore}</HandScore>
                  </HandHeader>
                  <CardArea $empty={dealerCards.length === 0}>
                    <CardsTrack>
                      {dealerCards.length === 0 ? (
                        <EmptyCards>
                          <div />
                          <div />
                        </EmptyCards>
                      ) : (
                        dealerCards.map((card, index) => {
                          const hidden = !revealDealerHoleCard && index === 1
                          return (
                            <CardContainer key={card.key} $index={index}>
                              <Card $color={SUIT_COLORS[card.suit]} $hidden={hidden}>
                                {hidden ? null : (
                                  <>
                                    <div className="rank">{RANK_SYMBOLS[card.rank]}</div>
                                    <div className="suit">{SUIT_SYMBOLS[card.suit]}</div>
                                  </>
                                )}
                              </Card>
                            </CardContainer>
                          )
                        })
                      )}
                    </CardsTrack>
                  </CardArea>
                </StyledHandPanel>
                <StyledHandPanel>
                  <HandHeader>
                    <HandTitle>Player</HandTitle>
                    <HandScore>{playerScore}</HandScore>
                  </HandHeader>
                  <CardArea $empty={playerCards.length === 0}>
                    <CardsTrack>
                      {playerCards.length === 0 ? (
                        <EmptyCards>
                          <div />
                          <div />
                        </EmptyCards>
                      ) : (
                        playerCards.map((card, index) => (
                          <CardContainer key={card.key} $index={index}>
                            <Card $color={SUIT_COLORS[card.suit]}>
                              <div className="rank">{RANK_SYMBOLS[card.rank]}</div>
                              <div className="suit">{SUIT_SYMBOLS[card.suit]}</div>
                            </Card>
                          </CardContainer>
                        ))
                      )}
                    </CardsTrack>
                  </CardArea>
                </StyledHandPanel>
              </HandsGrid>
              <OutcomeBanner $outcome={outcome ?? 'win'} $hidden={!outcome || payout === null}>
                <span>{outcome ? getOutcomeText(outcome) : 'Round pending'}</span>
                <span>
                  {(payout !== null && payout > 0) ? (
                    <>Payout: <TokenValue amount={payout} /> ({getProfitText(payout, wager)})</>
                  ) : (
                    <>No payout</>
                  )}
                </span>
              </OutcomeBanner>
            </Board>
          </Container>
        </GambaUi.Responsive>
      </GambaUi.Portal>
      <GambaUi.Portal target="controls">
        <GambaUi.WagerInput value={wager} onChange={setWager} disabled={gameBusy} />
        <GambaUi.PlayButton disabled={!canPlay} onClick={play}>
          {playLabel}
        </GambaUi.PlayButton>
      </GambaUi.Portal>
    </>
  )
}
