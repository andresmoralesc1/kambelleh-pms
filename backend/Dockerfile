FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY src ./src/

# Copy frontend build (served as static)
COPY ../frontend/dist ./public/

EXPOSE 3001

CMD ["node", "src/index.js"]