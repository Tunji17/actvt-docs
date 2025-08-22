---
sidebar_position: 5
---

# Troubleshooting

This guide helps you diagnose and solve common issues when setting up Actvt remote server monitoring. Start with Quick Diagnostics to identify the problem area, then jump to the relevant section.

## Quick Diagnostics

Run these commands to quickly identify where the problem lies:

```bash
# 1. Check if Vector is installed and running
which vector && echo "✓ Vector installed" || echo "✗ Vector not found"
sudo systemctl is-active vector >/dev/null 2>&1 && echo "✓ Vector running" || echo "✗ Vector not running"

# 2. Check if port 4096 is listening
netstat -tlnp | grep 4096 && echo "✓ Port 4096 listening" || echo "✗ Port 4096 not listening"

# 3. Test basic connectivity (replace with your server IP)
nc -zv YOUR_SERVER_IP 4096 && echo "✓ Port 4096 reachable" || echo "✗ Port 4096 blocked"

# 4. Check certificates exist
ls -la /etc/vector/certs/ && echo "✓ Certificates found" || echo "✗ Certificates missing"

# 5. Quick Vector config validation
vector validate /etc/vector/vector.toml && echo "✓ Config valid" || echo "✗ Config invalid"
```

## Connection Issues

### Testing WebSocket Connection

The most common issue is WebSocket connectivity. Follow these steps to test:

#### Basic Connectivity Test

```bash
# Test if the port is reachable
telnet your-domain.com 4096
# Should connect, press Ctrl+] then type "quit" to exit

# Alternative test
nc -zv your-domain.com 4096
# Should show "Connection to your-domain.com port 4096 [tcp/*] succeeded!"
```

#### WebSocket Protocol Test

Install and use wscat to test the actual WebSocket connection:

```bash
# Install wscat (requires Node.js)
npm install -g wscat

# Test WebSocket connection (replace with your domain)
wscat -c wss://your-domain.com:4096

# You should see:
# Connected (press CTRL+C to quit)
# Followed by JSON data streaming from Vector
```

#### TLS Certificate Verification

```bash
# Test TLS certificate
openssl s_client -connect your-domain.com:4096 -servername your-domain.com

# Check certificate validity
openssl x509 -in /etc/vector/certs/server.crt -text -noout | grep -E "(Subject:|DNS:|Not After)"

# Verify certificate chain
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /etc/vector/certs/server.crt
```

### Connection Timeout Errors

**Symptoms**: Cannot connect to WebSocket, connection times out

**Diagnosis**:
```bash
# Check if Vector is running
sudo systemctl status vector

# Check if port is listening locally
netstat -tlnp | grep 4096

# Check firewall status
sudo ufw status verbose

# Test from server itself
wscat -c wss://localhost:4096
```

**Solutions**:

1. **Vector not running**:

```bash
# Start Vector
sudo systemctl start vector

# Check logs for errors
sudo journalctl -u vector -f
```

2. **Firewall blocking connections** - Check your provider's firewall guide:
   - [AWS Security Groups](provider-guides/aws-ec2.md)
   - [Hetzner Cloud Firewall](provider-guides/hetzner-cloud.md)
   - [DigitalOcean Firewall](provider-guides/digitalocean.md)
   - [GCP Firewall Rules](provider-guides/gcp.md)
   - [Azure NSG](provider-guides/azure.md)

3. **Local UFW firewall**:
```bash
sudo ufw allow 4096/tcp
sudo ufw reload
```

### DNS Resolution Issues

**Symptoms**: Domain not resolving to server IP

```bash
# Check DNS resolution
dig your-domain.com
nslookup your-domain.com

# Should return your server's IP address

# Test direct IP connection if DNS fails
wscat -c wss://YOUR_SERVER_IP:4096
```

**Solutions**:
- Verify DNS A record points to correct server IP
- Wait for DNS propagation (up to 24 hours)
- Use `8.8.8.8` DNS server temporarily: `nslookup your-domain.com 8.8.8.8`

### Cannot Connect from Actvt App

