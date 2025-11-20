---
sidebar_position: 8
---

# State Management

The Actvt installation creates several state files, backups, and logs to track installation history and maintain configuration. This guide explains what gets created and how to manage it.

## Directory Structure

After installation, these directories are created:

```
/var/lib/actvt/              # Main state directory
├── install.state            # Installation metadata
├── domain                   # Configured domain name
└── backups/                 # Configuration backups
    ├── vector.toml.backup.XXXXXX
    ├── mtls-ca.crt.backup.XXXXXX
    └── actvt-vector.nginx.backup.XXXXXX

/var/log/
└── actvt-install.log        # Detailed installation log

/etc/vector/
├── vector.toml              # Vector configuration
├── certs/                   # TLS certificates
│   ├── server.crt
│   ├── server.key
│   └── mtls/                # mTLS certificates (if enabled)
│       ├── ca.crt
│       ├── ca.key
│       ├── clients/
│       │   ├── actvt-client-001.crt
│       │   └── actvt-client-001.key
│       ├── actvt-client-001-bundle.tar.gz
│       └── generate-client.sh

/etc/letsencrypt/
├── live/                    # Current certificates
│   └── yourdomain.com/
│       ├── fullchain.pem
│       └── privkey.pem
└── renewal-hooks/           # Auto-renewal hooks
    └── deploy/
        └── actvt-vector.sh

/etc/systemd/system/
└── vector.service.d/
    └── override.conf        # Vector service override
```

## State Files

### `/var/lib/actvt/install.state`

Contains installation metadata for tracking configuration and troubleshooting.

**Format:**
```bash
version=1.0.0
installed_at=2024-01-15T10:30:00Z
mode=proxy
webserver=nginx
mtls=enabled
mtls_client_cn=actvt-client-001
```

**Fields:**
- `version`: Installation script version used
- `installed_at`: ISO 8601 timestamp of installation
- `mode`: Installation mode (`standalone` or `proxy`)
- `webserver`: Detected web server (`none`, `nginx`, `apache`, `httpd`)
- `mtls`: Whether mTLS is enabled (`enabled` or `disabled`)
- `mtls_client_cn`: Name of the initial client certificate (if mTLS enabled)

**Usage:**
```bash
# View installation state
cat /var/lib/actvt/install.state

# Check if mTLS is enabled
grep "mtls=enabled" /var/lib/actvt/install.state
```

### `/var/lib/actvt/domain`

Stores the configured domain name. Used by Vector configuration and renewal scripts.

**Content:**
```
monitor.yourdomain.com
```

**Usage:**
```bash
# View configured domain
cat /var/lib/actvt/domain

# Use in scripts
DOMAIN=$(cat /var/lib/actvt/domain)
echo "Server domain: $DOMAIN"
```

## Backup Files

The installation script automatically backs up existing configuration files before making changes.

### Backup Location

All backups are stored in `/var/lib/actvt/backups/` with timestamped filenames:

```bash
# List all backups
ls -lh /var/lib/actvt/backups/

# Example output:
-rw-r--r-- 1 root root 5.2K Jan 15 10:30 vector.toml.backup.abc123
-rw-r--r-- 1 root root 1.8K Jan 15 10:32 mtls-ca.crt.backup.def456
-rw-r--r-- 1 root root  952 Jan 15 10:33 actvt-vector.nginx.backup.ghi789
```

### Backed Up Files

#### Vector Configuration
```bash
/var/lib/actvt/backups/vector.toml.backup.*
```

Created when:
- Vector configuration already exists
- Running installation script again

**Restore:**
```bash
# Find the backup
ls -lt /var/lib/actvt/backups/vector.toml.backup.* | head -1

# Restore (replace XXXXXX with actual timestamp)
sudo cp /var/lib/actvt/backups/vector.toml.backup.XXXXXX /etc/vector/vector.toml
sudo systemctl restart vector
```

#### mTLS CA Certificates
```bash
/var/lib/actvt/backups/mtls-ca.crt.backup.*
/var/lib/actvt/backups/mtls-ca.key.backup.*
```

Created when:
- Regenerating mTLS CA certificates
- User chooses not to reuse existing CA

**Restore:**
```bash
# Restore CA certificate
sudo cp /var/lib/actvt/backups/mtls-ca.crt.backup.XXXXXX /etc/vector/certs/mtls/ca.crt
sudo cp /var/lib/actvt/backups/mtls-ca.key.backup.XXXXXX /etc/vector/certs/mtls/ca.key
sudo chown vector:vector /etc/vector/certs/mtls/ca.*
sudo chmod 644 /etc/vector/certs/mtls/ca.crt
sudo chmod 600 /etc/vector/certs/mtls/ca.key
```

#### Nginx Configuration
```bash
/var/lib/actvt/backups/actvt-vector.nginx.backup.*
```

