import React from 'react'
import { useConnector } from '@solana/connector'
import { PLATFORM_ALLOW_REFERRER_REMOVAL } from '../../config/constants'
import { useReferral } from '../../hooks/useReferral'
import { useConnectWalletModal } from '../../providers/ConnectWalletModalContext'
import { MenuDivider, MenuInfo, MenuItem, MenuPanel, MenuWrapper, UiButton } from './primitives'

function truncateAddress(address: string, keep = 4) {
  if (!address) return ''
  return `${address.slice(0, keep)}...${address.slice(-keep)}`
}

function ConnectedSummary() {
  const { account, disconnectWallet } = useConnector()
  const referral = useReferral()
  const [open, setOpen] = React.useState(false)
  const [isDisconnecting, setIsDisconnecting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const address = account ? String((account as any).address ?? account) : ''
  const short = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

  React.useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    setActionError(null)
    try {
      await disconnectWallet()
      setOpen(false)
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleCopyInvite = async () => {
    try {
      setActionError(null)
      await referral.copyInviteLink()
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to copy invite link')
    }
  }

  const handleRemoveInvite = async () => {
    try {
      setActionError(null)
      await referral.removeInvite()
      setOpen(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to remove invite')
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <UiButton onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}>
        {short}
      </UiButton>
      {open && (
        <MenuWrapper>
          <MenuPanel>
            <MenuInfo>{address}</MenuInfo>
            <MenuItem as="button" onClick={handleCopyInvite}>
              {copied ? 'Invite copied' : 'Copy invite link'}
            </MenuItem>

            {PLATFORM_ALLOW_REFERRER_REMOVAL && referral.referrerAddress && (
              <>
                <MenuItem as="button" onClick={handleRemoveInvite} disabled={referral.removing || referral.loading}>
                  {referral.removing ? 'Removing invite...' : 'Remove invite'}
                </MenuItem>
                <MenuInfo>
                  Invited by <a href={`https://solscan.io/account/${referral.referrerAddress}`} target="_blank" rel="noreferrer">{truncateAddress(String(referral.referrerAddress), 6)}</a>
                </MenuInfo>
              </>
            )}

            <MenuDivider />
            <MenuItem as="button" onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </MenuItem>
            {actionError && <MenuInfo style={{ color: '#ff8080' }}>{actionError}</MenuInfo>}
          </MenuPanel>
        </MenuWrapper>
      )}
    </div>
  )
}

export function ConnectWallet() {
  const { isConnected, isConnecting } = useConnector()
  const { openConnectModal } = useConnectWalletModal()

  if (isConnected) return <ConnectedSummary />

  return (
    <UiButton onClick={openConnectModal}>{isConnecting ? 'Connecting' : 'Connect'}</UiButton>
  )
}
