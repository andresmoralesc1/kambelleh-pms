FROM node:20-bookworm

WORKDIR /app

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma client
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY backend/src ./src/

# Copy pre-built frontend dist for SPA serving
COPY frontend/dist ./public/

# Switch to non-root user
USER appuser

EXPOSE 3001

CMD ["node", "src/index.js"]