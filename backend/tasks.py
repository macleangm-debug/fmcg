"""
Celery Tasks for UniTxt Message Processing
Handles campaign processing, SMS/WhatsApp sending, and batch operations
Uses multi-provider SMS gateway (Twilio, Africa's Talking, Vonage)
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from celery import shared_task, group, chain, chord
from celery.exceptions import MaxRetriesExceededError
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import random
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection for tasks
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'retail_db')

# Batch sizes
BATCH_SIZE = 500  # Process 500 messages per batch
MAX_CONCURRENT_BATCHES = 10

# Import SMS Gateway
from sms_gateway import get_sms_gateway, SMSResult, MessageStatus


def get_sync_db():
    """Get synchronous MongoDB connection for Celery tasks"""
    from pymongo import MongoClient
    client = MongoClient(mongo_url)
    return client[db_name]


# ============== SMS/WHATSAPP SENDING TASKS ==============

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_single_sms(self, message_id: str, phone: str, message: str, 
                    sender_id: str, campaign_id: str = None,
                    user_id: str = None, business_id: str = None,
                    preferred_provider: str = None):
    """
    Send a single SMS message using the multi-provider gateway
    
    Args:
        message_id: Unique message ID for tracking
        phone: Recipient phone number (E.164 format)
        message: Message content
        sender_id: Sender ID/number
        campaign_id: Associated campaign (optional)
        user_id: User who initiated
        business_id: Business ID
        preferred_provider: Force specific provider (optional)
    
    Returns:
        dict: Result with status and details
    """
    db = get_sync_db()
    gateway = get_sms_gateway()
    
    try:
        logger.info(f"Sending SMS {message_id} to {phone}")
        
        # Update status to 'sending'
        db.unitxt_message_logs.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"status": "sending", "attempt": self.request.retries + 1}}
        )
        
        # Send via multi-provider gateway
        result = gateway.send_sms(
            to=phone,
            message=message,
            sender_id=sender_id,
            preferred_provider=preferred_provider,
            enable_failover=True
        )
        
        # Map gateway status to our status
        if result.success:
            status = 'delivered' if result.status == MessageStatus.DELIVERED else 'sent'
        else:
            status = 'failed'
        
        # Update message log
        update_data = {
            "status": status,
            "sent_at": datetime.utcnow(),
            "external_id": result.external_id,
            "provider": result.provider,
            "cost": result.cost,
            "segments": result.segments,
        }
        
        if not result.success:
            update_data["error"] = result.error
        
        db.unitxt_message_logs.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": update_data}
        )
        
        # Update campaign stats if part of a campaign
        if campaign_id:
            if result.success:
                db.unitxt_campaigns.update_one(
                    {"_id": ObjectId(campaign_id)},
                    {"$inc": {"delivered_count": 1}}
                )
            else:
                db.unitxt_campaigns.update_one(
                    {"_id": ObjectId(campaign_id)},
                    {"$inc": {"failed_count": 1}}
                )
        
        return {
            "message_id": message_id,
            "phone": phone,
            "status": status,
            "external_id": result.external_id,
            "provider": result.provider,
            "cost": result.cost
        }
        
    except Exception as e:
        logger.error(f"Error sending SMS {message_id}: {str(e)}")
        
        # Update with error
        db.unitxt_message_logs.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        
        # Retry if attempts remaining
        try:
            raise self.retry(exc=e)
        except MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for SMS {message_id}")
            if campaign_id:
                db.unitxt_campaigns.update_one(
                    {"_id": ObjectId(campaign_id)},
                    {"$inc": {"failed_count": 1}}
                )
            return {
                "message_id": message_id,
                "phone": phone,
                "status": "failed",
                "error": str(e)
            }


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_single_whatsapp(self, message_id: str, phone: str, message: str,
                         media_url: str = None, campaign_id: str = None,
                         user_id: str = None, business_id: str = None):
    """
    Send a single WhatsApp message
    Similar to SMS but with WhatsApp-specific handling
    """
    db = get_sync_db()
    
    try:
        logger.info(f"Sending WhatsApp {message_id} to {phone}")
        
        db.unitxt_message_logs.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"status": "sending", "attempt": self.request.retries + 1}}
        )
        
        # === WHATSAPP API INTEGRATION POINT ===
        # Replace with Meta Business API integration
        
        if WHATSAPP_API_URL and WHATSAPP_API_KEY:
            # Real WhatsApp sending would go here
            pass
        else:
            # Simulated sending
            time.sleep(0.02)  # WhatsApp is slightly slower
            
            if random.random() < 0.92:  # 92% success rate
                status = 'delivered'
                external_id = f"WA_{message_id[:8]}_{int(time.time())}"
            else:
                status = 'failed'
                external_id = None
        
        update_data = {
            "status": status,
            "sent_at": datetime.utcnow(),
            "external_id": external_id,
        }
        
        db.unitxt_message_logs.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": update_data}
        )
        
        if campaign_id:
            if status == 'delivered':
                db.unitxt_campaigns.update_one(
                    {"_id": ObjectId(campaign_id)},
                    {"$inc": {"delivered_count": 1}}
                )
            else:
                db.unitxt_campaigns.update_one(
                    {"_id": ObjectId(campaign_id)},
                    {"$inc": {"failed_count": 1}}
                )
        
        return {
            "message_id": message_id,
            "phone": phone,
            "status": status,
            "external_id": external_id
        }
        
    except Exception as e:
        logger.error(f"Error sending WhatsApp {message_id}: {str(e)}")
        db.unitxt_message_logs.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        try:
            raise self.retry(exc=e)
        except MaxRetriesExceededError:
            if campaign_id:
                db.unitxt_campaigns.update_one(
                    {"_id": ObjectId(campaign_id)},
                    {"$inc": {"failed_count": 1}}
                )
            return {"message_id": message_id, "status": "failed", "error": str(e)}


# ============== BATCH PROCESSING TASKS ==============

@shared_task(bind=True)
def process_campaign_batch(self, campaign_id: str, contacts: List[Dict],
                           message: str, message_type: str, sender_id: str,
                           user_id: str, business_id: str, batch_number: int):
    """
    Process a batch of messages for a campaign
    
    Args:
        campaign_id: Campaign ID
        contacts: List of contact dicts [{phone, name, ...}]
        message: Message template
        message_type: 'sms' or 'whatsapp'
        sender_id: Sender ID
        user_id: User ID
        business_id: Business ID
        batch_number: Batch sequence number
    
    Returns:
        dict: Batch processing results
    """
    db = get_sync_db()
    
    logger.info(f"Processing batch {batch_number} for campaign {campaign_id} - {len(contacts)} contacts")
    
    # Update campaign status
    db.unitxt_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {
            f"batch_status.{batch_number}": "processing",
            "updated_at": datetime.utcnow()
        }}
    )
    
    tasks = []
    message_ids = []
    
    for contact in contacts:
        # Personalize message
        personalized_message = message
        personalized_message = personalized_message.replace("{{name}}", contact.get("name", "Customer"))
        personalized_message = personalized_message.replace("{{first_name}}", contact.get("name", "Customer").split()[0])
        personalized_message = personalized_message.replace("{{phone}}", contact.get("phone", ""))
        
        # Create message log entry
        message_doc = {
            "campaign_id": campaign_id,
            "user_id": user_id,
            "business_id": business_id,
            "type": message_type,
            "recipient": contact["phone"],
            "recipient_name": contact.get("name"),
            "message": personalized_message,
            "sender_id": sender_id,
            "status": "queued",
            "batch_number": batch_number,
            "created_at": datetime.utcnow()
        }
        
        result = db.unitxt_message_logs.insert_one(message_doc)
        message_id = str(result.inserted_id)
        message_ids.append(message_id)
        
        # Queue individual message task
        if message_type == 'sms':
            task = send_single_sms.s(
                message_id=message_id,
                phone=contact["phone"],
                message=personalized_message,
                sender_id=sender_id,
                campaign_id=campaign_id,
                user_id=user_id,
                business_id=business_id
            )
        else:
            task = send_single_whatsapp.s(
                message_id=message_id,
                phone=contact["phone"],
                message=personalized_message,
                campaign_id=campaign_id,
                user_id=user_id,
                business_id=business_id
            )
        
        tasks.append(task)
    
    # Execute all tasks in the batch as a group
    job = group(tasks)
    result = job.apply_async()
    
    # Wait for batch to complete (with timeout)
    try:
        results = result.get(timeout=300)  # 5 minute timeout per batch
    except Exception as e:
        logger.error(f"Batch {batch_number} timeout/error: {str(e)}")
        results = []
    
    # Update batch status
    delivered = sum(1 for r in results if r and r.get("status") == "delivered")
    failed = sum(1 for r in results if r and r.get("status") == "failed")
    
    db.unitxt_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {
            f"batch_status.{batch_number}": "completed",
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"Batch {batch_number} completed: {delivered} delivered, {failed} failed")
    
    return {
        "batch_number": batch_number,
        "total": len(contacts),
        "delivered": delivered,
        "failed": failed,
        "message_ids": message_ids
    }


@shared_task(bind=True)
def process_campaign(self, campaign_id: str, user_id: str, business_id: str):
    """
    Main task to process an entire campaign
    Splits contacts into batches and processes them
    
    Args:
        campaign_id: Campaign ID to process
        user_id: User ID
        business_id: Business ID
    
    Returns:
        dict: Campaign processing results
    """
    db = get_sync_db()
    
    logger.info(f"Starting campaign processing: {campaign_id}")
    
    # Get campaign details
    campaign = db.unitxt_campaigns.find_one({"_id": ObjectId(campaign_id)})
    
    if not campaign:
        logger.error(f"Campaign {campaign_id} not found")
        return {"error": "Campaign not found"}
    
    # Update campaign status to 'processing'
    db.unitxt_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {
            "status": "processing",
            "processing_started_at": datetime.utcnow(),
            "celery_task_id": self.request.id
        }}
    )
    
    message = campaign.get("message", "")
    message_type = campaign.get("type", "sms")
    sender_id = campaign.get("sender_id", "UniTxt")
    recipient_groups = campaign.get("recipient_groups", [])
    
    # Get all contacts from recipient groups
    contacts = []
    
    if recipient_groups:
        for group_id in recipient_groups:
            if group_id == "all":
                # All contacts
                group_contacts = list(db.unitxt_contacts.find(
                    {"$or": [{"user_id": user_id}, {"business_id": business_id}],
                     "opted_out": {"$ne": True}},
                    {"_id": 1, "phone": 1, "name": 1, "email": 1}
                ))
            else:
                # Specific group
                group_contacts = list(db.unitxt_contacts.find(
                    {"$or": [{"user_id": user_id}, {"business_id": business_id}],
                     "groups": group_id,
                     "opted_out": {"$ne": True}},
                    {"_id": 1, "phone": 1, "name": 1, "email": 1}
                ))
            
            for c in group_contacts:
                contacts.append({
                    "id": str(c["_id"]),
                    "phone": c["phone"],
                    "name": c.get("name", "Customer")
                })
    
    # Remove duplicates by phone
    seen_phones = set()
    unique_contacts = []
    for c in contacts:
        if c["phone"] not in seen_phones:
            seen_phones.add(c["phone"])
            unique_contacts.append(c)
    
    contacts = unique_contacts
    total_recipients = len(contacts)
    
    logger.info(f"Campaign {campaign_id}: {total_recipients} recipients to process")
    
    # Update campaign with recipient count
    db.unitxt_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {
            "recipients_count": total_recipients,
            "delivered_count": 0,
            "failed_count": 0,
            "batch_status": {}
        }}
    )
    
    if total_recipients == 0:
        db.unitxt_campaigns.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
        )
        return {"campaign_id": campaign_id, "status": "completed", "recipients": 0}
    
    # Split into batches
    batches = [contacts[i:i + BATCH_SIZE] for i in range(0, len(contacts), BATCH_SIZE)]
    total_batches = len(batches)
    
    logger.info(f"Campaign {campaign_id}: Split into {total_batches} batches of {BATCH_SIZE}")
    
    # Process batches
    batch_tasks = []
    for i, batch in enumerate(batches):
        task = process_campaign_batch.s(
            campaign_id=campaign_id,
            contacts=batch,
            message=message,
            message_type=message_type,
            sender_id=sender_id,
            user_id=user_id,
            business_id=business_id,
            batch_number=i
        )
        batch_tasks.append(task)
    
    # Execute batches (can be parallel or sequential based on needs)
    # Using chord to wait for all batches to complete
    callback = finalize_campaign.s(campaign_id)
    job = chord(batch_tasks)(callback)
    
    return {
        "campaign_id": campaign_id,
        "status": "processing",
        "total_recipients": total_recipients,
        "total_batches": total_batches,
        "task_id": self.request.id
    }


@shared_task
def finalize_campaign(batch_results: List[Dict], campaign_id: str):
    """
    Called after all batches complete to finalize campaign
    """
    db = get_sync_db()
    
    logger.info(f"Finalizing campaign {campaign_id}")
    
    # Calculate totals from batch results
    total_delivered = sum(r.get("delivered", 0) for r in batch_results if r)
    total_failed = sum(r.get("failed", 0) for r in batch_results if r)
    total_processed = sum(r.get("total", 0) for r in batch_results if r)
    
    # Update campaign status
    db.unitxt_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow(),
            "delivered_count": total_delivered,
            "failed_count": total_failed,
            "final_stats": {
                "total_processed": total_processed,
                "delivery_rate": round((total_delivered / max(total_processed, 1)) * 100, 2),
                "batches_completed": len(batch_results)
            }
        }}
    )
    
    logger.info(f"Campaign {campaign_id} completed: {total_delivered} delivered, {total_failed} failed")
    
    return {
        "campaign_id": campaign_id,
        "status": "completed",
        "delivered": total_delivered,
        "failed": total_failed,
        "delivery_rate": round((total_delivered / max(total_processed, 1)) * 100, 2)
    }


# ============== SCHEDULED TASKS ==============

@shared_task
def process_scheduled_campaigns():
    """
    Check for scheduled campaigns that are due and process them
    Runs every minute via celery beat
    """
    db = get_sync_db()
    
    now = datetime.utcnow()
    
    # Find campaigns scheduled for now or earlier
    scheduled_campaigns = db.unitxt_campaigns.find({
        "status": "scheduled",
        "scheduled_at": {"$lte": now}
    })
    
    for campaign in scheduled_campaigns:
        campaign_id = str(campaign["_id"])
        user_id = campaign.get("user_id")
        business_id = campaign.get("business_id")
        
        logger.info(f"Processing scheduled campaign: {campaign_id}")
        
        # Queue the campaign for processing
        process_campaign.delay(campaign_id, user_id, business_id)


@shared_task
def cleanup_old_results():
    """
    Cleanup old message logs and results
    Runs hourly via celery beat
    """
    db = get_sync_db()
    
    # Delete message logs older than 30 days
    cutoff = datetime.utcnow() - timedelta(days=30)
    
    result = db.unitxt_message_logs.delete_many({
        "created_at": {"$lt": cutoff},
        "status": {"$in": ["delivered", "failed"]}
    })
    
    logger.info(f"Cleaned up {result.deleted_count} old message logs")
    
    return {"deleted": result.deleted_count}


# ============== UTILITY TASKS ==============

@shared_task
def get_campaign_progress(campaign_id: str):
    """
    Get real-time progress of a campaign
    """
    db = get_sync_db()
    
    campaign = db.unitxt_campaigns.find_one({"_id": ObjectId(campaign_id)})
    
    if not campaign:
        return {"error": "Campaign not found"}
    
    total = campaign.get("recipients_count", 0)
    delivered = campaign.get("delivered_count", 0)
    failed = campaign.get("failed_count", 0)
    processed = delivered + failed
    
    return {
        "campaign_id": campaign_id,
        "status": campaign.get("status"),
        "total_recipients": total,
        "processed": processed,
        "delivered": delivered,
        "failed": failed,
        "progress_percent": round((processed / max(total, 1)) * 100, 1),
        "delivery_rate": round((delivered / max(processed, 1)) * 100, 1),
        "batch_status": campaign.get("batch_status", {})
    }
