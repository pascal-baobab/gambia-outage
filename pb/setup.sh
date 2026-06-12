#!/usr/bin/env bash
# pb/setup.sh — fetch the PINNED Pocketbase binary for local dev (gitignored).
# The migration/hook API is version-specific; keep this pinned in lock-step with pb_migrations.
set -euo pipefail
PB_VERSION="0.39.0"
cd "$(dirname "$0")"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"   # darwin | linux
case "$(uname -m)" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64)  ARCH="amd64" ;;
  *) echo "unsupported arch $(uname -m)"; exit 1 ;;
esac

URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
echo "↓ $URL"
curl -fsSL "$URL" -o /tmp/pocketbase.zip
unzip -o /tmp/pocketbase.zip pocketbase >/dev/null
chmod +x pocketbase
./pocketbase --version
echo "✓ Pocketbase ${PB_VERSION} ready. Next:"
echo "    ./pocketbase superuser create admin@gambiaoutage.com '<password>'"
echo "    ./pocketbase serve --http 127.0.0.1:8090   # applies pb_migrations, loads pb_hooks"
echo "    pnpm -C ../data seed                         # seeds 7 macros + 54 quarters"
