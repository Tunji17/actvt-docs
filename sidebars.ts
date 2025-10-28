import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Manual sidebar configuration with expanded sections
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Remote Server Setup',
      collapsed: false,
      items: [
        'remote-server/prerequisites',
        'remote-server/automated-install',
        'remote-server/vector-setup',
        'remote-server/tls-configuration',
        'remote-server/troubleshooting',
        {
          type: 'category',
          label: 'Provider Guides',
          collapsed: true,
          items: [
            'remote-server/provider-guides/aws-ec2',
            'remote-server/provider-guides/hetzner-cloud',
            'remote-server/provider-guides/digitalocean',
            'remote-server/provider-guides/gcp',
            'remote-server/provider-guides/azure',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
