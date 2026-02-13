#!/bin/bash

#############################################################
#  FMCG UniTxt Bulk SMS - One-Click Deployment Script
#  Server: Ubuntu/Debian with VPN to Tigo
#############################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=============================================="
echo "   FMCG UniTxt Bulk SMS - Deployment Script"
echo "=============================================="
echo -e "${NC}"

# Configuration - EDIT THESE IF NEEDED
GITHUB_REPO="https://github.com/macleangm-debug/fmcg.git"
INSTALL_DIR="/opt/fmcg"
BACKEND_PORT=8001
FRONTEND_PORT=3000

# MongoDB Configuration
MONGO_URL="mongodb://localhost:27017"
DB_NAME="fmcg_db"

# Tigo SMPP Credentials (Pre-configured)
TIGO_SMPP_HOST="smpp01.tigo.co.tz"
TIGO_SMPP_PORT="10501"
TIGO_SMPP_USERNAME="datavision"
TIGO_SMPP_PASSWORD="dat@vis"
TIGO_SENDER_ID="UNITXT"

# JWT Secret (generate random if not set)
JWT_SECRET=$(openssl rand -hex 32)

echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv nodejs npm git curl

echo -e "${YELLOW}[2/8] Installing MongoDB (if not installed)...${NC}"
if ! command -v mongod &> /dev/null; then
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt-get update -y
    sudo apt-get install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
    echo -e "${GREEN}MongoDB installed and started${NC}"
else
    echo -e "${GREEN}MongoDB already installed${NC}"
    sudo systemctl start mongod || true
fi

echo -e "${YELLOW}[3/8] Cloning repository...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory exists. Pulling latest changes...${NC}"
    cd $INSTALL_DIR
    git pull origin main || git pull origin master
else
    sudo mkdir -p $INSTALL_DIR
    sudo chown $USER:$USER $INSTALL_DIR
    git clone $GITHUB_REPO $INSTALL_DIR
    cd $INSTALL_DIR
fi

echo -e "${YELLOW}[4/8] Setting up Backend...${NC}"
cd $INSTALL_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create backend .env file
cat > .env << EOF
MONGO_URL=$MONGO_URL
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
TIGO_SMPP_HOST=$TIGO_SMPP_HOST
TIGO_SMPP_PORT=$TIGO_SMPP_PORT
TIGO_SMPP_USERNAME=$TIGO_SMPP_USERNAME
TIGO_SMPP_PASSWORD=$TIGO_SMPP_PASSWORD
TIGO_SENDER_ID=$TIGO_SENDER_ID
EOF

echo -e "${GREEN}Backend .env created${NC}"

echo -e "${YELLOW}[5/8] Setting up Frontend...${NC}"
cd $INSTALL_DIR/frontend

# Install Node.js dependencies
npm install --legacy-peer-deps

# Get server's public IP for frontend config
SERVER_IP=$(curl -s ifconfig.me || echo "localhost")

# Create frontend .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:$BACKEND_PORT
EOF

echo -e "${GREEN}Frontend .env created (Backend URL: http://$SERVER_IP:$BACKEND_PORT)${NC}"

echo -e "${YELLOW}[6/8] Creating systemd service for Backend...${NC}"
sudo tee /etc/systemd/system/fmcg-backend.service > /dev/null << EOF
[Unit]
Description=FMCG Backend API Service
After=network.target mongod.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo -e "${YELLOW}[7/8] Creating systemd service for Frontend...${NC}"
sudo tee /etc/systemd/system/fmcg-frontend.service > /dev/null << EOF
[Unit]
Description=FMCG Frontend Service
After=network.target fmcg-backend.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=PORT=$FRONTEND_PORT

[Install]
WantedBy=multi-user.target
EOF

echo -e "${YELLOW}[8/8] Starting services...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable fmcg-backend fmcg-frontend
sudo systemctl start fmcg-backend
sleep 5
sudo systemctl start fmcg-frontend

echo ""
echo -e "${GREEN}=============================================="
echo "   DEPLOYMENT COMPLETE!"
echo "==============================================${NC}"
echo ""
echo -e "${BLUE}Backend API:${NC}    http://$SERVER_IP:$BACKEND_PORT"
echo -e "${BLUE}Frontend:${NC}       http://$SERVER_IP:$FRONTEND_PORT"
echo -e "${BLUE}API Docs:${NC}       http://$SERVER_IP:$BACKEND_PORT/docs"
echo ""
echo -e "${YELLOW}Tigo SMPP Configuration:${NC}"
echo "  Host:     $TIGO_SMPP_HOST"
echo "  Port:     $TIGO_SMPP_PORT"
echo "  Username: $TIGO_SMPP_USERNAME"
echo "  Sender:   $TIGO_SENDER_ID"
echo ""
echo -e "${GREEN}Testing Tigo Connection...${NC}"
sleep 3
curl -s http://localhost:$BACKEND_PORT/api/unitxt/tigo/status | python3 -m json.tool || echo -e "${RED}Could not reach backend yet. Wait a moment and try manually.${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  Check backend status:   sudo systemctl status fmcg-backend"
echo "  Check frontend status:  sudo systemctl status fmcg-frontend"
echo "  View backend logs:      sudo journalctl -u fmcg-backend -f"
echo "  View frontend logs:     sudo journalctl -u fmcg-frontend -f"
echo "  Restart backend:        sudo systemctl restart fmcg-backend"
echo "  Restart frontend:       sudo systemctl restart fmcg-frontend"
echo ""
echo -e "${GREEN}Send test SMS:${NC}"
echo "curl -X POST http://localhost:$BACKEND_PORT/api/unitxt/tigo/send \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"recipient\": \"255XXXXXXXXX\", \"message\": \"Test from UniTxt\", \"sender_id\": \"UNITXT\"}'"
echo ""
