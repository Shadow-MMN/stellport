import {
  formatAmount,
  flattenAssetCode,
} from '../lib/stellar'

function PortfolioCard({ balances, onRefresh, busy }) {
  const nativeBalance =
    balances.find((b) => b.asset_type === 'native')?.balance ?? '0'
  const others = balances.filter((b) => b.asset_type !== 'native')

  return (
    <section className="card">
      <div className="card__head">
        <h2>Portfolio</h2>
        <div className="row">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onRefresh}
            disabled={busy}
          >
            {busy ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="xlm-amount">
        <span className="xlm-amount__value">{formatAmount(nativeBalance)}</span>
        <span className="xlm-amount__code">XLM</span>
      </div>

      {others.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Issuer</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {others.map((b, index) => {
              const asset = flattenAssetCode(b)
              return (
                <tr key={`${b.asset_code ?? b.asset_type}-${index}`}>
                  <td>{asset.code}</td>
                  <td className="mono truncate" title={asset.issuer}>
                    {asset.issuer
                      ? `${asset.issuer.slice(0, 5)}…${asset.issuer.slice(-4)}`
                      : '—'}
                  </td>
                  <td>{formatAmount(b.balance)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {others.length === 0 && (
        <p className="muted">
          Only XLM so far — fund your account with the faucet button below.
        </p>
      )}
    </section>
  )
}

export default PortfolioCard