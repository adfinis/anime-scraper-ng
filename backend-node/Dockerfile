FROM node:24-slim

WORKDIR /app

# corepack ships with Node and pins pnpm to the "packageManager" field below
RUN corepack enable

# better-sqlite3 ships prebuilt binaries, but keep the toolchain for fallbacks
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY server.js .

EXPOSE 8001
CMD ["node", "server.js"]
