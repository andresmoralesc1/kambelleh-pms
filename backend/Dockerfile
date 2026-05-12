FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY src ./src/

# Copy frontend build (served as static)
COPY ../frontend/dist ./public/

# Switch to non-root user
USER appuser

EXPOSE 3001

CMD ["node", "src/index.js"]