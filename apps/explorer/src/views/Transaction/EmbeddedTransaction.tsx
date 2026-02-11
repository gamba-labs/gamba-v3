import React from 'react'
import { useParams } from 'react-router-dom'
import { TransactionContent } from './TransactionContent'

export default function EmbeddedTransactionView() {
  const { txid = '' } = useParams<{ txid: string }>()
  return <TransactionContent txId={txid} embedded />
}
