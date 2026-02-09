import React from 'react'
import { ConnectModal } from '../ui/components/ConnectModal'

type ConnectWalletModalContextValue = {
  openConnectModal: () => void
  closeConnectModal: () => void
}

const ConnectWalletModalContext = React.createContext<ConnectWalletModalContextValue | null>(null)

export function ConnectWalletModalProvider({ children }: React.PropsWithChildren) {
  const [open, setOpen] = React.useState(false)

  const openConnectModal = React.useCallback(() => setOpen(true), [])
  const closeConnectModal = React.useCallback(() => setOpen(false), [])

  const value = React.useMemo<ConnectWalletModalContextValue>(
    () => ({
      openConnectModal,
      closeConnectModal,
    }),
    [closeConnectModal, openConnectModal],
  )

  return (
    <ConnectWalletModalContext.Provider value={value}>
      {children}
      <ConnectModal open={open} onClose={closeConnectModal} />
    </ConnectWalletModalContext.Provider>
  )
}

export function useConnectWalletModal() {
  const context = React.useContext(ConnectWalletModalContext)
  if (!context) {
    throw new Error('useConnectWalletModal must be used within ConnectWalletModalProvider')
  }
  return context
}
