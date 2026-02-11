import { minidenticon } from 'minidenticons'
import React from 'react'
import { truncateString } from '@/components/AccountItem'
import { type PlatformMeta, getPlatformMeta } from '@/platforms'
import { useBonfidaName } from './useBonfidaName'

export * from './useToast'
export * from './useTokenMeta'
export * from './useBonfidaName'
export * from './useMediaQuery'
export * from './useTokens'
export * from './useWalletAddress'

export function usePlatformMeta(address: string): PlatformMeta {
  const meta = getPlatformMeta(address)
  const domainName = useBonfidaName(address)
  const identicon = React.useMemo(
    () => 'data:image/svg+xml;utf8,' + encodeURIComponent(minidenticon(address.toString())),
    [address],
  )

  return (
    meta ?? {
      address: address.toString(),
      name: domainName ?? truncateString(address.toString()),
      image: identicon,
    }
  )
}
