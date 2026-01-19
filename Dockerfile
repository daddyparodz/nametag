FROM node:20-alpine

WORKDIR /app

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Install dependencies based on the package files
COPY --chown=nextjs:nodejs package*.json ./
RUN npm ci

# Copy application files
COPY --chown=nextjs:nodejs . .

# Generate Prisma Client for runtime (avoids missing .prisma in production)
RUN DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy" npx prisma generate

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh && chown nextjs:nodejs /usr/local/bin/docker-entrypoint.sh

# Ensure runtime build output is writable by non-root user
RUN mkdir -p /app/.next && chown -R nextjs:nodejs /app/.next

 

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Switch to non-root user
USER nextjs

# Use entrypoint script to run migrations before starting app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
