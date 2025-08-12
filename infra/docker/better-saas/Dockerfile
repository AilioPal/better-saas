# Base Dockerfile for better-saas
# This is a general-purpose Dockerfile that can be used as a base

FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.6.4 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.6.4 --activate

# Copy necessary files from build stage
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/drizzle ./drizzle
COPY --from=base /app/src ./src
COPY --from=base /app/next.config.ts ./next.config.ts

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]