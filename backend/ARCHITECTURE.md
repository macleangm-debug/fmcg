# KwikPay Backend Architecture

## Production-Grade Payment Gateway for 100K+ TPM

This backend is designed to handle high-throughput payment processing with enterprise-grade reliability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Load Balancer                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (x3)                           │
│   • REST API endpoints                                              │
│   • WebSocket connections                                           │
│   • Request validation                                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────────────┐
│   MongoDB   │ │    Redis    │ │          Celery Workers             │
│  (Primary   │ │  (Broker +  │ │  ┌───────────┬───────────┬────────┐ │
│  Database)  │ │   Cache)    │ │  │ Critical  │ Webhooks  │ Batch  │ │
└─────────────┘ └─────────────┘ │  │ (8 procs) │ (4 procs) │(2 proc)│ │
                                │  └───────────┴───────────┴────────┘ │
                                └─────────────────────────────────────┘
```

## Directory Structure

```
backend/
├── core/                       # Core modules
│   ├── __init__.py
│   ├── config.py              # Database, auth, settings
│   ├── celery_config.py       # Celery production config
│   └── payment_tasks.py       # Celery tasks for payments
├── routes/                     # Modular API routes
│   ├── __init__.py            # Route initialization
│   ├── auth.py                # Authentication & registration
│   ├── business.py            # Business management
│   ├── checkout.py            # Public checkout pages
│   ├── customers.py           # Customer management
│   ├── dashboard.py           # Dashboard statistics
│   ├── ecosystem.py           # Product ecosystem linking
│   ├── galaxy.py              # Galaxy ecosystem & SSO
│   ├── gateway.py             # Payment gateway config
│   ├── inventory.py           # Inventory management
│   ├── invoices.py            # Invoicing system
│   ├── kwikpay.py             # KwikPay payments
│   ├── load_test.py           # Load testing utilities
│   ├── orders.py              # Order management
│   ├── products.py            # Product catalog
│   ├── subscription.py        # Subscription billing
│   ├── superadmin.py          # Admin functions
│   └── unitxt.py              # Bulk SMS (UniTxt)
├── models/                     # Pydantic models (embedded in routes)
├── server.py                   # Main FastAPI application
├── docker-compose.production.yml  # Production deployment
└── requirements.txt
```

## Celery Queue Configuration

| Queue    | Priority | Workers | Use Case                    |
|----------|----------|---------|----------------------------|
| critical | 10       | 8       | Real-time payments         |
| payments | 8        | (shared)| Payment verification       |
| webhooks | 6        | 4       | Webhook delivery           |
| default  | 5        | (shared)| General tasks              |
| batch    | 3        | 2       | Batch processing           |
| low      | 1        | (shared)| Analytics, cleanup         |

## Quick Start (Development)

```bash
# Without Redis/Celery (synchronous mode - ~40K TPM)
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

## Production Deployment

```bash
# With Docker Compose (async mode - 100K+ TPM)
cd backend
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f celery-critical
```

## Manual Celery Startup (Development with Redis)

```bash
# Terminal 1: Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 2: Start Celery workers
celery -A core.celery_config worker -Q critical,payments -c 8 -l INFO

# Terminal 3: Start webhook workers
celery -A core.celery_config worker -Q webhooks,default -c 4 -l INFO

# Terminal 4: Start Celery Beat (scheduler)
celery -A core.celery_config beat -l INFO

# Terminal 5: Start Flower (monitoring - optional)
celery -A core.celery_config flower --port=5555
```

## Environment Variables

```bash
# Required
MONGO_URL=mongodb://localhost:27017
DB_NAME=retail_db

# For 100K+ TPM (recommended)
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Security
JWT_SECRET=your-production-secret-key
```

## API Endpoints

### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/kwikpay/load-test/health` - Detailed system health
- `POST /api/kwikpay/load-test/run-benchmark` - Run benchmark
- `POST /api/kwikpay/load-test/simulate` - Simulate load

### Payment Processing
- `POST /api/pay/{checkout_code}` - Process payment
- `GET /api/pay/{checkout_code}` - Get checkout config
- `GET /api/kwikpay/payment/{tx_ref}` - Get payment status

## Performance Tuning

### MongoDB
- Connection pool: 200 max connections
- Indexes on: tx_ref, merchant_id, status, created_at

### Redis
- Max memory: 512MB
- Eviction policy: allkeys-lru
- Persistence: AOF enabled

### Celery Workers
- Critical queue: 8 concurrent workers
- Prefetch multiplier: 8
- Max tasks per child: 1000 (memory management)
- Rate limits: 1000/s for payments, 500/s for webhooks

## Monitoring

### Flower Dashboard
Access at `http://localhost:5555` for real-time Celery monitoring:
- Active workers
- Task success/failure rates
- Queue lengths
- Worker resource usage

### Recommended Production Monitoring
- Prometheus + Grafana for metrics
- Sentry for error tracking
- ELK Stack for centralized logging

## Scaling Guidelines

| Load (TPM) | Configuration                                    |
|------------|--------------------------------------------------|
| < 40K      | Single instance, sync mode                       |
| 40K - 100K | Single instance + 3 Celery workers + Redis       |
| 100K - 250K| 3 instances + 6 Celery workers + Redis cluster   |
| 250K+      | Kubernetes HPA + Redis cluster + MongoDB replica |
