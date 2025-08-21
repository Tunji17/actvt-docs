---
sidebar_position: 2
---
# DigitalOcean

This guide focuses on configuring DigitalOcean Cloud Firewalls for Actvt remote monitoring on DigitalOcean Droplets.

## Prerequisites

- DigitalOcean account
- Droplet running Ubuntu 20.04+ or similar Linux distribution
- Basic familiarity with DigitalOcean Control Panel or doctl CLI

## Required Ports

For Actvt monitoring to work, you need to allow these ports:

- **Port 22**: SSH access for server management
- **Port 80**: HTTP access for Let's Encrypt certificate verification
- **Port 4096**: WebSocket server for Actvt connections

## DigitalOcean Cloud Firewall Configuration

### Method 1: Using DigitalOcean Control Panel

1. **Navigate to Firewalls**
   - Go to [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
   - Click "Networking" in the left sidebar
   - Click "Firewalls"
   - Click "Create Firewall"

2. **Create Firewall Rules**
   
   **Name your firewall:** `actvt-monitoring`
   
   **Inbound Rules:**
   
   **SSH Rule:**
   ```
   Type: SSH
   Protocol: TCP
   Port: 22
   Sources: Your IP address (recommended) or All IPv4 & IPv6
   ```
   
   **HTTP Rule:**
   ```
   Type: HTTP
   Protocol: TCP
   Port: 80
   Sources: All IPv4 & IPv6
   ```
   
   **Custom WebSocket Rule:**
   ```
   Type: Custom
   Protocol: TCP
   Port: 4096
   Sources: All IPv4 & IPv6 (or restrict to your IP range)
   ```

3. **Apply Firewall to Droplet**
   - In the "Apply to Droplets" section
   - Search for your droplet name
   - Select your droplet
   - Click "Create Firewall"

### Method 2: Using doctl CLI

First, install the doctl CLI:

```bash
# Install doctl (Linux/macOS)
# Download from: https://github.com/digitalocean/doctl/releases

# For Ubuntu/Debian:
wget https://github.com/digitalocean/doctl/releases/latest/download/doctl-1.94.0-linux-amd64.tar.gz
tar xf doctl-*.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate with your API token
doctl auth init
# Enter your DigitalOcean API token when prompted
```

Create firewall and rules:

```bash
# Create a new firewall
doctl compute firewall create \
  --name actvt-monitoring \
  --inbound-rules "protocol:tcp,ports:22,address:YOUR_IP/32" \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
  --inbound-rules "protocol:tcp,ports:4096,address:0.0.0.0/0" \
  --droplet-ids YOUR_DROPLET_ID

# Alternative: Apply to existing droplets by tag
doctl compute firewall create \
  --name actvt-monitoring \
  --inbound-rules "protocol:tcp,ports:22,address:YOUR_IP/32" \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
  --inbound-rules "protocol:tcp,ports:4096,address:0.0.0.0/0" \
  --tag-names monitoring
```

Get your droplet ID if needed:

```bash
# List your droplets
doctl compute droplet list

# Get specific droplet ID
doctl compute droplet get your-droplet-name --format ID --no-header
```

## Verify Configuration

Check that your firewall is properly configured:

```bash
# List firewalls
doctl compute firewall list

# Get firewall details
doctl compute firewall get actvt-monitoring

# Test connectivity (from your local machine)
telnet YOUR_DROPLET_IP 4096
nc -zv YOUR_DROPLET_IP 4096
```

## Additional Security Considerations

### Restrict WebSocket Access
For production environments, consider restricting port 4096:

```bash
# Update firewall to restrict WebSocket access
doctl compute firewall update actvt-monitoring \
  --inbound-rules "protocol:tcp,ports:22,address:YOUR_IP/32" \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
  --inbound-rules "protocol:tcp,ports:4096,address:YOUR_OFFICE_IP/32"
```

### Multiple IP Ranges
To allow access from multiple IP ranges:

```bash
# Create firewall with multiple source IPs
doctl compute firewall create \
  --name actvt-monitoring \
  --inbound-rules "protocol:tcp,ports:22,address:YOUR_HOME_IP/32" \
  --inbound-rules "protocol:tcp,ports:22,address:YOUR_OFFICE_IP/32" \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
  --inbound-rules "protocol:tcp,ports:4096,address:YOUR_HOME_IP/32" \
  --inbound-rules "protocol:tcp,ports:4096,address:YOUR_OFFICE_IP/32" \
  --droplet-ids YOUR_DROPLET_ID
```

### Using Tags for Management
Apply firewall rules to droplets using tags:

```bash
# Tag your droplet
doctl compute droplet tag YOUR_DROPLET_ID --tag-names monitoring

# Create firewall that applies to tagged droplets
doctl compute firewall create \
  --name actvt-monitoring \
  --inbound-rules "protocol:tcp,ports:22,address:YOUR_IP/32" \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
  --inbound-rules "protocol:tcp,ports:4096,address:0.0.0.0/0" \
  --tag-names monitoring
```

## Troubleshooting

**Connection timeout errors:**
```bash
# Check firewall status
doctl compute firewall list
doctl compute firewall get actvt-monitoring

# Check if firewall is applied to your droplet
doctl compute droplet get YOUR_DROPLET_NAME --format Name,Status,PublicIPv4,PrivateIPv4
```

**Can't connect to WebSocket:**
```bash
# Test from your local machine
wscat -c wss://your-domain:4096

# SSH into droplet and check Vector
ssh root@your-droplet-ip
ps aux | grep vector
netstat -tlnp | grep 4096
```

**SSH access issues:**
```bash
# Check if SSH rule allows your current IP
curl -s https://ipinfo.io/ip  # Get your current IP
# Compare with the SSH rule source IP in firewall

# Temporarily allow all SSH access (be careful!)
doctl compute firewall update actvt-monitoring \
  --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0" \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
  --inbound-rules "protocol:tcp,ports:4096,address:0.0.0.0/0"
```

## Ubuntu Firewall (UFW) - Additional Layer

DigitalOcean droplets may also have UFW enabled. Configure it as well:

```bash
# SSH into your droplet
ssh root@your-droplet-ip

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

## Load Balancer Integration (Optional)

For high availability setups with DigitalOcean Load Balancers:

```bash
# Create load balancer with health checks on port 4096
doctl compute load-balancer create \
  --name actvt-lb \
  --algorithm round_robin \
  --health-check-protocol tcp \
  --health-check-port 4096 \
  --health-check-interval 10s \
  --health-check-timeout 5s \
  --health-check-unhealthy-threshold 3 \
  --health-check-healthy-threshold 2 \
  --forwarding-rules entry_protocol:tcp,entry_port:4096,target_protocol:tcp,target_port:4096 \
  --droplet-ids YOUR_DROPLET_ID \
  --region nyc3
```

## Next Steps

Once your DigitalOcean firewall is configured:

1. **[Install Vector](../vector-setup.md)** - Set up the monitoring agent
2. **[Configure TLS](../tls-configuration.md)** - Set up SSL certificates
3. **[Test Connection](../troubleshooting.md)** - Verify everything works
4. **[Connect from Actvt](../../getting-started/quick-start.md)** - Add server to Actvt

For detailed droplet creation instructions, see the [DigitalOcean Documentation](https://docs.digitalocean.com/).