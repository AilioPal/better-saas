# Caddy Web Server Dockerfile
# Based on official Caddy Alpine image for minimal size

FROM caddy:2-alpine

# Copy Caddyfile configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Volumes for persistent data (directories already exist in base image)
VOLUME ["/data", "/config"]

# Start Caddy with the Caddyfile (runs as appropriate user from base image)
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]