Created when:
- Nginx configuration already exists
- Reinstalling in proxy mode

**Restore:**
```bash
# Restore nginx config
sudo cp /var/lib/actvt/backups/actvt-vector.nginx.backup.XXXXXX \
  /etc/nginx/sites-available/actvt-vector
sudo nginx -t
sudo systemctl reload nginx
```

### Backup Management

#### View Backups

```bash
# List all backups sorted by date (newest first)
ls -lt /var/lib/actvt/backups/

# Find backups older than 30 days
find /var/lib/actvt/backups/ -name "*.backup.*" -mtime +30
```

#### Clean Old Backups

```bash
# Remove backups older than 90 days
sudo find /var/lib/actvt/backups/ -name "*.backup.*" -mtime +90 -delete

# Or remove all backups (use with caution)
sudo rm /var/lib/actvt/backups/*.backup.*
```

#### Create Manual Backup

Before making manual changes:

```bash
# Backup current configuration
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
sudo cp /etc/vector/vector.toml \
  /var/lib/actvt/backups/vector.toml.manual.$TIMESTAMP
```

## Logs

### Installation Log

Location: `/var/log/actvt-install.log`

**Contains:**
- Complete installation output
- Command executions
- Error messages
- Package manager output

**Usage:**
```bash
# View full log
sudo less /var/log/actvt-install.log

# View recent entries
sudo tail -n 100 /var/log/actvt-install.log

# Search for errors
sudo grep -i error /var/log/actvt-install.log

# Search for warnings
sudo grep -i warning /var/log/actvt-install.log
```

**Log Format:**
```
[2024-01-15 10:30:15] [INFO] Starting Actvt installation (version 1.0.0)
[2024-01-15 10:30:16] [INFO] Detected: Ubuntu 22.04.3 LTS
[2024-01-15 10:30:17] [INFO] Package manager: apt-get
[2024-01-15 10:30:25] [SUCCESS] Vector installation complete
[2024-01-15 10:31:10] [WARNING] GPU not detected
[2024-01-15 10:32:45] [SUCCESS] Installation completed successfully
```

### Vector Logs

```bash
# View Vector service logs
sudo journalctl -u vector -f

# View last 50 lines
sudo journalctl -u vector -n 50

# View logs since boot
sudo journalctl -u vector -b

# View logs for specific date
sudo journalctl -u vector --since "2024-01-15"
```

## Security Considerations

### File Permissions

The installation script sets appropriate permissions for security:

```bash
# State directory (root only)
/var/lib/actvt/              # 700 (drwx------)
/var/lib/actvt/backups/      # 700 (drwx------)

# Certificates (vector user)
/etc/vector/certs/           # 755 (drwxr-xr-x)
/etc/vector/certs/server.crt # 644 (-rw-r--r--)
/etc/vector/certs/server.key # 600 (-rw-------)

# mTLS certificates
/etc/vector/certs/mtls/      # 755 (drwxr-xr-x)
/etc/vector/certs/mtls/ca.crt # 644 (-rw-r--r--)
/etc/vector/certs/mtls/ca.key # 600 (-rw-------)

# Logs
/var/log/actvt-install.log   # 644 (-rw-r--r--)
```

### Sensitive Information

These files contain sensitive data and should be protected:

- `/etc/vector/certs/server.key` - TLS private key
- `/etc/vector/certs/mtls/ca.key` - CA private key
- `/etc/vector/certs/mtls/clients/*.key` - Client private keys
- `/var/lib/actvt/backups/*.key.backup.*` - Backup private keys

**Never:**
- Share these files publicly
- Commit to version control
- Send via unencrypted channels
- Store in web-accessible directories

**Security Audit:**
```bash
# Check for world-readable private keys (should return nothing)
sudo find /etc/vector/certs -name "*.key" -perm -004

# Fix permissions if needed
sudo find /etc/vector/certs -name "*.key" -exec chmod 600 {} \;
sudo find /etc/vector/certs -name "*.key" -exec chown vector:vector {} \;
```

## Maintenance Tasks

### Disk Space Management

Monitor disk space used by state files:

```bash
# Check state directory size
sudo du -sh /var/lib/actvt
sudo du -sh /var/lib/actvt/backups

# Check certificate directory
sudo du -sh /etc/vector/certs

# Check logs
sudo du -sh /var/log/actvt-install.log
```

### Cleaning Up

```bash
# Remove old backups (older than 6 months)
sudo find /var/lib/actvt/backups -mtime +180 -delete

# Rotate installation log if it's large (>10MB)
if [ $(stat -f%z /var/log/actvt-install.log 2>/dev/null || stat -c%s /var/log/actvt-install.log) -gt 10485760 ]; then
    sudo mv /var/log/actvt-install.log /var/log/actvt-install.log.old
    sudo touch /var/log/actvt-install.log
fi
```

