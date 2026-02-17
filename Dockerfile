# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# # Production stage
# FROM node:22-alpine

# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install production dependencies only
# RUN npm ci --only=production

# # Copy built files from builder
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# COPY prisma ./prisma/

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
