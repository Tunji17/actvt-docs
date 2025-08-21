---
sidebar_position: 1
---

# Remote Server Monitoring

Actvt supports connecting to remote servers to monitor their performance in real-time alongside your local macOS system. This section provides complete setup instructions for monitoring remote Linux servers.

## Overview

Remote monitoring in Actvt works by:

1. **Installing Vector** on your remote server to collect system metrics
2. **Configuring a WebSocket server** to stream data securely on your remote server
3. **Setting up TLS encryption** for secure communication
4. **Connecting from Actvt** to view remote metrics in your dashboard

## Architecture

```
    ┌──────────────┐             ┌────────────────────────────┐
    │  Actvt       │             │ Remote Server              │
    │  macOS       │◄────WSS────►│  Ubuntu/Linux  ┌─────────┐ │
    │   App        │             │   Port 4096    │ Vector  │ │
    │              │             │                └─────────┘ │  
    └──────────────┘             └────────────────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
    Dashboard              TLS Certificate         System Metrics
    Integration            WebSocket Server        CPU, Memory, GPU
    Real-time Data         Secure Connection       Network Activity
```

## What You'll Monitor

Once configured, you can monitor these metrics from your remote servers:

✅ **CPU Metrics**
- CPU utilization percentage

✅ **Memory Metrics**
- RAM usage and availability

✅ **GPU Metrics** (NVIDIA only)
- GPU utilization percentage


## Setup Process

Setting up remote monitoring involves several steps:

### 1. [Prerequisites](prerequisites.md)
Verify your server meets the requirements and prepare your environment.

### 2. [Vector Installation & Setup](vector-setup.md)
Install Vector data pipeline software and configure it for system monitoring.

### 3. [TLS Configuration](tls-configuration.md)
Set up SSL certificates for secure WebSocket connections.

### 4. Firewall Setup
Configure firewalls based on your provider - see [Provider-Specific Guides](provider-guides/overview) for detailed firewall instructions.

### 5. [Provider-Specific Guides](provider-guides/overview)
Specialized setup instructions for different cloud providers.

### 6. [Troubleshooting](troubleshooting.md)
Solve common issues and verify your setup is working correctly.

## Supported Platforms

### Operating Systems
- ✅ **Ubuntu 20.04 LTS** (Recommended)
- ✅ **Ubuntu 22.04 LTS**
- ✅ **Debian 10/11**
- ✅ **CentOS 7/8** (Basic support)
- ✅ **Amazon Linux 2**

### Hardware Requirements
- **CPU**: 1+ cores (2+ recommended)
- **RAM**: 512MB minimum (1GB+ recommended)
- **Storage**: 100MB for Vector installation
- **Network**: Public IP or accessible endpoint

## Security Considerations

🔒 **Transport Security**
- All connections use TLS 1.2+ encryption
- WebSocket Secure (WSS) protocol
- Certificate validation required

🔒 **Network Security**
- Only port 4096 needs to be exposed
- Firewall rules can restrict source IPs
- No inbound SSH required for monitoring

🔒 **Data Security**
- No sensitive data transmitted
- Only system performance metrics
- No file system access or commands

## Quick Start Checklist

For experienced users, here's the abbreviated setup process:

- [ ] **Server Setup**: Ubuntu server with public IP
- [ ] **Domain**: DNS A record pointing to server IP
- [ ] **Firewall**: Allow ports 22 (SSH), 80 (HTTP), 4096 (WebSocket)
- [ ] **Vector**: Install and configure with system metrics
- [ ] **TLS**: Set up Let's Encrypt or custom certificates
- [ ] **Testing**: Verify WebSocket connection works
- [ ] **Actvt**: Add server in remote servers settings

## Performance Impact

### Server Performance
- **CPU Usage**: Less than 0.1% typical impact
- **Memory Usage**: ~10-20MB for Vector process
- **Network Usage**: ~1-5KB/s per connection
- **Storage**: Minimal (logs only)

### Network Requirements
- **Bandwidth**: ~1Mbps per connected client
- **Latency**: Less than 100ms recommended for smooth updates
- **Reliability**: Handles temporary disconnections gracefully

## Common Use Cases

### Development Servers
- Monitor staging environments
- Track deployment performance
- Debug production issues

### Production Monitoring
- Real-time server health
- Capacity planning
- Performance optimization

### Multi-Server Setups
- Database server monitoring
- Load balancer performance
- Microservices health

### GPU Workloads
- Machine learning training
- Rendering farms
- Cryptocurrency mining

## Getting Help

If you encounter issues during setup:

1. **Check Prerequisites**: Ensure your server meets requirements
2. **Review Troubleshooting**: Common issues and solutions documented
3. **Test Components**: Verify each step works before proceeding
4. **Check Logs**: Vector and system logs provide debugging information
5. **Vector Documentation**: Refer to [Vector's official docs](https://vector.dev/docs/) for advanced configuration
6. **Custom Support**: If you need help, reach out to our community or support channels

---

## Ready to Start?

Choose your setup path:

🚀 **Quick Setup**: If you have an Ubuntu server ready → [Prerequisites](prerequisites.md)

☁️ **Cloud Setup**: If you need to create a server → [Provider Guides](provider-guides/overview)

🔧 **Troubleshooting**: If you're having issues → [Troubleshooting Guide](troubleshooting.md)

Let's get started with remote monitoring!