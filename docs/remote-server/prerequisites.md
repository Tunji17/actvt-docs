---
sidebar_position: 3
---

# Prerequisites

Before setting up remote server monitoring with Actvt, ensure your environment meets these requirements.

:::tip Quick Setup Available
Want to skip the manual setup? Try our [automated installation script](automated-install.md) that handles everything automatically:
```bash
curl https://actvt.io/install -fsS | bash
```
:::


## Server Requirements

### Operating System
- **Ubuntu Server 20.04 LTS or newer** (Recommended)
- **Debian 10 or newer**
- **CentOS 7/8** or **Amazon Linux 2**
- **Root or sudo access** for installation and configuration

### Hardware Specifications

#### Minimum Requirements
- **CPU**: 1 core, any modern x64 processor
- **RAM**: 512MB available memory
- **Storage**: 100MB free space for Vector
- **Network**: Public IP address or accessible endpoint

### Network Requirements

#### Domain Name
- **Required**: A domain name pointing to your server's public IP
- **DNS Configuration**: A record resolving to server IP address
- **Examples**: `monitoring.yourdomain.com` or `server1.company.com`
- **Free Options**: Use services like Cloudflare, Namecheap, or DuckDNS

#### Port Access
- **Port 22**: SSH access for initial setup
- **Port 80**: HTTP access for Let's Encrypt certificate verification
- **Port 4096**: WebSocket server for Actvt connections
- **Firewall**: Ability to configure firewall rules

## Software Prerequisites

### On Your macOS System
- **Actvt Application**: Latest version installed
- **Internet Connection**: For connecting to remote servers
- **TLS Support**: macOS 11+ includes required TLS capabilities

### On Remote Server (Will be installed)
- **Vector**: High-performance data pipeline (we'll install this)
- **SSL Certificates**: Let's Encrypt or custom certificates (we'll set this up)
- **Firewall**: UFW or equivalent (we'll configure this)

## Optional GPU Monitoring (NVIDIA Only)
If you want to monitor GPU metrics:
- **NVIDIA GPU**: Any CUDA-compatible GPU
- **NVIDIA Drivers**: Latest stable drivers installed
- **nvidia-smi**: Command-line GPU monitoring tool (included with drivers)

## Testing Prerequisites

### Verify Server Access
```bash
# Test SSH connection
ssh user@your-domain.com

# Check sudo access
sudo whoami
# Should return: root

# Verify internet connectivity
ping -c 4 google.com

# Check available disk space
df -h
```

### Verify Domain Resolution
```bash
# From your Mac, test domain resolution
nslookup your-domain.com

# Should return your server's IP address
ping your-domain.com
```

### Check Port Availability
```bash
# On server, check if port 4096 is free
sudo netstat -tlnp | grep 4096
# Should return no results (port is free)

# Test if we can bind to port 4096
sudo nc -l 4096 &
kill %1  # Kill the test process
```

### GPU Prerequisites (Optional)
```bash
# Verify NVIDIA GPU is detected
lspci | grep -i nvidia

# Test nvidia-smi command
nvidia-smi
# Should show GPU information

# Check CUDA version (optional)
nvcc --version
```

## Security Considerations

### Server Security
- **SSH Keys**: Use SSH key authentication instead of passwords
- **Firewall**: Keep unnecessary ports closed
- **Updates**: Ensure server is running latest security updates
- **User Access**: Use non-root user with sudo access

### Network Security
- **TLS Certificates**: We'll set up proper SSL/TLS encryption
- **IP Restrictions**: Consider restricting access to specific IP ranges
- **VPN Access**: Use VPN if monitoring internal/private servers

## Troubleshooting Prerequisites

### Common Issues

**"Domain doesn't resolve"**
```bash
# Check DNS propagation
dig your-domain.com
# Wait up to 24 hours for DNS propagation
```

**"Can't connect to server"**
```bash
# Test connectivity
telnet your-domain.com 22
# Should connect to SSH
```

**"Permission denied"**
```bash
# Verify user is in sudo group
groups $USER
# Should include 'sudo'
```

**"Port already in use"**
```bash
# Find what's using port 4096
sudo lsof -i :4096
# Stop conflicting service if needed
```

### Getting Help

If you're missing prerequisites:

1. **Server Setup**: Most cloud providers offer one-click Ubuntu server deployment
2. **Domain Names**: Free options include DuckDNS, FreeDNS, or use cloud provider DNS
3. **SSH Access**: Most cloud consoles provide web-based terminal access
4. **Firewall Issues**: Cloud provider documentation typically covers security group setup

## Next Steps

Once you've verified all prerequisites:

1. **[Install Vector](vector-setup.md)** - Set up the data pipeline
2. **[Configure TLS](tls-configuration.md)** - Set up secure connections
3. **[Setup Firewall](provider-guides/overview)** - Configure network access using provider-specific guides

---

**Ready to continue?** → [Vector Setup Guide](vector-setup.md)