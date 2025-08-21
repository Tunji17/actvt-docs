---
sidebar_position: 1
---

# Provider-Specific Setup Guides

This section contains detailed setup instructions for different cloud providers and hosting platforms. Each guide includes provider-specific configuration steps, networking setup, and optimization tips.

## Supported Providers

Each guide focuses on firewall configuration specific to that cloud provider, with both console and CLI instructions.

### ✅ AWS EC2
**[AWS EC2 Firewall Setup Guide](aws-ec2.md)**

Configuring AWS Security Groups for Actvt monitoring:
- Security Group rules configuration
- Console and CLI setup methods
- VPC firewall considerations
- Troubleshooting connectivity

### ✅ Hetzner Cloud
**[Hetzner Cloud Firewall Setup Guide](hetzner-cloud.md)**

Configuring Hetzner Cloud Firewalls for Actvt monitoring:
- Cloud Firewall rules setup
- Console and hcloud CLI methods
- Server firewall integration
- Security best practices

### ✅ DigitalOcean
**[DigitalOcean Firewall Setup Guide](digitalocean.md)**

Configuring DigitalOcean Cloud Firewalls for Actvt monitoring:
- Cloud Firewall configuration
- Console and doctl CLI methods
- Droplet firewall management
- Load balancer integration

### ✅ Google Cloud Platform
**[GCP Firewall Setup Guide](gcp.md)**

Configuring GCP VPC Firewall Rules for Actvt monitoring:
- VPC firewall rules configuration
- Console and gcloud CLI methods
- Network tags and targeting
- Service account integration

### ✅ Microsoft Azure
**[Azure Firewall Setup Guide](azure.md)**

Configuring Azure Network Security Groups for Actvt monitoring:
- NSG rules configuration
- Portal and Azure CLI methods
- Application Security Groups
- Azure Firewall integration

---

## Need Help?

If your provider isn't listed here:

1. **Follow the general setup guide** - Most steps are provider-agnostic
2. **Focus on networking** - Ensure ports 22, 80, and 4096 are accessible
3. **Check provider documentation** - For firewall and DNS configuration
4. **Read our guide** - Check our [Troubleshooting Guide](../troubleshooting.md)
