/** Pure portfolio helpers kept separate from Horizon/RPC clients so they can
 * be tested in Node and reused by dashboards, exports, and future analytics.
 */
export function getNativeBalance(balances = []) {
  return balances.find((balance) => balance?.asset_type === 'native')?.balance ?? '0'
}

export function getPortfolioAssets(balances = []) {
  return balances
    .filter((balance) => balance?.asset_type !== 'native')
    .map((balance) => ({
      code: balance.asset_code ?? balance.asset_type ?? 'UNKNOWN',
      balance: String(balance.balance ?? '0'),
      issuer: balance.asset_issuer ?? null,
    }))
}

export function portfolioSummary(balances = []) {
  const native = getNativeBalance(balances)
  const assets = getPortfolioAssets(balances)
  return {
    native,
    assets,
    assetCount: assets.length,
    hasFunds: Number(native) > 0 || assets.some((asset) => Number(asset.balance) > 0),
  }
}

export function mergeById(items, incoming) {
  const next = new Map(items.map((item) => [item.id, item]))
  incoming.forEach((item) => next.set(item.id, item))
  return [...next.values()]
}
