# Use an official Node.js image as the base, with a smaller image variant
FROM node:20-alpine AS build

# Metadata
# Copyright © 2024 Max Dietrich <mail@mxd.codes>. All rights reserved.
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
COPY package.json package-lock.json ./

# Install only production dependencies to reduce size
RUN npm ci --production && npm prune --production

# Copy only necessary application files
COPY dist ./dist
COPY public ./public

# Stage 2: Final Stage (Minimal Image)
FROM node:20-alpine AS final

# Set working directory
WORKDIR /opt/app

# Copy only the necessary artifacts (from build stage)
COPY --from=build /opt/app /opt/app

# Clean up npm cache (to save space)
RUN rm -rf /opt/app/node_modules/.cache

# Remove build dependencies (any leftover dev dependencies)
RUN npm prune --production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /opt/app

# Switch to non-root user for security
USER appuser

# Expose port
EXPOSE 3000

# Add healthcheck to monitor service status
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "run", "start"]
