---
sidebar_position: 6
---

# mTLS Security Configuration

Mutual TLS (mTLS) provides an additional layer of security by requiring clients to present valid certificates when connecting to your remote server. This ensures that only authorized Actvt clients can access your server's metrics.

:::tip Automated mTLS Setup
The easiest way to enable mTLS is during automated installation:
```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_ENABLE_MTLS=yes
curl -L https://actvt.io/install | bash
```
:::

## What is mTLS?

Standard TLS (used in HTTPS) authenticates the server to the client. With mTLS, both parties authenticate each other:

- **Server → Client**: Server presents its TLS certificate (from Let's Encrypt)
- **Client → Server**: Client presents its own certificate (signed by your CA)

This prevents unauthorized clients from connecting, even if they know your server's domain name.

## When to Use mTLS

### Use mTLS When:
- ✅ Monitoring production or sensitive servers
- ✅ You want to restrict access to specific clients
- ✅ Compliance requires mutual authentication
- ✅ Multiple team members need separate certificates
- ✅ You want certificate-based revocation capability

### Regular TLS is Sufficient When:
- Development or testing environments
- Single-user personal projects
- Server is behind additional access controls (VPN, IP whitelist)

## Automated mTLS Setup

### Environment Variables

The installation script supports these mTLS-related variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ACTVT_ENABLE_MTLS` | Enable mTLS client certificate verification | `no` | No |
| `ACTVT_MTLS_CA_DAYS` | CA certificate validity in days | `3650` (10 years) | No |
| `ACTVT_MTLS_CLIENT_DAYS` | Client certificate validity in days | `365` (1 year) | No |
| `ACTVT_MTLS_CLIENT_CN` | Client certificate common name | `actvt-client-001` | No |
| `ACTVT_REUSE_MTLS_CA` | Reuse existing mTLS CA certificate | `yes` | No |
| `ACTVT_REGEN_CLIENT_CERT` | Regenerate client certificate | `no` | No |

### Basic mTLS Installation

Install with mTLS enabled using default settings:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_ENABLE_MTLS=yes
curl -L https://actvt.io/install | bash
```

### Custom Certificate Validity

Configure custom expiration periods:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_ENABLE_MTLS=yes
export ACTVT_MTLS_CA_DAYS=7300          # CA valid for 20 years
export ACTVT_MTLS_CLIENT_DAYS=730       # Client cert valid for 2 years
curl -L https://actvt.io/install | bash
```

### What the Script Creates

When mTLS is enabled, the installation script creates:

1. **CA Certificate Authority** (`/etc/vector/certs/mtls/`)
   - `ca.crt` - CA certificate (public, 644 permissions)
   - `ca.key` - CA private key (private, 600 permissions)

2. **Client Certificate** (`/etc/vector/certs/mtls/clients/`)
   - `actvt-client-001.crt` - Client certificate
   - `actvt-client-001.key` - Client private key

3. **Client Bundle** (`/etc/vector/certs/mtls/`)
   - `actvt-client-001-bundle.tar.gz` - Ready-to-distribute bundle

4. **Certificate Generator Script**
   - `/etc/vector/certs/mtls/generate-client.sh` - Script to create additional client certificates

## Manual mTLS Setup

If you've already installed without mTLS, you can add it manually.

### Step 1: Generate CA Certificate

Create a Certificate Authority for signing client certificates:

```bash
# Create mTLS directory structure
sudo mkdir -p /etc/vector/certs/mtls/clients
sudo chmod 755 /etc/vector/certs/mtls
sudo chmod 755 /etc/vector/certs/mtls/clients

# Generate CA private key (4096-bit PKCS#8 format)
sudo openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 \
  -out /etc/vector/certs/mtls/ca.key

# Create self-signed CA certificate (valid 10 years)
sudo openssl req -new -x509 -sha256 -days 3650 \
  -key /etc/vector/certs/mtls/ca.key \
  -out /etc/vector/certs/mtls/ca.crt \
  -subj "/CN=Actvt-CA/O=Actvt/C=US"

# Set proper permissions
sudo chmod 644 /etc/vector/certs/mtls/ca.crt
sudo chmod 600 /etc/vector/certs/mtls/ca.key
sudo chown -R vector:vector /etc/vector/certs/mtls
```

### Step 2: Generate Client Certificate

Create a client certificate signed by your CA:

```bash
# Generate client private key (2048-bit PKCS#8 format)
sudo openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
  -out /etc/vector/certs/mtls/clients/actvt-client-001.key

# Create Certificate Signing Request (CSR)
sudo openssl req -new \
  -key /etc/vector/certs/mtls/clients/actvt-client-001.key \
  -out /etc/vector/certs/mtls/clients/actvt-client-001.csr \
  -subj "/CN=actvt-client-001/O=Actvt"

# Sign the client certificate with CA (valid 1 year)
sudo openssl x509 -req -days 365 -sha256 \
  -in /etc/vector/certs/mtls/clients/actvt-client-001.csr \
  -CA /etc/vector/certs/mtls/ca.crt \
  -CAkey /etc/vector/certs/mtls/ca.key \
  -CAcreateserial \
  -out /etc/vector/certs/mtls/clients/actvt-client-001.crt \
  -extfile <(printf "basicConstraints=CA:FALSE\nextendedKeyUsage=clientAuth")

# Set proper permissions
sudo chmod 644 /etc/vector/certs/mtls/clients/actvt-client-001.crt
sudo chmod 600 /etc/vector/certs/mtls/clients/actvt-client-001.key
sudo chown -R vector:vector /etc/vector/certs/mtls

# Clean up CSR
sudo rm /etc/vector/certs/mtls/clients/actvt-client-001.csr
```

### Step 3: Configure Vector for mTLS

Edit your Vector configuration to enable client certificate verification:

```bash
sudo nano /etc/vector/vector.toml
```

Add the `ca_file` and `verify_certificate` lines to the TLS section:

```toml
[sinks.websocket_out.tls]
enabled  = true
crt_file = "/etc/vector/certs/server.crt"
key_file = "/etc/vector/certs/server.key"
ca_file  = "/etc/vector/certs/mtls/ca.crt"
verify_certificate = true
```

### Step 4: Configure Nginx for mTLS (Proxy Mode Only)

If you're using nginx in proxy mode, update the nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/actvt-vector
```

Add these lines to the `server` block (NOT inside `location` blocks):

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

        # ... existing proxy configuration ...

        # mTLS to upstream Vector
        proxy_ssl_certificate /etc/vector/certs/mtls/clients/actvt-client-001.crt;
        proxy_ssl_certificate_key /etc/vector/certs/mtls/clients/actvt-client-001.key;
    }
}
```

Test and reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Restart Vector

Apply the configuration changes:

```bash
# Validate Vector configuration
sudo vector validate /etc/vector/vector.toml

