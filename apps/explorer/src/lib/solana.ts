export function getExplorerClusterParam(rpcUrl: string) {
  if (rpcUrl.includes('devnet')) return 'devnet'
  if (rpcUrl.includes('testnet')) return 'testnet'
  return 'mainnet-beta'
}

export function getExplorerTxUrl(signature: string, rpcUrl: string) {
  const cluster = getExplorerClusterParam(rpcUrl)
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
}

export function getExplorerAddressUrl(address: string, rpcUrl: string) {
  const cluster = getExplorerClusterParam(rpcUrl)
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`
}
