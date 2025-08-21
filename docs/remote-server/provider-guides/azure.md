---
sidebar_position: 2
---
# Microsoft Azure

This guide focuses on configuring Azure Network Security Groups (NSG) for Actvt remote monitoring on Azure Virtual Machines.

## Prerequisites

- Microsoft Azure account with active subscription
- Virtual Machine running Ubuntu 20.04+ or similar Linux distribution
- Basic familiarity with Azure Portal or Azure CLI

## Required Ports

For Actvt monitoring to work, you need to allow these ports:

- **Port 22**: SSH access for server management
- **Port 80**: HTTP access for Let's Encrypt certificate verification
- **Port 4096**: WebSocket server for Actvt connections

## Azure Network Security Group Configuration

### Method 1: Using Azure Portal

1. **Navigate to Network Security Groups**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Search for "Network security groups"
   - Click "Create" to create a new NSG or select existing one

2. **Create NSG and Rules**
   
   **Create NSG:** `actvt-monitoring-nsg`
   
   **Inbound Security Rules:**

   **SSH Rule:**
   ```
   Name: SSH
   Priority: 100
   Source: IP Addresses
   Source IP addresses: Your IP address/32 (recommended) or * for any
   Source port ranges: *
   Destination: Any
   Service: SSH (port 22)
   Protocol: TCP
   Action: Allow
   ```

   **HTTP Rule:**
   ```
   Name: HTTP-LetsEncrypt
   Priority: 110
   Source: Any
   Source port ranges: *
   Destination: Any
   Service: HTTP (port 80)
   Protocol: TCP
   Action: Allow
   ```

   **WebSocket Rule:**
   ```
   Name: Actvt-WebSocket
   Priority: 120
   Source: IP Addresses
   Source IP addresses: * (or restrict to your IP range)
   Source port ranges: *
   Destination: Any
   Destination port ranges: 4096
   Protocol: TCP
   Action: Allow
   ```

3. **Associate NSG with VM**
   - Go to Virtual Machines
   - Select your VM
   - Click "Networking" 
   - Click "Network security group" → "Configure"
   - Select your NSG: `actvt-monitoring-nsg`

### Method 2: Using Azure CLI

First, install Azure CLI:

```bash
# Install Azure CLI (Linux/macOS)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login
```

Create NSG and rules:

```bash
# Set variables
RESOURCE_GROUP="your-resource-group"
NSG_NAME="actvt-monitoring-nsg"
LOCATION="East US"
VM_NAME="your-vm-name"

# Create Network Security Group
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name $NSG_NAME \
  --location $LOCATION

# Create SSH rule (replace YOUR_IP)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name SSH \
  --protocol Tcp \
  --priority 100 \
  --destination-port-range 22 \
  --source-address-prefixes YOUR_IP/32 \
  --access Allow

# Create HTTP rule for Let's Encrypt
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name HTTP-LetsEncrypt \
  --protocol Tcp \
  --priority 110 \
  --destination-port-range 80 \
  --source-address-prefixes "*" \
  --access Allow

# Create WebSocket rule
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name Actvt-WebSocket \
  --protocol Tcp \
  --priority 120 \
  --destination-port-range 4096 \
  --source-address-prefixes "*" \
  --access Allow

# Associate NSG with VM's network interface
NIC_NAME=$(az vm show --resource-group $RESOURCE_GROUP --name $VM_NAME --query 'networkProfile.networkInterfaces[0].id' -o tsv | xargs basename)

az network nic update \
  --resource-group $RESOURCE_GROUP \
  --name $NIC_NAME \
  --network-security-group $NSG_NAME
```

## Verify Configuration

Check that your NSG is properly configured:

```bash
# List NSG rules
az network nsg rule list \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --output table

# Show specific rule
az network nsg rule show \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name Actvt-WebSocket

# Test connectivity (from your local machine)
telnet YOUR_VM_IP 4096
nc -zv YOUR_VM_IP 4096
```

## Additional Security Considerations

### Restrict WebSocket Access
For production environments, consider restricting port 4096:

```bash
# Update WebSocket rule to restrict access
az network nsg rule update \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name Actvt-WebSocket \
  --source-address-prefixes YOUR_OFFICE_IP/32
```

