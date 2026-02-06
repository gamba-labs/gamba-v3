import React from 'react'
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
} from '@solana/kit'
import { useConnector, useKitTransactionSigner } from '@solana/connector'
import { useGambaRpc } from './useGambaRpc'
import type { SendSmartTransactionResult, SimResult } from '../types'

const COMPUTE_BUDGET_PROGRAM = 'ComputeBudget111111111111111111111111111111' as Address

function createSetComputeUnitLimitInstruction(units: number): Instruction<Address> {
  const data = new Uint8Array(5)
  data[0] = 2
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

function toBase64(bytes: ArrayLike<number>) {
  return btoa(String.fromCharCode(...Array.from(bytes)))
}

export function useSendSmartTransaction(): SendSmartTransactionResult {
  const { rpc, config } = useGambaRpc()
  const { isConnected } = useConnector()
  const { signer, ready } = useKitTransactionSigner()

  const buildEncodedTransaction = React.useCallback(async (
    instructions: Instruction<Address>[],
    latestBlockhash: any,
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
      base64: toBase64(transactionBytes),
    }
  }, [signer])

  const simulate = React.useCallback(async (instructions: Instruction<Address>[]): Promise<SimResult> => {
    if (!isConnected || !ready || !signer) throw new Error('Wallet not connected')
    if (!instructions?.length) throw new Error('No instructions provided')

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    const { base64 } = await buildEncodedTransaction(instructions, latestBlockhash)

    return rpc.simulateTransaction(base64 as any, {
      encoding: 'base64',
      commitment: config.defaultCommitment,
      sigVerify: false,
    }).send()
  }, [rpc, config.defaultCommitment, isConnected, ready, signer, buildEncodedTransaction])

  const send = React.useCallback(async (instructions: Instruction<Address>[]) => {
    if (!isConnected || !ready || !signer) throw new Error('Wallet not connected')
    if (!instructions?.length) throw new Error('No instructions provided')

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    let computeLimit = Math.ceil(config.defaultComputeUnits * config.computeUnitBuffer)

    try {
      const { base64: simBase64 } = await buildEncodedTransaction(instructions, latestBlockhash)
      const simResult = await rpc.simulateTransaction(simBase64 as any, {
        encoding: 'base64',
        commitment: config.defaultCommitment,
        sigVerify: false,
      }).send()

      if (!simResult?.value?.err && simResult?.value?.unitsConsumed) {
        const unitsConsumed = Number(simResult.value.unitsConsumed)
        computeLimit = Math.ceil(unitsConsumed * config.computeUnitBuffer)
      } else if (config.debug && simResult?.value?.err) {
        console.warn('[useSendSmartTransaction] Simulation returned error, using default compute units', simResult.value.err)
      }
    } catch (simulationError) {
      if (config.debug) {
        console.warn('[useSendSmartTransaction] Simulation failed, using default compute units', simulationError)
      }
    }

    const finalInstructions = [createSetComputeUnitLimitInstruction(computeLimit), ...instructions]

    const message = pipe(
      createTransactionMessage({ version: 'legacy' }),
      (m) => setTransactionMessageFeePayerSigner(signer as any, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstructions(finalInstructions, m),
    )

    if (config.debug) {
      console.debug('[useSendSmartTransaction] Prepared transaction', {
        feePayer: (signer as any)?.address,
        computeLimit,
        instructionCount: finalInstructions.length,
      })
    }

    const signedTransaction = await signTransactionMessageWithSigners(message)
    const transactionEncoder = getTransactionEncoder()
    const transactionBytes = transactionEncoder.encode(signedTransaction)
    const transactionBase64 = toBase64(transactionBytes)

    const signature = await rpc.sendTransaction(transactionBase64 as any, {
      encoding: 'base64',
      skipPreflight: false,
      preflightCommitment: config.defaultCommitment,
    }).send()

    return signature as string
  }, [rpc, config, isConnected, ready, signer, buildEncodedTransaction])

  return { simulate, send, signer, ready }
}
