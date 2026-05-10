# Multi-stage build for Kambelleh PMS
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001

# Install production dependencies only
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --ignore-scripts --production && npm cache clean --force

# Generate Prisma client
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy backend source
COPY backend/src ./src/

# Copy pre-built frontend dist
COPY --from=frontend-builder /app/dist ./public/

EXPOSE 3001

CMD ["node", "src/index.js"]