import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addPosition,
  CONTRACT_ID,
  fetchContractEvents,
  fetchCount,
  fetchPositions,
  fetchTotal,
  removePosition,
  shortifyAddress,
} from '../lib/contract'
import { EXPLORER_TX_URL } from '../lib/stellar'
import { StatusPill } from './StatusPill'

const EMPTY = { asset: 'XLM', amount: '', note: '' }

const ASSET_OPTIONS = ['XLM', 'USDC', 'ETH', 'BTC', 'SOL']

function PositionRow({ position, index, own, onRemove, busy }) {
  const amount = String(position.amount ?? '')
  const asset = String(position.asset ?? '')
  const note = String(position.note ?? '')
  const owner = String(position.owner ?? '')
  const timestamp = Number(position.timestamp ?? 0)

  return (
    <li className="tx-list__item tx-list__item--board">
      <div className="board__top">
        <span className="tx-list__dir">{asset}</span>
        <span className="tx-list__amount mono">
          {amount} {asset}
        </span>
      </div>
      <div className="board__meta">
        <span className="mono" title={owner}>
          {shortifyAddress(owner)}
        </span>
        <span className="board__time">
          {timestamp ? new Date(timestamp * 1000).toLocaleString() : ''}
        </span>
        {own && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onRemove(index)}
            disabled={busy}
          >
            {busy ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
      {note && <p className="board__note muted">{note}</p>}
    </li>
  )
}

function PositionsBoard({ address }) {
  const [positions, setPositions] = useState([])
  const [count, setCount] = useState(null)
  const [total, setTotal] = useState('0')
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState({ state: null, hash: null, message: '' })
  const [live, setLive] = useState(false)
  const [error, setError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [removingIdx, setRemovingIdx] = useState(null)
  const cursorRef = useRef(null)
  const timerRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const [nextPositions, nextCount, nextTotal] = await Promise.all([
        fetchPositions(address),
        fetchCount(address),
        fetchTotal(address),
      ])
      setPositions(nextPositions ?? [])
      setCount(nextCount)
      setTotal(nextTotal)
    } catch (err) {
      setError(err?.message ?? 'Could not load the positions board.')
    } finally {
      setInitialLoading(false)
    }
  }, [address])

  const pollEvents = useCallback(async () => {
    try {
      const { events, cursor } = await fetchContractEvents({
        cursor: cursorRef.current ?? undefined,
      })
      if (cursor) cursorRef.current = cursor
      setLive(true)
      if (events.length > 0) {
        await load()
      }
    } catch (err) {
      // RPC may be temporarily unavailable; keep the last snapshot.
      setError(err?.message ?? 'Could not watch contract events.')
    }
  }, [load])

  useEffect(() => {
    if (!address) return
    cursorRef.current = null
    load()
    pollEvents()
    timerRef.current = setInterval(pollEvents, 6000)
    return () => clearInterval(timerRef.current)
  }, [address, load, pollEvents])

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const validate = () => {
    if (!form.asset) {
      setError('Choose an asset.')
      return false
    }
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return false
    }
    if (Number(form.amount) > 100000000) {
      setError('Amount is too large (max 100,000,000).')
      return false
    }
    setError('')
    return true
  }

  const handleAdd = async (event) => {
    event.preventDefault()
    if (!validate()) return
    setBusy(true)
    setStatus({ state: 'pending', hash: null, message: 'Waiting for wallet approval…' })
    try {
      const result = await addPosition({
        owner: address,
        asset: form.asset,
        amount: Math.round(Number(form.amount)),
        note: form.note.trim(),
      })
      setStatus({
        state: 'success',
        hash: result.hash,
        message: `Position added to the public board (${form.amount} ${form.asset}).`,
      })
      setForm(EMPTY)
      await load()
    } catch (err) {
      setStatus({
        state: 'error',
        hash: null,
        message: err?.message ?? 'Could not add the position.',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (index) => {
    setRemovingIdx(index)
    setStatus({ state: 'pending', hash: null, message: 'Waiting for wallet approval…' })
    try {
      const result = await removePosition({ owner: address, index })
      setStatus({
        state: 'success',
        hash: result.hash,
        message: `Removed position #${index} from the board.`,
      })
      await load()
    } catch (err) {
      setStatus({
        state: 'error',
        hash: null,
        message: err?.message ?? 'Could not remove the position.',
      })
    } finally {
      setRemovingIdx(null)
    }
  }

  const resultClass =
    status.state === 'success'
      ? 'result--success'
      : status.state === 'error'
        ? 'result--error'
        : status.state === 'pending'
          ? 'result--pending'
          : ''

  return (
    <section className="card">
      <div className="card__head">
        <h2>Public Positions Board</h2>
        <StatusPill tone={live ? 'success' : 'muted'}>
          {live ? 'Live events' : 'Syncing…'}
        </StatusPill>
      </div>

      <p className="muted">
        A shared Soroban contract board on the Stellar testnet. Anyone can add a
        position; only its owner can remove it. Updates arrive in real time via
        contract events. Contract:{' '}
        <code className="mono break">{shortifyAddress(CONTRACT_ID)}</code>
      </p>

      <dl className="kv">
        <dt>Positions</dt>
        <dd className="mono">{count ?? '…'}</dd>
        <dt>Total</dt>
        <dd className="mono">{total}</dd>
      </dl>

      <form className="stack" onSubmit={handleAdd}>
        <div className="grid-2">
          <label className="field">
            <span>Asset</span>
            <select value={form.asset} onChange={set('asset')} disabled={busy}>
              {ASSET_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              value={form.amount}
              onChange={set('amount')}
              placeholder="1000"
              min="1"
              step="any"
              disabled={busy}
              inputMode="decimal"
            />
          </label>
        </div>
        <label className="field">
          <span>Note (optional)</span>
          <input
            type="text"
            value={form.note}
            onChange={set('note')}
            placeholder="e.g. BTC long"
            maxLength="64"
            disabled={busy}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Add position'}
        </button>
      </form>

      {status.state && (
        <div className={`result ${resultClass}`}>
          <div className="result__row">
            <strong>
              {status.state === 'pending'
                ? 'Waiting for wallet approval…'
                : status.state === 'success'
                  ? 'Transaction succeeded'
                  : 'Transaction failed'}
            </strong>
            <span className="pill pill--muted">{status.state}</span>
          </div>
          {status.hash && (
            <div className="result__row mono">
              <span title={status.hash}>
                {status.hash.slice(0, 24)}…{status.hash.slice(-8)}
              </span>
              <a
                className="btn btn--ghost btn--sm"
                href={`${EXPLORER_TX_URL}${status.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Explorer
              </a>
            </div>
          )}
          {status.message && <p className="result__msg">{status.message}</p>}
        </div>
      )}

      <div className="stack">
        <ul className="tx-list">
          {initialLoading ? (
            <li className="tx-list__item" aria-live="polite">
              <span className="tx-list__dir">Loading positions…</span>
              <span className="tx-list__amount">Reading the Soroban registry.</span>
            </li>
          ) : positions.length === 0 ? (
            <li className="tx-list__item">
              <span className="tx-list__dir">Empty</span>
              <span className="tx-list__amount">No positions yet. Be the first!</span>
            </li>
          ) : (
            positions.map((p, i) => (
              <PositionRow
                key={`${p.owner}-${i}`}
                position={p}
                index={i}
                own={String(p.owner) === address}
                onRemove={handleRemove}
                busy={removingIdx === i}
              />
            ))
          )}
        </ul>
      </div>
    </section>
  )
}

export default PositionsBoard
