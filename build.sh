#!/bin/bash

# Create Vercel output directory structure
mkdir -p .vercel/output/static

# Copy all frontend files to the static output directory
cp -r frontend/* .vercel/output/static/

echo "Build complete! Files copied to .vercel/output/static/"
