import React from 'react'
import { Modal } from '../../components/Modal'
import { type Period, type Player, useLeaderboardData } from '../../../hooks/useLeaderboardData'
import {
  EmptyStateText,
  ErrorText,
  formatVolume,
  HeaderPlayer,
  HeaderRank,
  HeaderSection,
  HeaderVolume,
  LeaderboardList,
  ListHeader,
  LoadingText,
  ModalContent,
  PlayerInfo,
  RankItem,
  RankNumber,
  Subtitle,
  TabButton,
  TabRow,
  Title,
  VolumeAmount,
} from './LeaderboardsModal.styles'

type LeaderboardsModalProps = {
  open: boolean
  onClose: () => void
  creator: string
}

export default function LeaderboardsModal({ open, onClose, creator }: LeaderboardsModalProps) {
  const [period, setPeriod] = React.useState<Period>('weekly')
  const { data, loading, error } = useLeaderboardData(period, creator)

  return (
    <Modal open={open} onClose={onClose}>
      <ModalContent>
        <HeaderSection>
          <Title>Leaderboard</Title>
          <Subtitle>Top players by volume {period === 'weekly' ? 'this week' : 'this month'} (USD)</Subtitle>
        </HeaderSection>

        <TabRow>
          <TabButton $selected={period === 'weekly'} onClick={() => setPeriod('weekly')} disabled={loading}>
            Weekly
          </TabButton>
          <TabButton $selected={period === 'monthly'} onClick={() => setPeriod('monthly')} disabled={loading}>
            Monthly
          </TabButton>
        </TabRow>

        {loading ? (
          <LoadingText>Loading...</LoadingText>
        ) : error ? (
          <ErrorText>{error}</ErrorText>
        ) : data.length === 0 ? (
          <EmptyStateText>No leaderboard data for this period.</EmptyStateText>
        ) : (
          <LeaderboardList>
            <ListHeader>
              <HeaderRank>Rank</HeaderRank>
              <HeaderPlayer>Player</HeaderPlayer>
              <HeaderVolume>Volume (USD)</HeaderVolume>
            </ListHeader>

            {data.map((entry: Player, index: number) => {
              const rank = index + 1
              return (
                <RankItem key={entry.user} $isTop3={rank <= 3}>
                  <RankNumber rank={rank}>{rank}</RankNumber>
                  <PlayerInfo title={entry.user}>{entry.user}</PlayerInfo>
                  <VolumeAmount>{formatVolume(entry.usd_volume)}</VolumeAmount>
                </RankItem>
              )
            })}
          </LeaderboardList>
        )}
      </ModalContent>
    </Modal>
  )
}
