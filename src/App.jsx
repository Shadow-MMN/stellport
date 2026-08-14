import { useCallback, useEffect, useState } from 'react'
import WalletCard from './components/WalletCard'
import PortfolioCard from './components/PortfolioCard'
import SendCard from './components/SendCard'
import RecentPayments from './components/RecentPayments'
import FaucetCard from './components/FaucetCard'
import PositionsBoard from './components/PositionsBoard'
import ErrorBoundary from './components/ErrorBoundary'
import { StatusPill } from './components/StatusPill'
import {
  EXPLORER_TX_URL,
  NETWORK,
  disconnectFromWallet,
  fetchAccountBalances,
  fetchRecentPayments,
  getCurrentNetwork,
  requestWalletAccess,
  sendXlm,
} from './lib/stellar'
import { watchWalletChanges } from './lib/wallet'

function App() {
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState({ network: '', networkPassphrase: '' })
  const [balances, setBalances] = useState([])
  const [payments, setPayments] = useState([])
  const [connectBusy, setConnectBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [installHint, setInstallHint] = useState(false)

  const loadAccountData = useCallback(async (publicKey) => {
    setLoading(true)
    setError('')
    try {
      const [nextBalances, nextPayments] = await Promise.all([
        fetchAccountBalances(publicKey),
        fetchRecentPayments(publicKey),
      ])
      setBalances(nextBalances)
      setPayments(nextPayments)
    } catch (err) {
      setError(
        err?.message ??
          'Could not load account data. The account may not exist yet — fund it with the faucet.',
      )
      setBalances([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [])

  const syncNetwork = useCallback(async () => {
    const next = await getCurrentNetwork()
    if (next.error) return
    setNetwork({ network: next.network, networkPassphrase: next.networkPassphrase })
  }, [])

  const connect = async () => {
    setConnectBusy(true)
    setError('')
    try {
      const res = await requestWalletAccess()
      if (res.error) {
        throw new Error(res.error)
      }
      if (!res.address) {
        throw new Error('No wallet returned an address. Try again.')
      }
      setInstallHint(false)
      localStorage.setItem('stellport', res.address)
      setAddress(res.address)
      await syncNetwork()
      await loadAccountData(res.address)
    } catch (err) {
      const message = err?.message ?? 'Could not connect a wallet.'
      setError(message)
      if (/wallet|extension|install|respond/i.test(message)) {
        setInstallHint(true)
      }
    } finally {
      setConnectBusy(false)
    }
  }

  const disconnect = async () => {
    localStorage.removeItem('stellport')
    try {
      await disconnectFromWallet()
    } catch {
      // ignore; local state is the source of truth here
    }
    setAddress('')
    setBalances([])
    setPayments([])
    setError('')
    setInstallHint(false)
  }

  const refresh = useCallback(async () => {
    if (!address) return
    await loadAccountData(address)
    await syncNetwork()
  }, [address, loadAccountData, syncNetwork])

  useEffect(() => {
    if (localStorage.getItem('stellport')) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!address) return
    const off = watchWalletChanges((payload) => {
      const nextAddress = payload?.address || payload?.publicKey
      if (nextAddress && nextAddress !== address) {
        setAddress(nextAddress)
        loadAccountData(nextAddress)
        setError('')
      }
      if (payload?.networkPassphrase) {
        setNetwork((prev) => ({
          ...prev,
          networkPassphrase: payload.networkPassphrase,
        }))
      }
    })
    return off
  }, [address, loadAccountData])

  const handleSend = async (form) => {
    const result = await sendXlm({
      from: address,
      to: form.destination.trim(),
      amount: form.amount,
      memo: form.memo,
    })
    await loadAccountData(address)
    return result
  }

  const xlmBalance =
    balances.find((b) => b.asset_type === 'native')?.balance ?? '0'
  const isFunded = Number(xlmBalance) > 0
  const onTestnet = network.network === NETWORK

  return (
    <div className="page">
      <header className="header">
        <div className="logo">
          <span className="logo__mark">✦</span>
          <span>StellPort</span>
        </div>
        <div className="row">
          <StatusPill tone={onTestnet ? 'warn' : 'muted'}>
            {onTestnet ? 'Stellar Testnet' : network.network || 'Unknown network'}
          </StatusPill>
        </div>
      </header>

      <main className="layout">
        <ErrorBoundary>
          <div className="layout__main">
            <WalletCard
              connected={Boolean(address)}
              address={address}
              onConnect={connect}
              onDisconnect={disconnect}
              busy={connectBusy}
              installHint={installHint}
            />

            {address && !isFunded && (
              <FaucetCard address={address} onFunded={() => refresh()} />
            )}

            {error && <p className="error error--box">{error}</p>}

            {address && (
              <>
                <PortfolioCard
                  balances={balances}
                  onRefresh={refresh}
                  busy={loading}
                />
                <SendCard onSend={handleSend} disabled={!isFunded} />
                <ErrorBoundary>
                  <PositionsBoard address={address} />
                </ErrorBoundary>
              </>
            )}
          </div>

          {address && (
            <aside className="layout__side">
              <ErrorBoundary>
                <RecentPayments address={address} payments={payments} />
              </ErrorBoundary>
              <section className="card">
                <div className="card__head">
                  <h2>Network info</h2>
                </div>
                <dl className="kv">
                  <dt>Horizon</dt>
                  <dd className="mono">horizon-testnet.stellar.org</dd>
                  <dt>Passphrase</dt>
                  <dd className="mono break">{network.networkPassphrase || '—'}</dd>
                  <dt>Explorer</dt>
                  <dd className="mono break">{EXPLORER_TX_URL.replace(/tx\/$/, '')}</dd>
                </dl>
              </section>
            </aside>
          )}
        </ErrorBoundary>
      </main>

      <footer className="footer">
        StellPort — Stellar journey to mastery White Belt build on the Stellar
        testnet.
      </footer>
    </div>
  )
}

export default App