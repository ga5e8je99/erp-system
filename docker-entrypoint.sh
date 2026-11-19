#!/bin/sh
set -e

# If requested or invoked as a migration step, run database migrations
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🚀 Running Prisma database migrations (deploy)..."
  npx prisma migrate deploy
fi

# Support explicit commands
case "$1" in
  migrate|db:deploy)
    echo "🚀 Running Prisma database migrations (deploy)..."
    exec npx prisma migrate deploy
    ;;
  seed:prod|db:seed:prod)
    echo "🌱 Running production essentials seed..."
    exec npx tsx prisma/seed-prod.ts
    ;;
  seed|db:seed)
    echo "🌱 Running database seed..."
    exec npx tsx prisma/seed.ts
    ;;
  *)
    exec "$@"
    ;;
esac
