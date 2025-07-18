#!/bin/bash

# Build the application
npm run build

# Copy static files if needed
cp -r public .next/

echo "Build completed successfully for Netlify deployment"
