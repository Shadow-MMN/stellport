#!/usr/bin/env bash
set -euo pipefail

# Run from a configured Stellar CLI environment. Keep secrets in the CLI
# identity store or CI secret manager; never commit a secret key.
: "${STELLAR_NETWORK:=testnet}"
: "${WASM_PATH:=target/wasm32-unknown-unknown/release/portfolio_tracker.wasm}"

cargo build --target wasm32-unknown-unknown --release
echo "Built ${WASM_PATH}. Deploy with your configured identity:"
echo "stellar contract deploy --wasm ${WASM_PATH} --network ${STELLAR_NETWORK} --source-account <IDENTITY>"
