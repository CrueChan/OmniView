FROM node:lts-alpine

LABEL maintainer="OmniView Team"
LABEL description="OmniView - Free Online Video Search and Viewing Platform"

# Set environment variables (can be overridden by docker-compose)
ENV PORT=8080 \
    CORS_ORIGIN=* \
    DEBUG=false \
    REQUEST_TIMEOUT=5000 \
    MAX_RETRIES=2 \
    USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    CACHE_MAX_AGE=1d \
    BLOCKED_HOSTS=localhost,127.0.0.1,0.0.0.0,::1 \
    BLOCKED_IP_PREFIXES=192.168.,10.,172. \
    FILTERED_HEADERS=content-security-policy,cookie,set-cookie,x-frame-options,access-control-allow-origin \
    NODE_ENV=production

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install production dependencies (use npm ci to ensure reproducible builds)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy the application files (excluding node_modules and other unnecessary files)
COPY . .

# Creating a non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Exposed ports
EXPOSE 8080

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]