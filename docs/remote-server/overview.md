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
    ┌──────────────┐             ┌────────────────────────────────────┐
    │  Actvt       │             │ Remote Server                      │
    │  macOS       │◄────WSS────►│  Ubuntu/Linux   ┌─────────┐       │
    │   App        │             │                 │ Vector  │       │
    │              │             │  Modes:         └─────────┘       │
    └──────────────┘             │  • Standalone: 0.0.0.0:4096 (WSS) │
                                 │  • Proxy: nginx → /actvt (WSS)    │
                                 └────────────────────────────────────┘
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


## Installation Options

### Option 1: Automated Installation (Recommended)

The fastest way to set up your remote server is using our automated installation script:

```bash
curl -L https://actvt.io/install | bash
```

This single command will:
- ✅ Detect your Linux distribution automatically
- ✅ Install Vector and all dependencies
- ✅ Configure system metrics collection
- ✅ Set up TLS certificates with Let's Encrypt
- ✅ Configure firewall rules
- ✅ Start and enable the monitoring service

**Requirements:**
- Root or sudo access
- A domain name pointing to your server
- Ports depend on mode:
  - Proxy mode (nginx detected): 80 and 443 must be accessible; Vector listens on localhost
  - Standalone: 80, 443, and 4096 must be accessible

The installation takes approximately 3-5 minutes and handles all configuration automatically.

### Option 2: Manual Installation

For advanced users who prefer manual control, follow the step-by-step guides below.

## Setup Process

Setting up remote monitoring manually involves several steps:

### 1. [Prerequisites](prerequisites.md)
Verify your server meets the requirements and prepare your environment.

### 2. [Vector Installation & Setup](vector-setup.md)
Install Vector data pipeline software and configure it for system monitoring.

### 3. [TLS Configuration](tls-configuration.md)
Set up SSL certificates for secure WebSocket connections.

### 4. Firewall Setup
Configure firewalls based on your provider - see [Provider-Specific Guides](provider-guides/overview) for detailed firewall instructions.
In proxy mode, do not expose port 4096 publicly; nginx proxies WSS at `/actvt` over 443.

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
- In proxy mode, only ports 80/443 are exposed; Vector listens on 127.0.0.1
- In standalone mode, port 4096 is exposed for WSS
- Firewall rules can restrict source IPs
- No inbound SSH required for monitoring

🔒 **Data Security**
- No sensitive data transmitted
- Only system performance metrics
- No file system access or commands

## Quick Start Checklist

### Automated Installation
The easiest path - just run our installation script:

- [ ] **Server Setup**: Ubuntu/Debian/CentOS server with public IP and root access
- [ ] **Domain**: DNS A record pointing to server IP
- [ ] **Run Script**: `curl -L https://actvt.io/install | bash`
- [ ] **Connect**: Add server in Actvt → Settings → Remote Servers

### Manual Installation
For experienced users who prefer manual control:

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

⚡ **Automated Setup**: Use the one-command installation script (recommended)
```bash
curl -L https://actvt.io/install | bash
```

🚀 **Manual Setup**: If you prefer step-by-step control → [Prerequisites](prerequisites.md)

☁️ **Cloud Setup**: If you need to create a server first → [Provider Guides](provider-guides/overview)

🔧 **Troubleshooting**: If you're having issues → [Troubleshooting Guide](troubleshooting.md)

Let's get started with remote monitoring!