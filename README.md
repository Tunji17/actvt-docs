# Actvt Documentation Site

This directory contains the Docusaurus-powered documentation website for Actvt, hosted at [docs.actvt.io](https://docs.actvt.io).

## Local Development

Start the development server:

```bash
npm start
```

This opens a browser window at `http://localhost:3000` which shows the intro page directly at the root. Most changes are reflected live without restarting the server.

## Building

Generate static content:

```bash
npm run build
```

This generates static content into the `build` directory for production deployment.

## Testing Production Build

Test the production build locally:

```bash
npm run serve
```

## Deployment to Cloudflare Pages

This site is configured for deployment to Cloudflare Pages:

### Build Configuration
- **Build command**: `npm run build`
- **Build output directory**: `build`
- **Root directory**: `docusaurus`

### Custom Domain
- **Production URL**: `https://docs.actvt.io` (intro page served at root `/`)
- **Configured in**: `wrangler.toml`

### Automatic Deployments
The site automatically deploys to Cloudflare Pages when changes are pushed to the main branch.

## Project Structure

```
docs/                 # Documentation source files
├── intro.md         # Homepage/intro documentation
├── getting-started/ # Installation and quick start guides
└── remote-server/   # Remote monitoring setup guides
    └── provider-guides/ # Cloud provider specific guides

src/                 # React components and custom pages
├── components/      # Reusable React components
├── css/            # Custom CSS and themes
└── pages/          # Custom pages (homepage, etc.)

static/             # Static assets (images, favicon, etc.)
docusaurus.config.ts # Main configuration file
sidebars.ts         # Manual navigation sidebar (main sections expanded, provider guides collapsed)
```

## Features

- ✅ **Offline Search**: Local search functionality via `@easyops-cn/docusaurus-search-local`
- ✅ **Custom Branding**: Actvt logo, themed colors, and system fonts
- ✅ **Responsive Design**: Mobile-friendly documentation
- ✅ **SEO Optimized**: Meta tags, keywords, and social cards
- ✅ **Syntax Highlighting**: Code blocks with bash, JSON, and TOML support
- ✅ **Dark Theme**: Clean dark theme optimized for readability

## Documentation Updates

To update documentation:

1. Edit files in the `docs/` directory
2. Test locally with `npm start`
3. Build and verify with `npm run build && npm run serve`
4. Commit and push changes for automatic deployment

## Support

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Main Actvt Website](https://actvt.io)
- [GitHub Repository](https://github.com/Tunji17/actvt-docs)
