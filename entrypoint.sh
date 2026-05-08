#!/bin/sh
set -e
echo "→ Prisma migrate deploy..."
npx prisma migrate deploy
echo "→ Avvio Next.js..."
exec npx next start
