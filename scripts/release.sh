#!/bin/bash

# Release script for CDP Console
# Usage: ./scripts/release.sh [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version from argument or prompt
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: v$CURRENT_VERSION${NC}"

if [ -z "$1" ]; then
    echo -e "${YELLOW}Enter new version (e.g., 1.0.0):${NC}"
    read VERSION
else
    VERSION=$1
fi

# Validate version format (basic semver check)
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Version must be in format x.y.z${NC}"
    exit 1
fi

# Confirm the release
echo -e "${YELLOW}Creating release v$VERSION${NC}"
echo -e "${YELLOW}Are you sure? (y/N):${NC}"
read -r CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo -e "${RED}Release cancelled${NC}"
    exit 1
fi

# Check if we're on main/master branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
    echo -e "${RED}Warning: You're not on main/master branch (currently on $BRANCH)${NC}"
    echo -e "${YELLOW}Continue anyway? (y/N):${NC}"
    read -r CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: You have uncommitted changes${NC}"
    git status -s
    exit 1
fi

# Pull latest changes
echo -e "${GREEN}Pulling latest changes...${NC}"
git pull origin $BRANCH

# Update package.json version
echo -e "${GREEN}Updating package.json version...${NC}"
npm version $VERSION --no-git-tag-version

# Commit version bump
echo -e "${GREEN}Committing version bump...${NC}"
git add package.json
git commit -m "Bump version to v$VERSION"

# Push changes
echo -e "${GREEN}Pushing changes...${NC}"
git push origin $BRANCH

# Create and push tag
echo -e "${GREEN}Creating and pushing tag v$VERSION...${NC}"
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"

echo -e "${GREEN}✅ Release v$VERSION created successfully!${NC}"
echo -e "${GREEN}🚀 Deployment will start automatically via GitHub Actions${NC}"
echo -e "${GREEN}📊 Monitor progress at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions${NC}"
