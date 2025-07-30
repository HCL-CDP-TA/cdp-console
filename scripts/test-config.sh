#!/bin/bash

# Quick test commands for deployment setup
# Run these commands to validate your setup

echo "🧪 Testing Deployment Configuration"
echo "=================================="

# Test 1: Check if build works
echo -e "\n1️⃣ Testing build process..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Test 2: Validate GitHub Actions syntax
echo -e "\n2️⃣ Validating GitHub Actions syntax..."
if command -v yamllint >/dev/null 2>&1; then
    yamllint .github/workflows/deploy.yml
    yamllint .github/workflows/build.yml
    echo "✅ YAML syntax valid"
else
    echo "⚠️  yamllint not installed, skipping syntax check"
    echo "   Install with: pip install yamllint"
fi

# Test 3: Check required files exist
echo -e "\n3️⃣ Checking required files..."
files=(".github/workflows/deploy.yml" ".github/workflows/build.yml" "netlify.toml" "package.json")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Test 4: Validate package.json scripts
echo -e "\n4️⃣ Checking package.json scripts..."
if jq -e '.scripts.build' package.json >/dev/null; then
    echo "✅ build script found"
else
    echo "❌ build script missing"
fi

echo -e "\n🎉 Local validation complete!"
echo "📝 Next steps for testing:"
echo "   1. Set up Netlify deploy hook in dashboard"
echo "   2. Add NETLIFY_DEPLOY_HOOK to GitHub secrets"
echo "   3. Test webhook: NETLIFY_DEPLOY_HOOK='your_url' ./scripts/test-deploy-hook.sh"
echo "   4. Test with Netlify CLI:"
echo "      netlify build           # Test build process"
echo "      netlify deploy          # Deploy to preview"
echo "      netlify deploy --prod   # Deploy to production"

https://api.netlify.com/build_hooks/68803113ee47d9c1729f69f0