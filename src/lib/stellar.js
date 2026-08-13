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
  requestAccess,
  getAddress,
  isConnected,
  getNetwork,
  signTransaction,
} from '@stellar/freighter-api'

export const NETWORK = 'testnet'
export const NETWORK_PASSPHRASE = Networks.TESTNET
export const HORIZON_URL = 'https://horizon-testnet.stellar.org'
export const FRIENDBOT_URL = 'https://friendbot.stellar.org'
export const EXPLORER_TX_URL = 'https://stellar.expert/explorer/testnet/tx/'

export const server = new Horizon.Server(HORIZON_URL)

export function isFreighterInstalled() {
  return typeof window !== 'undefined' && Boolean(window.freighter)
}

export async function getWalletState() {
  try {
    const connected = await isConnected()
    return { connected, ...connected }
  } catch (error) {
    return { connected: false, error }
  }
}

export async function requestWalletAccess() {
  const res = await requestAccess()
  return { address: res?.address ?? '', error: res?.error ?? null }
}

export async function getPublicKey() {
  const res = await getAddress()
  return { address: res?.address ?? '', error: res?.error ?? null }
}

export async function getCurrentNetwork() {
  const res = await getNetwork()
  return {
    network: res?.network ?? '',
    networkPassphrase: res?.networkPassphrase ?? '',
    error: res?.error ?? null,
  }
}

export function flattenAssetCode(balance) {
  if (balance.asset_type === 'native') {
    return { code: 'XLM', isNative: true }
  }
  if (balance.asset_type === 'liquidity_pool_shares') {
    return { code: 'LP Shares', isNative: false }
  }
  return {
    code: balance.asset_code ?? '?',
    issuer: balance.asset_issuer,
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
  const signed = await signTransaction(xdr, {
    address: from,
    networkPassphrase: NETWORK_PASSPHRASE,
  })

  if (signed?.error) {
    throw new Error(signed.error.message ?? signed.error)
  }
  if (!signed?.signedTxXdr) {
    throw new Error('Transaction was not signed. It may have been rejected.')
  }

  const signedTx = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
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