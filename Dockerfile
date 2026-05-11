# Multi-stage build for Kambelleh PMS
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001

# Install OpenSSL 1.1 for Prisma (required by libquery_engine)
RUN apk add --no-cache libressl libressl1.1 || apk add --no-cache openssl

# Install all dependencies including axios (used in services but missing from package.json)
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --ignore-scripts && npm install axios && npm cache clean --force

# Generate Prisma client
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy backend source
COPY backend/src ./src/

# Use pre-built frontend dist (already exists)
COPY frontend/dist ./public/

EXPOSE 3001

CMD ["node", "src/index.js"]