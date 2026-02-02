#!/bin/sh
set -e

# Navigate to repository root
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Node.js using Homebrew (required for Expo/React Native)
echo "Installing Node.js..."
brew install node

# Install npm dependencies
echo "Installing npm dependencies..."
npm ci

# Navigate to ios directory and install CocoaPods
echo "Installing CocoaPods dependencies..."
cd ios
pod install