**Symptoms**: Actvt shows "Connection Failed" or similar

**Check these common issues**:

1. **URL format**: Must be `wss://your-domain.com:4096` (note the `wss://` and port `:4096`)

2. **Certificate trust**: macOS might not trust your Let's Encrypt certificate
```bash
# Test certificate from your Mac
curl -I https://your-domain.com:4096
```

3. **Network restrictions**: Your local network might block outgoing connections on port 4096

## Vector Issues

### Installation Problems

**"command not found: vector"**

```bash
# Check if vector is installed
ls -la /usr/bin/vector

# If not found, reinstall via package manager
# For Debian/Ubuntu:
sudo apt-get update && sudo apt-get install vector

# For RHEL/CentOS/Amazon Linux:
sudo yum install vector

# Verify installation
vector --version
```

**Permission denied errors**

```bash
# Fix Vector directory permissions
sudo chown -R vector:vector /etc/vector
sudo chown -R vector:vector /var/log/vector

# Fix certificate permissions specifically
sudo chown vector:vector /etc/vector/certs/server.*
sudo chmod 644 /etc/vector/certs/server.crt
sudo chmod 600 /etc/vector/certs/server.key
```

### Configuration Errors

**Configuration validation fails**

```bash
# Check configuration syntax
vector validate /etc/vector/vector.toml

# Common syntax errors and fixes:
```

**Common TOML syntax issues**:
- Missing quotes around strings: Use `"string"` not `string`
- Incorrect array format: Use `["item1", "item2"]`
- Wrong section headers: Use `[section.subsection]`
- Missing commas in arrays
- Incorrect indentation

**Example of common fixes**:
```toml
# Wrong
sources.system_metrics.type = host_metrics

# Correct
[sources.system_metrics]
type = "host_metrics"
```

### Runtime Issues

**"Port 4096 already in use"**

```bash
# Find what's using the port
sudo lsof -i :4096
sudo netstat -tlnp | grep 4096

# Kill conflicting process
sudo kill <PID>

# Or change Vector's port in vector.toml if needed
```

**Vector consuming high CPU/memory**

```bash
# Check Vector resource usage
sudo systemctl status vector

# Check Vector logs for errors
sudo journalctl -u vector -f

# Reduce collection frequency in vector.toml
[sources.system_metrics]
scrape_interval_secs = 5  # Instead of 1
```

**Vector not starting**

```bash
# Check Vector logs
sudo journalctl -u vector -n 50

# Common issues:
# - Configuration file errors
# - Permission issues with certificates
# - Port conflicts
# - Missing dependencies

# Test Vector manually (as vector user)
sudo -u vector vector --config /etc/vector/vector.toml --verbose
```

### GPU Monitoring Issues

**"nvidia-smi command not found"**

```bash
# Check if NVIDIA drivers are installed
nvidia-smi

# If not found and you have NVIDIA GPU:
sudo apt update
sudo apt install nvidia-driver-470  # or latest version
sudo reboot

# If no NVIDIA GPU, remove GPU sections from vector.toml
```

**GPU metrics not appearing**

```bash
# Test nvidia-smi command Vector uses
nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits

# Should return a number (GPU utilization percentage)

# Check Vector GPU transform in config
vector tap format_gpu --config /etc/vector/vector.toml
```

## TLS/Certificate Issues

### Let's Encrypt Problems

**"Domain validation failed"**

```bash
# Check DNS resolution
dig your-domain.com

# Ensure domain points to your server
# Check firewall allows port 80
sudo ufw status | grep 80
curl -I http://your-domain.com

# Stop services using port 80 during certificate generation
sudo systemctl stop apache2 nginx
# Note: Vector should not be using port 80, it uses port 4096
```

**"Port 80 already in use"**

```bash
# Find what's using port 80
sudo lsof -i :80

# Stop common web servers
sudo systemctl stop apache2
sudo systemctl stop nginx

# Retry certificate generation
sudo certbot certonly --standalone -d your-domain.com
```

**Let's Encrypt rate limiting**

