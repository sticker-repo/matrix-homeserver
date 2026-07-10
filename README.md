# Sticker-Repo for Local Matrix Homeservers

This service lets you self-host the sticker-repo repository. On first startup, it clones all sticker packs, then mimics the Matrix homeserver federation API to serve them to your homeserver as needed.

## Prerequisites

- Docker and Docker Compose (or Docker installed)
- A Matrix homeserver running at a base domain (e.g., `example.com`)
- A subdomain available for sticker-repo (e.g., `sticker-repo.example.com`)
- A reverse proxy (Nginx, Caddy, etc.) configured for your domain

## Quick Start

### 1. Choose a Subdomain

Select a subdomain for your sticker repository. For example, if your homeserver is at `example.com`, you can use `sticker-repo.example.com`.

### 2. Run the Docker Container

```bash
docker run -d \
  --name sticker-repo \
  -v sticker-repo:/app/sticker-repo \
  -p 8080:80 \
  ghcr.io/sticker-repo/matrix-homeserver
```

### 3. Configure Your Reverse Proxy

Point your reverse proxy (Nginx, Caddy, etc.) to forward traffic from `sticker-repo.example.com` to the container's port `8080`.

**Nginx example:**
```nginx
server {
    server_name sticker-repo.example.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Verify Installation

Visit `https://sticker-repo.example.com` in your browser to confirm the service is running.

## Configuration

- **Volume mounting:** Sticker packs are stored in the `sticker-repo` volume. Customize the path by changing `-v sticker-repo:/app/sticker-repo`.
- **Port mapping:** Change the port mapping (`-p 8080:80`) if port 8080 is already in use.
