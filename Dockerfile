FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY packages/core packages/core
COPY apps/api apps/api

RUN npm run build --workspace @seederpro/core \
  && npm run build --workspace @seederpro/api \
  && npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "apps/api/dist/server.js"]
