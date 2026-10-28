# ==========================================
# Thinkz AI Backend - Production Optimized V7
# ==========================================

FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --ignore-scripts \
    && npx prisma generate \
    && npm prune --omit=dev \
    && rm -rf \
       node_modules/prisma \
       node_modules/@prisma/engines \
       node_modules/@prisma/config \
       node_modules/@prisma/fetch-engine \
       node_modules/@prisma/get-platform \
       node_modules/@prisma/engines-version \
       node_modules/effect \
       node_modules/@prisma/debug \
       node_modules/c12 \
       node_modules/chokidar \
       node_modules/citty \
       node_modules/confbox \
       node_modules/consola \
       node_modules/deepmerge-ts \
       node_modules/defu \
       node_modules/destr \
       node_modules/empathic \
       node_modules/exsolve \
       node_modules/fast-check \
       node_modules/giget \
       node_modules/jiti \
       node_modules/node-fetch-native \
       node_modules/nypm \
       node_modules/ohash \
       node_modules/pathe \
       node_modules/perfect-debounce \
       node_modules/pkg-types \
       node_modules/pure-rand \
       node_modules/rc9 \
       node_modules/readdirp \
       node_modules/tinyexec \
    && find node_modules -type f -name "*.map" -delete \
    && find node_modules/@prisma/client/runtime -type f \
       \( -name "*cockroachdb*" -o \
          -name "*mysql*" -o \
          -name "*sqlserver*" -o \
          -name "*sqlite*" \) \
       -delete \
    && npm cache clean --force


FROM node:20-alpine AS production

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

WORKDIR /app

RUN apk add --no-cache openssl \
    && addgroup -g 1001 -S appuser \
    && adduser -u 1001 -S -G appuser appuser \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/bin/npm \
              /usr/local/bin/npx \
              /opt/yarn-* \
              /usr/local/bin/yarn \
              /usr/local/bin/yarnpkg

COPY --from=builder --chown=appuser:appuser \
     /app/node_modules ./node_modules

COPY --chown=appuser:appuser . .

# Remove files that are not required by the production runtime.
RUN rm -rf \
      /app/structure.txt \
      /app/tests \
      /app/test-chat-poll-breakout.js \
      /app/roleMatrix.test.js \
      /app/roleHierarchy.test.js \
      /app/realForumSeeding.test.js \
      /app/package.json.before-joi-fix \
      /app/package-lock.json.before-joi-fix \
      /app/Dockerfile.v6-working-* \
      /app/Dockerfile.test-v5-backup

USER appuser

EXPOSE 5000

CMD ["node", "server.js"]