# Restart Vector service
sudo systemctl restart vector

# Verify service is running
sudo systemctl status vector
```

## Distributing Client Certificates

### Create Client Bundle

Package the client certificate for distribution:

```bash
cd /etc/vector/certs/mtls
sudo tar -czf actvt-client-001-bundle.tar.gz \
  clients/actvt-client-001.crt \
  clients/actvt-client-001.key
sudo chmod 644 actvt-client-001-bundle.tar.gz
```

### Download to Your Mac

From your Mac, download the client certificate bundle:

```bash
# If you get permission denied, run this on the server first:
sudo chmod 644 /etc/vector/certs/mtls/actvt-client-001-bundle.tar.gz

# Then download from your Mac:
scp username@monitor.yourdomain.com:/etc/vector/certs/mtls/actvt-client-001-bundle.tar.gz ~/Downloads/
```

### Extract the Bundle

On your Mac, extract the client certificates:

```bash
cd ~/Downloads
tar -xzf actvt-client-001-bundle.tar.gz

# You'll now have:
# - clients/actvt-client-001.crt
# - clients/actvt-client-001.key
```

### Configure Actvt

In the Actvt application:

1. Go to **Settings → Remote Servers**
2. Click **Add Server**
3. Enter the WebSocket URL:
   - Standalone: `wss://monitor.yourdomain.com:4096`
   - Proxy: `wss://monitor.yourdomain.com/actvt`
