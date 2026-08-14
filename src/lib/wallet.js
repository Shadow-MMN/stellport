import {
  StellarWalletsKit,
  Networks,
} from '@creit-tech/stellar-wallets-kit'
import { defaultModules } from '@creit-tech/stellar-wallets-kit/modules/utils'
import { KitEventType } from '@creit-tech/stellar-wallets-kit/types'
import { NETWORK_PASSPHRASE } from './stellar'

let kitInitialized = false

export function initWalletKit() {
  if (kitInitialized) return
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: Networks.TESTNET,
  })
  kitInitialized = true
}

export class WalletError extends Error {
  constructor(message, code = 'WALLET_ERROR') {
    super(message)
    this.code = code
    this.name = 'WalletError'
  }
}

export function classifyWalletError(err, action = 'connect') {
  const message = err?.message ?? err?.toString?.() ?? ''
  const lower = message.toLowerCase()

  if (/no wallet|wallet not found|extension|not installed|albedo.*require|user.*not.*connect/i.test(lower)) {
    return new WalletError(
      'No wallet was found. Install Freighter, xBull, Lobstr, Albedo or Rabet, then try again.',
      'WALLET_NOT_FOUND',
    )
  }
  if (/reject|denied|cancel|declined|user denied|not authorized|declined by user/i.test(lower)) {
    return new WalletError(
      action === 'sign'
        ? 'Transaction signing was rejected in the wallet.'
        : 'Wallet connection was rejected. Approve the request to continue.',
      'USER_REJECTED',
    )
  }
  if (/insufficient|over the max|max.*amount|not enough|limit/i.test(lower)) {
    return new WalletError(
      'Insufficient balance for this operation. Fund the account on testnet first.',
      'INSUFFICIENT_BALANCE',
    )
  }
  if (/network|passphrase/i.test(lower)) {
    return new WalletError(
      `Network mismatch. Switch your wallet to the Stellar testnet (${NETWORK_PASSPHRASE}).`,
      'NETWORK_MISMATCH',
    )
  }
  if (/timeout|did not respond/i.test(lower)) {
    return new WalletError(
      'The wallet did not respond. Open the wallet extension once, then retry.',
      'WALLET_TIMEOUT',
    )
  }
  return new WalletError(message || `Something went wrong while ${action}ing.`, 'UNKNOWN')
}

export async function connectWallet() {
  initWalletKit()
  try {
    const { address } = await StellarWalletsKit.authModal()
    if (!address) {
      throw new WalletError('No address returned after connecting.', 'WALLET_NOT_FOUND')
    }
    return address
  } catch (err) {
    throw classifyWalletError(err, 'connect')
  }
}

export async function disconnectWallet() {
  initWalletKit()
  try {
    await StellarWalletsKit.disconnect()
  } catch (err) {
    throw classifyWalletError(err, 'disconnect')
  }
}

export async function getWalletAddress() {
  initWalletKit()
  try {
    const { address } = await StellarWalletsKit.getAddress()
    return address || ''
  } catch (err) {
    throw classifyWalletError(err, 'connect')
  }
}

export async function signWalletTransaction(xdr, { networkPassphrase = NETWORK_PASSPHRASE, address } = {}) {
  initWalletKit()
  try {
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase,
      address,
    })
    if (!signedTxXdr) {
      throw new WalletError('Transaction was not signed. It may have been rejected.', 'USER_REJECTED')
    }
    return signedTxXdr
  } catch (err) {
    throw classifyWalletError(err, 'sign')
  }
}

export async function getWalletNetwork() {
  initWalletKit()
  try {
    const { network, networkPassphrase } = await StellarWalletsKit.getNetwork()
    return { network, networkPassphrase }
  } catch (err) {
    throw classifyWalletError(err, 'connect')
  }
}

export function watchWalletChanges(onState) {
  initWalletKit()
  return StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) =>
    onState(event.payload),
  )
}