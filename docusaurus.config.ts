import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Actvt Documentation',
  tagline: 'Real-time system monitoring for macOS with remote server capabilities',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.actvt.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Tunji17', // Usually your GitHub org/user name.
  projectName: 'actvt-docs', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve docs at the site root
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Tunji17/actvt-docs/tree/main/',
        },
        blog: false, // Disable blog for documentation site
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/actvt-social-card.png',
    clarityProjectId: process.env.CLARITY_PROJECT_ID || 'tne1zlthk7', // Microsoft Clarity Project ID
    metadata: [{name: 'keywords', content: 'macOS monitoring, system monitoring, CPU monitoring, GPU monitoring, remote server monitoring, real-time monitoring, macOS menu bar app, Apple Silicon'}],
    navbar: {
      title: 'Actvt',
      logo: {
        alt: 'Actvt Logo',
        src: 'img/actvt-logo.png',
        href: 'https://actvt.io',
      },
      items: [
        {
          href: 'https://actvt.io/#download',
          label: 'Download',
          position: 'right',
        },
        {
          href: 'https://github.com/Tunji17/actvt-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/getting-started/overview',
            },
            {
              label: 'Remote Server Setup',
              to: '/remote-server/overview',
            },
          ],
        },
        {
          title: 'Actvt',
          items: [
            {
              label: 'Main Website',
              href: 'https://actvt.io',
            },
            {
              label: 'Download App',
              href: 'https://actvt.io/#download',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Tunji17/actvt-docs',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Actvt Team. Built with Docusaurus.`,
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    prism: {
      theme: prismThemes.dracula, // Use dark theme for both modes
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'toml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
