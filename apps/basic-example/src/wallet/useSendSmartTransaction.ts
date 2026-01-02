import React from 'react'
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  createTransactionMessage,
  type Address,
  type Instruction,
} from '@solana/kit'
import { useConnector, useKitTransactionSigner } from '@solana/connector'
import { useRpc } from '../useRpc'

const COMPUTE_UNIT_BUFFER = 1.15 // 15% buffer
const DEFAULT_COMPUTE_UNITS = 200_000
const COMPUTE_BUDGET_PROGRAM = 'ComputeBudget111111111111111111111111111111' as Address

/**
 * Creates a SetComputeUnitLimit instruction
 * Instruction type 2 = SetComputeUnitLimit
 * Data layout: [u8 instruction_type, u32 units]
 */
function createSetComputeUnitLimitInstruction(units: number): Instruction<Address> {
  const data = new Uint8Array(5)
  data[0] = 2 // SetComputeUnitLimit instruction discriminator
  // Write units as u32 little-endian
  data[1] = units & 0xff
  data[2] = (units >> 8) & 0xff
  data[3] = (units >> 16) & 0xff
  data[4] = (units >> 24) & 0xff
  
  return {
    programAddress: COMPUTE_BUDGET_PROGRAM,
    accounts: [],
    data,
  }
}

export function useSendSmartTransaction(): {
  simulate: (instructions: Instruction<Address>[]) => Promise<any>
  send: (instructions: Instruction<Address>[]) => Promise<string>
  signer: any
} {
  const { rpc } = useRpc()
  const { isConnected } = useConnector()
  const { signer, ready } = useKitTransactionSigner()

  // Helper to build and encode a transaction for RPC
  const buildEncodedTransaction = React.useCallback(async (
    instructions: Instruction<Address>[],
    latestBlockhash: any
  ) => {
    const message = pipe(
      createTransactionMessage({ version: 'legacy' }),
      (m) => setTransactionMessageFeePayerSigner(signer as any, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    )
    const compiledTx = compileTransaction(message)
    const transactionEncoder = getTransactionEncoder()
    const transactionBytes = transactionEncoder.encode(compiledTx)
    return {
      message,
      base64: btoa(String.fromCharCode(...transactionBytes)),
    }
  }, [signer])

  const simulate = React.useCallback(async (instructions: Instruction<Address>[]) => {
    if (!isConnected || !ready || !signer) throw new Error('Wallet not connected')
    if (!instructions?.length) throw new Error('No instructions provided')

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    const { base64 } = await buildEncodedTransaction(instructions, latestBlockhash)

    try {
      const res = await rpc.simulateTransaction(base64 as any, {
        encoding: 'base64',
        commitment: 'confirmed',
        sigVerify: false,
      }).send()
      
      console.group('[sendSmartTransaction] Simulation result')
      console.log(res)
      const logs = res?.value?.logs
      if (logs) {
        console.groupCollapsed('logs')
        logs.forEach((l: string) => console.log(l))
        console.groupEnd()
      }
      if (res?.value?.err) {
        console.error('Simulation error:', res.value.err)
      }
      if (res?.value?.unitsConsumed) {
        console.log('Compute units consumed:', res.value.unitsConsumed)
      }
      console.groupEnd()
      return res
    } catch (e) {
      console.error('[sendSmartTransaction] simulate failed', e)
      throw e
    }
  }, [rpc, isConnected, ready, signer, buildEncodedTransaction])

  const send = React.useCallback(async (instructions: Instruction<Address>[]) => {
    try {
      if (!isConnected || !ready || !signer) throw new Error('Wallet not connected')
      if (!instructions?.length) throw new Error('No instructions provided')

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      // Step 1: Simulate to estimate compute units (non-fatal if it fails)
      let computeLimit = Math.ceil(DEFAULT_COMPUTE_UNITS * COMPUTE_UNIT_BUFFER)
      
      try {
        console.log('[sendSmartTransaction] Simulating to estimate compute units...')
        const { base64: simBase64 } = await buildEncodedTransaction(instructions, latestBlockhash)
        
        const simResult = await rpc.simulateTransaction(simBase64 as any, {
          encoding: 'base64',
          commitment: 'confirmed',
          sigVerify: false,
        }).send()

        if (simResult?.value?.err) {
          // Log the error but don't throw - use default compute units
          console.warn('[sendSmartTransaction] Simulation had errors (using default CU):', simResult.value.err)
        } else if (simResult?.value?.unitsConsumed) {
          // Successfully got compute units estimate
          const unitsConsumed = Number(simResult.value.unitsConsumed)
          computeLimit = Math.ceil(unitsConsumed * COMPUTE_UNIT_BUFFER)
          console.log(`[sendSmartTransaction] Estimated CU: ${unitsConsumed}, with buffer: ${computeLimit}`)
        }
      } catch (simError) {
        console.warn('[sendSmartTransaction] Simulation failed (using default CU):', simError)
      }

      // Step 2: Build final transaction with compute budget instruction
      const computeIx = createSetComputeUnitLimitInstruction(computeLimit)
      const finalInstructions = [computeIx, ...instructions]

      const message = pipe(
        createTransactionMessage({ version: 'legacy' }),
        (m) => setTransactionMessageFeePayerSigner(signer as any, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) => appendTransactionMessageInstructions(finalInstructions, m),
      )

      console.groupCollapsed('[sendSmartTransaction] Prepared message')
      console.log('feePayer', signer.address)
      console.log('latestBlockhash', latestBlockhash)
      console.log('computeLimit', computeLimit)
      console.table(finalInstructions.map((ix) => ({ program: String(ix.programAddress), dataLen: ix.data?.length ?? 0 })))
      finalInstructions.forEach((ix, i) => {
        console.groupCollapsed(`ix[${i}] accounts`)
        ix.accounts?.forEach((a: any, j: number) => {
          const role = a.role
          const signerFlag = a.signer ? ' signer' : ''
          console.log(`#${j}`, String(a.address), role, signerFlag)
        })
        console.groupEnd()
      })
      console.groupEnd()

      // Step 3: Sign the transaction (wallet will sign)
      const signedTransaction = await signTransactionMessageWithSigners(message)
      
      // Step 4: Encode and send the signed transaction
      const transactionEncoder = getTransactionEncoder()
      const transactionBytes = transactionEncoder.encode(signedTransaction)
      const transactionBase64 = btoa(String.fromCharCode(...transactionBytes))

      const signature = await rpc.sendTransaction(transactionBase64 as any, {
        encoding: 'base64',
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      }).send()

      console.info('[sendSmartTransaction] Sent', signature)
      return signature as string
    } catch (e) {
      console.error('[sendSmartTransaction] Failed', e)
      throw e
    }
  }, [rpc, isConnected, ready, signer, buildEncodedTransaction])

  return { simulate, send, signer }
}
