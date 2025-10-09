---
sidebar_position: 2
---

# Install Script

The automated installation script is the fastest and easiest way to set up Actvt remote server monitoring. This single command handles all the complexity of installation, configuration, and setup.

## Quick Start

On your remote server, set the required environment variables and run the installer:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
curl -L https://actvt.io/install | bash
```

Notes:
- ACTVT_DOMAIN and ACTVT_EMAIL are required.
- The script auto-detects if nginx is present and will run in proxy mode behind nginx; otherwise it runs in standalone mode.

## What the Script Does

The automated installation script performs the following tasks:

### 1. System Detection & Validation
- Detects your Linux distribution (Ubuntu, Debian, CentOS, RHEL, Amazon Linux)
- Checks for root/sudo access
- Verifies system requirements (CPU, RAM, storage)
- Tests internet connectivity

### 2. Vector Installation
- Adds Vector's official package repository
- Installs Vector using your distribution's package manager
- Sets up systemd service for automatic startup
- Creates necessary directories and users

### 3. Configuration
- Generates optimized Vector configuration
- Automatically detects NVIDIA GPUs for optional monitoring
- Configures WebSocket server on port 4096
- Sets up proper permissions and security

### 4. TLS Certificate Setup
- Prompts for your domain name
- Installs Certbot (Let's Encrypt client)
- Obtains free SSL/TLS certificates
- Installs certificates for Vector by copying them into `/etc/vector/certs` with secure ownership/permissions
- Configures automatic certificate renewal via a Certbot deploy hook that refreshes `/etc/vector/certs` and reloads Vector

### 5. Firewall Configuration
- Detects firewall type (UFW, firewalld, or iptables)
- Opens required ports (80, 443, 4096)
- Maintains existing firewall rules
- Ensures secure access

### 6. Service Activation
- Enables Vector to start on boot
- Starts the Vector service
- Verifies everything is running correctly

### 7. Validation
- Tests WebSocket server is listening
- Verifies TLS certificates are valid
- Provides connection URL for Actvt
- Displays next steps

## Prerequisites

Before running the installation script, ensure you have:

- **Linux Server**: Ubuntu 20.04+, Debian 10+, CentOS 7+, or Amazon Linux 2
- **Root Access**: The script must be run as root or with sudo
- **Domain Name**: A domain pointing to your server's public IP (e.g., `monitor.yourdomain.com`)
- **DNS Configured**: A record resolving to your server's IP address
- **Port Access**: Ports 80, 443, and 4096 must be accessible
- **Internet Connection**: Required for downloading packages

## Interactive Prompts

During installation, the script will ask for:

### Domain Name
```
Enter your domain name (e.g., monitor.yourdomain.com):
>
```
This is required for obtaining TLS certificates. Make sure your domain's DNS is configured before running the script.

### Email Address (Optional)
```
Enter your email for Let's Encrypt notifications (optional):
>
```
Let's Encrypt will send renewal reminders to this email. You can skip this by pressing Enter.

### GPU Monitoring (If Detected)
```
Enable GPU monitoring? [Y/n]
>
```
If an NVIDIA GPU is detected, you'll be asked if you want to enable GPU metrics collection.

### Vector Reinstallation (If Already Installed)
```
Do you want to reinstall/update Vector? [y/N]
>
```
If Vector is already installed, you can choose to skip reinstallation or update to the latest version.

## Non-Interactive Installation

For automated deployments, CI/CD pipelines, or infrastructure-as-code, you can provide all configuration via environment variables. The script will automatically run in non-interactive mode when piped from curl.

### Available Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ACTVT_DOMAIN` | Server domain name | - | Yes |
| `ACTVT_EMAIL` | Let's Encrypt email for renewal notifications | - | Yes |
| `ACTVT_INSTALL_MODE` | Installation mode: `auto` (detect), `standalone`, or `proxy` | `auto` | No |
| `ACTVT_VECTOR_PORT` | Vector WebSocket port | `4096` | No |
| `ACTVT_NGINX_WEBROOT` | Webroot for Certbot http-01 in proxy mode | `/var/www/html` | No |
| `ACTVT_FORCE_STANDALONE` | Force standalone mode even if nginx is detected | `no` | No |
| `ACTVT_REINSTALL_VECTOR` | Reinstall Vector if already installed | `no` | No |
| `ACTVT_ENABLE_GPU` | Enable GPU monitoring if GPU detected | `yes` | No |
| `ACTVT_REUSE_CERT` | Reuse existing certificates if present | `yes` | No |
| `ACTVT_CONTINUE_WITHOUT_DNS` | Continue if DNS resolution fails | `no` | No |
| `ACTVT_CONFIGURE_FIREWALL` | Configure firewall rules (UFW/firewalld/iptables) | `yes` | No |
| `ACTVT_NON_INTERACTIVE` | Force non-interactive mode | auto-detect | No |

