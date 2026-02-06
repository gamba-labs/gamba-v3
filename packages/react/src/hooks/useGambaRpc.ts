import React from 'react'
import { GambaReactContext } from '../provider/context'

export function useGambaRpc() {
  const context = React.useContext(GambaReactContext)
  if (!context) {
    throw new Error('useGambaRpc must be used within GambaReactProvider')
  }
  return context
}
