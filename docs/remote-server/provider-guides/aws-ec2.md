---
sidebar_position: 2
---
# AWS EC2

This guide focuses on configuring AWS Security Groups (firewall rules) for Actvt remote monitoring on Amazon EC2 instances.

## Prerequisites

- AWS account with EC2 access
- EC2 instance running Ubuntu 20.04+ or similar Linux distribution
- Basic familiarity with AWS Console or CLI

## Required Ports

For Actvt monitoring to work, you need to allow these ports:

- **Port 22**: SSH access for server management
- **Port 80**: HTTP access for Let's Encrypt certificate verification  
- **Port 4096**: WebSocket server for Actvt connections

## Security Group Configuration

### Method 1: Using AWS Console

1. **Navigate to Security Groups**
   - Go to [AWS Console](https://console.aws.amazon.com/)
   - Navigate to EC2 service → Security Groups
   - Find your instance's security group
   - Click "Edit inbound rules"

2. **Add Required Rules**
   
   **SSH Rule:**
   ```
   Type: SSH
   Protocol: TCP
   Port: 22
   Source: Your IP address (recommended) or 0.0.0.0/0
   Description: SSH access for management
   ```
   
   **HTTP Rule:**
   ```
   Type: HTTP
   Protocol: TCP
   Port: 80
   Source: 0.0.0.0/0
   Description: Let's Encrypt certificate verification
   ```
   
   **WebSocket Rule:**
   ```
   Type: Custom TCP
   Protocol: TCP
   Port: 4096
   Source: 0.0.0.0/0 (or restrict to your IP range for security)
   Description: Actvt WebSocket server
   ```

3. **Save Rules**
   - Click "Save rules"
   - Verify all three rules appear in the inbound rules list

### Method 2: Using AWS CLI

First, get your Security Group ID:

```bash
# Find your instance's security group
aws ec2 describe-instances --instance-ids YOUR_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text
```

Then add the required rules:

```bash
# Set your security group ID
SECURITY_GROUP_ID="sg-your-security-group-id"

# Add SSH rule (replace YOUR_IP with your actual IP for security)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

# Add HTTP rule for Let's Encrypt
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Add WebSocket rule for Actvt
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 4096 \
  --cidr 0.0.0.0/0
```

## Verify Configuration

Check that your rules are properly configured:

```bash
# List inbound rules for your security group
aws ec2 describe-security-groups --group-ids $SECURITY_GROUP_ID \
  --query 'SecurityGroups[0].IpPermissions'

# Test connectivity (from your local machine)
telnet YOUR_INSTANCE_IP 4096
nc -zv YOUR_INSTANCE_IP 4096
```

## Additional Security Considerations

### Restrict WebSocket Access
For production environments, consider restricting port 4096 to specific IP addresses:

```bash
# Allow WebSocket access only from your office/home IP
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 4096 \
  --cidr YOUR_OFFICE_IP/32
```

### VPC Considerations
If using a custom VPC, ensure:
- Your instance is in a public subnet (for internet access)
- Internet Gateway is attached to the VPC
- Route table allows outbound internet access

## Troubleshooting

**Connection timeout errors:**
```bash
# Check if security group allows the port
aws ec2 describe-security-groups --group-ids $SECURITY_GROUP_ID

# Verify instance is running
aws ec2 describe-instances --instance-ids YOUR_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name'
```

**Can't connect to WebSocket:**
```bash
# Test from your local machine
wscat -c wss://your-domain:4096

# Check if Vector is running on the instance
ssh -i your-key.pem ubuntu@your-instance
ps aux | grep vector
```

## Next Steps

Once your AWS Security Groups are configured:

1. **[Install Vector](../vector-setup.md)** - Set up the monitoring agent
2. **[Configure TLS](../tls-configuration.md)** - Set up SSL certificates
3. **[Test Connection](../troubleshooting.md)** - Verify everything works
4. **[Connect from Actvt](../../getting-started/quick-start.md)** - Add server to Actvt

For detailed server creation instructions, see the [AWS Documentation](https://docs.aws.amazon.com/ec2/latest/userguide/EC2_GetStarted.html).