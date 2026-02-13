#!/bin/bash

#############################################################
#  FMCG UniTxt - Quick Setup for PRIVATE Repository
#  Run this if your GitHub repo is PRIVATE
#############################################################

echo "=============================================="
echo "   FMCG Private Repo Deployment"
echo "=============================================="
echo ""

# Ask for GitHub credentials
read -p "Enter your GitHub username: " GITHUB_USER
read -sp "Enter your GitHub Personal Access Token: " GITHUB_TOKEN
echo ""

GITHUB_REPO="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/macleangm-debug/fmcg.git"
INSTALL_DIR="/opt/fmcg"

# Update and install dependencies
echo "[1/4] Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv nodejs npm git curl

# Clone repo
echo "[2/4] Cloning private repository..."
if [ -d "$INSTALL_DIR" ]; then
    cd $INSTALL_DIR && git pull
else
    sudo mkdir -p $INSTALL_DIR
    sudo chown $USER:$USER $INSTALL_DIR
    git clone $GITHUB_REPO $INSTALL_DIR
fi

echo "[3/4] Now running main deployment script..."
cd $INSTALL_DIR

# Download and run main deploy script (or use local)
if [ -f "deploy.sh" ]; then
    bash deploy.sh
else
    echo "Main deploy.sh not found. Please copy deploy.sh to $INSTALL_DIR and run it."
fi

echo "[4/4] Done!"
