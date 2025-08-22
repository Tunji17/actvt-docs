---
sidebar_position: 3
---

# Vector Setup Guide

[Vector](https://vector.dev/docs/) is a high-performance observability data pipeline that collects, transforms, and routes system metrics. This guide walks through installing and configuring Vector for Actvt remote monitoring.

## What is Vector?

Vector is an open-source tool built in Rust that:
- 📡 **Collects** system metrics (CPU, memory, GPU, network)
- ⚙️ **Transforms** raw data into standardized formats
- 📏 **Routes** processed metrics to various destinations
- 🚀 **Performs** with minimal resource usage

## Installation

### Step 1: Install Vector via Package Repository

Vector provides official package repositories for easy installation and updates. Choose your distribution:

#### For Debian/Ubuntu Systems

```bash
# Add Vector repository and install script
bash -c "$(curl -L https://setup.vector.dev)"

# Update package list and install Vector
sudo apt-get update
sudo apt-get install vector
```

#### For RHEL/CentOS/Amazon Linux Systems

```bash
# Add Vector repository and install script
bash -c "$(curl -L https://setup.vector.dev)"

# Install Vector (use dnf on newer systems)
sudo yum install vector
```

### Step 2: Verify Installation

The package installation automatically:
- Creates the `vector` system user and group
- Sets up systemd service files
- Creates configuration directories with proper permissions
- Installs Vector binary to `/usr/bin/vector`

Verify the installation:

```bash
# Check Vector version
vector --version

# Verify systemd service is available
sudo systemctl status vector

# Check that Vector user was created
id vector
```

You should see output like:
```
vector 0.34.0 (x86_64-unknown-linux-gnu)
● vector.service - Vector
   Loaded: loaded (/lib/systemd/system/vector.service; disabled; vendor preset: enabled)
   Active: inactive (dead)
uid=999(vector) gid=999(vector) groups=999(vector)
```

## Configuration

### Step 3: Create Vector Configuration

The package installation automatically creates:
- `/etc/vector/` directory for configuration files
- `/var/log/vector/` directory for logs (when needed)
- Proper ownership and permissions

Now create the main configuration file:

```bash
# Create configuration file
sudo nano /etc/vector/vector.toml
```

Copy and paste this complete configuration:

```toml
###############################################################################
#                    vector.toml Production Configuration                   #
###############################################################################

################################ 1. SOURCES ###################################

[sources.system_metrics]
type                 = "host_metrics"
collectors           = ["cpu", "memory"]
scrape_interval_secs = 1

# Optional: GPU metrics (requires nvidia-smi)
[sources.gpu_metrics]
type    = "exec"
command = [
  "nvidia-smi",
  "--query-gpu=utilization.gpu",
  "--format=csv,noheader,nounits"
]
mode = "scheduled"

[sources.gpu_metrics.scheduled]
exec_interval_secs = 1

################################# 2. NORMALISE ################################

[transforms.metrics_to_logs]
type   = "metric_to_log"
inputs = ["system_metrics"]

[transforms.format_gpu]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
.metric_type = "gpu"
.value       = to_float!(.message)
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

[transforms.rewrite_mem_names]
type   = "remap"
inputs = ["metrics_to_logs"]
source = '''
if starts_with!(.name, "memory_") {
  .name = "host_" + to_string!(.name)
}
'''

################################ 3. FILTER & TAG ##############################

[transforms.format_metrics]
type   = "remap"
inputs = ["rewrite_mem_names"]
source = '''
# ----- derive a reliable host field -----
hostname = if !is_null(.host) {
             .host
           } else if !is_null(.tags.host) {
             .tags.host
           } else {
             get_env_var("HOSTNAME") ?? "unknown-host"
           }

# -------- filter + rename the metrics we care about --------
if .name == "host_memory_used_bytes" {
  .metric_type = "memory_used"
  .value       = .gauge.value
  .host        = hostname

} else if .name == "host_memory_total_bytes" {
  .metric_type = "memory_total"
  .value       = .gauge.value
  .host        = hostname

} else if (.name == "host_cpu_seconds_total" || .name == "cpu_seconds_total") && .tags.mode == "idle" {
  .metric_type = "cpu_idle"
  .value       = .counter.value
  .cpu         = .tags.cpu
  .host        = hostname

} else if (.name == "host_cpu_seconds_total" || .name == "cpu_seconds_total") {
  .metric_type = "cpu_total"
  .value       = .counter.value
  .cpu         = .tags.cpu
  .host        = hostname

} else {
  abort   # drop everything else
}

.timestamp = format_timestamp!(now(), format: "%+")
'''

################################ 4. PRODUCTION SINK ###########################

[sinks.websocket_out]
type    = "websocket_server"
inputs  = ["format_metrics", "format_gpu"]
address = "0.0.0.0:4096"

encoding.codec            = "json"
encoding.timestamp_format = "rfc3339"

[sinks.websocket_out.tls]
enabled  = true
crt_file = "/etc/vector/certs/server.crt"
key_file = "/etc/vector/certs/server.key"

################################ 5. API #######################################

[api]
enabled = true
```

### Configuration Explanation

#### Sources Section
- **`system_metrics`**: Collects CPU and memory metrics every second
- **`gpu_metrics`**: Runs nvidia-smi command for GPU data (optional)

#### Transforms Section
- **`metrics_to_logs`**: Converts metrics to log format for processing
- **`format_gpu`**: Processes GPU command output into structured data
- **`rewrite_mem_names`**: Normalizes memory metric names
- **`format_metrics`**: Filters and formats metrics for WebSocket output

#### Sinks Section
- **`websocket_out`**: Creates WebSocket server on port 4096 with TLS

#### API Section
- **`api`**: Enables Vector's management API (optional)

## GPU Configuration (Optional)

### If You Have NVIDIA GPU

If your server has an NVIDIA GPU and you want GPU monitoring:

```bash
# Verify nvidia-smi works
nvidia-smi

# Test the specific command Vector will use
nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits
```

If this works, your configuration is ready.

### If You Don't Have NVIDIA GPU

Edit the configuration to remove GPU sections:

```bash
# Edit the configuration file
sudo nano /etc/vector/vector.toml
```

Remove or comment out these sections:
1. The entire `[sources.gpu_metrics]` section
2. The entire `[sources.gpu_metrics.scheduled]` section  
3. The entire `[transforms.format_gpu]` section
4. Remove `"format_gpu"` from the inputs line in `[sinks.websocket_out]`

The inputs line should become:
```toml
inputs  = ["format_metrics"]
```

## Testing Configuration

### Step 4: Validate Configuration

Before running Vector, validate your configuration:

```bash
# Validate configuration file
vector validate /etc/vector/vector.toml
```

You should see:
```
✓ Validated
```

If you do not have TLS certificates set up yet, you will see an error

```
x Sink "websocket_out": Could not open certificate file "/etc/vector/certs/server.crt": No such file or directory
```

If you see any other errors, review the configuration file for syntax issues. Now proceed to the [TLS Configuration Guide](tls-configuration.md) to set up certificates before running Vector.

## Running Vector

### Step 6: Start Vector Service

Enable and start Vector as a systemd service:

```bash
# Enable Vector to start on boot
sudo systemctl enable vector

# Start Vector service
sudo systemctl start vector
```

### Step 7: Verify Vector is Running

```bash
# Check Vector service status
sudo systemctl status vector

# View Vector logs
sudo journalctl -u vector -f

# Verify WebSocket server is listening
sudo netstat -tlnp | grep 4096
```

You should see:
- Service status showing "active (running)"
- Log messages showing successful startup
- Port 4096 in LISTEN state

Also from your local machine, you can test the WebSocket connection (replace `monitor.yourdomain.com` with your server's domain):

```bash
# Test WebSocket connection
wscat -c wss://monitor.yourdomain.com:4096
```

## Managing Vector

### Common Management Commands

```bash
# Check Vector status
sudo systemctl status vector

# Stop Vector
sudo systemctl stop vector

# Start Vector
sudo systemctl start vector

# Restart Vector
sudo systemctl restart vector

# Reload configuration without restarting
sudo systemctl reload vector

# View live logs
sudo journalctl -u vector -f

# View last 100 log lines
sudo journalctl -u vector -n 100

# View logs from last hour
sudo journalctl -u vector --since "1 hour ago"

# Enable Vector to start on boot
sudo systemctl enable vector

# Disable Vector from starting on boot
sudo systemctl disable vector
```

### Advanced Service Configuration

For enhanced service management, you can create a systemd override file:

```bash
# Create override directory
sudo mkdir -p /etc/systemd/system/vector.service.d

# Create override configuration
sudo nano /etc/systemd/system/vector.service.d/override.conf
```

Add this configuration for robust restart policies:

```ini
[Service]
# Enhanced restart policies
Restart=always
RestartSec=10
StartLimitBurst=5
StartLimitInterval=60s

# Resource limits (optional)
LimitNOFILE=65536
LimitNPROC=4096

# Additional environment variables (optional)
Environment="VECTOR_LOG=info"
```

After creating the override file:

```bash
# Reload systemd to apply changes
sudo systemctl daemon-reload

# Restart Vector to apply new configuration
sudo systemctl restart vector
```

### Package Updates

To update Vector to the latest version:

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get upgrade vector

# RHEL/CentOS/Amazon Linux
sudo yum update vector  # or 'sudo dnf update vector' on newer systems

# After updating, restart the service
sudo systemctl restart vector
```

### Vector API (Optional)

If you enabled the API, you can check Vector health:

```bash
# Check Vector health
curl http://localhost:8686/health

# Get Vector metrics
curl http://localhost:8686/metrics
```

## Troubleshooting Vector

### Common Issues

**"command not found: vector"**
```bash
# Verify installation path
which vector

# If not found, check installation
ls -la /usr/local/bin/vector

# Add to PATH if needed
export PATH="$PATH:/usr/local/bin"
echo 'export PATH="$PATH:/usr/local/bin"' >> ~/.bashrc
```

**"Permission denied" errors**
```bash
# Fix permissions
sudo chown -R $USER:$USER /etc/vector
sudo chown -R $USER:$USER /var/log/vector

# For certificate directory (after TLS setup)
sudo chown -R $USER:$USER /etc/vector/certs
```

**"nvidia-smi command not found"**
```bash
# If you don't have NVIDIA GPU, remove GPU sections from config
# If you do have NVIDIA GPU, install drivers:
sudo apt update
sudo apt install nvidia-driver-470  # or latest available
sudo reboot
```

**"Port 4096 already in use"**
```bash
# Find what's using the port
sudo lsof -i :4096

# Stop conflicting service
sudo kill <PID>

# Or change port in vector.toml if needed
```

**Configuration validation fails**
```bash
# Check for syntax errors
vector validate /etc/vector/vector.toml

# Common issues:
# - Missing quotes around strings
# - Incorrect indentation
# - Missing commas in arrays
# - Typos in section names
```

### Vector Performance

**Monitor Vector resource usage:**
```bash
# Check Vector CPU and memory usage
top -p $(pgrep vector)

# Or use htop for better visualization
htop -p $(pgrep vector)
```

Vector should typically use:
- **CPU**: Less than 0.1% when idle, less than 1% under load
- **Memory**: 10-20MB typical usage
- **Network**: Minimal unless actively streaming

## Configuration Customization

### Adjusting Collection Intervals

To reduce resource usage or change update frequency:

```toml
# In vector.toml, adjust these values:

[sources.system_metrics]
scrape_interval_secs = 5  # Collect every 5 seconds instead of 1

[sources.gpu_metrics.scheduled]
exec_interval_secs = 5    # GPU metrics every 5 seconds
```

### Filtering Specific CPUs or Interfaces

You can filter which CPUs or network interfaces to monitor:

```toml
[sources.system_metrics]
type      = "host_metrics"
collectors = ["cpu", "memory"]

[sources.system_metrics.cpu]
# Only monitor specific CPU cores
cores = [0, 1, 2, 3]

[sources.system_metrics.network]
# Only monitor specific interfaces
interfaces = ["eth0", "wlan0"]
```

## Next Steps

Once Vector is successfully installed and configured:

1. **[Set up TLS certificates](tls-configuration.md)** - Required for secure WebSocket connections
2. **Configure firewall** - Allow WebSocket connections on port 4096 (see [Provider Guides](provider-guides/overview))
3. **[Test the connection](troubleshooting.md#testing-websocket-connection)** - Verify everything works
4. **[Connect from Actvt](../getting-started/quick-start.md)** - Add server to Actvt

**Important**: Vector will not accept WebSocket connections until TLS certificates are properly configured. Continue to the **[TLS Configuration Guide](tls-configuration.md)** next.