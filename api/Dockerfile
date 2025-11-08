# -------- deps para BUILD (con dev) --------
FROM node:20-alpine AS deps-dev
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* ./
# Instala con tolerancia de peers para evitar ERESOLVE durante el build
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && corepack prepare pnpm@latest --activate && pnpm i --frozen-lockfile --legacy-peer-deps; \
    elif [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps; \
    else \
      npm i --legacy-peer-deps; \
    fi

# -------- build (usa dev deps) --------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npx tsc -p .

# -------- deps para RUNTIME (solo prod) --------
FROM node:20-alpine AS deps-prod
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* ./
# Instala SOLO producción para no traer eslint ni plugins
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && corepack prepare pnpm@latest --activate && pnpm i --prod --frozen-lockfile --legacy-peer-deps; \
    elif [ -f package-lock.json ]; then \
      npm ci --omit=dev --legacy-peer-deps; \
    else \
      npm i --omit=dev --legacy-peer-deps; \
    fi

# -------- runtime --------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build     /app/dist         ./dist
COPY ./src/database/cassandra/init.cql /app/dist/database/cassandra/init.cql
COPY ./openapi.yaml                      ./openapi.yaml
COPY --from=deps-prod /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node","dist/index.js"]
