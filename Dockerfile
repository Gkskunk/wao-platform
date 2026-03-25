FROM node:22-slim

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.cjs"]
