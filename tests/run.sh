#!/usr/bin/env bash
# Runs the pure-logic tests (no database, no network).
# Needs Node and esbuild:  npm i -D esbuild   (or set ESBUILD=/path/to/esbuild package)
# Usage: bash tests/run.sh
set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)
OUT=$(mktemp -d)
for t in tests/*.test.ts; do
  node -e "require(process.env.ESBUILD || 'esbuild').buildSync({ entryPoints: ['$t'], bundle: true, platform: 'node', outfile: '$OUT/t.js', alias: { '@': '$ROOT' }, logLevel: 'warning' })"
  echo "── $t"; node "$OUT/t.js" | tail -1
done
