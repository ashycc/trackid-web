#!/usr/bin/env bash
# Regenerate public/og-image.png from scripts/og-image-template.html using headless Chrome.
# Usage: ./scripts/build-og-image.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ROOT/scripts/og-image-template.html"
OUT="$ROOT/public/og-image.png"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [ ! -x "$CHROME" ]; then
  echo "Chrome not found at: $CHROME" >&2
  echo "Set CHROME=/path/to/chrome to override." >&2
  exit 1
fi

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --screenshot="$OUT" --window-size=1200,630 \
  "file://$TEMPLATE"

echo "Wrote $OUT"
file "$OUT"