### Basic Non-Interactive Installation

Minimal installation with just the required variables:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
curl -L https://actvt.io/install | bash
```

Or as a one-liner:

```bash
ACTVT_DOMAIN="monitor.yourdomain.com" ACTVT_EMAIL="admin@yourdomain.com" curl -L https://actvt.io/install | bash
```

### Complete Non-Interactive Installation

Full control over all settings:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_EMAIL="admin@yourdomain.com"
export ACTVT_REINSTALL_VECTOR="no"
export ACTVT_ENABLE_GPU="yes"
export ACTVT_REUSE_CERT="yes"
export ACTVT_CONTINUE_WITHOUT_DNS="no"
curl -L https://actvt.io/install | bash
```

### CI/CD and Automation Examples

#### GitHub Actions

```yaml
- name: Install Actvt Remote Server
  env:
    ACTVT_DOMAIN: ${{ secrets.ACTVT_DOMAIN }}
    ACTVT_EMAIL: ${{ secrets.ACTVT_EMAIL }}
  run: |
    curl -L https://actvt.io/install | sudo bash
```

#### Terraform with cloud-init

```hcl
resource "aws_instance" "monitoring" {
  ami           = "ami-xxxxx"
  instance_type = "t3.small"

  user_data = <<-EOF
    #!/bin/bash
    export ACTVT_DOMAIN="monitor.example.com"
    export ACTVT_EMAIL="admin@example.com"
    curl -L https://actvt.io/install | bash
  EOF
}
```

#### Docker Build

```dockerfile
FROM ubuntu:22.04
ENV ACTVT_DOMAIN=monitor.example.com
ENV ACTVT_EMAIL=admin@example.com
RUN curl -L https://actvt.io/install | bash
```

#### Ansible Playbook

```yaml
- name: Install Actvt Remote Server
  shell: curl -L https://actvt.io/install | bash
  environment:
    ACTVT_DOMAIN: "{{ actvt_domain }}"
    ACTVT_EMAIL: "{{ actvt_email }}"
    ACTVT_REINSTALL_VECTOR: "no"
  become: yes
```

### Force Reinstall Scenario

If you want to reinstall Vector and get new certificates:

```bash
export ACTVT_DOMAIN="monitor.yourdomain.com"
export ACTVT_REINSTALL_VECTOR="yes"
export ACTVT_REUSE_CERT="no"
curl -L https://actvt.io/install | bash
```

### Development/Testing Without DNS

For testing environments where DNS is not configured:

```bash
export ACTVT_DOMAIN="test.internal"
export ACTVT_CONTINUE_WITHOUT_DNS="yes"
curl -L https://actvt.io/install | bash
```

**Warning**: Certificate acquisition will fail without proper DNS. This is only suitable for testing.

### Cloud Environments (AWS/Azure/GCP)

For cloud environments where firewall is managed via Security Groups, Network Security Groups, or Cloud Firewall:

```bash
# Skip firewall configuration since it's managed by cloud provider
export ACTVT_DOMAIN="monitor.example.com"
export ACTVT_EMAIL="admin@example.com"
export ACTVT_CONFIGURE_FIREWALL="no"
curl -L https://actvt.io/install | bash
```

**Note**: Ensure your cloud security groups allow inbound traffic on ports 80, 443, and 4096.

## Installation Progress

The script shows clear progress indicators:

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           Actvt Remote Server Installation Script            ║
║                      Version 1.0.0                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

