#!/usr/bin/env bash
# Build the MythOS compositor WASM floor
# Requires: TinyGo 0.34+, Go 1.19+
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

export GOROOT=/home/hitadmin/sdk/go1.23.4
export PATH=/home/hitadmin/sdk/go1.23.4/bin:/usr/local/bin:/usr/bin:/bin:$PATH

echo "Building compositor WASM..."
tinygo build -o floor.wasm -target wasm -no-debug ./floor.go

SIZE=$(stat -c%s floor.wasm 2>/dev/null || stat -f%z floor.wasm)
echo "floor.wasm: ${SIZE} bytes"
echo "Build complete."
