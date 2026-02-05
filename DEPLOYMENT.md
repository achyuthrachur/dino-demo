# Deployment Guide: Infinite Mesozoic

> Complete guide for deploying the Digital Museum exhibit to Vercel

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [GitHub Repository Setup](#github-repository-setup)
5. [Vercel Deployment](#vercel-deployment)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [CDN & Asset Optimization](#cdn--asset-optimization)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

---

## Prerequisites

### Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| **GitHub** | Source code hosting | [github.com](https://github.com) |
| **Vercel** | Deployment platform | [vercel.com](https://vercel.com) |

### Required Tools

```bash
# Node.js 18.17 or later (20.x recommended)
node --version  # Should be >= 18.17.0

# npm (comes with Node.js)
npm --version

# Git
git --version

# Vercel CLI (optional but recommended)
npm install -g vercel

# GitHub CLI (optional but helpful)
npm install -g gh
```

---

## Environment Variables

### Current Project: No Environment Variables Required

This project is a **static/client-side only** application with no backend dependencies. All assets are:
- **3D Models**: Served from `/public/models/`
- **MediaPipe WASM**: Loaded from CDN (`cdn.jsdelivr.net`)
- **Fonts**: Loaded from Google Fonts CDN

### Optional Environment Variables

If you want to extend the project, here are common additions:

```bash
# .env.local (for local development)
# .env.production (set in Vercel dashboard)

# ─────────────────────────────────────────────────────────────
# ANALYTICS (Optional)
# ─────────────────────────────────────────────────────────────

# Vercel Analytics (automatically available on Vercel)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=

# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Plausible Analytics (privacy-friendly)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com

# ─────────────────────────────────────────────────────────────
# ERROR TRACKING (Optional)
# ─────────────────────────────────────────────────────────────

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=

# ─────────────────────────────────────────────────────────────
# FEATURE FLAGS (Optional)
# ─────────────────────────────────────────────────────────────

# Enable presenter mode (default: true)
NEXT_PUBLIC_ENABLE_PRESENTER_MODE=true

# Enable scientific mode (default: true)
NEXT_PUBLIC_ENABLE_SCIENTIFIC_MODE=true

# ─────────────────────────────────────────────────────────────
# CONTENT MANAGEMENT (Future)
# ─────────────────────────────────────────────────────────────

# If adding a headless CMS for specimen data
# CONTENTFUL_SPACE_ID=
# CONTENTFUL_ACCESS_TOKEN=
# SANITY_PROJECT_ID=
# SANITY_DATASET=
```

---

## Pre-Deployment Checklist

Run these commands before deploying:

```bash
# 1. Ensure clean working directory
git status

# 2. Run linting
npm run lint

# 3. Type check
npm run typecheck

# 4. Test production build locally
npm run build

# 5. (Optional) Test the production build
npm run start
# Open http://localhost:3000 and verify everything works
```

### Checklist

- [ ] `npm run build` completes without errors
- [ ] `npm run lint` shows no errors
- [ ] `npm run typecheck` passes
- [ ] 3D model loads correctly (`public/models/tyrannosaurus-rex/skeleton.glb`)
- [ ] Presenter mode camera works (requires HTTPS or localhost)
- [ ] Mobile layout is responsive
- [ ] All UI controls function properly

---

## GitHub Repository Setup

### 1. Initialize Git (if not already done)

```bash
cd "Dino Demo"
git init
```

### 2. Create `.gitignore`

Ensure these entries exist:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
.next/
out/
build/
dist/

# Environment files
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# OS
.DS_Store
Thumbs.db
*.log

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 3. Create Repository

```bash
# Stage all files
git add .

# Initial commit
git commit -m "feat: complete Infinite Mesozoic digital museum"

# Create GitHub repository (using GitHub CLI)
gh repo create achyuthrachur/dino-museum --public --source=. --remote=origin --push

# Or manually:
# 1. Go to github.com/new
# 2. Create repository named "dino-museum"
# 3. Run:
git remote add origin https://github.com/achyuthrachur/dino-museum.git
git branch -M main
git push -u origin main
```

---

## Vercel Deployment

### Method 1: Vercel Dashboard (Recommended for First Deploy)

1. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

2. **Click "Add New" → "Project"**

3. **Import your repository**
   - Find `achyuthrachur/dino-museum`
   - Click "Import"

4. **Configure Project Settings**

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Next.js (auto-detected) |
   | **Root Directory** | `./` |
   | **Build Command** | `npm run build` (default) |
   | **Output Directory** | `.next` (default) |
   | **Install Command** | `npm install` (default) |
   | **Node.js Version** | 20.x |

5. **Environment Variables**
   - None required for basic deployment
   - Add any optional variables from the [Environment Variables](#environment-variables) section

6. **Click "Deploy"**

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time - will prompt for settings)
vercel

# Deploy to production
vercel --prod
```

### Method 3: Git Push (After Initial Setup)

Once connected, every push to `main` auto-deploys:

```bash
git add .
git commit -m "your changes"
git push origin main
# Vercel automatically builds and deploys
```

---

## Post-Deployment Configuration

### 1. Custom Domain (Optional)

In Vercel Dashboard:

1. Go to your project → **Settings** → **Domains**
2. Add your domain (e.g., `mesozoic.yourdomain.com`)
3. Configure DNS:
   - **CNAME**: `cname.vercel-dns.com`
   - Or **A Record**: `76.76.21.21`

### 2. vercel.json Configuration

Create `vercel.json` in project root for advanced settings:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/models/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).glb",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3. Enable Vercel Analytics (Free)

1. Go to Project → **Analytics** tab
2. Click **Enable**

Or add programmatically:

```bash
npm install @vercel/analytics
```

```tsx
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 4. Enable Speed Insights (Free)

```bash
npm install @vercel/speed-insights
```

```tsx
// src/app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## CDN & Asset Optimization

### 3D Model Optimization

The T-Rex model is served from `/public/models/`. For large models:

1. **Compress GLB files** using [gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline):
   ```bash
   npx gltf-pipeline -i skeleton.glb -o skeleton-compressed.glb --draco.compressionLevel 10
   ```

2. **Consider external CDN** for very large models:
   - AWS S3 + CloudFront
   - Google Cloud Storage
   - Cloudflare R2

### MediaPipe WASM Assets

MediaPipe assets are loaded from `cdn.jsdelivr.net`. This is:
- ✅ Globally distributed
- ✅ Free
- ✅ No configuration needed
- ⚠️ ~50MB download on first Presenter Mode use

For offline/self-hosted version, download WASM files and serve from `/public/mediapipe/`.

### Image Optimization

Next.js Image component is configured with `unoptimized: true` for GLB compatibility. For actual images, enable optimization:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    // Remove unoptimized for production images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
      },
    ],
  },
};
```

---

## Monitoring & Analytics

### Recommended Free Tools

| Tool | Purpose | Setup |
|------|---------|-------|
| **Vercel Analytics** | Page views, visitors | Built-in, enable in dashboard |
| **Vercel Speed Insights** | Core Web Vitals | npm package (see above) |
| **Sentry** | Error tracking | [sentry.io](https://sentry.io) free tier |

### Setting Up Sentry (Optional)

```bash
npx @sentry/wizard@latest -i nextjs
```

Follow prompts to configure. Add to environment:

```bash
SENTRY_AUTH_TOKEN=your_token
NEXT_PUBLIC_SENTRY_DSN=your_dsn
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails: "Module not found"

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

#### 2. 3D Model Not Loading

- Check file exists: `public/models/tyrannosaurus-rex/skeleton.glb`
- Check file size isn't too large (>100MB may have issues)
- Check browser console for CORS errors

#### 3. Presenter Mode Camera Not Working

- **Requires HTTPS** in production (Vercel provides this)
- User must grant camera permission
- Some browsers block camera on HTTP (localhost is exception)

#### 4. WebGL Not Supported

Add fallback in your code:
```tsx
if (!window.WebGLRenderingContext) {
  return <div>WebGL not supported</div>;
}
```

#### 5. Memory Issues on Mobile

- GLB models can be memory-intensive
- Consider lower-poly versions for mobile
- Monitor with Chrome DevTools Memory tab

### Vercel-Specific Issues

#### Build Timeout

If build exceeds 45 minutes:
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "maxDuration": 60
}
```

#### Function Size Limit

Not applicable (this is a static site), but if you add API routes:
- Default limit: 50MB
- Can increase in Pro plan

---

## Performance Optimization

### Lighthouse Target Scores

| Metric | Target | Notes |
|--------|--------|-------|
| Performance | >80 | 3D reduces this |
| Accessibility | >90 | We've added ARIA labels |
| Best Practices | >90 | |
| SEO | >90 | |

### Optimization Checklist

- [x] Code splitting (automatic with Next.js)
- [x] Dynamic imports for 3D scene
- [x] React.memo on frequently updated components
- [x] Reduced motion support
- [ ] Consider lazy loading additional specimens
- [ ] Add service worker for offline support
- [ ] Implement model LOD (Level of Detail)

### Bundle Analysis

```bash
# Install analyzer
npm install @next/bundle-analyzer

# Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

---

## CI/CD Pipeline (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Build
        run: npm run build
```

---

## Quick Deploy Commands

```bash
# Full deployment workflow
git add .
git commit -m "your message"
git push origin main

# Preview deployment (PR or branch)
vercel

# Production deployment
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs your-project.vercel.app
```

---

## Summary

### What Gets Deployed

```
├── .next/                 # Build output (generated)
├── public/
│   └── models/
│       └── tyrannosaurus-rex/
│           └── skeleton.glb  # 3D model (~15MB)
├── src/                   # Application source
├── package.json
├── next.config.ts
└── vercel.json            # (optional) deployment config
```

### External Dependencies (CDN-loaded)

| Resource | CDN | Size |
|----------|-----|------|
| Google Fonts | fonts.googleapis.com | ~100KB |
| MediaPipe WASM | cdn.jsdelivr.net | ~50MB (lazy) |

### Deployment Checklist

- [ ] GitHub repository created
- [ ] Vercel project connected
- [ ] Build successful
- [ ] 3D scene renders
- [ ] Presenter mode works (HTTPS required)
- [ ] Mobile layout responsive
- [ ] (Optional) Custom domain configured
- [ ] (Optional) Analytics enabled

---

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **React Three Fiber**: [docs.pmnd.rs/react-three-fiber](https://docs.pmnd.rs/react-three-fiber)
- **MediaPipe**: [developers.google.com/mediapipe](https://developers.google.com/mediapipe)

---

*Last updated: 2026-02-04*
