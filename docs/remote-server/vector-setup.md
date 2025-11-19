---
sidebar_position: 4
---

# Vector Setup Guide

[Vector](https://vector.dev/docs/) is a high-performance observability data pipeline that collects, transforms, and routes system metrics. This guide walks through installing and configuring Vector for Actvt remote monitoring.

:::tip Automated Installation Available
This guide covers manual installation. For a faster setup, use our [automated installation script](automated-install.md):
```bash
curl -L https://actvt.io/install | bash
```
:::


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
#                    vector.toml Production Configuration                     #
###############################################################################

################################ 1. SOURCES ###################################

# Real-time system metrics
[sources.system_metrics]
type                 = "host_metrics"
collectors           = ["cpu", "memory", "disk", "filesystem", "network", "host", "load"]
scrape_interval_secs = 1

# System information (static details collected less frequently)
[sources.system_info]
type    = "exec"
command = [
  "sh", "-c",
  "echo \"{\\\"os\\\":\\\"$(grep PRETTY_NAME /etc/os-release | cut -d'=' -f2 | tr -d '\\\"')\\\",\\\"arch\\\":\\\"$(uname -m)\\\",\\\"domain\\\":\\\"$(hostname -f 2>/dev/null || hostname)\\\",\\\"ipv4\\\":\\\"$(ip route get 1 2>/dev/null | awk '{print $7;exit}' || hostname -I 2>/dev/null | awk '{print $1}' || echo 'unknown')\\\",\\\"ipv4_public\\\":\\\"$(curl -s --max-time 5 ifconfig.me || curl -s --max-time 5 icanhazip.com || echo 'unknown')\\\"}\""
]
mode = "scheduled"

[sources.system_info.scheduled]
exec_interval_secs = 15

# Optional: GPU metrics (requires nvidia-smi)
[sources.gpu_metrics]
type    = "exec"
command = [
  "nvidia-smi",
  "--query-gpu=utilization.gpu,memory.used,memory.total,gpu_name,temperature.gpu,power.draw,power.limit,fan.speed,clocks.current.graphics,clocks.current.memory,utilization.encoder,utilization.decoder,pstate",
  "--format=csv,noheader,nounits"
]
mode = "scheduled"

[sources.gpu_metrics.scheduled]
exec_interval_secs = 1

################################# 2. NORMALISE ################################

[transforms.metrics_to_logs]
type   = "metric_to_log"
inputs = ["system_metrics"]

# System information transform
[transforms.format_system_info]
type   = "remap"
inputs = ["system_info"]
source = '''
parsed = parse_json!(.message)
.metric_type = "system_info"
.os          = parsed.os
.arch        = parsed.arch
.domain      = parsed.domain
.ipv4        = parsed.ipv4
.ipv4_public = parsed.ipv4_public
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

# GPU metrics transform (parses CSV: utilization,memory.used,memory.total,gpu_name,temperature,power.draw,power.limit,fan.speed,clocks.graphics,clocks.memory,encoder,decoder,pstate)
[transforms.format_gpu]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
parts = split!(.message, ",")
gpu_utilization = to_float!(parts[0])
gpu_name = strip_whitespace!(parts[3])

# GPU utilization metric
.metric_type = "gpu_utilization"
.value       = gpu_utilization
.gpu_name    = gpu_name
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

[transforms.format_gpu_memory]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
parts = split!(.message, ",")
memory_used_mb = to_float!(parts[1])
memory_total_mb = to_float!(parts[2])
gpu_name = strip_whitespace!(parts[3])

# GPU memory metric
.metric_type = "gpu_memory"
.memory_used = memory_used_mb
.memory_total = memory_total_mb
.memory_percent = if memory_total_mb > 0 { ((memory_used_mb / memory_total_mb) ?? 0.0) * 100.0 } else { 0.0 }
.gpu_name    = gpu_name
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

# GPU temperature transform
[transforms.format_gpu_temperature]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
parts = split!(.message, ",")
temperature_celsius = to_float!(parts[4])
gpu_name = strip_whitespace!(parts[3])

# GPU temperature metric
.metric_type = "gpu_temperature"
.value       = temperature_celsius
.gpu_name    = gpu_name
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

# GPU clock frequency transform
[transforms.format_gpu_clocks]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
parts = split!(.message, ",")
clock_graphics_mhz = to_float!(parts[8])
clock_memory_mhz = to_float!(parts[9])
gpu_name = strip_whitespace!(parts[3])

# GPU clocks metric
.metric_type = "gpu_clocks"
.clock_graphics = clock_graphics_mhz
.clock_memory = clock_memory_mhz
.gpu_name    = gpu_name
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

# GPU power metrics transform
[transforms.format_gpu_power]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
parts = split!(.message, ",")
power_draw_watts = to_float!(parts[5])
power_limit_watts = to_float!(parts[6])
gpu_name = strip_whitespace!(parts[3])

# GPU power metric
.metric_type = "gpu_power"
.power_draw = power_draw_watts
.power_limit = power_limit_watts
.power_percent = if power_limit_watts > 0 { ((power_draw_watts / power_limit_watts) ?? 0.0) * 100.0 } else { 0.0 }
.gpu_name    = gpu_name
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

# GPU encoder/decoder utilization transform
[transforms.format_gpu_encoder_decoder]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
parts = split!(.message, ",")
encoder_utilization = to_float!(parts[10])
decoder_utilization = to_float!(parts[11])
gpu_name = strip_whitespace!(parts[3])

# GPU encoder/decoder metric
.metric_type = "gpu_encoder_decoder"
.encoder_utilization = encoder_utilization
.decoder_utilization = decoder_utilization
.gpu_name    = gpu_name
.host        = get_env_var("HOSTNAME") ?? "unknown-host"
.timestamp   = format_timestamp!(now(), format: "%+")
'''

# GPU fan speed and performance state transform
[transforms.format_gpu_fan_pstate]
type   = "remap"
inputs = ["gpu_metrics"]
source = '''
parts = split!(.message, ",")
fan_speed_percent = to_float!(parts[7])
pstate = strip_whitespace!(parts[12])
gpu_name = strip_whitespace!(parts[3])

# GPU fan and pstate metric
.metric_type = "gpu_fan_pstate"
.fan_speed = fan_speed_percent
.performance_state = pstate
.gpu_name    = gpu_name
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

# Network metrics transform
[transforms.format_network]
type   = "remap"
inputs = ["rewrite_mem_names"]
source = '''
hostname = if !is_null(.host) {
             .host
           } else if !is_null(.tags.host) {
             .tags.host
           } else {
             get_env_var("HOSTNAME") ?? "unknown-host"
           }

interface = .tags.device

if .name == "network_receive_bytes_total" {
  .metric_type = "network_rx_bytes"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else if .name == "network_transmit_bytes_total" {
  .metric_type = "network_tx_bytes"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else if .name == "network_receive_packets_total" {
  .metric_type = "network_rx_packets"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else if .name == "network_transmit_packets_total" {
  .metric_type = "network_tx_packets"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else if .name == "network_receive_errs_total" {
  .metric_type = "network_rx_errors"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else if .name == "network_transmit_errs_total" {
  .metric_type = "network_tx_errors"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else if .name == "network_receive_drop_total" {
  .metric_type = "network_rx_dropped"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else if .name == "network_transmit_drop_total" {
  .metric_type = "network_tx_dropped"
  .value       = .counter.value
  .interface   = interface
  .host        = hostname
} else {
  abort
}

.timestamp = format_timestamp!(now(), format: "%+")
'''

# Storage/Filesystem metrics transform
[transforms.format_storage]
type   = "remap"
inputs = ["rewrite_mem_names"]
source = '''
hostname = if !is_null(.host) {
             .host
           } else if !is_null(.tags.host) {
             .tags.host
           } else {
             get_env_var("HOSTNAME") ?? "unknown-host"
           }

filesystem = .tags.filesystem
device = .tags.device

if .name == "filesystem_total_bytes" {
  .metric_type = "disk_total"
  .value       = .gauge.value
  .filesystem  = filesystem
  .device      = device
  .host        = hostname
} else if .name == "filesystem_used_bytes" {
  .metric_type = "disk_used"
  .value       = .gauge.value
  .filesystem  = filesystem
  .device      = device
  .host        = hostname
} else if .name == "filesystem_free_bytes" {
  .metric_type = "disk_free"
  .value       = .gauge.value
  .filesystem  = filesystem
  .device      = device
  .host        = hostname
} else if .name == "disk_read_bytes_total" {
  .metric_type = "disk_read_bytes"
  .value       = .counter.value
  .device      = device
  .host        = hostname
} else if .name == "disk_written_bytes_total" {
  .metric_type = "disk_write_bytes"
  .value       = .counter.value
  .device      = device
  .host        = hostname
} else {
  abort
}

.timestamp = format_timestamp!(now(), format: "%+")
'''

# System uptime and load metrics transform
[transforms.format_system]
type   = "remap"
inputs = ["rewrite_mem_names"]
source = '''
hostname = if !is_null(.host) {
             .host
           } else if !is_null(.tags.host) {
             .tags.host
           } else {
             get_env_var("HOSTNAME") ?? "unknown-host"
           }

if .name == "uptime" {
  .metric_type = "uptime"
  .value       = .gauge.value
  .host        = hostname
} else if .name == "boot_time" {
  .metric_type = "boot_time"
  .value       = .gauge.value
  .host        = hostname
} else if .name == "load1" {
  .metric_type = "load_1min"
  .value       = .gauge.value
  .host        = hostname
} else if .name == "load5" {
  .metric_type = "load_5min"
  .value       = .gauge.value
  .host        = hostname
} else if .name == "load15" {
  .metric_type = "load_15min"
  .value       = .gauge.value
  .host        = hostname
} else if .name == "host_logical_cpus" {
  .metric_type = "cpu_logical_count"
  .value       = .gauge.value
  .host        = hostname
} else if .name == "host_physical_cpus" {
  .metric_type = "cpu_physical_count"
  .value       = .gauge.value
  .host        = hostname
} else {
  abort
}

.timestamp = format_timestamp!(now(), format: "%+")
'''

################################ 4. PRODUCTION SINK ###########################

[sinks.websocket_out]
type    = "websocket_server"
inputs  = ["format_metrics", "format_network", "format_storage", "format_system", "format_system_info", "format_gpu", "format_gpu_memory", "format_gpu_temperature", "format_gpu_clocks", "format_gpu_power", "format_gpu_encoder_decoder", "format_gpu_fan_pstate"]
address = "0.0.0.0:4096"

encoding.codec            = "json"
encoding.timestamp_format = "rfc3339"

[sinks.websocket_out.tls]
enabled  = true
crt_file = "/etc/vector/certs/server.crt"
key_file = "/etc/vector/certs/server.key"
# Optional: Enable mTLS client certificate verification (disabled by default)
# ca_file  = "/etc/vector/certs/mtls/ca.crt"
# verify_certificate = true

################################ 5. API #######################################

[api]
enabled = true
```

### Configuration Explanation

#### Sources Section
- **`system_metrics`**: Collects comprehensive system metrics every second:
  - CPU usage per core
  - Memory usage
  - Disk I/O
  - Filesystem usage
  - Network interface statistics
  - System host information
  - Load averages
- **`system_info`**: Collects static system information every 15 seconds (OS, architecture, domain, IPv4 address)
- **`gpu_metrics`**: Runs nvidia-smi command for comprehensive GPU metrics including utilization, memory, temperature, power, clocks, encoder/decoder usage, fan speed, and performance state (optional)

#### Transforms Section
- **`metrics_to_logs`**: Converts metrics to log format for processing
- **`format_system_info`**: Processes system information (OS, architecture, domain, IPv4 address)
- **`format_gpu`**: Processes GPU utilization from nvidia-smi CSV output
- **`format_gpu_memory`**: Processes GPU memory usage from nvidia-smi CSV output
- **`format_gpu_temperature`**: Processes GPU temperature in Celsius
- **`format_gpu_clocks`**: Processes GPU graphics and memory clock frequencies in MHz
- **`format_gpu_power`**: Processes GPU power draw and limits in Watts
- **`format_gpu_encoder_decoder`**: Processes GPU encoder and decoder utilization percentages
- **`format_gpu_fan_pstate`**: Processes GPU fan speed percentage and performance state (P0-P15)
- **`rewrite_mem_names`**: Normalizes memory metric names with "host_" prefix
- **`format_metrics`**: Filters and formats CPU and memory metrics
- **`format_network`**: Processes network interface metrics (rx/tx bytes, packets, errors, dropped)
- **`format_storage`**: Processes filesystem and disk I/O metrics
- **`format_system`**: Processes system uptime, load averages, and CPU counts

#### Sinks Section
- **`websocket_out`**: Creates WebSocket server on port 4096 with TLS
  - Combines all metric transforms into a single output stream
  - Optional mTLS client certificate verification (disabled by default)

#### API Section
- **`api`**: Enables Vector's management API (optional)

## mTLS Configuration (Client Certificate Authentication)

### What is mTLS?

Mutual TLS (mTLS) is an optional enhanced security feature that requires both the server and client to authenticate with certificates. By default, Actvt uses standard TLS (server authentication only) for simplicity. You can optionally enable mTLS to ensure that only authorized clients with valid certificates can connect to your monitoring endpoint.

### Certificate Structure

```
/etc/vector/certs/
├── server.crt          # Let's Encrypt server certificate
├── server.key          # Server private key
└── mtls/
    ├── ca.crt          # mTLS Certificate Authority (distribute to clients)
    ├── ca.key          # CA private key (keep secure!)
    ├── ca.srl          # CA serial number file
    ├── clients/
    │   └── actvt-client-001.crt  # Client certificate
    │   └── actvt-client-001.key  # Client private key
    └── generate-client.sh  # Script to generate new client certificates
```

### Setting Up mTLS

The automated installation script can set up mTLS when you set `ACTVT_ENABLE_MTLS=yes`. If you're setting up manually or enabling mTLS later, follow these steps:

#### Step 1: Generate Certificate Authority (CA)

Create a self-signed CA that will sign all client certificates:

```bash
# Create mTLS directory structure
sudo mkdir -p /etc/vector/certs/mtls/clients
sudo chmod 750 /etc/vector/certs/mtls
sudo chown vector:vector /etc/vector/certs/mtls

# Generate CA private key (4096-bit for strong security)
sudo openssl genrsa -aes256 -out /etc/vector/certs/mtls/ca.key 4096

# Create self-signed CA certificate (valid for 10 years)
sudo openssl req -new -x509 -sha256 -days 3650 \
  -key /etc/vector/certs/mtls/ca.key \
  -out /etc/vector/certs/mtls/ca.crt \
  -subj "/CN=Actvt-CA/O=Actvt/C=US"

# Set proper permissions
sudo chmod 600 /etc/vector/certs/mtls/ca.key
sudo chmod 644 /etc/vector/certs/mtls/ca.crt
sudo chown vector:vector /etc/vector/certs/mtls/ca.*
```

#### Step 2: Generate Client Certificate

Create a certificate for the Actvt client application:

```bash
# Generate client private key (2048-bit is sufficient)
sudo openssl genrsa -out /etc/vector/certs/mtls/clients/actvt-client-001.key 2048

# Create Certificate Signing Request (CSR)
sudo openssl req -new \
  -key /etc/vector/certs/mtls/clients/actvt-client-001.key \
  -out /etc/vector/certs/mtls/clients/actvt-client-001.csr \
  -subj "/CN=actvt-client-001/O=Actvt"

# Sign the client certificate with CA (valid for 1 year)
sudo openssl x509 -req -days 365 -sha256 \
  -in /etc/vector/certs/mtls/clients/actvt-client-001.csr \
  -CA /etc/vector/certs/mtls/ca.crt \
  -CAkey /etc/vector/certs/mtls/ca.key \
  -CAcreateserial \
  -out /etc/vector/certs/mtls/clients/actvt-client-001.crt \
  -extfile <(printf "extendedKeyUsage=clientAuth")

# Set proper permissions
sudo chmod 644 /etc/vector/certs/mtls/clients/actvt-client-001.crt
sudo chmod 600 /etc/vector/certs/mtls/clients/actvt-client-001.key
sudo chown vector:vector /etc/vector/certs/mtls/clients/actvt-client-001.*

# Clean up CSR
sudo rm /etc/vector/certs/mtls/clients/actvt-client-001.csr
```

#### Step 3: Distribute Client Certificates

Copy the following files to your Actvt client machine:
- `/etc/vector/certs/mtls/ca.crt` - CA certificate (for verification)
- `/etc/vector/certs/mtls/clients/actvt-client-001.crt` - Client certificate
- `/etc/vector/certs/mtls/clients/actvt-client-001.key` - Client private key

```bash
# Create a bundle for easy distribution
cd /etc/vector/certs/mtls
sudo tar -czf actvt-client-001-bundle.tar.gz \
  ca.crt \
  clients/actvt-client-001.crt \
  clients/actvt-client-001.key

# Copy to your local machine (replace USER and HOST)
scp /etc/vector/certs/mtls/actvt-client-001-bundle.tar.gz USER@HOST:~/
```

### Generating Additional Client Certificates

To create certificates for additional clients or devices, use the automated script:

```bash
# Create the generation script
sudo tee /etc/vector/certs/mtls/generate-client.sh > /dev/null << 'GENCERT_EOF'
#!/bin/bash
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or with sudo"
    exit 1
fi

CLIENT_NAME="${1:-}"
if [ -z "$CLIENT_NAME" ]; then
    echo "Usage: $0 <client-name>"
    echo "Example: $0 actvt-client-002"
    exit 1
fi

MTLS_DIR="/etc/vector/certs/mtls"
CLIENT_DIR="${MTLS_DIR}/clients"
CA_CRT="${MTLS_DIR}/ca.crt"
CA_KEY="${MTLS_DIR}/ca.key"
CLIENT_KEY="${CLIENT_DIR}/${CLIENT_NAME}.key"
CLIENT_CSR="${CLIENT_DIR}/${CLIENT_NAME}.csr"
CLIENT_CRT="${CLIENT_DIR}/${CLIENT_NAME}.crt"
BUNDLE="${MTLS_DIR}/${CLIENT_NAME}-bundle.tar.gz"

echo "Generating client certificate: ${CLIENT_NAME}"

# Generate client private key
openssl genrsa -out "$CLIENT_KEY" 2048

# Create CSR
openssl req -new \
  -key "$CLIENT_KEY" \
  -out "$CLIENT_CSR" \
  -subj "/CN=${CLIENT_NAME}/O=Actvt"

# Sign certificate
openssl x509 -req -days 365 -sha256 \
  -in "$CLIENT_CSR" \
  -CA "$CA_CRT" \
  -CAkey "$CA_KEY" \
  -CAcreateserial \
  -out "$CLIENT_CRT" \
  -extfile <(printf "extendedKeyUsage=clientAuth")

# Set permissions
chmod 644 "$CLIENT_CRT"
chmod 600 "$CLIENT_KEY"
chown vector:vector "$CLIENT_CRT" "$CLIENT_KEY"

# Clean up CSR
rm "$CLIENT_CSR"

# Create distribution bundle
cd "$MTLS_DIR"
tar -czf "$BUNDLE" \
  ca.crt \
  "clients/${CLIENT_NAME}.crt" \
  "clients/${CLIENT_NAME}.key"

echo "✓ Client certificate generated successfully"
echo "✓ Bundle created: ${BUNDLE}"
echo ""
echo "Distribute these files to the client:"
echo "  - ca.crt"
echo "  - clients/${CLIENT_NAME}.crt"
echo "  - clients/${CLIENT_NAME}.key"
GENCERT_EOF

# Make the script executable
sudo chmod +x /etc/vector/certs/mtls/generate-client.sh
```

Usage:
```bash
sudo /etc/vector/certs/mtls/generate-client.sh actvt-client-002
```

### Certificate Renewal

Client certificates are valid for 1 year by default. To renew:

```bash
# Generate new certificate with the same name
sudo /etc/vector/certs/mtls/generate-client.sh actvt-client-001

# Distribute the new certificate to the client
```

### Enabling mTLS (Optional Enhanced Security)

By default, Actvt uses TLS for server authentication only. For enhanced security, you can enable mTLS (mutual TLS) to require client certificate authentication:

**During Installation:**
```bash
export ACTVT_DOMAIN=monitor.yourdomain.com
export ACTVT_EMAIL=admin@yourdomain.com
export ACTVT_ENABLE_MTLS=yes
curl -L https://actvt.io/install | bash
```

**To Enable mTLS on Existing Installation:**

1. Generate mTLS certificates:
```bash
# The installation script includes a certificate generator
sudo /etc/vector/certs/mtls/generate-client.sh actvt-client-001
```

2. Edit Vector configuration:
```bash
sudo nano /etc/vector/vector.toml
```

3. Add these lines in the `[sinks.websocket_out.tls]` section:
```toml
ca_file  = "/etc/vector/certs/mtls/ca.crt"
verify_certificate = true
```

4. Restart Vector:
```bash
sudo systemctl restart vector
```

**Benefits of mTLS**: Requires client certificates for connections, providing mutual authentication and preventing unauthorized access even if the endpoint is exposed to the internet.

### Security Best Practices

1. **Protect CA Private Key**: The `ca.key` file should never leave the server. It's used only to sign new client certificates.

2. **Use Strong Passwords**: When generating the CA key, use a strong password to encrypt it.

3. **Limit Certificate Validity**: Client certificates expire after 1 year, requiring renewal. This limits the impact of compromised certificates.

4. **Per-Device Certificates**: Generate unique certificates for each client device. If one device is compromised, revoke only that certificate.

5. **Secure Distribution**: When transferring certificates to clients, use secure channels (SSH, encrypted USB, secure file sharing).

6. **Regular Rotation**: Establish a certificate rotation policy (e.g., renew every 6-12 months).

7. **Monitor Access**: Use Vector's logs to monitor which clients are connecting and investigate any suspicious activity.

### Troubleshooting mTLS

**Connection Refused / Certificate Errors**:
```bash
# Verify certificates exist
ls -la /etc/vector/certs/mtls/

# Check certificate validity
openssl x509 -in /etc/vector/certs/mtls/ca.crt -noout -dates
openssl x509 -in /etc/vector/certs/mtls/clients/actvt-client-001.crt -noout -dates

# Verify certificate chain
openssl verify -CAfile /etc/vector/certs/mtls/ca.crt \
  /etc/vector/certs/mtls/clients/actvt-client-001.crt
```

**Vector Startup Errors**:
```bash
# Check Vector logs
sudo journalctl -u vector -n 50 --no-pager

# Validate configuration
vector validate /etc/vector/vector.toml
```

**Client Cannot Connect**:
- Ensure client has the correct CA certificate, client certificate, and private key
- Verify client certificate is not expired
- Check firewall rules allow connections to port 4096
- Verify Vector is listening: `sudo netstat -tlnp | grep 4096`

### mTLS with Nginx Reverse Proxy

When using nginx as a reverse proxy for Vector, mTLS client certificate verification can optionally be configured at the nginx level for enhanced security. The automated installation script can configure this when `ACTVT_ENABLE_MTLS=yes` is set.

#### How It Works

In a reverse proxy setup, the traffic flow is:

```
Client (with mTLS cert) → Nginx (verifies client cert) → Vector (local TLS)
```

**Note**: When mTLS is enabled, nginx must verify client certificates before proxying to Vector. If nginx doesn't verify certificates, mTLS is effectively bypassed.

#### Automated Installation

The `curl -L https://actvt.io/install | bash` script can configure mTLS for nginx when `ACTVT_ENABLE_MTLS=yes` is set. There are two scenarios:

1. **Dedicated Server Block**: When no existing nginx configuration exists for the domain, the script creates a complete server block with mTLS enabled if requested:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # mTLS client certificate verification
    ssl_client_certificate /etc/vector/certs/mtls/ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    # Proxy to Vector
    location /actvt {
        proxy_pass https://127.0.0.1:4096;
        # ... WebSocket configuration ...
    }
}
```

2. **Existing Server Block**: When an existing nginx server block is detected, the script creates a snippet at `/etc/nginx/snippets/actvt-vector.conf`. If mTLS is enabled, the snippet includes commented mTLS directives that you must manually uncomment:

```nginx
# Actvt Vector WebSocket Configuration Snippet
# Add these directives to your existing server block

# mTLS client certificate verification (add to server block)
# IMPORTANT: Add these lines at the server level, not inside location blocks
#
# ssl_client_certificate /etc/vector/certs/mtls/ca.crt;
# ssl_verify_client on;
# ssl_verify_depth 2;
#

# WebSocket proxy location block
location /actvt {
    proxy_pass https://127.0.0.1:4096;
    # ... WebSocket configuration ...
}
```

#### Manual Configuration

If you're setting up nginx manually and want to enable mTLS, add these directives to your server block **at the server level** (not inside location blocks):

```nginx
server {
    # ... other SSL configuration ...

    # Optional: mTLS client certificate verification (only if ACTVT_ENABLE_MTLS=yes)
    ssl_client_certificate /etc/vector/certs/mtls/ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    location /actvt {
        proxy_pass https://127.0.0.1:4096;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        proxy_buffering off;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;  # Vector uses self-signed cert
    }
}
```

**Critical Configuration Notes**:

1. **Server Level Only**: The `ssl_client_certificate` and `ssl_verify_client` directives **must** be at the server block level. Placing them inside a location block will cause nginx configuration errors.

2. **Verification Mode**: `ssl_verify_client on` requires a valid client certificate for all connections to this server block. Use `ssl_verify_client optional` if you want mTLS only for specific locations.

3. **Depth Setting**: `ssl_verify_depth 2` allows for a certificate chain of up to 2 levels (client cert → CA).

#### Enabling mTLS in Proxy Mode

To enable mTLS when using nginx (disabled by default):

1. Add the mTLS directives to your nginx server block configuration:
```nginx
ssl_client_certificate /etc/vector/certs/mtls/ca.crt;
ssl_verify_client on;
ssl_verify_depth 2;
```

2. Ensure certificates have been generated (either through the install script with `ACTVT_ENABLE_MTLS=yes` or manually)

3. Test and reload nginx:
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

**Note**: mTLS provides enhanced security by requiring client certificates. This is recommended for public-facing endpoints or compliance requirements.

#### Verifying Nginx mTLS Configuration

Test that nginx is properly verifying certificates:

```bash
# Test with valid client certificate (should succeed)
curl --cert /path/to/client.crt \
     --key /path/to/client.key \
     --cacert /path/to/ca.crt \
     https://your-domain.com/actvt

# Test without client certificate (should fail with 400 Bad Request)
curl https://your-domain.com/actvt
```

Check nginx logs for certificate verification:
```bash
# View nginx error log
sudo tail -f /var/log/nginx/error.log

# Look for SSL verification messages
sudo grep -i "ssl" /var/log/nginx/error.log
```

#### Troubleshooting Nginx mTLS

**"400 Bad Request - No required SSL certificate was sent"**:
- This is correct behavior when a client connects without a certificate
- Ensure your client is presenting the certificate, key, and CA

**"400 Bad Request - SSL certificate error"**:
```bash
# Verify the CA certificate nginx is using
sudo openssl x509 -in /etc/vector/certs/mtls/ca.crt -noout -text

# Check nginx error log for details
sudo tail -n 50 /var/log/nginx/error.log
```

**Nginx fails to start or reload**:
```bash
# Test nginx configuration
sudo nginx -t

# Common issues:
# - ssl_client_certificate directive in wrong location (must be server level)
# - CA certificate file doesn't exist or has wrong permissions
# - Conflicting SSL directives
```

**Client connections bypass mTLS**:
```bash
# Verify nginx is actually requiring certificates
curl -v https://your-domain.com/actvt

# You should see "400 Bad Request" without client cert
# If you get a different response, nginx may not be verifying certificates
```

## GPU Configuration (Optional)

### If You Have NVIDIA GPU

If your server has an NVIDIA GPU and you want GPU monitoring:

```bash
# Verify nvidia-smi works
nvidia-smi

# Test the specific command Vector will use
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,gpu_name,temperature.gpu,power.draw,power.limit,fan.speed,clocks.current.graphics,clocks.current.memory,utilization.encoder,utilization.decoder,pstate --format=csv,noheader,nounits
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
4. The entire `[transforms.format_gpu_memory]` section
5. The entire `[transforms.format_gpu_temperature]` section
6. The entire `[transforms.format_gpu_clocks]` section
7. The entire `[transforms.format_gpu_power]` section
8. The entire `[transforms.format_gpu_encoder_decoder]` section
9. The entire `[transforms.format_gpu_fan_pstate]` section
10. Remove all GPU-related transform names from the inputs line in `[sinks.websocket_out]`

The inputs line should become:
```toml
inputs  = ["format_metrics", "format_network", "format_storage", "format_system", "format_system_info"]
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