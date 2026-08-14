import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk'
import {
  connectWallet,
  disconnectWallet,
  getWalletAddress,
  getWalletNetwork,
  signWalletTransaction,
} from './wallet'

export const NETWORK = 'testnet'
export const NETWORK_PASSPHRASE = Networks.TESTNET
export const HORIZON_URL = 'https://horizon-testnet.stellar.org'
export const FRIENDBOT_URL = 'https://friendbot.stellar.org'
export const EXPLORER_TX_URL = 'https://stellar.expert/explorer/testnet/tx/'

export const server = new Horizon.Server(HORIZON_URL)

export function callWithTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms),
    ),
  ])
}

export async function getWalletState() {
  try {
    const address = await getWalletAddress()
    return { connected: Boolean(address), address }
  } catch (error) {
    return { connected: false, error }
  }
}

export async function requestWalletAccess() {
  try {
    const address = await callWithTimeout(
      connectWallet(),
      12000,
      'No wallet responded. Open the wallet extension once, then try again.',
    )
    return { address, error: null }
  } catch (error) {
    return { address: '', error: error.message ?? error }
  }
}

export async function disconnectFromWallet() {
  await disconnectWallet()
}

export async function getPublicKey() {
  try {
    const address = await getWalletAddress()
    return { address, error: null }
  } catch (error) {
    return { address: '', error: error.message ?? error }
  }
}

export async function getCurrentNetwork() {
  try {
    const { network, networkPassphrase } = await getWalletNetwork()
    return { network, networkPassphrase, error: null }
  } catch (error) {
    return { network: '', networkPassphrase: '', error: error.message ?? error }
  }
}

export function flattenAssetCode(record) {
  const type = record?.asset_type
  if (!type) return { code: '—', isNative: false }
  if (type === 'native') return { code: 'XLM', isNative: true }
  if (type === 'liquidity_pool_shares') {
    return { code: 'LP Shares', isNative: false }
  }
  return {
    code: record.asset_code ?? '?',
    issuer: record.asset_issuer,
    isNative: false,
  }
}

export function formatAmount(value, decimals = 7) {
  return Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export function truncatePublicKey(publicKey, head = 6, tail = 6) {
  if (!publicKey) return ''
  return `${publicKey.slice(0, head)}…${publicKey.slice(-tail)}`
}

export function isStellarAddress(value) {
  if (!value) return false
  try {
    Keypair.fromPublicKey(value.trim())
    return true
  } catch {
    return false
  }
}

export async function fetchAccountBalances(publicKey) {
  const account = await server.loadAccount(publicKey)
  return account.balances ?? []
}

export async function fundWithFriendbot(publicKey) {
  const url = `${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.detail ?? `Friendbot request failed with status ${res.status}`,
    )
  }
  return res.json()
}

export async function sendXlm({ from, to, amount, memo }) {
  const account = await server.loadAccount(from)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: to,
        asset: Asset.native(),
        amount: String(amount),
      }),
    )
    .setTimeout(60)
    .build()

  if (memo) {
    tx.addMemo(Memo.text(memo.slice(0, 28)))
  }

  const xdr = tx.toXDR()
  const signed = await signWalletTransaction(xdr, {
    address: from,
    networkPassphrase: NETWORK_PASSPHRASE,
  })

  if (!signed) {
    throw new Error('Transaction was not signed. It may have been rejected.')
  }

  const signedTx = TransactionBuilder.fromXDR(
    signed,
    NETWORK_PASSPHRASE,
  )

  const response = await server.submitTransaction(signedTx)
  return {
    hash: response.hash,
    successful: response.successful,
    resultXdr: response.result_xdr,
  }
}

export async function fetchRecentPayments(publicKey, limit = 8) {
  const res = await server
    .payments()
    .forAccount(publicKey)
    .limit(limit)
    .order('desc')
    .call()
  return res.records ?? []
}