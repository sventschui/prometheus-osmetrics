#!/bin/sh
set -eo pipefail

if [ "$1" = 'start' ]; then
  shift
  exec node --async-stack-traces ./src/index.js "$@"
fi

exec "$@"