[1/9] Detecting Operating System
  → Detected: Ubuntu 22.04.3 LTS
  → Package manager: apt-get
  ✓ OS detection complete

[2/9] Checking System Requirements
  → Root access: OK
  → Disk space: OK (25GB)
  → Memory: OK (2048MB)
  → Internet connectivity: OK
  ✓ All system requirements met

[3/9] Installing Vector
  → Adding Vector repository...
  → Installing Vector package...
  → Vector 0.34.0 installed successfully
  ✓ Vector installation complete

[4/9] Setting up TLS Certificates
  → Domain: monitor.yourdomain.com
  → Installing Certbot...
  → Obtaining Let's Encrypt certificate...
  → Certificates installed successfully
  ✓ TLS certificates configured successfully

[5/9] Configuring Vector
  → Creating Vector configuration...
  ✓ Vector configuration complete

[6/9] Configuring Nginx Reverse Proxy (proxy mode only)
  → Created nginx server block or snippet include
  ✓ Nginx reverse proxy configured successfully

[7/9] Configuring Firewall
  → Detected firewall: ufw
  → Firewall rules added
  ✓ Firewall configuration complete

[8/9] Starting Vector Service
  → Enabling Vector service...
  → Starting Vector...
  ✓ Vector service started and enabled

[9/9] Validating Installation
  → Vector service: Running ✓
  → Port 4096: Listening ✓
  → TLS certificates: Valid until Mar 15 12:30:00 2025 GMT ✓
  ✓ Installation validation complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Installation Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WebSocket URL (depends on mode):
  • Proxy mode (nginx detected): wss://monitor.yourdomain.com/actvt
  • Standalone mode:             wss://monitor.yourdomain.com:4096

Next Steps:
  1. Open Actvt on your Mac
  2. Go to Settings → Remote Servers
  3. Add a new server with the WebSocket URL above
  4. Start monitoring your remote server!

Service Management:
  • Check status:  sudo systemctl status vector
  • View logs:     sudo journalctl -u vector -f
  • Restart:       sudo systemctl restart vector

Documentation:
  https://actvt.io/docs/remote-server/overview

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## What Gets Installed

The script installs and configures:

### Software Packages
- **Vector**: High-performance observability data pipeline
- **Certbot**: Let's Encrypt certificate client
- **Supporting tools**: curl, tar (if not already installed)

### Configuration Files
- `/etc/vector/vector.toml`: Vector configuration
- `/etc/vector/certs/server.crt`: TLS certificate (copied from Let's Encrypt, 644, owned by vector)
- `/etc/vector/certs/server.key`: TLS private key (copied from Let's Encrypt, 640, owned by vector)
- `/etc/letsencrypt/`: Let's Encrypt configuration and certificates

### System Services
- `vector.service`: Systemd service for Vector
- Certificate auto-renewal via Certbot deploy hook that refreshes `/etc/vector/certs` and reloads Vector

### State Files
- `/var/lib/actvt/install.state`: Installation state tracking
- `/var/lib/actvt/domain`: Your domain name
- `/var/log/actvt-install.log`: Detailed installation log

## Troubleshooting

### Script Fails to Download

If you see `curl: (6) Could not resolve host`:

```bash
# Check internet connectivity
ping -c 4 8.8.8.8

# Check DNS resolution
nslookup actvt.io
```

### Permission Denied

The script must be run as root or with sudo:

```bash
# Use sudo if you're not root
sudo bash -c "$(curl -L https://actvt.io/install)"
```

### Certificate Acquisition Fails

Common causes:
- Port 80 is not accessible from the internet
- DNS has not propagated yet
- Firewall blocking Let's Encrypt validation

```bash
# Verify port 80 is accessible
sudo netstat -tlnp | grep :80

# Check DNS resolution
dig yourdomain.com

# Wait up to 24 hours for DNS propagation
```

### Vector Service Won't Start

Check the logs for specific errors:

```bash
# View Vector logs
sudo journalctl -u vector -n 50

# Check configuration
sudo vector validate /etc/vector/vector.toml

# Check certificate permissions
ls -la /etc/vector/certs/
```

### Installation Log

If installation fails, check the detailed log:

```bash
# View installation log
sudo tail -n 100 /var/log/actvt-install.log

# Or use less for full log
sudo less /var/log/actvt-install.log
```

## Security Considerations

### Script Safety

The `curl | bash` pattern is commonly used but carries risks. To verify the script before running:

```bash
# Download and inspect the script first
curl -L https://actvt.io/install > install.sh
less install.sh

# Run it manually after inspection
sudo bash install.sh
```

### What the Script Does NOT Do

The script will NOT:
- Modify SSH configuration
- Change user passwords
- Access sensitive files
- Install unnecessary packages
- Open ports beyond 80, 443, and 4096
- Send data to external services (except Let's Encrypt for certificates)

### TLS Certificate Security

- Certificates are automatically renewed before expiration
- Certificates are copied into `/etc/vector/certs` with restrictive permissions
  - server.crt: 644 vector:vector
  - server.key: 640 vector:vector
- A Certbot deploy hook refreshes these files on renewal and reloads Vector (and nginx if present)

## Nginx Reverse Proxy and Snippet Include

When nginx is already serving your domain on port 443, the installer avoids creating a conflicting server block. Instead, it creates a snippet you include in your existing server block:

1) Snippet location:
```
/etc/nginx/snippets/actvt-vector-location.conf
```

2) Include it inside the existing server { } for your domain:
```
server {
    listen 443 ssl http2;
    server_name monitor.yourdomain.com;
    # ... your existing config ...

    include /etc/nginx/snippets/actvt-vector-location.conf;
}
```

3) Test and reload nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

