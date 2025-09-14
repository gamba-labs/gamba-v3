import React from 'react'
import {
  appendTransactionMessageInstructions,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  createTransactionMessage,
  type Address,
  type Instruction,
  type TransactionSendingSigner,
} from '@solana/kit'
import { useRpc } from '../providers/RpcContext'

export function useSendSmartTransaction(signer: TransactionSendingSigner | null) {
  const { rpc } = useRpc()

  const simulate = React.useCallback(async (instructions: Instruction<Address>[]) => {
    if (!instructions?.length) throw new Error('No instructions provided')
    if (!signer) throw new Error('Wallet not connected')
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    const message = pipe(
      createTransactionMessage({ version: 'legacy' }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    )
    const res = await (rpc as any).simulateTransaction(message).send()
    return res
  }, [rpc, signer])

  const send = React.useCallback(async (instructions: Instruction<Address>[]) => {
    if (!instructions?.length) throw new Error('No instructions provided')
    if (!signer) throw new Error('Wallet not connected')
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    const message = pipe(
      createTransactionMessage({ version: 'legacy' }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    )
    const signatureBytes = await signAndSendTransactionMessageWithSigners(message)
    const signature = getBase58Decoder().decode(signatureBytes)
    return signature
  }, [rpc, signer])

  return { simulate, send }
}