4. Enable **Client Certificate**
5. Select the `.crt` and `.key` files you extracted
6. Click **Connect**

## Managing Multiple Clients

### Generate Additional Client Certificates

The installation script creates a helper script for generating new client certificates:

```bash
# Generate a new client certificate
sudo /etc/vector/certs/mtls/generate-client.sh actvt-client-002

# The script will create:
# - clients/actvt-client-002.crt
# - clients/actvt-client-002.key
# - actvt-client-002-bundle.tar.gz
```

Example output:

```
Generating client certificate: actvt-client-002
Certificate validity: 365 days

→ Generating client private key (PKCS#8)...
→ Creating certificate signing request...
→ Signing certificate with CA...
→ Creating distribution bundle...

✓ Client certificate generated successfully
✓ Certificate: /etc/vector/certs/mtls/clients/actvt-client-002.crt
✓ Private key: /etc/vector/certs/mtls/clients/actvt-client-002.key
✓ Bundle: /etc/vector/certs/mtls/actvt-client-002-bundle.tar.gz
```

### List All Client Certificates

```bash
# View all client certificates
ls -la /etc/vector/certs/mtls/clients/

# Check certificate details
sudo openssl x509 -in /etc/vector/certs/mtls/clients/actvt-client-001.crt \
  -noout -subject -dates -issuer
```

## Certificate Management

### Check Certificate Expiration

```bash
# Check CA certificate expiration
sudo openssl x509 -in /etc/vector/certs/mtls/ca.crt -noout -enddate

# Check client certificate expiration
sudo openssl x509 -in /etc/vector/certs/mtls/clients/actvt-client-001.crt -noout -enddate
```

### Renew Client Certificate

When a client certificate is near expiration, regenerate it:

```bash
# Regenerate with the same name (will prompt for confirmation)
sudo /etc/vector/certs/mtls/generate-client.sh actvt-client-001
```

### Revoke Client Certificate

To revoke a client certificate, simply delete it:

```bash
# Remove client certificate
sudo rm /etc/vector/certs/mtls/clients/actvt-client-003.crt
sudo rm /etc/vector/certs/mtls/clients/actvt-client-003.key
sudo rm /etc/vector/certs/mtls/actvt-client-003-bundle.tar.gz
```

No restart is required. The client will be denied on next connection attempt.

## Testing mTLS Connection

### Using wscat

Test the mTLS connection from your Mac:

```bash
# Install wscat if not already installed
npm install -g wscat

# Test connection with client certificate
# Standalone mode:
wscat -c wss://monitor.yourdomain.com:4096 \
  --cert clients/actvt-client-001.crt \
  --key clients/actvt-client-001.key

# Proxy mode:
wscat -c wss://monitor.yourdomain.com/actvt \
  --cert clients/actvt-client-001.crt \
  --key clients/actvt-client-001.key
```

You should see metrics streaming. Press Ctrl+C to disconnect.

### Test Without Certificate (Should Fail)

```bash
# This should be rejected:
wscat -c wss://monitor.yourdomain.com:4096
# Expected: Connection closed with error
```

### Using curl

```bash
# Test with client certificate
curl --cert clients/actvt-client-001.crt \
     --key clients/actvt-client-001.key \
     -I https://monitor.yourdomain.com:4096

# Test without certificate (should fail)
curl -I https://monitor.yourdomain.com:4096
```

## Security Best Practices

### Certificate Storage
- ✅ Store client certificates in a secure location (encrypted disk, password manager)
- ✅ Use separate certificates for each team member or device
- ✅ Regularly audit active certificates
- ❌ Never commit certificates to version control
- ❌ Never share the CA private key (`ca.key`)

