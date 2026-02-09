import React from 'react'
import { useCurrentToken } from './useCurrentToken'

export function useWagerInput(initial?: number) {
  const token = useCurrentToken()
  const [wager, setWager] = React.useState<number>(initial ?? token.baseWager)

  React.useEffect(() => {
    setWager(initial ?? token.baseWager)
  }, [initial, token.mint, token.baseWager])

  return [wager, setWager] as const
}
