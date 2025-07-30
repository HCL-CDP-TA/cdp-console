#!/bin/bash

# Test Netlify Deploy Hook
# Usage: ./scripts/test-deploy-hook.sh

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Netlify Deploy Hook...${NC}"

# Check if NETLIFY_DEPLOY_HOOK is set
if [ -z "$NETLIFY_DEPLOY_HOOK" ]; then
    echo -e "${RED}Error: NETLIFY_DEPLOY_HOOK environment variable not set${NC}"
    echo -e "${YELLOW}Usage: NETLIFY_DEPLOY_HOOK='your_hook_url' ./scripts/test-deploy-hook.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}Deploy hook URL: $NETLIFY_DEPLOY_HOOK${NC}"

# Test the webhook
echo -e "${YELLOW}Sending POST request...${NC}"
response=$(curl -s -w "%{http_code}" -X POST -d {} "$NETLIFY_DEPLOY_HOOK")
http_code="${response: -3}"

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}✅ Deploy hook triggered successfully!${NC}"
    echo -e "${GREEN}HTTP Status Code: $http_code${NC}"
    echo -e "${GREEN}🚀 Check your Netlify dashboard for the deployment${NC}"
else
    echo -e "${RED}❌ Deploy hook failed${NC}"
    echo -e "${RED}HTTP Status Code: $http_code${NC}"
    echo -e "${RED}Response: ${response%???}${NC}"
    exit 1
fi
