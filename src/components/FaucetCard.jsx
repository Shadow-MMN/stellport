import { useState } from 'react'
import { fundWithFriendbot } from '../lib/stellar'

function FaucetCard({ address, onFunded }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState({ ok: null, message: '' })

  const handleFund = async () => {
    setBusy(true)
    setStatus({ ok: null, message: '' })
    try {
      const res = await fundWithFriendbot(address)
      setStatus({
        ok: true,
        message: `Funded! Friendbot sent testnet XLM to your account.`,
      })
      onFunded(res)
    } catch (error) {
      setStatus({
        ok: false,
        message: error?.message ?? 'The faucet request failed.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card card--accent">
      <div className="card__head">
        <h2>Testnet Faucet</h2>
      </div>
      <p className="muted">
        Your account looks unfunded. Grab free testnet XLM from the Stellar
        Friendbot so you can send transactions.
      </p>
      <button
        type="button"
        className="btn btn--accent"
        onClick={handleFund}
        disabled={busy}
      >
        {busy ? 'Requesting…' : 'Fund my wallet with 10,000 XLM'}
      </button>
      {status.message && (
        <p className={`faucet-status ${status.ok === false ? 'error' : ''}`}>
          {status.message}
        </p>
      )}
    </section>
  )
}

export default FaucetCard