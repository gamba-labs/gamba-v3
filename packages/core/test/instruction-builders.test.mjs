import assert from 'node:assert/strict'
import test from 'node:test'
import { AccountRole } from '@solana/kit'
import * as gamba from '../dist/index.js'

const USER_ADDRESS = '11111111111111111111111111111111'
const WSOL_MINT = 'So11111111111111111111111111111111111111112'

const signer = {
  address: USER_ADDRESS,
  async signTransactions(transactions) {
    return transactions
  },
}

test('buildPlayerInitializeInstruction marks user as signer', async () => {
  const ix = await gamba.instructions.singleplayer.buildPlayerInitializeInstruction({ user: signer })
  assert.equal(ix.programAddress, gamba.core.GAMBA_PROGRAM_ADDRESS)
  assert.equal(ix.accounts[2].role, AccountRole.WRITABLE_SIGNER)
})

test('buildPlayGameInstruction requires rpc when underlying token mint is not provided', async () => {
  await assert.rejects(
    gamba.instructions.singleplayer.buildPlayGameInstruction({
      user: signer,
      pool: USER_ADDRESS,
      wager: 1n,
      bet: [1, 1],
    }),
    /rpc required to resolve pool data/,
  )
})

test('buildJoinGameInstruction marks player as signer', async () => {
  const ix = await gamba.instructions.multiplayer.buildJoinGameInstruction({
    user: signer,
    gameAccount: USER_ADDRESS,
    mint: WSOL_MINT,
    wager: 1n,
  })
  assert.equal(ix.programAddress, gamba.multiplayer.MULTIPLAYER_PROGRAM_ADDRESS)
  assert.equal(ix.accounts[4].role, AccountRole.WRITABLE_SIGNER)
})
