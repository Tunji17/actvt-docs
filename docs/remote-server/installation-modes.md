---
sidebar_position: 7
---

# Installation Modes

The Actvt installation script supports three different installation modes to accommodate various server setups. The mode determines how Vector binds to network interfaces and whether nginx is used as a reverse proxy.

## Mode Overview

| Mode | Vector Binding | Nginx Required | Port Exposure | Use Case |
|------|---------------|----------------|---------------|----------|
| **Auto** | Detected automatically | Optional | Depends on detection | Let script choose (recommended) |
| **Standalone** | `0.0.0.0:4096` | No | Port 4096 publicly accessible | Dedicated monitoring server |
| **Proxy** | `127.0.0.1:4096` | Yes | Only 80/443 exposed | Shared web server |

## Auto Mode (Recommended)

Auto mode automatically detects your server configuration and chooses the appropriate setup.

### How It Works

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_INSTALL_MODE="auto"  # This is the default
curl -L https://actvt.io/install | bash
```

The script will:
1. Check if nginx is running on ports 80 or 443
2. If nginx detected → Use **Proxy Mode**
3. If no web server → Use **Standalone Mode**

### Detection Logic

```
Check ports 80/443
├── nginx running? → Proxy Mode
├── apache running? → Show manual instructions
└── No web server? → Standalone Mode
```

## Standalone Mode

Vector binds directly to all interfaces on port 4096. Clients connect directly to Vector's WebSocket server.

### Architecture

```
Internet → Port 4096 (Vector WSS) → System Metrics
         └─ TLS/mTLS verification
```

### When to Use

- ✅ Dedicated monitoring server
- ✅ No other web services running
- ✅ Simpler network configuration
- ✅ Slightly lower latency (no nginx hop)

### Connection URL

```
wss://monitor.yourdomain.com:4096
```

### Installation

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_INSTALL_MODE="standalone"
curl -L https://actvt.io/install | bash
```

Or force standalone even if nginx is detected:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_FORCE_STANDALONE="yes"
curl -L https://actvt.io/install | bash
```

### Firewall Ports

In standalone mode, these ports must be accessible:

- **Port 80**: HTTP (Let's Encrypt certificate validation)
- **Port 443**: HTTPS (Optional, for future use)
- **Port 4096**: WebSocket Secure (Vector metrics streaming)

### Configuration

Vector configuration in standalone mode:

```toml
[sinks.websocket_out]
type    = "websocket_server"
inputs  = [...]
address = "0.0.0.0:4096"  # Bind to all interfaces

[sinks.websocket_out.tls]
enabled  = true
crt_file = "/etc/vector/certs/server.crt"
key_file = "/etc/vector/certs/server.key"
```

## Proxy Mode

Vector binds only to localhost. Nginx acts as a reverse proxy, forwarding the `/actvt` path to Vector.

### Architecture

```
Internet → Port 443 (Nginx) → /actvt → 127.0.0.1:4096 (Vector) → System Metrics
         └─ TLS/mTLS verification
```

### When to Use

- ✅ Server already running nginx for websites
- ✅ Want to minimize exposed ports
- ✅ Need to consolidate certificates
- ✅ Require additional nginx features (rate limiting, IP filtering)
- ✅ Prefer path-based routing over port-based

### Connection URL

```
wss://monitor.yourdomain.com/actvt
```

### Installation

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_INSTALL_MODE="proxy"
curl -L https://actvt.io/install | bash
```

### Firewall Ports

In proxy mode, these ports must be accessible:

- **Port 80**: HTTP (Let's Encrypt + nginx)
- **Port 443**: HTTPS (nginx → Vector proxy)

Port 4096 is **NOT** exposed publicly (Vector listens only on localhost).

### Vector Configuration

Vector configuration in proxy mode:

```toml
[sinks.websocket_out]
type    = "websocket_server"
inputs  = [...]
address = "127.0.0.1:4096"  # Bind to localhost only

[sinks.websocket_out.tls]
enabled  = true
crt_file = "/etc/vector/certs/server.crt"
key_file = "/etc/vector/certs/server.key"
```

### Nginx Configuration

#### Dedicated Server Block

If no existing server block for your domain exists, the script creates `/etc/nginx/sites-available/actvt-vector`:

```nginx
server {
    listen 443 ssl http2;
    server_name monitor.yourdomain.com;

    # SSL certificates managed by certbot
    ssl_certificate /etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Actvt Vector WebSocket endpoint
    location /actvt {
        # Proxy to local Vector WebSocket server
        proxy_pass https://127.0.0.1:4096;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts (24 hours)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;

        # Disable buffering for WebSocket
        proxy_buffering off;

        # Upstream TLS options
        proxy_ssl_server_name on;
        proxy_ssl_name monitor.yourdomain.com;
        proxy_ssl_verify off;
    }

    # Health check endpoint
    location /actvt/health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

#### Snippet Include (Existing Server Block Detected)

If nginx is already serving your domain, the script creates `/etc/nginx/snippets/actvt-vector-location.conf`:

```nginx
# Actvt Vector WebSocket Configuration Snippet

# WebSocket proxy location block
location /actvt {
    proxy_pass https://127.0.0.1:4096;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    proxy_connect_timeout 60;
    proxy_buffering off;
    proxy_ssl_server_name on;
    proxy_ssl_name monitor.yourdomain.com;
    proxy_ssl_verify off;
}

location = /actvt/health {
    access_log off;
    return 200 "OK\n";
    add_header Content-Type text/plain;
}
```

Include this snippet in your existing server block:

```nginx
server {
    listen 443 ssl http2;
    server_name monitor.yourdomain.com;

    # Your existing configuration...

    # Include Actvt Vector proxy
    include /etc/nginx/snippets/actvt-vector-location.conf;
}
```

Then reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Proxy Mode with mTLS

When using proxy mode with mTLS enabled, nginx handles client certificate verification.

### Nginx mTLS Configuration

Add to the server block (NOT inside location blocks):

```nginx
server {
    listen 443 ssl http2;
    server_name monitor.yourdomain.com;

    # ... existing SSL configuration ...

    # mTLS client certificate verification
    # Using 'optional' to allow mTLS only for /actvt endpoint
    ssl_client_certificate /etc/vector/certs/mtls/ca.crt;
    ssl_verify_client optional;
    ssl_verify_depth 2;

    # Actvt Vector WebSocket endpoint
    location /actvt {
        # Enforce mTLS ONLY for this location
        if ($ssl_client_verify != SUCCESS) {
            return 496; # SSL Certificate Required
        }

        # Proxy configuration...
        proxy_pass https://127.0.0.1:4096;

        # ... WebSocket headers ...

        # mTLS to upstream Vector
        proxy_ssl_certificate /etc/vector/certs/mtls/clients/actvt-client-001.crt;
        proxy_ssl_certificate_key /etc/vector/certs/mtls/clients/actvt-client-001.key;
    }
}
```

This configuration:
1. Verifies client certificates for the `/actvt` endpoint only
2. Uses nginx's client certificate to connect to Vector's backend
3. Allows other paths on the domain to work without client certificates

## Switching Between Modes

### From Standalone to Proxy

1. Install and configure nginx
2. Run the installation script with proxy mode:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_INSTALL_MODE="proxy"
export ACTVT_REUSE_CERT="yes"
curl -L https://actvt.io/install | bash
```

3. Update firewall to close port 4096:

```bash
# UFW
sudo ufw delete allow 4096/tcp

# firewalld
sudo firewall-cmd --permanent --remove-port=4096/tcp
sudo firewall-cmd --reload
```

4. Update Actvt connection URL to `wss://monitor.yourdomain.com/actvt`

### From Proxy to Standalone

1. Edit Vector configuration to bind to all interfaces:

```bash
sudo nano /etc/vector/vector.toml
```

Change:
```toml
address = "0.0.0.0:4096"  # Changed from 127.0.0.1:4096
```

2. Open port 4096 in firewall:

```bash
# UFW
sudo ufw allow 4096/tcp

# firewalld
sudo firewall-cmd --permanent --add-port=4096/tcp
sudo firewall-cmd --reload
```

3. Restart Vector:

```bash
sudo systemctl restart vector
```

4. Optionally remove nginx configuration:

```bash
sudo rm /etc/nginx/sites-enabled/actvt-vector
sudo systemctl reload nginx
```

5. Update Actvt connection URL to `wss://monitor.yourdomain.com:4096`

## Testing Your Mode

### Verify Vector Binding

Check which interface Vector is listening on:

```bash
# Should show 0.0.0.0:4096 (standalone) or 127.0.0.1:4096 (proxy)
sudo netstat -tlnp | grep 4096

# Or with ss:
sudo ss -tlnp | grep 4096
```

Expected output:

**Standalone Mode:**
```
tcp  0  0  0.0.0.0:4096  0.0.0.0:*  LISTEN  12345/vector
```

**Proxy Mode:**
```
tcp  0  0  127.0.0.1:4096  0.0.0.0:*  LISTEN  12345/vector
```

### Test WebSocket Connection

#### Standalone Mode

```bash
# Test direct connection to Vector
wscat -c wss://monitor.yourdomain.com:4096
```

#### Proxy Mode

```bash
# Test nginx proxy
wscat -c wss://monitor.yourdomain.com/actvt

# Health check endpoint
curl https://monitor.yourdomain.com/actvt/health
# Should return: OK
```

## Environment Variables Reference

Control installation mode with these variables:

| Variable | Values | Description |
|----------|--------|-------------|
| `ACTVT_INSTALL_MODE` | `auto`, `standalone`, `proxy` | Installation mode selection |
| `ACTVT_FORCE_STANDALONE` | `yes`, `no` | Force standalone even if nginx detected |
| `ACTVT_VECTOR_PORT` | Number (default: `4096`) | Vector WebSocket port |
| `ACTVT_NGINX_WEBROOT` | Path (default: `/var/www/html`) | Nginx webroot for certificate validation |

### Examples

**Force Standalone:**
```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_FORCE_STANDALONE="yes"
curl -L https://actvt.io/install | bash
```

**Proxy with Custom Port:**
```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_INSTALL_MODE="proxy"
export ACTVT_VECTOR_PORT="8096"
curl -L https://actvt.io/install | bash
```

**Custom Webroot for Let's Encrypt:**
```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_INSTALL_MODE="proxy"
export ACTVT_NGINX_WEBROOT="/var/www/mysite"
curl -L https://actvt.io/install | bash
```

## Troubleshooting

### "Port 4096 already in use"

Check what's using the port:

```bash
sudo lsof -i :4096
# Or
sudo ss -tlnp | grep 4096
```

Stop the conflicting service or choose a different port:

```bash
export ACTVT_VECTOR_PORT="8096"
```

### "Connection refused" in Standalone Mode

Check firewall:

```bash
# UFW
sudo ufw status | grep 4096

# firewalld
sudo firewall-cmd --list-ports | grep 4096

# Open port if needed
sudo ufw allow 4096/tcp
```

### "502 Bad Gateway" in Proxy Mode

Nginx can't reach Vector. Check:

1. Vector is running:
```bash
sudo systemctl status vector
```

2. Vector is listening on localhost:
```bash
sudo netstat -tlnp | grep 127.0.0.1:4096
```

3. Nginx configuration is correct:
```bash
sudo nginx -t
```

### Existing Nginx Server Block Conflict

If the script detects an existing server block for your domain, it creates a snippet file instead. You'll see:

```
⚠ An existing nginx server block for monitor.yourdomain.com was detected.
ℹ Created snippet at /etc/nginx/snippets/actvt-vector-location.conf
  Include it inside your existing server block, e.g.:
    include /etc/nginx/snippets/actvt-vector-location.conf;
ℹ Then reload nginx: systemctl reload nginx
```

Follow the instructions to manually include the snippet.

## Performance Considerations

### Standalone Mode
- **Pros**: Lower latency (no nginx hop), simpler stack
- **Cons**: More exposed ports, no nginx features (caching, rate limiting)

### Proxy Mode
- **Pros**: Fewer exposed ports, leverage nginx features, unified certificate management
- **Cons**: Slight additional latency (~1-2ms), additional component to manage

For most users, the performance difference is negligible (< 1% CPU usage difference).

## Security Comparison

| Security Feature | Standalone | Proxy |
|-----------------|------------|-------|
| TLS Encryption | ✅ | ✅ |
| mTLS Support | ✅ | ✅ |
| Port Exposure | 3 ports (80, 443, 4096) | 2 ports (80, 443) |
| IP Filtering | Via firewall | Via nginx + firewall |
| Rate Limiting | No | Via nginx |
| DDoS Protection | Firewall only | nginx + firewall |

Both modes are secure. Proxy mode provides slightly better defense-in-depth by keeping Vector unexposed.

## Next Steps

Once you understand installation modes:

1. **[Run Automated Installation](automated-install.md)** - Install with your preferred mode
2. **[Configure mTLS](mtls-security.md)** - Add client certificate authentication (optional)
3. **[Configure Firewall](#firewall-ports)** - Ensure correct ports are open
4. **[Test Connection](#testing-your-mode)** - Verify your installation works

Choose the mode that best fits your server setup and security requirements.
