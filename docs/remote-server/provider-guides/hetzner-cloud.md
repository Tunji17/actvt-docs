---
sidebar_position: 2
---
# Hetzner Cloud

This guide focuses on configuring Hetzner Cloud Firewalls for Actvt remote monitoring on Hetzner Cloud servers.

## Prerequisites

- Hetzner Cloud account
- Server running Ubuntu 20.04+ or similar Linux distribution
- Basic familiarity with Hetzner Cloud Console or hcloud CLI

## Required Ports

For Actvt monitoring to work, you need to allow these ports:

- **Port 22**: SSH access for server management
- **Port 80**: HTTP access for Let's Encrypt certificate verification
- **Port 4096**: WebSocket server for Actvt connections

## Hetzner Cloud Firewall Configuration

### Method 1: Using Hetzner Cloud Console

1. **Navigate to Firewalls**
   - Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
   - Select your project
   - Click "Firewalls" in the left sidebar
   - Click "Create Firewall"

2. **Create Firewall Rules**
   
   **Name your firewall:** `actvt-monitoring`
   
   **Inbound Rules:**
   
   **SSH Rule:**
   ```
   Port: 22
   Protocol: TCP
   Source: Your IP address (recommended) or 0.0.0.0/0
   Description: SSH access
   ```
   
   **HTTP Rule:**
   ```
   Port: 80
   Protocol: TCP  
   Source: 0.0.0.0/0
   Description: Let's Encrypt verification
   ```
   
   **WebSocket Rule:**
   ```
   Port: 4096
   Protocol: TCP
   Source: 0.0.0.0/0 (or restrict to your IP range)
   Description: Actvt WebSocket server
   ```

3. **Apply Firewall to Server**
   - After creating the firewall, click "Apply to resources"
   - Select your server
   - Click "Apply"

### Method 2: Using hcloud CLI

First, install the hcloud CLI:

```bash
# Install hcloud CLI (Linux/macOS)
curl -L https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz | tar xz
sudo mv hcloud /usr/local/bin/

# Configure with your API token
hcloud context create actvt-monitoring
# Enter your Hetzner Cloud API token when prompted
```

Create firewall and rules:

```bash
# Create a new firewall
hcloud firewall create --name actvt-monitoring

# Add SSH rule (replace YOUR_IP with your actual IP)
hcloud firewall add-rule actvt-monitoring \
  --direction in \
  --source-ips YOUR_IP/32 \
  --protocol tcp \
  --port 22 \
  --description "SSH access"

# Add HTTP rule for Let's Encrypt
hcloud firewall add-rule actvt-monitoring \
  --direction in \
  --source-ips 0.0.0.0/0 \
  --protocol tcp \
  --port 80 \
  --description "Let's Encrypt verification"

# Add WebSocket rule for Actvt
hcloud firewall add-rule actvt-monitoring \
  --direction in \
  --source-ips 0.0.0.0/0 \
  --protocol tcp \
  --port 4096 \
  --description "Actvt WebSocket server"

# Apply firewall to your server
hcloud firewall apply-to-resource actvt-monitoring \
  --type server \
  --server YOUR_SERVER_NAME_OR_ID
```

## Verify Configuration

Check that your firewall is properly configured:

```bash
# List firewall rules
hcloud firewall describe actvt-monitoring

# Test connectivity (from your local machine)
telnet YOUR_SERVER_IP 4096
nc -zv YOUR_SERVER_IP 4096
```

## Additional Security Considerations

### Restrict WebSocket Access
For production environments, consider restricting port 4096:

```bash
# Remove the open WebSocket rule
hcloud firewall delete-rule actvt-monitoring \
  --direction in \
  --source-ips 0.0.0.0/0 \
  --protocol tcp \
  --port 4096

# Add restricted WebSocket rule
hcloud firewall add-rule actvt-monitoring \
  --direction in \
  --source-ips YOUR_OFFICE_IP/32 \
  --protocol tcp \
  --port 4096 \
  --description "Actvt WebSocket (restricted)"
```

### Multiple IP Ranges
To allow access from multiple IP ranges:

```bash
# Add multiple source IPs
hcloud firewall add-rule actvt-monitoring \
  --direction in \
  --source-ips 203.0.113.1/32,198.51.100.0/24 \
  --protocol tcp \
  --port 4096 \
  --description "Actvt WebSocket (multiple IPs)"
```

## Troubleshooting

**Connection timeout errors:**
```bash
# Check firewall status
hcloud firewall list
hcloud firewall describe actvt-monitoring

# Verify firewall is applied to server
hcloud server describe YOUR_SERVER_NAME
```

**Can't connect to WebSocket:**
```bash
# Test from your local machine
wscat -c wss://your-domain:4096

# SSH into server and check Vector
ssh root@your-server-ip
ps aux | grep vector
netstat -tlnp | grep 4096
```

**SSH access issues:**
```bash
# Check if SSH rule allows your current IP
curl -s https://ipinfo.io/ip  # Get your current IP
# Compare with the SSH rule source IP
```

## Ubuntu Firewall (UFW) - Additional Layer

Hetzner servers may also have UFW enabled. Configure it as well:

```bash
# SSH into your server
ssh root@your-server-ip

# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP for Let's Encrypt  
sudo ufw allow 4096/tcp  # WebSocket server

# Enable UFW
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

## Next Steps

Once your Hetzner Cloud firewall is configured:

1. **[Install Vector](../vector-setup.md)** - Set up the monitoring agent
2. **[Configure TLS](../tls-configuration.md)** - Set up SSL certificates  
3. **[Test Connection](../troubleshooting.md)** - Verify everything works
4. **[Connect from Actvt](../../getting-started/quick-start.md)** - Add server to Actvt

For detailed server creation instructions, see the [Hetzner Cloud Documentation](https://docs.hetzner.cloud/).