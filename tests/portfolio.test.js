import test from 'node:test'
import assert from 'node:assert/strict'
import { getNativeBalance, getPortfolioAssets, mergeById, portfolioSummary } from '../src/lib/portfolio.js'

const balances = [
  { asset_type: 'native', balance: '12.5' },
  { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GISSUER', balance: '4' },
]

test('extracts the native XLM balance safely', () => {
  assert.equal(getNativeBalance(balances), '12.5')
  assert.equal(getNativeBalance([]), '0')
})

test('normalizes non-native assets for portfolio cards', () => {
  assert.deepEqual(getPortfolioAssets(balances), [
    { code: 'USDC', balance: '4', issuer: 'GISSUER' },
  ])
})

test('summarizes funds and asset count', () => {
  assert.deepEqual(portfolioSummary(balances), {
    native: '12.5',
    assets: [{ code: 'USDC', balance: '4', issuer: 'GISSUER' }],
    assetCount: 1,
    hasFunds: true,
  })
})

test('merges streamed records without duplicate ids', () => {
  assert.deepEqual(mergeById([{ id: '1', value: 'old' }], [
    { id: '1', value: 'new' },
    { id: '2', value: 'second' },
  ]), [
    { id: '1', value: 'new' },
    { id: '2', value: 'second' },
  ])
})
