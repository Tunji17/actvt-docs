---
sidebar_position: 4
---

# TLS Configuration for Vector

Vector's WebSocket server requires TLS certificates to establish secure connections with Actvt. This guide shows you how to set up free SSL certificates using Let's Encrypt specifically for Vector's WebSocket server.

## Prerequisites

Before setting up TLS certificates, ensure you have:

- ✅ **Domain name** pointing to your server's public IP address
- ✅ **DNS A record** configured (e.g., `monitor.yourdomain.com` → `your.server.ip`)
- ✅ **Ports 80 and 443** temporarily accessible for certificate validation
- ✅ **Vector installed** and configured (see [Vector Setup Guide](vector-setup.md))

## Step 1: Install Certbot

Certbot is Let's Encrypt's official client for obtaining SSL certificates:

```bash
# Update package list
sudo apt update

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

Use Certbot's standalone mode to obtain a certificate. Replace `monitor.yourdomain.com` with your actual domain:

```bash
# Stop Vector temporarily to free port 80
pkill -f "vector --config /etc/vector/vector.toml"

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

# Set proper permissions
sudo chown -R $USER:$USER /etc/vector/certs
chmod 600 /etc/vector/certs/server.key
chmod 644 /etc/vector/certs/server.crt

# Verify files are in place
ls -la /etc/vector/certs/
```

You should see:
```
-rw-r--r-- 1 ubuntu ubuntu 3849 Jan 15 10:30 server.crt
-rw------- 1 ubuntu ubuntu 1704 Jan 15 10:30 server.key
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

## Step 5: Start Vector with TLS

Restart Vector to apply the TLS configuration:

```bash
# Start Vector with TLS enabled
nohup vector --config /etc/vector/vector.toml > /var/log/vector/stdout.log 2>&1 &
disown

# Verify Vector is running
ps aux | grep vector

# Check logs for TLS initialization
tail -f /var/log/vector/stdout.log
```

Look for log messages indicating successful TLS setup:
```
INFO vector::api: Building API server. address=127.0.0.1:8686
INFO vector::sinks::websocket::server: Starting websocket server. address=0.0.0.0:4096
INFO vector::tls: TLS certificate loaded successfully
```

## Step 6: Set Up Auto-Renewal

Let's Encrypt certificates expire every 90 days. Set up automatic renewal:

```bash
# Create renewal script
sudo nano /etc/vector/renew-certs.sh
```

Add this content:

```bash
#!/bin/bash

# Renew certificates
certbot renew --quiet

# Copy renewed certificates to Vector directory
cp /etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem /etc/vector/certs/server.crt
cp /etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem /etc/vector/certs/server.key

# Set permissions
chown -R $USER:$USER /etc/vector/certs
chmod 600 /etc/vector/certs/server.key
chmod 644 /etc/vector/certs/server.crt

# Restart Vector to load new certificates
pkill -f "vector --config /etc/vector/vector.toml"
sleep 2
nohup vector --config /etc/vector/vector.toml > /var/log/vector/stdout.log 2>&1 &
disown

echo "Certificates renewed and Vector restarted: $(date)" >> /var/log/vector/cert-renewal.log
```

Make the script executable and add to crontab:

```bash
# Make script executable
sudo chmod +x /etc/vector/renew-certs.sh

# Add to crontab (runs daily at 2 AM)
echo "0 2 * * * /etc/vector/renew-certs.sh" | sudo crontab -

# Verify cron job was added
sudo crontab -l
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
wscat -c wss://monitor.yourdomain.com:4096
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
pkill -f "vector --config /etc/vector/vector.toml"
nohup vector --config /etc/vector/vector.toml > /var/log/vector/stdout.log 2>&1 &
disown

# Check certificate expiration
openssl x509 -in /etc/vector/certs/server.crt -noout -dates

# Test WebSocket connection
wscat -c wss://monitor.yourdomain.com:4096
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