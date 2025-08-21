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

### Step 1: Download and Install Vector

Vector provides an official installation script that works on most Linux distributions:

```bash
# Download and run the Vector installation script
curl --proto '=https' --tlsv1.2 -sSfL https://sh.vector.dev | bash
```

This script will:
- Detect your operating system
- Download the appropriate Vector binary
- Install Vector to `/usr/local/bin/vector`
- Set up the necessary permissions

### Step 2: Add Vector to PATH

After installation, add Vector to your shell PATH:

```bash
# Add Vector to PATH (bash/zsh)
source ~/.zprofile

# For bash users, you might need:
source ~/.bashrc

# Verify installation
vector --version
```

You should see output like:
```
vector 0.34.0 (x86_64-unknown-linux-gnu)
```

### Alternative: Manual Installation

If the script doesn't work, you can install manually:

```bash
# Download Vector binary
wget https://github.com/vectordotdev/vector/releases/download/v0.34.0/vector-0.34.0-x86_64-unknown-linux-gnu.tar.gz

# Extract and install
tar -xzf vector-0.34.0-x86_64-unknown-linux-gnu.tar.gz
sudo mv vector-x86_64-unknown-linux-gnu/bin/vector /usr/local/bin/
sudo chmod +x /usr/local/bin/vector

# Verify installation
vector --version
```

## Configuration

### Step 3: Create Configuration Directory

```bash
# Create Vector configuration directory
sudo mkdir -p /etc/vector
sudo mkdir -p /var/log/vector

# Set permissions
sudo chown -R $USER:$USER /etc/vector
sudo chown -R $USER:$USER /var/log/vector
```

### Step 4: Create Vector Configuration

Create the main configuration file:

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

### Step 5: Validate Configuration

Before running Vector, validate your configuration:

```bash
# Validate configuration file
vector validate /etc/vector/vector.toml
```

You should see:
```
✓ Validated
```

If you see errors, review the configuration file for syntax issues.

### Step 6: Test Vector Output

Vector includes a powerful "tap" feature to test data processing, make sure api is enabled in your configuration:

```bash
# Test system metrics processing (run this in background)
vector --config /etc/vector/vector.toml &

# In another terminal, test the output
vector tap format_metrics --config /etc/vector/vector.toml
```

You should see JSON output like:
```json
{
  "host": "your-hostname",
  "metric_type": "cpu_idle",
  "cpu": "0",
  "value": 12345.67,
  "timestamp": "2024-01-15T10:30:45Z"
}
```

Press `Ctrl+C` to stop the tap output.

## Running Vector

### Step 7: Start Vector Service

For production use, run Vector as a background service:

```bash
# Stop any existing Vector process
pkill -f "vector --config /etc/vector/vector.toml"

# Start Vector in background with nohup
nohup vector --config /etc/vector/vector.toml > /var/log/vector/stdout.log 2>&1 &
disown
```

### Step 8: Verify Vector is Running

```bash
# Check if Vector process is running
ps aux | grep vector

# Check Vector logs
tail -f /var/log/vector/stdout.log

# Verify WebSocket server is listening
sudo netstat -tlnp | grep 4096
```

You should see:
- Vector process in ps output
- Log messages showing successful startup
- Port 4096 in LISTEN state

## Managing Vector

### Common Management Commands

```bash
# Check Vector status
ps aux | grep vector

# Stop Vector
pkill -f "vector --config /etc/vector/vector.toml"

# Start Vector
nohup vector --config /etc/vector/vector.toml > /var/log/vector/stdout.log 2>&1 &
disown

# Restart Vector
pkill -f "vector --config /etc/vector/vector.toml"
sleep 2
nohup vector --config /etc/vector/vector.toml > /var/log/vector/stdout.log 2>&1 &
disown

# View logs
tail -f /var/log/vector/stdout.log

# View last 100 log lines
tail -n 100 /var/log/vector/stdout.log
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