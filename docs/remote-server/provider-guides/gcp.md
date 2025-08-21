---
sidebar_position: 2
---
# Google Cloud Platform

This guide focuses on configuring GCP VPC Firewall Rules for Actvt remote monitoring on Google Compute Engine instances.

## Prerequisites

- Google Cloud Platform account with billing enabled
- Compute Engine instance running Ubuntu 20.04+ or similar Linux distribution
- Basic familiarity with Google Cloud Console or gcloud CLI

## Required Ports

For Actvt monitoring to work, you need to allow these ports:

- **Port 22**: SSH access for server management
- **Port 80**: HTTP access for Let's Encrypt certificate verification
- **Port 4096**: WebSocket server for Actvt connections

## GCP VPC Firewall Configuration

### Method 1: Using Google Cloud Console

1. **Navigate to VPC Firewall**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to VPC network → Firewall
   - Click "Create Firewall Rule"

2. **Create SSH Firewall Rule**
   ```
   Name: actvt-ssh
   Direction: Ingress
   Action: Allow
   Targets: Specified target tags
   Target tags: actvt-monitoring
   Source IP ranges: Your IP address/32 (recommended) or 0.0.0.0/0
   Protocols and ports: TCP, port 22
   ```

3. **Create HTTP Firewall Rule**
   ```
   Name: actvt-http
   Direction: Ingress  
   Action: Allow
   Targets: Specified target tags
   Target tags: actvt-monitoring
   Source IP ranges: 0.0.0.0/0
   Protocols and ports: TCP, port 80
   ```

4. **Create WebSocket Firewall Rule**
   ```
   Name: actvt-websocket
   Direction: Ingress
   Action: Allow
   Targets: Specified target tags
   Target tags: actvt-monitoring
   Source IP ranges: 0.0.0.0/0 (or restrict to your IP range)
   Protocols and ports: TCP, port 4096
   ```

5. **Apply Tags to Your Instance**
   - Navigate to Compute Engine → VM instances
   - Click on your instance
   - Click "Edit"
   - In the "Network tags" field, add: `actvt-monitoring`
   - Click "Save"

### Method 2: Using gcloud CLI

First, install the gcloud CLI:

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize and authenticate
gcloud init
gcloud auth login
```

Create firewall rules:

```bash
# Set your project ID
PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Create SSH firewall rule (replace YOUR_IP)
gcloud compute firewall-rules create actvt-ssh \
  --description="SSH access for Actvt monitoring servers" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=YOUR_IP/32 \
  --target-tags=actvt-monitoring

# Create HTTP firewall rule for Let's Encrypt
gcloud compute firewall-rules create actvt-http \
  --description="HTTP access for Let's Encrypt verification" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=actvt-monitoring

# Create WebSocket firewall rule
gcloud compute firewall-rules create actvt-websocket \
  --description="WebSocket server for Actvt connections" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:4096 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=actvt-monitoring

# Apply tags to your instance
gcloud compute instances add-tags YOUR_INSTANCE_NAME \
  --tags=actvt-monitoring \
  --zone=YOUR_ZONE
```

## Verify Configuration

Check that your firewall rules are properly configured:

```bash
# List firewall rules
gcloud compute firewall-rules list --filter="name~actvt"

# Describe specific rule
gcloud compute firewall-rules describe actvt-websocket

# Check instance tags
gcloud compute instances describe YOUR_INSTANCE_NAME \
  --zone=YOUR_ZONE \
  --format="value(tags.items[])"

# Test connectivity (from your local machine)
telnet YOUR_INSTANCE_IP 4096
nc -zv YOUR_INSTANCE_IP 4096
```

## Additional Security Considerations

### Restrict WebSocket Access
For production environments, consider restricting port 4096:

```bash
# Update WebSocket rule to restrict access
gcloud compute firewall-rules update actvt-websocket \
  --source-ranges=YOUR_OFFICE_IP/32
