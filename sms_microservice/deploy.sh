#!/bin/bash
# Deployment script for SMS Microservice on VPN Server

echo "=== UniTxt SMS Microservice Setup ==="

# Install Python if needed
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

# Install dependencies
echo "Installing dependencies..."
pip3 install -r requirements.txt

# Create systemd service for auto-start
echo "Creating systemd service..."
sudo tee /etc/systemd/system/sms-microservice.service > /dev/null << EOF
[Unit]
Description=UniTxt SMS Microservice
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/python3 $(pwd)/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable sms-microservice
sudo systemctl start sms-microservice

# Check status
echo ""
echo "=== Service Status ==="
sudo systemctl status sms-microservice --no-pager

echo ""
echo "=== Testing ==="
sleep 3
curl -s http://localhost:8002/health | python3 -m json.tool

echo ""
echo "=== Done! ==="
echo "SMS Microservice is running on port 8002"
echo "Test: curl http://localhost:8002/test-connection"
