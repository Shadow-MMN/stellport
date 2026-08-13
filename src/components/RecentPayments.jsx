import { formatAmount, flattenAssetCode } from '../lib/stellar'

function amountLabel(record) {
  if (record.type === 'payment') {
    const asset = flattenAssetCode(record.asset)
    return `${formatAmount(record.amount)} ${asset.code}`
  }
  if (record.type === 'create_account') {
    return `Account created with ${formatAmount(record.starting_balance)} XLM`
  }
  if (record.type === 'path_payment_strict_receive' || record.type === 'path_payment_strict_send') {
    return `${formatAmount(record.amount)} ${flattenAssetCode(record.asset).code}`
  }
  return record.type ?? 'operation'
}

function RecentPayments({ address, payments }) {
  return (
    <section className="card">
      <div className="card__head">
        <h2>Recent operations</h2>
      </div>
      {payments.length === 0 ? (
        <p className="muted">No recent activity found for this account.</p>
      ) : (
        <ul className="tx-list">
          {payments.map((record) => (
            <li key={record.id} className="tx-list__item">
              {record.type === 'payment' ? (
                <span className="tx-list__dir">
                  {record.to === address ? 'Received' : 'Sent'}
                </span>
              ) : (
                <span className="tx-list__dir">{record.type}</span>
              )}
              <span className="tx-list__amount">{amountLabel(record)}</span>
              <span className="tx-list__time">
                {new Date(record.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      <a
        className="btn btn--ghost btn--sm"
        href={`https://stellar.expert/explorer/testnet/account/${address}`}
        target="_blank"
        rel="noreferrer"
      >
        View full account on Stellar Expert
      </a>
    </section>
  )
}

export default RecentPayments