# -------- Stage 1: Build --------
FROM node:26-alpine@sha256:725aeba2364a9b16beae49e180d83bd597dbd0b15c47f1f28875c290bfd255b9 AS build

# Metadata
LABEL org.opencontainers.image.title="docker-staticmaps"
LABEL org.opencontainers.image.description="A containerized web version for staticmaps with Express"
LABEL org.opencontainers.image.url="https://hub.docker.com/repository/docker/mxdcodes/docker-staticmaps"
LABEL org.opencontainers.image.source="https://github.com/dietrichmax/docker-staticmaps"
LABEL org.opencontainers.image.documentation="https://github.com/dietrichmax/docker-staticmaps/blob/main/README.md"
LABEL org.opencontainers.image.authors="Max Dietrich <mail@mxd.codes>"
LABEL org.opencontainers.image.vendor="Max Dietrich <mail@mxd.codes>"
LABEL org.opencontainers.image.licenses=GPL

# Create app directory
WORKDIR /opt/app

# Copy package.json and package-lock.json first to utilize Docker cache for dependencies
COPY package*.json ./

# Install all dependencies (including dev deps) using npm ci for reproducibility
RUN npm ci

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Remove dev dependencies to keep only production deps and native modules
RUN npm prune --omit=dev

# Clean npm cache to save space
RUN npm cache clean --force

# Stage 2: Final Stage (Minimal Image)
FROM node:26-alpine@sha256:725aeba2364a9b16beae49e180d83bd597dbd0b15c47f1f28875c290bfd255b9 AS final

# Patch base OS packages and install a font for sharp's SVG text rendering
RUN apk upgrade --no-cache && \
    apk add --no-cache fontconfig font-liberation
  
# Set working directory
WORKDIR /opt/app

# Copy only necessary files from the build stage
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/package*.json ./
COPY --from=build /opt/app/node_modules ./node_modules

# Remove npm and add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx && \
    chown -R appuser:appgroup /opt/app

# Switch to non-root user for security
USER appuser

# Set environment variable for production
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Set health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --no-verbose --tries=1 -O - http://127.0.0.1:3000/health || exit 1

# Start the application
CMD ["node", "dist/server.cjs"]