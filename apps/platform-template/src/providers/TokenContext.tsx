import React from 'react'

export type TokenOption = {
  id: string
  symbol: string
  label: string
}

const DEFAULT_TOKENS: TokenOption[] = [
  { id: 'sol', symbol: '◎', label: 'SOL' },
  { id: 'usdc', symbol: '$', label: 'USDC' },
  { id: 'fake', symbol: '★', label: 'FAKE' },
]

type TokenContextType = {
  tokens: TokenOption[]
  selected: TokenOption
  setSelected: (t: TokenOption) => void
}

const TokenContext = React.createContext<TokenContextType | undefined>(undefined)

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = React.useState<TokenOption>(DEFAULT_TOKENS[0])
  const value = React.useMemo<TokenContextType>(() => ({ tokens: DEFAULT_TOKENS, selected, setSelected }), [selected])
  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
}

export function useToken() {
  const ctx = React.useContext(TokenContext)
  if (!ctx) throw new Error('useToken must be used within TokenProvider')
  return ctx
}


