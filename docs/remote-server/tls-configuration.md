---
sidebar_position: 5
---

# TLS Configuration for Vector

Vector's WebSocket server requires TLS certificates to establish secure connections with Actvt. This guide shows you how to set up free SSL certificates using Let's Encrypt specifically for Vector's WebSocket server.

:::tip Automated Installation Available
This guide covers manual TLS setup. For automatic certificate installation, use our [automated installation script](automated-install.md):
```bash
curl -L https://actvt.io/install | bash
```
:::

## Prerequisites

Before setting up TLS certificates, ensure you have:

- ✅ **Domain name** pointing to your server's public IP address
- ✅ **DNS A record** configured (e.g., `monitor.yourdomain.com` → `your.server.ip`)
- ✅ **Ports 80 and 443** temporarily accessible for certificate validation
- ✅ **Vector installed** and configured (see [Vector Setup Guide](vector-setup.md))

## Step 1: Install Certbot

Certbot is Let's Encrypt's official client for obtaining SSL certificates:

```bash
# Install Certbot
sudo apt install certbot -y

# Verify installation
certbot --version
```

You should see output like:
```
certbot 1.21.0
```

## Step 2: Obtain Let's Encrypt Certificate

Use Certbot's standalone mode to obtain a certificate:

> **⚠️ Note:** Replace `monitor.yourdomain.com` with your actual domain in all commands throughout this guide.

```bash
# Obtain certificate using standalone mode
sudo certbot certonly --standalone -d monitor.yourdomain.com

# Follow the prompts:
# - Enter your email address for renewal notifications
# - Agree to Terms of Service (type 'Y')
# - Choose whether to share email with EFF (optional)
```

If successful, you'll see:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem
```

## Step 3: Prepare Certificates for Vector

Vector needs the certificates in its own directory with proper permissions:

```bash
# Create Vector certificates directory
sudo mkdir -p /etc/vector/certs

# Copy certificates to Vector directory
sudo cp /etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem /etc/vector/certs/server.crt
sudo cp /etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem /etc/vector/certs/server.key

# Set proper permissions (owned by vector user)
sudo chown -R vector:vector /etc/vector/certs
sudo chmod 640 /etc/vector/certs/server.key
sudo chmod 644 /etc/vector/certs/server.crt

# Verify files are in place
ls -la /etc/vector/certs/
```

You should see:
```
-rw-r--r-- 1 vector vector 3849 Jan 15 10:30 server.crt
-rw-r----- 1 vector vector 1704 Jan 15 10:30 server.key
```

## Step 4: Configure Vector for TLS

Your `vector.toml` configuration already includes TLS settings. Verify they point to the correct certificate files:

```bash
# Check TLS configuration in vector.toml
grep -A 5 "\[sinks.websocket_out.tls\]" /etc/vector/vector.toml
```

You should see:
```toml
[sinks.websocket_out.tls]
enabled  = true
crt_file = "/etc/vector/certs/server.crt"
key_file = "/etc/vector/certs/server.key"
```

If the paths are different, update them:

```bash
# Edit Vector configuration
sudo nano /etc/vector/vector.toml
```

## Step 5: Validate Vector with TLS

Validate Vector configuration without any errors:

```bash
# Validate configuration file
vector validate /etc/vector/vector.toml
```

You should see:
```
✓ Validated
```

Head back to the [Vector Setup Guide](vector-setup.md) to run Vector and ensure it starts correctly with TLS enabled.

echo "Certificates renewed and Vector restarted: $(date)" >> /var/log/vector/cert-renewal.log
## Step 6: Set Up Auto-Renewal

Let's Encrypt certificates expire every 90 days. We recommend using a Certbot deploy hook to copy renewed certificates and reload Vector automatically:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/actvt-vector.sh >/dev/null 
#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${RENEWED_LINEAGE##*/}"
SRC="/etc/letsencrypt/live/${DOMAIN}"
DST="/etc/vector/certs"

install -d -o vector -g vector -m 750 "${DST}"
install -o vector -g vector -m 644 "${SRC}/fullchain.pem" "${DST}/server.crt"
install -o vector -g vector -m 640 "${SRC}/privkey.pem" "${DST}/server.key"

systemctl reload vector 2>/dev/null || systemctl restart vector || true
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/actvt-vector.sh
```

## Step 7: Test Renewal Process

Test the renewal process manually:

```bash
# Test certificate renewal (dry run)
sudo certbot renew --dry-run

# If successful, test the actual renewal script
sudo /etc/vector/renew-certs.sh

# Check renewal log
tail /var/log/vector/cert-renewal.log
```

## Verification

### Check Certificate Validity

Verify your certificates are properly configured:

```bash
# Check certificate details
openssl x509 -in /etc/vector/certs/server.crt -text -noout | grep -E "(Subject:|DNS:|Not After)"

# Test WebSocket TLS connection (install wscat if needed)
# npm install -g wscat
# Standalone mode
wscat -c wss://monitor.yourdomain.com:4096
# Proxy mode (via nginx)
wscat -c wss://monitor.yourdomain.com/actvt
```

### Check Vector Logs

Monitor Vector logs to confirm TLS is working:

```bash
# Check for TLS-related messages
tail -n 50 /var/log/vector/stdout.log | grep -i tls

# Monitor real-time logs
tail -f /var/log/vector/stdout.log
```

### Test from Actvt

In the Actvt application:
1. Go to Settings → Remote Servers
2. Add your server: `wss://monitor.yourdomain.com:4096`
3. The connection should establish successfully

## Quick Reference

### Certificate Locations
```bash
# Let's Encrypt original certificates
/etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem
/etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem

# Vector certificate copies
/etc/vector/certs/server.crt
/etc/vector/certs/server.key
```

### Common Commands
```bash
# Manual certificate renewal
sudo certbot renew

# Restart Vector
sudo systemctl restart vector

# Check certificate expiration
openssl x509 -in /etc/vector/certs/server.crt -noout -dates

# Test WebSocket connection
# Standalone mode
wscat -c wss://monitor.yourdomain.com:4096
# Proxy mode (via nginx)
wscat -c wss://monitor.yourdomain.com/actvt
```

## Troubleshooting

**"Certificate verification failed"**
```bash
# Check certificate files exist and have correct permissions
ls -la /etc/vector/certs/
openssl x509 -in /etc/vector/certs/server.crt -text -noout
```

**"Port 80 already in use" during certificate generation**
```bash
# Stop services using port 80
sudo systemctl stop apache2 nginx
# Or stop Vector if it's somehow using port 80
pkill -f vector
```

**"Domain validation failed"**
```bash
# Verify DNS is correctly configured
dig monitor.yourdomain.com
nslookup monitor.yourdomain.com

# Check firewall allows port 80
sudo ufw status
```

**Vector won't start with TLS**
```bash
# Check Vector configuration syntax
vector validate /etc/vector/vector.toml

# Verify certificate files are readable
sudo -u $USER cat /etc/vector/certs/server.crt
sudo -u $USER cat /etc/vector/certs/server.key
```

## Next Steps

Once TLS is configured and working:

1. **Configure Firewall** - Set up firewall rules based on your provider (see [Provider Guides](provider-guides/overview))
2. **[Test Connection](troubleshooting.md#testing-websocket-connection)** - Verify everything works end-to-end
3. **[Connect from Actvt](../getting-started/quick-start.md)** - Add your server to Actvt

Your Vector WebSocket server now has secure TLS encryption and will automatically renew certificates before they expire.