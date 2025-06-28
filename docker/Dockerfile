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

RUN apk add --no-cache msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f -v

# Install build dependencies needed for 'canvas' and node-gyp
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    giflib-dev \
    jpeg-dev \
    librsvg-dev

# Copy package.json and package-lock.json first to utilize Docker cache for dependencies
COPY package*.json ./

# Install dependencies using npm ci for reproducibility
RUN npm ci

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Remove build dependencies to reduce image size after build
RUN apk del .build-deps

# Stage 2: Final Stage (Minimal Image)
FROM node:22-alpine AS final

# Set environment variable for production
ENV NODE_ENV=production

# Set working directory
WORKDIR /opt/app

# Copy only necessary files from the build stage
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/package*.json ./
COPY --from=build /usr/share/fonts /usr/share/fonts

# Install only production deps and add non-root user
RUN npm ci --omit=dev && \
    rm -rf node_modules/.cache && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /opt/app

# Switch to non-root user for security
USER appuser

# Expose port
EXPOSE 3000

# Set health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --no-verbose --tries=1 -O - http://127.0.0.1:3000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]
