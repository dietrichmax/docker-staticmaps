# -------- Stage 1: Build --------
FROM node:22-alpine AS build

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

# Install build dependencies for native modules
RUN apk add --no-cache \
  python3 make g++ libc6-compat \
  cairo-dev pango-dev giflib-dev libpng-dev jpeg-dev \
  libtool pkgconfig

# Install Microsoft fonts for canvas (optional)
RUN apk add --no-cache msttcorefonts-installer fontconfig && \
    update-ms-fonts && fc-cache -f -v

# Symlink python3 to python for node-gyp
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Copy package.json and package-lock.json first to utilize Docker cache for dependencies
COPY package*.json ./

# Install all dependencies (including dev deps) using npm ci for reproducibility
RUN npm ci

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Remove dev dependencies to keep only production deps and native modules
RUN npm prune --production

# Clean npm cache to save space
RUN npm cache clean --force

# Stage 2: Final Stage (Minimal Image)
FROM node:22-alpine AS final

# Install runtime dependencies required by node-canvas
RUN apk add --no-cache \
  cairo pango giflib libpng jpeg msttcorefonts-installer fontconfig && \
  update-ms-fonts && fc-cache -f -v
  
# Set working directory
WORKDIR /opt/app

# Copy only necessary files from the build stage
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/package*.json ./
COPY --from=build /opt/app/node_modules ./node_modules

# Install only production deps and add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
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
CMD ["npm", "run", "start"]