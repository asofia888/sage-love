#!/bin/bash
# Vercel用のビルドスクリプト - APIのみなのでビルド不要
echo "API-only project - no build step required"
mkdir -p dist
echo "API ready" > dist/index.html