If no existing server block is found, the installer creates and enables a dedicated server block at `/etc/nginx/sites-available/actvt-vector`.

## Managing the Installation

### Service Management

```bash
# Check Vector status
sudo systemctl status vector

# Stop Vector
sudo systemctl stop vector

# Start Vector
sudo systemctl start vector

# Restart Vector
sudo systemctl restart vector

# View live logs
sudo journalctl -u vector -f
```

### Updating Vector

To update Vector to the latest version:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get upgrade vector
sudo systemctl restart vector

# CentOS/RHEL/Amazon Linux
sudo yum update vector
sudo systemctl restart vector
```

### Reconfiguring

If you need to change configuration:

```bash
# Edit Vector configuration
sudo nano /etc/vector/vector.toml

# Validate changes
vector validate /etc/vector/vector.toml

# Apply changes
sudo systemctl restart vector
```

### Certificate Renewal

Certificates are automatically renewed. To manually test renewal:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal (if needed)
sudo certbot renew --force-renewal

# Check certificate expiry
sudo openssl x509 -in /etc/vector/certs/server.crt -noout -enddate
```

## Uninstalling

To completely remove the installation:

```bash
# Stop and disable Vector service
sudo systemctl stop vector
sudo systemctl disable vector

# Remove Vector package
# Ubuntu/Debian:
sudo apt-get remove --purge vector

# CentOS/RHEL/Amazon Linux:
sudo yum remove vector

# Remove configuration and state files
sudo rm -rf /etc/vector
sudo rm -rf /var/lib/actvt
sudo rm -f /var/log/actvt-install.log

# Optional: Remove Let's Encrypt certificates
sudo certbot delete --cert-name yourdomain.com
```

## Next Steps

After successful installation:

1. **Open Actvt**: Launch the Actvt application on your Mac
2. **Add Server**: Go to Settings → Remote Servers
3. **Enter URL**: Use the WebSocket URL provided
   - Proxy mode: `wss://monitor.yourdomain.com/actvt`
   - Standalone: `wss://monitor.yourdomain.com:4096`
4. **Connect**: Click "Add Server" or "Connect"
5. **Monitor**: Start viewing real-time metrics from your remote server!

## Support

If you encounter any issues:

- **Documentation**: See the [Troubleshooting Guide](troubleshooting.md)
- **Manual Installation**: Try the [step-by-step guide](prerequisites.md) if automated installation fails
- **Logs**: Check `/var/log/actvt-install.log` for detailed error messages
- **Service Logs**: Use `journalctl -u vector -f` to view Vector logs

The automated installation script is designed to work on most standard server configurations. If you have a custom setup or encounter issues, the manual installation process provides more control and troubleshooting options.