### Backup Best Practices

**Create Complete Backup:**

```bash
# Create timestamped backup of all Actvt configuration
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
sudo tar -czf ~/actvt-backup-$BACKUP_DATE.tar.gz \
  /var/lib/actvt \
  /etc/vector/vector.toml \
  /etc/vector/certs \
  /var/log/actvt-install.log

# List contents
tar -tzf ~/actvt-backup-$BACKUP_DATE.tar.gz

# Download to your local machine
scp username@server:~/actvt-backup-$BACKUP_DATE.tar.gz ~/Downloads/
```

**Restore from Backup:**

```bash
# Extract backup
sudo tar -xzf ~/actvt-backup-20240115-103000.tar.gz -C /

# Verify permissions
sudo chown -R vector:vector /etc/vector
sudo chmod 600 /etc/vector/certs/*.key
sudo chmod 644 /etc/vector/certs/*.crt

# Restart Vector
sudo systemctl restart vector
```

## Troubleshooting

### "Permission denied" accessing state files

State files are owned by root. Use sudo:

```bash
# Wrong
cat /var/lib/actvt/install.state
# permission denied

# Correct
sudo cat /var/lib/actvt/install.state
```

### Missing state directory

If `/var/lib/actvt` doesn't exist, the installation may have failed:

```bash
# Recreate state directory
sudo mkdir -p /var/lib/actvt/backups
sudo chmod 700 /var/lib/actvt
sudo chmod 700 /var/lib/actvt/backups
```

### Lost installation log

If the log is missing, check:

```bash
# Check if it was moved
ls -l /var/log/actvt-install.log*

# Check /tmp (fallback location)
ls -l /tmp/actvt-install.log
```

### Backup files taking up space

Clean old backups safely:

```bash
# Check backup space
sudo du -sh /var/lib/actvt/backups/*

# Remove backups older than 1 year
sudo find /var/lib/actvt/backups -name "*.backup.*" -mtime +365 -delete
```

## Reinstallation and State

### Fresh Installation

To completely start over:

```bash
# Stop Vector
sudo systemctl stop vector

# Remove all state (WARNING: This deletes everything!)
sudo rm -rf /var/lib/actvt
sudo rm -rf /etc/vector
sudo rm -f /var/log/actvt-install.log

# Run installation again
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
curl -L https://actvt.io/install | bash
```

### Preserving State During Reinstall

The installation script preserves state by default:

- Existing certificates are reused (unless you specify otherwise)
- Configuration is backed up before changes
- Domain and mode settings are detected

Environment variables to control this:

```bash
export ACTVT_REUSE_CERT="yes"          # Reuse Let's Encrypt certificate
export ACTVT_REUSE_MTLS_CA="yes"       # Reuse mTLS CA
export ACTVT_REINSTALL_VECTOR="no"     # Skip Vector reinstall
```

## Monitoring State Health

### Check Installation State

```bash
# View all state files
sudo ls -lR /var/lib/actvt/

# Check last installation date
sudo grep "installed_at" /var/lib/actvt/install.state

# Verify certificate expiration
sudo openssl x509 -in /etc/vector/certs/server.crt -noout -enddate
```

### Automated Health Check Script

Create a simple health check:

```bash
#!/bin/bash
# /usr/local/bin/actvt-health-check

echo "=== Actvt Installation Health Check ==="
echo

# Check state directory
if [ -d "/var/lib/actvt" ]; then
    echo "✓ State directory exists"
else
    echo "✗ State directory missing"
fi

# Check certificates
if [ -f "/etc/vector/certs/server.crt" ]; then
    EXPIRY=$(sudo openssl x509 -in /etc/vector/certs/server.crt -noout -enddate | cut -d= -f2)
    echo "✓ TLS certificate valid until: $EXPIRY"
else
    echo "✗ TLS certificate missing"
fi

# Check Vector service
if systemctl is-active --quiet vector; then
    echo "✓ Vector service is running"
else
    echo "✗ Vector service is not running"
fi

# Check disk space
BACKUP_SIZE=$(sudo du -sh /var/lib/actvt/backups 2>/dev/null | cut -f1)
echo "ℹ Backup directory size: ${BACKUP_SIZE:-0}"

echo
echo "Complete!"
```

Make it executable and run:

```bash
sudo chmod +x /usr/local/bin/actvt-health-check
sudo /usr/local/bin/actvt-health-check
```

## Next Steps

Understanding state management helps with:

1. **[Troubleshooting Issues](troubleshooting.md)** - Use logs and state to debug
2. **[Certificate Management](tls-configuration.md)** - Understand certificate locations
3. **[mTLS Setup](mtls-security.md)** - Know where client certificates are stored
4. **Server Migration** - Backup and restore state on new servers

Keep your state files and backups secure, and review them periodically to ensure your installation remains healthy.
