import { truncatePublicKey } from '../lib/stellar'
import { CopyButton, StatusPill } from './StatusPill'

function WalletCard({ connected, address, onConnect, onDisconnect, busy, installHint }) {
  return (
    <section className="card">
      <div className="card__head">
        <h2>Wallet</h2>
        <StatusPill tone={connected ? 'success' : 'muted'}>
          {connected ? 'Connected' : 'Disconnected'}
        </StatusPill>
      </div>

      {!connected ? (
        <>
          <p className="muted">
            Connect any Stellar wallet (Freighter, xBull, Lobstr, Albedo, Rabet…).
          </p>
          <div className="row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={onConnect}
              disabled={busy}
            >
              {busy ? 'Connecting…' : 'Connect wallet'}
            </button>
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost"
            >
              Install a wallet
            </a>
          </div>
          {installHint && (
            <p className="hint">
              StellPort could not reach a wallet. Open your wallet extension once
              to wake it up (make sure it's unlocked and on the Testnet network),
              then connect again.
            </p>
          )}
        </>
      ) : (
        <div className="stack">
          <div className="address-box">
            <code className="address" title={address}>
              {truncatePublicKey(address)}
            </code>
            <CopyButton text={address} />
          </div>
          <button type="button" className="btn btn--danger" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </section>
  )
}

export default WalletCard