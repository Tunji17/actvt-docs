---
sidebar_position: 1
---

# Installation

This guide will walk you through installing Actvt on your macOS system. Choose the installation method that works best for you.

## System Requirements

Before installing, verify your system meets these requirements:

- **Operating System**: macOS 13.0 (Ventura) or later
- **Architecture**: Apple Silicon (M1/M2/M3/M4)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50MB available space
- **Permissions**: Administrator access for installation

## Installation Methods

### Method 1: Direct Download (Recommended)

1. **Download the Latest Release**
   - Visit [actvt.io/download](https://actvt.io/download)
   - Click "Download for Apple silicon" to get the latest `.dmg` file
   - The download should start automatically

2. **Install the Application**
   - Open the downloaded `.dmg` file
   - Drag the Actvt app to your Applications folder
   - Wait for the copy process to complete

3. **Launch Actvt**
   - Open Applications folder or use Spotlight (⌘+Space)
   - Double-click on Actvt to launch
   - Grant necessary permissions when prompted

### Method 2: Homebrew Installation

If you prefer using Homebrew:

```bash
# Install using Homebrew Cask
brew install --cask actvt

# Launch the application
open /Applications/Actvt.app
```

## First Launch Setup

### Security & Permissions

When you first launch Actvt, macOS will request several permissions:

1. **Gatekeeper Warning**
   - If you see "Actvt can't be opened because it's from an unidentified developer"
   - Right-click on the app → "Open" → "Open" in the dialog
   - Or go to System Preferences → Security & Privacy → "Open Anyway"

2. **System Monitoring Permissions**
   ```
   Actvt needs permission to monitor system performance.
   This includes CPU, memory, GPU, and network metrics.
   ```
   - Click "Allow" when prompted
   - If missed, go to System Preferences → Security & Privacy → Privacy

3. **Menu Bar Access**
   - Actvt will request permission to appear in your menu bar
   - This is required for the core functionality

## Verification

To verify Actvt is installed correctly:

1. **Check Menu Bar**
   - Look for the Actvt icon in your menu bar
   - It should show animated activity based on CPU usage

2. **Open Dashboard**
   - Open Applications folder or use Spotlight (⌘+Space)
   - Double-click on Actvt to launch
   - Verify you see real-time metrics for:
     - CPU usage across all cores
     - GPU usage/metrics
     - Memory consumption
     - Network activity

## Troubleshooting Installation

### Common Issues

**Permission Denied Errors**
- Ensure you have administrator privileges
- Try installing from an administrator account
- Check that Applications folder is writable

**Missing Dependencies**
- Actvt includes all required dependencies
- No additional software installation needed
- If issues persist, try reinstalling

**Menu Bar Icon Not Appearing**
- Restart Actvt application
- Check System Preferences → Users & Groups → Login Items
- Ensure menu bar isn't hidden (System Preferences → Dock & Menu Bar)

### Getting Help

If you continue to experience issues:

 **Contact Support**
   - Chat with our support team via our website's live [chat](https://actvt.io)
   - Visit our GitHub repository for known issues
   - Submit a bug report with system information
   - Include relevant log files

## Next Steps

Once Actvt is successfully installed:

1. **[Complete the Quick Start Guide](quick-start.md)** - Configure your monitoring preferences
2. **Explore Features** - Learn about all monitoring capabilities from the intro guide
3. **[Set up Remote Monitoring](../remote-server/overview)** - Connect to remote servers (optional)

Congratulations! You've successfully installed Actvt. Let's move on to the **[Quick Start Guide](quick-start.md)** to get you up and running.