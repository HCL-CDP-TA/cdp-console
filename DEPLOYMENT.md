# Deployment Guide

## Overview

This project is configured to deploy only on releases, not on every commit. This ensures that:

- Development commits don't trigger unnecessary deployments
- Only stable, tagged releases are deployed to production
- Manual control over when deployments happen

## Deployment Workflow

### Automatic Deployment (Releases)

1. Create a new release on GitHub with a version tag (e.g., `v1.0.0`)
2. The GitHub Actions workflow automatically triggers
3. The application is built and deployed to Netlify

### Manual Deployment

You can manually trigger a deployment using the GitHub Actions workflow:

1. Go to the Actions tab in GitHub
2. Select the "Deploy to Netlify on Release" workflow
3. Click "Run workflow"

## Configuration Files

### netlify.toml

- Configures Netlify to skip automatic builds on commits
- Only allows production builds through manual deployment
- Disables deploy previews and branch deploys

### GitHub Actions Workflows

#### `.github/workflows/deploy.yml`

- Triggers on release publication
- Builds and deploys to Netlify production
- Requires secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`

#### `.github/workflows/build.yml`

- Runs on every commit to test branches
- Performs linting, testing, and build verification
- Does NOT deploy - only validates the code

## Required Secrets

In your GitHub repository settings, configure these secrets:

### Required:

- `NETLIFY_DEPLOY_HOOK`: Your Netlify deploy webhook URL (from Site Settings → Build & deploy → Deploy notifications)
- `ADMIN_API_URL`: Backend API URL
- `NEXT_PUBLIC_GA_ID`: Google Analytics ID (optional)

### Optional (for enhanced monitoring):

- `NETLIFY_SITE_ID`: Your Netlify site ID (for deployment monitoring links)

## Setup Steps

### 1. Netlify Configuration

1. Go to your Netlify site dashboard
2. **Find Build Settings**:
   - Look for "Project configuration", "Site configuration", or "Site settings"
   - Navigate to "Build & deploy" section (may be under "Environment" or "Deploys")
3. **Disable auto-builds**:
   - Under "Build settings", click "Edit settings" or "Configure"
   - Change build command to `echo "Builds controlled by GitHub"`
   - Or look for "Stop auto publishing" option and enable it
   - Save settings
4. **Create deploy hook**:
   - Look for "Deploy notifications", "Build hooks", or "Webhooks" section
   - Click "Add notification" or "Add build hook"
   - Select "HTTP POST request" or "Incoming webhook"
   - Choose event type (typically "Deploy started" or "Build started")
   - Copy the generated webhook URL (format: `https://api.netlify.com/build_hooks/[HOOK_ID]`)

> **Note**: Netlify's UI layout may vary. Look for sections related to "Build", "Deploy", "Webhooks", or "Notifications".

### 2. GitHub Secrets

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add `NETLIFY_DEPLOY_HOOK` with the webhook URL from step 1
3. Add other required environment variables

### 3. Test the Setup

1. Create a test release or manually trigger the deploy workflow
2. Check GitHub Actions for successful execution
3. Verify deployment in Netlify dashboard

## Creating a Release

1. Ensure your code is ready for production
2. Update version in `package.json` if needed
3. Create a new release on GitHub:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. Or use GitHub's web interface to create a release
5. The deployment will automatically start

## Rollback

To rollback to a previous version:

1. Go to Netlify dashboard
2. Navigate to "Deploys" section
3. Find the previous successful deployment
4. Click "Publish deploy"

Or create a new release with the previous version's code.

## Troubleshooting

### Can't Find Netlify Settings?

Netlify's interface evolves, so menu names may vary:

**Build Settings** might be under:

- Project configuration → Build & deploy
- Site settings → Build & deploy
- Environment → Build settings
- Deploys → Build settings

**Deploy Hooks** might be under:

- Build & deploy → Deploy notifications
- Build & deploy → Build hooks
- Integrations → Webhooks
- Project configuration → Webhooks

**Alternative: Use Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and link site
netlify login
netlify link

# Create build hook
netlify api createHookBySiteId --data '{"type": "github"}'
```

### GitHub Actions Not Triggering?

1. Check that `NETLIFY_DEPLOY_HOOK` secret is set correctly
2. Verify the webhook URL format: `https://api.netlify.com/build_hooks/[ID]`
3. Test the webhook manually:
   ```bash
   curl -X POST -d {} "YOUR_WEBHOOK_URL"
   ```

### Deployment Still Happening on Commits?

1. Double-check Netlify build settings are disabled
2. Ensure your branch isn't set as "Production branch" in deploy contexts
3. Try setting build command to `exit 1` instead of echo command
