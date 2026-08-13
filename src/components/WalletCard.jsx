import { isFreighterInstalled, truncatePublicKey } from '../lib/stellar'
import { CopyButton, StatusPill } from './StatusPill'

function WalletCard({ connected, address, onConnect, onDisconnect, busy }) {
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
          <p className="muted">Connect your Freighter wallet to get started.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={onConnect}
              disabled={busy}
            >
              {busy ? 'Connecting…' : 'Connect Freighter'}
            </button>
            {!isFreighterInstalled() && (
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noreferrer"
                className="btn btn--ghost"
              >
                Install Freighter
              </a>
            )}
          </div>
          {!isFreighterInstalled() && (
            <p className="hint">
              Freighter does not look installed. Install the browser extension,
              create a wallet and switch it to the testnet before continuing.
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