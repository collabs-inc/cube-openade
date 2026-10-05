#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node cube/install.mjs
sh cube/desktop/install.sh