```bash
# Check rate limit status at:
# https://crt.sh/?q=your-domain.com

# If hit rate limit:
# - Wait 1 week for rate limit reset
# - Use staging environment for testing:
sudo certbot certonly --staging --standalone -d your-domain.com
```

### Certificate Errors

**"Certificate verification failed"**

```bash
# Check certificate files exist
ls -la /etc/vector/certs/

# Check certificate validity
openssl x509 -in /etc/vector/certs/server.crt -text -noout | grep "Not After"

# Check certificate permissions
ls -la /etc/vector/certs/server.*

# Fix permissions if needed
sudo chown vector:vector /etc/vector/certs/server.*
sudo chmod 644 /etc/vector/certs/server.crt
sudo chmod 600 /etc/vector/certs/server.key
```

**Certificate expired**

```bash
# Check certificate expiration
openssl x509 -in /etc/vector/certs/server.crt -noout -dates

# Renew certificate manually
sudo certbot renew

# Copy renewed certificates to Vector directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /etc/vector/certs/server.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /etc/vector/certs/server.key

# Restart Vector
sudo systemctl restart vector
```

### Auto-Renewal Issues

**Cron job not running**

```bash
# Check if cron job exists
crontab -l | grep vector

# Check cron service is running
systemctl status cron

# Test renewal script manually
sudo /etc/vector/renew-certs.sh

# Check renewal script permissions
ls -la /etc/vector/renew-certs.sh
chmod +x /etc/vector/renew-certs.sh
```

## Provider-Specific Issues

### AWS EC2

**Security Group not allowing connections**

```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids YOUR_SECURITY_GROUP_ID

# Verify rules allow ports 22, 80, 4096
# Check if rules are applied to the right instances
```

**Instance not accessible**

```bash
# Check instance status
aws ec2 describe-instances --instance-ids YOUR_INSTANCE_ID

# Check system logs
aws ec2 get-console-output --instance-id YOUR_INSTANCE_ID
```

### Hetzner Cloud

**Firewall not attaching to server**

```bash
# Check firewall status
hcloud firewall describe actvt-monitoring

# Check if firewall is applied to server
hcloud server describe YOUR_SERVER_NAME | grep -i firewall

# Apply firewall manually
hcloud firewall apply-to-resource actvt-monitoring --type server --server YOUR_SERVER_NAME
```

### DigitalOcean

**Cloud Firewall conflicts**

```bash
# Check firewall rules
doctl compute firewall list
doctl compute firewall get actvt-monitoring

# Check if multiple firewalls are applied
doctl compute droplet get YOUR_DROPLET_NAME
```

### Google Cloud Platform

**Network tags not working**

```bash
# Check instance tags
gcloud compute instances describe YOUR_INSTANCE_NAME --zone=YOUR_ZONE --format="value(tags.items[])"

# Check firewall targets tags
gcloud compute firewall-rules describe actvt-websocket
```

### Microsoft Azure

**NSG rules not effective**

```bash
# Check effective security rules
az network nic list-effective-nsg --name YOUR_NIC_NAME --resource-group YOUR_RESOURCE_GROUP

# Check if NSG is associated with VM
az vm show --resource-group YOUR_RESOURCE_GROUP --name YOUR_VM_NAME
```

## Performance Issues

### Slow WebSocket Connections

**Symptoms**: Delayed data updates, high latency

**Diagnosis**:
```bash
# Check network latency to server
ping -c 10 your-server-ip

# Check server CPU and memory usage
top
htop

# Check Vector performance
ps aux | grep vector
```

**Solutions**:
- Increase collection interval in vector.toml
- Choose server location closer to your location
- Upgrade server resources

### High Resource Usage

**Vector consuming too many resources**

```bash
# Monitor Vector resource usage
top -p $(pgrep vector)

# Check Vector configuration
vector validate /etc/vector/vector.toml

# Reduce collection frequency
[sources.system_metrics]
scrape_interval_secs = 5  # Instead of 1 second
```

## Debugging Tools & Commands

