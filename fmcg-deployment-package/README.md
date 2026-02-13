# FMCG UniTxt Bulk SMS - Deployment Package

## Quick Start

### Option A: If your GitHub repo is PUBLIC
```bash
chmod +x deploy.sh
sudo bash deploy.sh
```

### Option B: If your GitHub repo is PRIVATE
```bash
chmod +x deploy-private-repo.sh
bash deploy-private-repo.sh
```
This will ask for your GitHub username and Personal Access Token.

---

## What's Included

| File | Description |
|------|-------------|
| `deploy.sh` | Main deployment script (public repos) |
| `deploy-private-repo.sh` | Deployment for private repos |
| `README.md` | This file |

---

## Pre-Configured Settings

### Tigo SMPP Credentials
- **Host:** smpp01.tigo.co.tz
- **Port:** 10501
- **Username:** datavision
- **Password:** dat@vis
- **Sender ID:** UNITXT

### Server Ports
- **Backend API:** 8001
- **Frontend:** 3000

### Database
- **MongoDB:** localhost:27017
- **Database Name:** fmcg_db

---

## After Deployment

### Access Points
- **Frontend:** http://YOUR_SERVER_IP:3000
- **Backend API:** http://YOUR_SERVER_IP:8001
- **API Documentation:** http://YOUR_SERVER_IP:8001/docs

### Test SMS Sending
```bash
curl -X POST http://localhost:8001/api/unitxt/tigo/send \
  -H "Content-Type: application/json" \
  -d '{"recipient": "255XXXXXXXXX", "message": "Hello from UniTxt!", "sender_id": "UNITXT"}'
```

### Check Tigo Connection
```bash
curl http://localhost:8001/api/unitxt/tigo/status
```

### Bulk SMS
```bash
curl -X POST http://localhost:8001/api/unitxt/tigo/send-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"recipient": "255700000001", "message": "Hello User 1"},
      {"recipient": "255700000002", "message": "Hello User 2"}
    ],
    "sender_id": "UNITXT"
  }'
```

---

## Service Management

```bash
# Check status
sudo systemctl status fmcg-backend
sudo systemctl status fmcg-frontend

# View logs
sudo journalctl -u fmcg-backend -f
sudo journalctl -u fmcg-frontend -f

# Restart services
sudo systemctl restart fmcg-backend
sudo systemctl restart fmcg-frontend

# Stop services
sudo systemctl stop fmcg-backend
sudo systemctl stop fmcg-frontend
```

---

## Troubleshooting

### Backend won't start
```bash
cd /opt/fmcg/backend
source venv/bin/activate
python3 -c "from src.main import app; print('OK')"
```

### MongoDB connection issues
```bash
sudo systemctl status mongod
sudo systemctl start mongod
```

### Tigo SMPP not connecting
- Verify VPN is connected to Tigo network
- Test connectivity: `telnet smpp01.tigo.co.tz 10501`

---

## Delivery Reports Webhook

If Tigo needs to send delivery reports, provide them:
```
URL: http://YOUR_PUBLIC_IP:8001/api/unitxt/tigo/delivery-report
Method: POST
Content-Type: application/json
```

---

## Support

For issues, check logs first:
```bash
sudo journalctl -u fmcg-backend --since "10 minutes ago"
```
