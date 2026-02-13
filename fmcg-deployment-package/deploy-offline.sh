#!/bin/bash

#############################################################
#  FMCG UniTxt - OFFLINE Deployment (No Git Required)
#  Use this if you have connectivity issues with GitHub
#############################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/fmcg"
BACKEND_PORT=8001
FRONTEND_PORT=3000

# MongoDB Configuration
MONGO_URL="mongodb://localhost:27017"
DB_NAME="fmcg_db"

# Tigo SMPP Credentials
TIGO_SMPP_HOST="smpp01.tigo.co.tz"
TIGO_SMPP_PORT="10501"
TIGO_SMPP_USERNAME="datavision"
TIGO_SMPP_PASSWORD="dat@vis"
TIGO_SENDER_ID="UNITXT"

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "your-secure-secret-key-change-me")

echo -e "${BLUE}"
echo "=============================================="
echo "   FMCG UniTxt - OFFLINE Deployment"
echo "=============================================="
echo -e "${NC}"

echo -e "${YELLOW}This script assumes you have already copied the 'backend' and 'frontend' folders to this directory.${NC}"
echo ""

# Check if backend folder exists
if [ ! -d "./backend" ]; then
    echo -e "${RED}ERROR: 'backend' folder not found in current directory${NC}"
    echo "Please copy your backend folder here first."
    exit 1
fi

if [ ! -d "./frontend" ]; then
    echo -e "${RED}ERROR: 'frontend' folder not found in current directory${NC}"
    echo "Please copy your frontend folder here first."
    exit 1
fi

echo -e "${YELLOW}[1/7] Installing system packages...${NC}"
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv nodejs npm curl

echo -e "${YELLOW}[2/7] Installing MongoDB...${NC}"
if ! command -v mongod &> /dev/null; then
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt-get update -y
    sudo apt-get install -y mongodb-org
fi
sudo systemctl start mongod || true
sudo systemctl enable mongod || true

echo -e "${YELLOW}[3/7] Setting up installation directory...${NC}"
sudo mkdir -p $INSTALL_DIR
sudo cp -r ./backend $INSTALL_DIR/
sudo cp -r ./frontend $INSTALL_DIR/
sudo chown -R $USER:$USER $INSTALL_DIR

echo -e "${YELLOW}[4/7] Setting up Backend...${NC}"
cd $INSTALL_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

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

echo -e "${YELLOW}[5/7] Setting up Frontend...${NC}"
cd $INSTALL_DIR/frontend
npm install --legacy-peer-deps

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
cat > .env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:$BACKEND_PORT
EOF

echo -e "${YELLOW}[6/7] Creating systemd services...${NC}"

sudo tee /etc/systemd/system/fmcg-backend.service > /dev/null << EOF
[Unit]
Description=FMCG Backend API
After=network.target mongod.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/fmcg-frontend.service > /dev/null << EOF
[Unit]
Description=FMCG Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/npm start
Environment=PORT=$FRONTEND_PORT
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo -e "${YELLOW}[7/7] Starting services...${NC}"
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
echo -e "Backend:  http://$SERVER_IP:$BACKEND_PORT"
echo -e "Frontend: http://$SERVER_IP:$FRONTEND_PORT"
echo -e "API Docs: http://$SERVER_IP:$BACKEND_PORT/docs"
echo ""
echo -e "${GREEN}Test Tigo:${NC} curl http://localhost:$BACKEND_PORT/api/unitxt/tigo/status"
