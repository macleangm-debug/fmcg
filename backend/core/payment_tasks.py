"""
KwikPay Celery Tasks for High-Throughput Payment Processing
Designed for 100K+ transactions per minute
"""
import os
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from celery import shared_task, group, chord
from celery.exceptions import MaxRetriesExceededError
from pymongo import MongoClient
from bson import ObjectId
import httpx

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection for sync tasks
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'retail_db')


def get_db():
    """Get synchronous MongoDB connection for Celery tasks"""
    client = MongoClient(MONGO_URL, maxPoolSize=100)
    return client[DB_NAME]


# ============== PAYMENT PROCESSING TASKS ==============

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a single payment asynchronously
    
    Args:
        payment_data: Dictionary containing payment details
            - tx_ref: Transaction reference
            - amount: Payment amount
            - currency: Currency code
            - payment_method: 'mobile_money', 'card', 'bank_transfer'
            - provider_code: MNO or bank code
            - customer_phone: Customer phone number
            - merchant_id: Merchant ID
    
    Returns:
        dict: Processing result with status and details
    """
    db = get_db()
    tx_ref = payment_data.get('tx_ref')
    
    try:
        logger.info(f"Processing payment {tx_ref}")
        
        # Update status to processing
        db.kwikpay_transactions.update_one(
            {"tx_ref": tx_ref},
            {"$set": {
                "status": "processing",
                "processing_started_at": datetime.now(timezone.utc),
                "celery_task_id": self.request.id
            }}
        )
        
        payment_method = payment_data.get('payment_method')
        
        # Route to appropriate processor
        if payment_method == 'mobile_money':
            result = _process_mobile_money_payment(db, payment_data)
        elif payment_method == 'card':
            result = _process_card_payment(db, payment_data)
        elif payment_method == 'bank_transfer':
            result = _process_bank_transfer(db, payment_data)
        else:
            result = {"success": False, "error": f"Unknown payment method: {payment_method}"}
        
        # Update transaction with result
        status = "completed" if result.get("success") else "failed"
        db.kwikpay_transactions.update_one(
            {"tx_ref": tx_ref},
            {"$set": {
                "status": status,
                "processed_at": datetime.now(timezone.utc),
                "provider_response": result,
                "external_ref": result.get("external_ref")
            }}
        )
        
        # Trigger webhook if configured
        if result.get("success"):
            send_webhook.delay(tx_ref, "payment.completed", result)
        else:
            send_webhook.delay(tx_ref, "payment.failed", result)
        
        logger.info(f"Payment {tx_ref} processed: {status}")
        return {"tx_ref": tx_ref, "status": status, **result}
        
    except Exception as e:
        logger.error(f"Error processing payment {tx_ref}: {str(e)}")
        
        db.kwikpay_transactions.update_one(
            {"tx_ref": tx_ref},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        
        try:
            raise self.retry(exc=e)
        except MaxRetriesExceededError:
            send_webhook.delay(tx_ref, "payment.failed", {"error": str(e)})
            return {"tx_ref": tx_ref, "status": "failed", "error": str(e)}


def _process_mobile_money_payment(db, payment_data: Dict) -> Dict:
    """Process mobile money payment"""
    provider_code = payment_data.get('provider_code', 'mpesa')
    phone = payment_data.get('customer_phone')
    amount = payment_data.get('amount')
    
    # TODO: Integrate with actual MNO APIs (M-Pesa, Tigo Pesa, etc.)
    # For now, simulate processing
    time.sleep(0.01)  # Simulate API call
    
    # Simulate success (95% success rate)
    import random
    if random.random() < 0.95:
        return {
            "success": True,
            "external_ref": f"MM_{provider_code}_{int(time.time())}",
            "provider": provider_code,
            "ussd_code": f"*150*00*{amount}#",
            "message": f"Payment request sent to {phone}"
        }
    else:
        return {"success": False, "error": "Provider timeout"}


def _process_card_payment(db, payment_data: Dict) -> Dict:
    """Process card payment"""
    # TODO: Integrate with card processor (Stripe, etc.)
    time.sleep(0.02)
    
    import random
    if random.random() < 0.92:
        return {
            "success": True,
            "external_ref": f"CARD_{int(time.time())}",
            "provider": "stripe",
            "message": "Card payment processed successfully"
        }
    else:
        return {"success": False, "error": "Card declined"}


def _process_bank_transfer(db, payment_data: Dict) -> Dict:
    """Process bank transfer"""
    bank_code = payment_data.get('provider_code', 'nmb')
    
    # TODO: Integrate with bank APIs
    time.sleep(0.01)
    
    return {
        "success": True,
        "external_ref": f"BT_{bank_code}_{int(time.time())}",
        "provider": bank_code,
        "account_number": "1234567890",
        "account_name": "KwikPay Collections",
        "message": "Bank transfer details generated"
    }


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_mobile_money(self, tx_ref: str, phone: str, amount: float, 
                         mno_code: str, merchant_id: str) -> Dict[str, Any]:
    """
    Dedicated mobile money processing task with MNO-specific handling
    """
    db = get_db()
    
    try:
        logger.info(f"Processing mobile money payment {tx_ref} via {mno_code}")
        
        # MNO-specific USSD codes
        ussd_codes = {
            'mpesa': f'*150*00*{int(amount)}#',
            'tigopesa': f'*150*01*{int(amount)}#',
            'airtelmoney': f'*150*60*{int(amount)}#',
            'halopesa': f'*150*88*{int(amount)}#',
        }
        
        ussd = ussd_codes.get(mno_code, f'*150*00*{int(amount)}#')
        
        # Update with USSD instructions
        db.kwikpay_transactions.update_one(
            {"tx_ref": tx_ref},
            {"$set": {
                "status": "pending_ussd",
                "ussd_code": ussd,
                "mno_code": mno_code,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "tx_ref": tx_ref,
            "status": "pending_ussd",
            "ussd_code": ussd,
            "mno": mno_code,
            "message": f"Dial {ussd} to complete payment"
        }
        
    except Exception as e:
        logger.error(f"Mobile money error for {tx_ref}: {str(e)}")
        raise self.retry(exc=e)


# ============== WEBHOOK TASKS ==============

@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def send_webhook(self, tx_ref: str, event_type: str, payload: Dict[str, Any]) -> Dict:
    """
    Send webhook notification to merchant
    """
    db = get_db()
    
    try:
        # Get transaction and merchant webhook config
        transaction = db.kwikpay_transactions.find_one({"tx_ref": tx_ref})
        if not transaction:
            return {"success": False, "error": "Transaction not found"}
        
        merchant_id = transaction.get("merchant_id")
        
        # Get webhook configuration
        webhook = db.kwikpay_webhooks.find_one({
            "business_id": merchant_id,
            "is_active": True,
            "events": {"$in": [event_type, "*"]}
        })
        
        if not webhook:
            logger.info(f"No webhook configured for merchant {merchant_id}")
            return {"success": True, "message": "No webhook configured"}
        
        webhook_url = webhook.get("url")
        secret = webhook.get("secret")
        
        # Prepare webhook payload
        webhook_payload = {
            "event": event_type,
            "tx_ref": tx_ref,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload
        }
        
        # Generate signature
        import hashlib
        import hmac
        import json
        signature = hmac.new(
            secret.encode(),
            json.dumps(webhook_payload).encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Send webhook
        headers = {
            "Content-Type": "application/json",
            "X-KwikPay-Signature": signature,
            "X-KwikPay-Event": event_type
        }
        
        with httpx.Client(timeout=30) as client:
            response = client.post(webhook_url, json=webhook_payload, headers=headers)
            
        success = response.status_code in [200, 201, 202]
        
        # Log webhook delivery
        db.kwikpay_webhook_logs.insert_one({
            "webhook_id": str(webhook.get("_id")),
            "tx_ref": tx_ref,
            "event": event_type,
            "url": webhook_url,
            "status_code": response.status_code,
            "success": success,
            "attempt": self.request.retries + 1,
            "created_at": datetime.now(timezone.utc)
        })
        
        if not success:
            raise Exception(f"Webhook failed with status {response.status_code}")
        
        return {"success": True, "status_code": response.status_code}
        
    except Exception as e:
        logger.error(f"Webhook error for {tx_ref}: {str(e)}")
        raise self.retry(exc=e)


@shared_task
def retry_failed_webhooks():
    """Retry all failed webhooks from the last 24 hours"""
    db = get_db()
    
    failed_webhooks = db.kwikpay_webhook_logs.find({
        "success": False,
        "attempt": {"$lt": 5},
        "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
    }).limit(100)
    
    for webhook_log in failed_webhooks:
        send_webhook.delay(
            webhook_log.get("tx_ref"),
            webhook_log.get("event"),
            {}
        )
    
    return {"retried": True}


# ============== BATCH PROCESSING TASKS ==============

@shared_task(bind=True)
def process_batch_payments(self, payments: List[Dict], merchant_id: str) -> Dict:
    """
    Process a batch of payments in parallel
    """
    db = get_db()
    
    logger.info(f"Processing batch of {len(payments)} payments for merchant {merchant_id}")
    
    # Create individual tasks
    tasks = [process_payment.s(payment) for payment in payments]
    
    # Execute in parallel
    job = group(tasks)
    result = job.apply_async()
    
    try:
        results = result.get(timeout=300)  # 5 minute timeout
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        results = []
    
    # Calculate statistics
    successful = sum(1 for r in results if r and r.get("status") == "completed")
    failed = sum(1 for r in results if r and r.get("status") == "failed")
    
    return {
        "batch_id": str(uuid.uuid4()),
        "total": len(payments),
        "successful": successful,
        "failed": failed,
        "success_rate": round((successful / max(len(payments), 1)) * 100, 2)
    }


# ============== MAINTENANCE TASKS ==============

@shared_task
def check_pending_payments():
    """Check and update status of pending payments"""
    db = get_db()
    
    # Find payments pending for more than 30 minutes
    cutoff = datetime.now(timezone.utc).replace(minute=datetime.now().minute - 30)
    
    pending = db.kwikpay_transactions.find({
        "status": {"$in": ["pending", "processing", "pending_ussd"]},
        "created_at": {"$lt": cutoff}
    }).limit(100)
    
    expired_count = 0
    for payment in pending:
        db.kwikpay_transactions.update_one(
            {"_id": payment["_id"]},
            {"$set": {"status": "expired", "expired_at": datetime.now(timezone.utc)}}
        )
        send_webhook.delay(payment.get("tx_ref"), "payment.expired", {})
        expired_count += 1
    
    logger.info(f"Expired {expired_count} pending payments")
    return {"expired": expired_count}


@shared_task
def cleanup_old_logs():
    """Clean up old webhook logs and transaction logs"""
    db = get_db()
    from datetime import timedelta
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    
    # Delete old webhook logs
    result = db.kwikpay_webhook_logs.delete_many({"created_at": {"$lt": cutoff}})
    
    logger.info(f"Cleaned up {result.deleted_count} old webhook logs")
    return {"deleted": result.deleted_count}


@shared_task
def system_health_check():
    """Perform system health check"""
    db = get_db()
    
    health = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "healthy",
        "pending_payments": 0,
        "failed_webhooks_24h": 0
    }
    
    try:
        # Check database
        db.command("ping")
        
        # Count pending payments
        health["pending_payments"] = db.kwikpay_transactions.count_documents({
            "status": {"$in": ["pending", "processing"]}
        })
        
        # Count failed webhooks in last 24 hours
        from datetime import timedelta
        yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
        health["failed_webhooks_24h"] = db.kwikpay_webhook_logs.count_documents({
            "success": False,
            "created_at": {"$gte": yesterday}
        })
        
    except Exception as e:
        health["database"] = "error"
        health["error"] = str(e)
    
    # Store health check result
    db.system_health_checks.insert_one(health)
    
    return health


@shared_task
def process_daily_settlement():
    """Process daily settlement for all merchants"""
    db = get_db()
    
    logger.info("Starting daily settlement processing")
    
    # Get all completed transactions for today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Aggregate by merchant
    pipeline = [
        {"$match": {
            "status": "completed",
            "processed_at": {"$gte": today_start}
        }},
        {"$group": {
            "_id": "$merchant_id",
            "total_amount": {"$sum": "$amount"},
            "transaction_count": {"$sum": 1},
            "total_fees": {"$sum": "$fee"}
        }}
    ]
    
    settlements = list(db.kwikpay_transactions.aggregate(pipeline))
    
    for settlement in settlements:
        # Create settlement record
        db.kwikpay_settlements.insert_one({
            "merchant_id": settlement["_id"],
            "date": today_start,
            "total_amount": settlement["total_amount"],
            "transaction_count": settlement["transaction_count"],
            "total_fees": settlement["total_fees"],
            "net_amount": settlement["total_amount"] - settlement["total_fees"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc)
        })
    
    logger.info(f"Created {len(settlements)} settlement records")
    return {"settlements_created": len(settlements)}


@shared_task
def generate_analytics():
    """Generate analytics for dashboards"""
    db = get_db()
    
    # This would generate various analytics reports
    # Implementation depends on specific requirements
    
    return {"status": "completed"}
