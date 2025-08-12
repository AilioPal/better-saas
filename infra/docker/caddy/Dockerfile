# Caddy Web Server Dockerfile
# Based on official Caddy Alpine image for minimal size

FROM caddy:2-alpine

# Set working directory
WORKDIR /etc/caddy

# Copy Caddyfile configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Create data directory for certificates
RUN mkdir -p /data /config && \
    chown -R caddy:caddy /data /config

# Switch to caddy user for security
USER caddy

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Volumes for persistent data
VOLUME ["/data", "/config"]

# Start Caddy with the Caddyfile
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]