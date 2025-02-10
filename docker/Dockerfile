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
COPY package*.json ./

# Install dependencies using npm ci for reproducibility
RUN npm install

# Copy the rest of the application code and build
COPY . .
RUN npm run build

# Stage 2: Final Stage (Minimal Image)
FROM node:20-alpine AS final

# Set working directory
WORKDIR /opt/app

# Copy only necessary files from the build stage
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/package*.json ./

# Install production dependencies, clean up cache, and create a non-root user in one layer
RUN npm install --production && \
    rm -rf node_modules/.cache && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /opt/app

# Switch to non-root user for security
USER appuser

# Expose port
EXPOSE 3000

# Define a healthcheck for the container
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "run", "start"]
