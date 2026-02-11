import React from 'react'
import { useParams } from 'react-router-dom'
import { TransactionContent } from './TransactionContent'

export default function TransactionView() {
  const { txid = '' } = useParams<{ txid: string }>()
  return <TransactionContent txId={txid} />
}