### Essential Commands

```bash
# System information
uname -a
lsb_release -a
free -h
df -h

# Network diagnostics
netstat -tlnp | grep 4096
ss -tlnp | grep 4096
lsof -i :4096

# Process monitoring
sudo systemctl status vector
sudo systemctl is-active vector
sudo systemctl is-enabled vector

# Log monitoring
sudo journalctl -u vector -f
sudo journalctl -u vector -n 100
sudo journalctl -u vector --since "1 hour ago"

# Certificate debugging
openssl x509 -in /etc/vector/certs/server.crt -text -noout
openssl s_client -connect localhost:4096 -servername your-domain.com
```

### Log File Locations

```bash
# Vector logs (via journald)
sudo journalctl -u vector

# System logs
/var/log/syslog
/var/log/auth.log

# Certificate renewal logs (if using custom renewal script)
/var/log/vector/cert-renewal.log

# Let's Encrypt logs
/var/log/letsencrypt/letsencrypt.log

# View Vector logs with different options
sudo journalctl -u vector -f                    # Follow logs
sudo journalctl -u vector -n 100                # Last 100 lines
sudo journalctl -u vector --since "1 hour ago"  # Last hour
sudo journalctl -u vector --until "2 hours ago" # Up to 2 hours ago
```

## Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "connection refused" | Port not listening or firewall blocking | Check Vector status, firewall rules |
| "certificate verify failed" | Invalid or expired certificate | Renew certificate, check file permissions |
| "port already in use" | Another service using port 4096 | Find and stop conflicting service |
| "permission denied" | File permission issues | Fix permissions on Vector directories/files |
| "command not found: vector" | Vector not in PATH or not installed | Add to PATH or reinstall Vector |
| "validation failed" | TOML configuration errors | Check syntax with `vector validate` |
| "nvidia-smi not found" | NVIDIA drivers not installed | Install drivers or remove GPU config |
| "domain validation failed" | DNS not pointing to server or port 80 blocked | Fix DNS, check firewall allows port 80 |

## Getting Help

### Collecting Information for Support

When asking for help, include this information:

```bash
# System information
echo "=== System Info ==="
uname -a
lsb_release -a

echo "=== Vector Status ==="
vector --version
sudo systemctl status vector

echo "=== Network Status ==="
netstat -tlnp | grep 4096
sudo ufw status

echo "=== Certificate Status ==="
ls -la /etc/vector/certs/
openssl x509 -in /etc/vector/certs/server.crt -noout -dates

echo "=== Vector Logs (last 50 lines) ==="
sudo journalctl -u vector -n 50

echo "=== Vector Config Validation ==="
vector validate /etc/vector/vector.toml
```

### Community Resources

- **Documentation**: Check this documentation for detailed setup guides
- **Provider Support**: Contact your cloud provider for infrastructure issues
- **Vector Documentation**: [Official Vector docs](https://vector.dev/docs/) for advanced configuration

### Reporting Issues

When reporting issues, include:

1. **Exact error message** from logs
2. **System information** (OS, provider, instance type)
3. **Steps to reproduce** the issue
4. **Configuration files** (remove sensitive information)
5. **Log files** showing the error

With detailed information, issues can be resolved much faster.

---

## Quick Reference

### Most Common Issues (90% of problems)

1. **Firewall blocking port 4096** → Check cloud provider firewall
2. **Vector not running** → Start with `sudo systemctl start vector`
3. **Certificate issues** → Check files exist in `/etc/vector/certs/` and have correct permissions
4. **Wrong URL format in Actvt** → Use `wss://your-domain.com:4096`
5. **DNS not resolving** → Check domain points to server IP

### Quick Fixes

```bash
# Restart everything
sudo systemctl restart vector

# Fix common permissions
sudo chown -R vector:vector /etc/vector
sudo chmod 600 /etc/vector/certs/server.key

# Test connection
wscat -c wss://your-domain.com:4096
```

Most issues can be resolved by checking these basics: Vector running, port open, certificates valid, DNS correct.