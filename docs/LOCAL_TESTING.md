# Testing GitHub Actions Locally

## Install Act

```bash
# macOS
brew install act

# Or download from: https://github.com/nektos/act
```

## Create secrets file for local testing

```bash
# Create .secrets file (add to .gitignore)
echo "NETLIFY_DEPLOY_HOOK=your_webhook_url_here" > .secrets
echo "NETLIFY_SITE_ID=your_site_id_here" >> .secrets
```

## Test the deploy workflow

```bash
# Test the deploy workflow
act release --secret-file .secrets

# Test manual workflow dispatch
act workflow_dispatch --secret-file .secrets

# List available workflows
act -l

# Dry run (don't actually execute)
act release --secret-file .secrets --dry-run
```

## Test specific job

````bash
# Test specific job
```bash
# Test just the deploy job
act release --secret-file .secrets --job deploy
````

## Netlify CLI Testing

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and link to your site
netlify login
netlify link

# Test build locally (this uses your netlify.toml settings)
netlify build

# Test functions locally (if you have any)
netlify dev

# Deploy to preview URL (safe testing)
netlify deploy

# Deploy to production (only when ready)
netlify deploy --prod

# Check build status
netlify status

# View site info
netlify sites:list
```

## Manual Testing Steps

```bash
# 1. Test build process
npm run build

# 2. Test webhook directly
curl -X POST -d {} "YOUR_NETLIFY_DEPLOY_HOOK_URL"

# 3. Validate GitHub Actions YAML
yamllint .github/workflows/deploy.yml
yamllint .github/workflows/build.yml

# 4. Check environment variables
netlify env:list
```

```

```
