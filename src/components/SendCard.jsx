import { useState } from 'react'
import { EXPLORER_TX_URL, isStellarAddress } from '../lib/stellar'

const EMPTY = { destination: '', amount: '', memo: '' }

function Result({ status, hash, message }) {
  if (!status) return null
  return (
    <div className={`result result--${status}`}>
      <div className="result__row">
        <strong>
          {status === 'success'
            ? 'Transaction succeeded'
            : status === 'pending'
              ? 'Waiting for approval…'
              : 'Transaction failed'}
        </strong>
        <span className="pill pill--muted">{status}</span>
      </div>
      {hash && (
        <div className="result__row mono">
          <span title={hash}>{hash.slice(0, 24)}…{hash.slice(-8)}</span>
          <a
            className="btn btn--ghost btn--sm"
            href={`${EXPLORER_TX_URL}${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Explorer
          </a>
        </div>
      )}
      {message && <p className="result__msg">{message}</p>}
    </div>
  )
}

function SendCard({ onSend, disabled }) {
  const [form, setForm] = useState(EMPTY)
  const [state, setState] = useState({ status: null, hash: null, message: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const validate = () => {
    if (!isStellarAddress(form.destination)) {
      setError('Enter a valid Stellar address (starts with G… and is 56 chars).')
      return false
    }
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return false
    }
    if (Number(form.amount) > 1000000) {
      setError('Amount is too large.')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    setSending(true)
    setState({ status: 'pending', hash: null, message: '' })
    try {
      const result = await onSend(form)
      setState({
        status: 'success',
        hash: result.hash,
        message: `Payment of ${form.amount} XLM sent to ${form.destination}.`,
      })
      setForm(EMPTY)
    } catch (err) {
      setState({
        status: 'error',
        hash: null,
        message: err?.message ?? 'Something went wrong while sending.'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card">
      <div className="card__head">
        <h2>Send XLM</h2>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Destination address</span>
          <input
            type="text"
            value={form.destination}
            onChange={set('destination')}
            placeholder="G…"
            disabled={sending}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Amount (XLM)</span>
            <input
              type="number"
              value={form.amount}
              onChange={set('amount')}
              placeholder="10"
              min="0"
              step="any"
              disabled={sending}
              inputMode="decimal"
            />
          </label>
          <label className="field">
            <span>Memo (optional)</span>
            <input
              type="text"
              value={form.memo}
              onChange={set('memo')}
              placeholder="Test payment"
              maxLength="28"
              disabled={sending}
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={sending || disabled}
        >
          {sending ? 'Sending…' : 'Send XLM'}
        </button>
      </form>

      <Result {...state} />
    </section>
  )
}

export default SendCard