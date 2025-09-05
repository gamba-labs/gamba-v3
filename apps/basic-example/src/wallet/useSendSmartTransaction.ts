import React from 'react'
import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
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

type Options = {
  rpcUrl?: string
  cluster?: 'mainnet' | 'devnet' | 'testnet'
  // Intentionally omitted advanced fields not available in @solana/kit
}

export function useSendSmartTransaction(signer: TransactionSendingSigner, options?: Options) {
  const simulate = React.useCallback(async (instructions: Instruction<Address>[]) => {
    const rpc = createSolanaRpc(options?.rpcUrl ?? 'https://elset-q80z7v-fast-mainnet.helius-rpc.com')
    if (!instructions?.length) throw new Error('No instructions provided')
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    const message = pipe(
      createTransactionMessage({ version: 'legacy' }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    )
    try {
      const res = await (rpc as any).simulateTransaction(message).send()
      console.group('[sendSmartTransaction] Simulation result')
      console.log(res)
      const logs = res?.value?.logs ?? res?.logs
      if (logs) {
        console.groupCollapsed('logs')
        logs.forEach((l: string) => console.log(l))
        console.groupEnd()
      }
      console.groupEnd()
      return res
    } catch (e) {
      console.error('[sendSmartTransaction] simulate failed', e)
      throw e
    }
  }, [options?.rpcUrl, signer])

  const send = React.useCallback(async (instructions: Instruction<Address>[]) => {
    const rpc = createSolanaRpc(options?.rpcUrl ?? 'https://elset-q80z7v-fast-mainnet.helius-rpc.com')
    try {
      if (!instructions?.length) throw new Error('No instructions provided')

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      let message = pipe(
        createTransactionMessage({ version: 'legacy' }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) => appendTransactionMessageInstructions(instructions, m),
      )

      console.groupCollapsed('[sendSmartTransaction] Prepared message')
      console.log('feePayer', signer.address)
      console.log('latestBlockhash', latestBlockhash)
      console.table(instructions.map((ix) => ({ program: String(ix.programAddress), dataLen: ix.data?.length ?? 0 })))
      instructions.forEach((ix, i) => {
        console.groupCollapsed(`ix[${i}] accounts`)
        ix.accounts?.forEach((a, j) => {
          const role = (a as any).role
          const signerFlag = (a as any).signer ? ' signer' : ''
          console.log(`#${j}`, String(a.address), role, signerFlag)
        })
        console.groupEnd()
      })
      console.groupEnd()

      const signatureBytes = await signAndSendTransactionMessageWithSigners(message)
      const signature = getBase58Decoder().decode(signatureBytes)
      console.info('[sendSmartTransaction] Sent', signature)
      return signature
    } catch (e) {
      console.error('[sendSmartTransaction] Failed', e)
      throw e
    }
  }, [options?.rpcUrl, signer])

  return { simulate, send }
}