### Multiple IP Ranges
To allow access from multiple IP ranges:

```bash
# Create WebSocket rule with multiple source IPs
az network nsg rule update \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name Actvt-WebSocket \
  --source-address-prefixes 203.0.113.0/24 198.51.100.0/24
```

### Application Security Groups
Use Application Security Groups for better organization:

```bash
# Create Application Security Group
az network asg create \
  --resource-group $RESOURCE_GROUP \
  --name actvt-monitoring-asg \
  --location $LOCATION

# Create rule using ASG
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name Actvt-ASG-WebSocket \
  --protocol Tcp \
  --priority 125 \
  --destination-port-range 4096 \
  --destination-asgs actvt-monitoring-asg \
  --access Allow
```

## Advanced Configuration

### Azure Firewall Integration
For enterprise environments with Azure Firewall:

```bash
# Create Azure Firewall application rule
az network firewall application-rule create \
  --collection-name "actvt-monitoring" \
  --firewall-name "your-firewall" \
  --name "allow-actvt" \
  --protocols "tcp=4096" \
  --resource-group $RESOURCE_GROUP \
  --source-addresses "10.0.0.0/16" \
  --target-fqdns "your-domain.com"
```

### Load Balancer Integration
For high availability with Azure Load Balancer:

```bash
# Create health probe
az network lb probe create \
  --resource-group $RESOURCE_GROUP \
  --lb-name actvt-lb \
  --name actvt-health-probe \
  --protocol tcp \
  --port 4096 \
  --interval 15 \
  --threshold 2

# Create load balancing rule
az network lb rule create \
  --resource-group $RESOURCE_GROUP \
  --lb-name actvt-lb \
  --name actvt-lb-rule \
  --protocol Tcp \
  --frontend-port 4096 \
  --backend-port 4096 \
  --probe-name actvt-health-probe
```

## Troubleshooting

**Connection timeout errors:**
```bash
# Check NSG rules
az network nsg rule list \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --output table

# Check VM status
az vm get-instance-view \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --output table
```

**Can't connect to WebSocket:**
```bash
# Test from your local machine
wscat -c wss://your-domain:4096

# SSH into VM and check Vector
ssh azureuser@your-vm-ip
ps aux | grep vector
netstat -tlnp | grep 4096
```

**SSH access issues:**
```bash
# Check if SSH rule allows your current IP
curl -s https://ipinfo.io/ip  # Get your current IP

# Temporarily allow all SSH (be careful!)
az network nsg rule update \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name SSH \
  --source-address-prefixes "*"

# Use Azure Bastion for secure access
az network bastion ssh \
  --name "your-bastion" \
  --resource-group $RESOURCE_GROUP \
  --target-resource-id "/subscriptions/your-sub/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Compute/virtualMachines/$VM_NAME" \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```

**Effective security rules:**
```bash
# Check effective security rules for network interface
az network nic list-effective-nsg \
  --resource-group $RESOURCE_GROUP \
  --name $NIC_NAME
```

## Ubuntu Firewall (UFW) - Additional Layer

Azure VMs may also have UFW enabled. Configure it as well:

```bash
# SSH into your VM
ssh azureuser@your-vm-ip

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

## Azure Monitor Integration

For comprehensive monitoring with Azure Monitor:

```bash
# Enable Azure Monitor for VMs
az vm extension set \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_NAME \
  --name OmsAgentForLinux \
  --publisher Microsoft.EnterpriseCloud.Monitoring \
  --version 1.13 \
  --settings '{"workspaceId":"your-workspace-id"}' \
  --protected-settings '{"workspaceKey":"your-workspace-key"}'
```

## Next Steps

Once your Azure NSG is configured:

1. **[Install Vector](../vector-setup.md)** - Set up the monitoring agent
2. **[Configure TLS](../tls-configuration.md)** - Set up SSL certificates
3. **[Test Connection](../troubleshooting.md)** - Verify everything works
4. **[Connect from Actvt](../../getting-started/quick-start.md)** - Add server to Actvt

For detailed VM creation instructions, see the [Azure Documentation](https://docs.microsoft.com/en-us/azure/virtual-machines/).