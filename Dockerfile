# Production Dockerfile for Nametag
# Multi-stage build for optimized production image

# Stage 1: Dependencies (for build)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies needed for build)
# Use cache mount to speed up npm install across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
RUN DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXTAUTH_SECRET="build-time-secret-min-32-chars-xxxxxxxxxxxxxxxxx" \
    RESEND_API_KEY="re_build_time_key" \
    EMAIL_DOMAIN="build.example.com" \
    CRON_SECRET="build-time-cron-secret" \
    npx prisma generate

# Build Next.js application
RUN DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXTAUTH_SECRET="build-time-secret-min-32-chars-xxxxxxxxxxxxxxxxx" \
    RESEND_API_KEY="re_build_time_key" \
    EMAIL_DOMAIN="build.example.com" \
    CRON_SECRET="build-time-cron-secret" \
    npm run build

# Compile production seed to JavaScript using esbuild
RUN npx esbuild prisma/seed.production.ts --platform=node --format=cjs --outfile=prisma/seed.production.js --bundle --external:@prisma/client --external:pg --minify

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

# Copy standalone build (includes node_modules with production dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# IMPORTANT: Copy public folder AFTER standalone
# Standalone output includes public, but we copy again to ensure all assets are present
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Install Prisma CLI for migrations (as root before switching users)
# Note: We only install prisma (not @prisma/client which is already in standalone)
RUN --mount=type=cache,target=/root/.npm \
    npm install prisma@6.5.0

# Copy Prisma generated client from builder (already built)
COPY --from=builder /app/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy and setup entrypoint script (as root before switching users)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh && chown nextjs:nodejs /usr/local/bin/docker-entrypoint.sh

# Ensure runtime build output is writable by non-root user
RUN mkdir -p /app/.next && chown -R nextjs:nodejs /app/.next

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint script to run migrations before starting app
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