```

### Multiple IP Ranges
To allow access from multiple IP ranges:

```bash
# Create WebSocket rule with multiple source ranges
gcloud compute firewall-rules create actvt-websocket \
  --description="WebSocket server for Actvt connections" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:4096 \
  --source-ranges=203.0.113.0/24,198.51.100.0/24 \
  --target-tags=actvt-monitoring
```

### Service Account Integration
For better security, use service accounts:

```bash
# Create service account
gcloud iam service-accounts create actvt-monitoring \
  --description="Service account for Actvt monitoring" \
  --display-name="Actvt Monitoring"

# Attach service account to instance
gcloud compute instances set-service-account YOUR_INSTANCE_NAME \
  --service-account=actvt-monitoring@PROJECT_ID.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --zone=YOUR_ZONE
```

## Advanced Configuration

### Custom VPC Network
If using a custom VPC network:

```bash
# Create custom VPC
gcloud compute networks create actvt-vpc --subnet-mode=custom

# Create subnet
gcloud compute networks subnets create actvt-subnet \
  --network=actvt-vpc \
  --range=10.0.0.0/24 \
  --region=us-central1

# Create firewall rules for custom VPC
gcloud compute firewall-rules create actvt-custom-ssh \
  --network=actvt-vpc \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=YOUR_IP/32 \
  --target-tags=actvt-monitoring
```

### Load Balancer Integration
For high availability with load balancers:

```bash
# Create health check
gcloud compute health-checks create tcp actvt-health-check \
  --port=4096 \
  --check-interval=10s \
  --timeout=5s \
  --healthy-threshold=2 \
  --unhealthy-threshold=3

# Create load balancer with health check
gcloud compute backend-services create actvt-backend \
  --protocol=TCP \
  --health-checks=actvt-health-check \
  --global
```

## Troubleshooting

**Connection timeout errors:**
```bash
# Check firewall rules
gcloud compute firewall-rules list --filter="name~actvt"

# Check instance status
gcloud compute instances list --filter="name=YOUR_INSTANCE_NAME"

# Check instance tags
gcloud compute instances describe YOUR_INSTANCE_NAME \
  --zone=YOUR_ZONE \
  --format="value(tags.items[])"
```

**Can't connect to WebSocket:**
```bash
# Test from your local machine
wscat -c wss://your-domain:4096

# SSH into instance and check Vector
gcloud compute ssh YOUR_INSTANCE_NAME --zone=YOUR_ZONE
ps aux | grep vector
netstat -tlnp | grep 4096
```

**SSH access issues:**
```bash
# Check if SSH rule allows your current IP
curl -s https://ipinfo.io/ip  # Get your current IP

# Temporarily allow all SSH (be careful!)
gcloud compute firewall-rules update actvt-ssh \
  --source-ranges=0.0.0.0/0

# Use browser-based SSH from console if needed
gcloud compute ssh YOUR_INSTANCE_NAME --zone=YOUR_ZONE
```

**Metadata server issues:**
```bash
# Check if metadata server is accessible (from instance)
curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/zone

# Enable OS Login for better SSH management
gcloud compute project-info add-metadata \
  --metadata enable-oslogin=TRUE
```

## Ubuntu Firewall (UFW) - Additional Layer

GCP instances may also have UFW enabled. Configure it as well:

```bash
# SSH into your instance
gcloud compute ssh YOUR_INSTANCE_NAME --zone=YOUR_ZONE

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

Once your GCP firewall is configured:

1. **[Install Vector](../vector-setup.md)** - Set up the monitoring agent
2. **[Configure TLS](../tls-configuration.md)** - Set up SSL certificates
3. **[Test Connection](../troubleshooting.md)** - Verify everything works
4. **[Connect from Actvt](../../getting-started/quick-start.md)** - Add server to Actvt

For detailed instance creation instructions, see the [Google Cloud Documentation](https://cloud.google.com/compute/docs/).