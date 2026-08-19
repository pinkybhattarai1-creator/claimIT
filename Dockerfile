FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source code and ensure permissions
COPY . .
RUN chown -R node:node /app

# Run as non-root user
USER node

# Expose port
EXPOSE 8847

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8847/health || exit 1

# Start the server
CMD ["node", "server.js"]
