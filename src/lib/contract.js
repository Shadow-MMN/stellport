import {
  contract,
  rpc,
  xdr,
  scValToNative,
} from '@stellar/stellar-sdk'
import { NETWORK_PASSPHRASE } from './stellar'
import { signWalletTransaction, classifyWalletError, WalletError } from './wallet'

export const CONTRACT_ID = 'CBGQVC3NSIERUM6P23WB5RMQBC7QSQ7MTBEDPZVU7PFAD2SDMMEM6YCC'
export const CONTRACT_RPC_URL = 'https://soroban-testnet.stellar.org'
export const SOROBAN_EVENT_TOPICS = ['portfolio_tracker', 'position_added', 'position_removed']

const server = new rpc.Server(CONTRACT_RPC_URL, { allowHttp: false })

async function getTrackerClient(publicKey, signTransaction) {
  return contract.Client.from({
    contractId: CONTRACT_ID,
    rpcUrl: CONTRACT_RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey,
    signTransaction,
  })
}

export async function fetchPositions(publicKey, signTransaction = signWalletTransaction) {
  const client = await getTrackerClient(publicKey, signTransaction)
  const tx = await client.get_positions()
  return tx.result
}

export async function fetchCount(publicKey, signTransaction = signWalletTransaction) {
  const client = await getTrackerClient(publicKey, signTransaction)
  const tx = await client.get_count()
  return Number(tx.result)
}

export async function fetchTotal(publicKey, signTransaction = signWalletTransaction) {
  const client = await getTrackerClient(publicKey, signTransaction)
  const tx = await client.get_total()
  return String(tx.result)
}

export async function addPosition({ owner, asset, amount, note }, signTransaction = signWalletTransaction) {
  const client = await getTrackerClient(owner, signTransaction)
  const tx = await client.add_position({ owner, asset, amount: BigInt(amount), note })
  const sent = await tx.signAndSend()
  return {
    result: sent.result,
    hash: sent.sendTransactionResponse?.hash,
    status: 'success',
  }
}

export async function removePosition({ owner, index }, signTransaction = signWalletTransaction) {
  const client = await getTrackerClient(owner, signTransaction)
  const tx = await client.remove_position({ owner, index: BigInt(index) })
  const sent = await tx.signAndSend()
  return {
    result: sent.result,
    hash: sent.sendTransactionResponse?.hash,
    status: 'success',
  }
}

export async function getTransactionStatus(txHash) {
  const response = await server.getTransaction(txHash)
  return response.status
}

export async function pollTransaction(txHash, { onStatus, timeoutMs = 120000 } = {}) {
  const response = await server.pollTransaction(txHash, {
    timeout: timeoutMs,
  })
  if (onStatus) onStatus(response.status)
  if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return response
  }
  if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
    const resultXdr = response.resultXdr
    let message = 'The transaction failed on-chain.'
    try {
      if (resultXdr) {
        const result = xdr.TransactionResult.fromXDR(resultXdr, 'base64')
        message = `Transaction failed: ${result.result().switch().name}`
      }
    } catch {
      // keep default message
    }
    throw new WalletError(message, 'TX_FAILED')
  }
  throw new WalletError('The transaction is still pending and timed out.', 'TX_TIMEOUT')
}

function topicToString(scv) {
  try {
    if (scv.switch().name === 'scvSymbol') {
      return scv.sym().toString()
    }
  } catch {
    // ignore
  }
  try {
    return String(scValToNative(scv))
  } catch {
    return ''
  }
}

function nativeFromScVal(scv) {
  try {
    return scValToNative(scv)
  } catch {
    return null
  }
}

export async function getLatestLedger() {
  const info = await server.getLatestLedger()
  return info.sequence
}

export async function fetchContractEvents({ fromLedger, cursor } = {}) {
  const filters = [{ type: 'contract', contractIds: [CONTRACT_ID] }]
  const request = cursor
    ? { filters, cursor, limit: 50 }
    : { filters, startLedger: fromLedger ?? (await getLatestLedger()), limit: 50 }
  const response = await server.getEvents(request)
  const events = response.events.map((event) => {
    const topics = (event.topic || []).map(topicToString)
    const value = event.value ? nativeFromScVal(event.value) : null
    return {
      id: event.id,
      txHash: event.txHash,
      ledger: event.ledger,
      type: event.type,
      inSuccessfulContractCall: event.inSuccessfulContractCall,
      topics,
      value,
    }
  })
  return { events, cursor: response.cursor, latestLedger: response.latestLedger }
}

export function decodePositionsFromEventValue(value) {
  if (!value || typeof value !== 'object') return null
  const fields = {}
  Object.entries(value).forEach(([key, val]) => {
    fields[key] = typeof val === 'bigint' ? val.toString() : val
  })
  return fields
}

export function shortifyAddress(address) {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export { classifyWalletError }