### Certificate Rotation
- Rotate client certificates every 1-2 years
- Rotate CA certificate before expiration (well in advance)
- Keep CA certificate validity long (10+ years) to avoid frequent rotation

### Access Control
- Generate unique certificates for each user or device
- Revoke certificates immediately when access should be removed
- Monitor Vector logs for connection attempts
- Consider using shorter validity periods (90 days) for high-security environments

### Backup
```bash
# Backup mTLS certificates and keys
sudo tar -czf ~/mtls-backup-$(date +%Y%m%d).tar.gz \
  /etc/vector/certs/mtls/

# Store backup in a secure location
```

## Troubleshooting

### "Certificate verification failed"

Check that client certificate was signed by the correct CA:

```bash
# Verify client certificate chain
sudo openssl verify -CAfile /etc/vector/certs/mtls/ca.crt \
  /etc/vector/certs/mtls/clients/actvt-client-001.crt
# Should output: OK
```

### "Permission denied" reading certificates

Check file permissions:

```bash
ls -la /etc/vector/certs/mtls/
ls -la /etc/vector/certs/mtls/clients/

# Fix permissions if needed
sudo chown -R vector:vector /etc/vector/certs/mtls
sudo chmod 644 /etc/vector/certs/mtls/ca.crt
sudo chmod 600 /etc/vector/certs/mtls/ca.key
sudo chmod 644 /etc/vector/certs/mtls/clients/*.crt
sudo chmod 600 /etc/vector/certs/mtls/clients/*.key
```

### Vector won't start after enabling mTLS

Check Vector configuration syntax:

```bash
# Validate configuration
sudo vector validate /etc/vector/vector.toml

# Check Vector logs
sudo journalctl -u vector -n 50
```

### Nginx returns 496 (SSL Certificate Required)

This is expected when connecting without a client certificate. If it happens with a certificate:

```bash
# Check nginx configuration
sudo nginx -t

# Verify nginx can read the CA certificate
sudo -u www-data cat /etc/vector/certs/mtls/ca.crt

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Client certificate has expired

Regenerate the client certificate:

```bash
sudo /etc/vector/certs/mtls/generate-client.sh actvt-client-001
# Confirm overwrite: Y
```

Then redistribute the new bundle to the client.

## Disabling mTLS

To remove mTLS and return to regular TLS:

### Step 1: Update Vector Configuration

```bash
sudo nano /etc/vector/vector.toml
```

Remove or comment out the mTLS lines:

```toml
[sinks.websocket_out.tls]
enabled  = true
crt_file = "/etc/vector/certs/server.crt"
key_file = "/etc/vector/certs/server.key"
# ca_file  = "/etc/vector/certs/mtls/ca.crt"
# verify_certificate = true
```

### Step 2: Update Nginx (Proxy Mode Only)

```bash
sudo nano /etc/nginx/sites-available/actvt-vector
```

Remove the mTLS configuration:

```nginx
# Remove or comment out these lines:
# ssl_client_certificate /etc/vector/certs/mtls/ca.crt;
# ssl_verify_client optional;
# ssl_verify_depth 2;

# And in location /actvt:
# if ($ssl_client_verify != SUCCESS) {
#     return 496;
# }
# proxy_ssl_certificate /etc/vector/certs/mtls/clients/actvt-client-001.crt;
# proxy_ssl_certificate_key /etc/vector/certs/mtls/clients/actvt-client-001.key;
```

### Step 3: Restart Services

```bash
# Test and restart nginx (if using proxy mode)
sudo nginx -t
sudo systemctl reload nginx

# Restart Vector
sudo systemctl restart vector
```

## Next Steps

Once mTLS is configured:

1. **[Test Your Connection](troubleshooting.md#testing-mtls-connections)** - Verify mTLS is working
2. **[Connect from Actvt](../getting-started/quick-start.md)** - Add your server with client certificates
3. **[Generate Additional Certificates](#managing-multiple-clients)** - Create certificates for team members

Your Vector WebSocket server now requires client certificate authentication for enhanced security.
