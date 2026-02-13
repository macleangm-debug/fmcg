"""
Software Galaxy Ecosystem Integrations for UniTxt
Enables data sync and automated messaging between:
- RetailPro (POS/Retail)
- Invoicing
- KwikPay (Payments)
- UniTxt (Messaging)

Author: Software Galaxy Platform
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum
from bson import ObjectId

logger = logging.getLogger(__name__)


class IntegratedApp(str, Enum):
    RETAILPRO = "retailpro"
    INVOICING = "invoicing"
    KWIKPAY = "kwikpay"
    UNITXT = "unitxt"


class EventType(str, Enum):
    # RetailPro Events
    CUSTOMER_CREATED = "retailpro.customer.created"
    CUSTOMER_UPDATED = "retailpro.customer.updated"
    ORDER_CREATED = "retailpro.order.created"
    ORDER_COMPLETED = "retailpro.order.completed"
    ORDER_SHIPPED = "retailpro.order.shipped"
    ORDER_DELIVERED = "retailpro.order.delivered"
    LOW_STOCK_ALERT = "retailpro.inventory.low_stock"
    
    # Invoicing Events
    CLIENT_CREATED = "invoicing.client.created"
    CLIENT_UPDATED = "invoicing.client.updated"
    INVOICE_CREATED = "invoicing.invoice.created"
    INVOICE_SENT = "invoicing.invoice.sent"
    INVOICE_OVERDUE = "invoicing.invoice.overdue"
    INVOICE_PAID = "invoicing.invoice.paid"
    QUOTE_CREATED = "invoicing.quote.created"
    QUOTE_ACCEPTED = "invoicing.quote.accepted"
    
    # KwikPay Events
    PAYMENT_RECEIVED = "kwikpay.payment.received"
    PAYMENT_FAILED = "kwikpay.payment.failed"
    PAYOUT_INITIATED = "kwikpay.payout.initiated"
    PAYOUT_COMPLETED = "kwikpay.payout.completed"
    
    # UniTxt Events
    MESSAGE_DELIVERED = "unitxt.message.delivered"
    MESSAGE_FAILED = "unitxt.message.failed"
    CONTACT_OPTED_OUT = "unitxt.contact.opted_out"


class EcosystemIntegration:
    """
    Manages integrations between Software Galaxy apps
    """
    
    def __init__(self, db):
        self.db = db
        
        # Default message templates for each event type
        self.message_templates = {
            # RetailPro templates
            EventType.ORDER_COMPLETED: "Hi {{customer_name}}, your order #{{order_number}} has been confirmed! Total: {{currency}}{{total}}. Thank you for shopping with us!",
            EventType.ORDER_SHIPPED: "Hi {{customer_name}}, great news! Your order #{{order_number}} has been shipped. Track it here: {{tracking_url}}",
            EventType.ORDER_DELIVERED: "Hi {{customer_name}}, your order #{{order_number}} has been delivered. Enjoy! Rate your experience: {{feedback_url}}",
            EventType.LOW_STOCK_ALERT: "ALERT: {{product_name}} is running low ({{current_stock}} left). Reorder soon to avoid stockouts.",
            
            # Invoicing templates
            EventType.INVOICE_CREATED: "Hi {{client_name}}, invoice #{{invoice_number}} for {{currency}}{{amount}} has been created. View: {{invoice_url}}",
            EventType.INVOICE_SENT: "Hi {{client_name}}, invoice #{{invoice_number}} for {{currency}}{{amount}} is due on {{due_date}}. Pay now: {{payment_url}}",
            EventType.INVOICE_OVERDUE: "Hi {{client_name}}, your invoice #{{invoice_number}} for {{currency}}{{amount}} is overdue. Please pay immediately to avoid late fees.",
            EventType.INVOICE_PAID: "Hi {{client_name}}, thank you! We received your payment of {{currency}}{{amount}} for invoice #{{invoice_number}}.",
            EventType.QUOTE_CREATED: "Hi {{client_name}}, your quote #{{quote_number}} for {{currency}}{{amount}} is ready. Review: {{quote_url}}",
            EventType.QUOTE_ACCEPTED: "Hi {{client_name}}, great news! Your quote #{{quote_number}} has been accepted. We'll proceed with the order.",
            
            # KwikPay templates
            EventType.PAYMENT_RECEIVED: "Payment received! {{currency}}{{amount}} from {{customer_name}}. Transaction ID: {{transaction_id}}",
            EventType.PAYMENT_FAILED: "Payment failed: {{currency}}{{amount}} from {{customer_name}}. Reason: {{failure_reason}}. Please retry.",
            EventType.PAYOUT_INITIATED: "Payout of {{currency}}{{amount}} has been initiated to your account. Expected arrival: {{expected_date}}",
            EventType.PAYOUT_COMPLETED: "Payout complete! {{currency}}{{amount}} has been deposited to your account ending in {{account_last4}}.",
        }
    
    # =========================================================================
    # CONTACT SYNC
    # =========================================================================
    
    async def sync_contacts_from_retailpro(self, user_id: str, business_id: str = None) -> Dict[str, Any]:
        """
        Sync customers from RetailPro to UniTxt contacts
        """
        try:
            # Query RetailPro customers
            query = {"business_id": business_id} if business_id else {"user_id": user_id}
            
            customers = await self.db.customers.find(query).to_list(10000)
            
            synced = 0
            skipped = 0
            errors = 0
            
            for customer in customers:
                try:
                    phone = customer.get("phone") or customer.get("mobile")
                    if not phone:
                        skipped += 1
                        continue
                    
                    # Check if contact already exists
                    existing = await self.db.unitxt_contacts.find_one({
                        "phone": phone,
                        "$or": [{"user_id": user_id}, {"business_id": business_id}]
                    })
                    
                    if existing:
                        # Update existing contact
                        await self.db.unitxt_contacts.update_one(
                            {"_id": existing["_id"]},
                            {"$set": {
                                "name": customer.get("name", existing.get("name")),
                                "email": customer.get("email", existing.get("email")),
                                "source": "retailpro",
                                "source_id": str(customer["_id"]),
                                "updated_at": datetime.utcnow()
                            },
                            "$addToSet": {"tags": "retailpro-customer"}}
                        )
                    else:
                        # Create new contact
                        await self.db.unitxt_contacts.insert_one({
                            "user_id": user_id,
                            "business_id": business_id,
                            "name": customer.get("name", "Customer"),
                            "phone": phone,
                            "email": customer.get("email"),
                            "country": customer.get("country", "TZ"),
                            "source": "retailpro",
                            "source_id": str(customer["_id"]),
                            "tags": ["retailpro-customer"],
                            "groups": ["retailpro-sync"],
                            "opted_out": False,
                            "created_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        })
                    
                    synced += 1
                    
                except Exception as e:
                    logger.error(f"Error syncing customer {customer.get('_id')}: {e}")
                    errors += 1
            
            # Log sync event
            await self.db.unitxt_sync_logs.insert_one({
                "user_id": user_id,
                "business_id": business_id,
                "source_app": IntegratedApp.RETAILPRO.value,
                "sync_type": "contacts",
                "synced": synced,
                "skipped": skipped,
                "errors": errors,
                "created_at": datetime.utcnow()
            })
            
            return {
                "success": True,
                "source": "retailpro",
                "synced": synced,
                "skipped": skipped,
                "errors": errors,
                "message": f"Synced {synced} contacts from RetailPro"
            }
            
        except Exception as e:
            logger.error(f"RetailPro contact sync error: {e}")
            return {"success": False, "error": str(e)}
    
    async def sync_contacts_from_invoicing(self, user_id: str, business_id: str = None) -> Dict[str, Any]:
        """
        Sync clients from Invoicing app to UniTxt contacts
        """
        try:
            query = {"business_id": business_id} if business_id else {"user_id": user_id}
            
            clients = await self.db.invoicing_clients.find(query).to_list(10000)
            
            synced = 0
            skipped = 0
            errors = 0
            
            for client in clients:
                try:
                    phone = client.get("phone") or client.get("mobile")
                    if not phone:
                        skipped += 1
                        continue
                    
                    existing = await self.db.unitxt_contacts.find_one({
                        "phone": phone,
                        "$or": [{"user_id": user_id}, {"business_id": business_id}]
                    })
                    
                    if existing:
                        await self.db.unitxt_contacts.update_one(
                            {"_id": existing["_id"]},
                            {"$set": {
                                "name": client.get("name", existing.get("name")),
                                "email": client.get("email", existing.get("email")),
                                "company": client.get("company"),
                                "source": "invoicing",
                                "source_id": str(client["_id"]),
                                "updated_at": datetime.utcnow()
                            },
                            "$addToSet": {"tags": "invoicing-client"}}
                        )
                    else:
                        await self.db.unitxt_contacts.insert_one({
                            "user_id": user_id,
                            "business_id": business_id,
                            "name": client.get("name", "Client"),
                            "phone": phone,
                            "email": client.get("email"),
                            "company": client.get("company"),
                            "country": client.get("country", "TZ"),
                            "source": "invoicing",
                            "source_id": str(client["_id"]),
                            "tags": ["invoicing-client"],
                            "groups": ["invoicing-sync"],
                            "opted_out": False,
                            "created_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        })
                    
                    synced += 1
                    
                except Exception as e:
                    logger.error(f"Error syncing client {client.get('_id')}: {e}")
                    errors += 1
            
            await self.db.unitxt_sync_logs.insert_one({
                "user_id": user_id,
                "business_id": business_id,
                "source_app": IntegratedApp.INVOICING.value,
                "sync_type": "contacts",
                "synced": synced,
                "skipped": skipped,
                "errors": errors,
                "created_at": datetime.utcnow()
            })
            
            return {
                "success": True,
                "source": "invoicing",
                "synced": synced,
                "skipped": skipped,
                "errors": errors,
                "message": f"Synced {synced} contacts from Invoicing"
            }
            
        except Exception as e:
            logger.error(f"Invoicing contact sync error: {e}")
            return {"success": False, "error": str(e)}
    
    async def sync_all_contacts(self, user_id: str, business_id: str = None) -> Dict[str, Any]:
        """
        Sync contacts from all integrated apps
        """
        results = {
            "retailpro": await self.sync_contacts_from_retailpro(user_id, business_id),
            "invoicing": await self.sync_contacts_from_invoicing(user_id, business_id),
        }
        
        total_synced = sum(r.get("synced", 0) for r in results.values())
        
        return {
            "success": True,
            "total_synced": total_synced,
            "details": results
        }
    
    # =========================================================================
    # EVENT TRIGGERS - Auto-send SMS on events
    # =========================================================================
    
    async def handle_event(self, event_type: EventType, event_data: Dict[str, Any], 
                          user_id: str, business_id: str = None) -> Dict[str, Any]:
        """
        Handle an event from any integrated app and trigger appropriate SMS
        """
        try:
            # Check if automation is enabled for this event
            automation = await self.db.unitxt_automations.find_one({
                "$or": [{"user_id": user_id}, {"business_id": business_id}],
                "event_type": event_type.value,
                "enabled": True
            })
            
            if not automation:
                # Check default automations
                automation = await self._get_or_create_default_automation(
                    event_type, user_id, business_id
                )
                if not automation or not automation.get("enabled"):
                    return {"triggered": False, "reason": "Automation not enabled"}
            
            # Get recipient phone number
            phone = self._extract_phone_from_event(event_type, event_data)
            if not phone:
                return {"triggered": False, "reason": "No phone number in event data"}
            
            # Check opt-out status
            contact = await self.db.unitxt_contacts.find_one({
                "phone": phone,
                "$or": [{"user_id": user_id}, {"business_id": business_id}]
            })
            
            if contact and contact.get("opted_out"):
                return {"triggered": False, "reason": "Contact opted out"}
            
            # Build message from template
            template = automation.get("message_template") or self.message_templates.get(event_type, "")
            message = self._render_template(template, event_data)
            
            # Send SMS via UniTxt
            result = await self._send_triggered_sms(
                phone=phone,
                message=message,
                event_type=event_type,
                event_data=event_data,
                user_id=user_id,
                business_id=business_id,
                automation_id=str(automation.get("_id"))
            )
            
            return {
                "triggered": True,
                "event_type": event_type.value,
                "phone": phone,
                "message_preview": message[:100] + "..." if len(message) > 100 else message,
                "result": result
            }
            
        except Exception as e:
            logger.error(f"Event handling error: {e}")
            return {"triggered": False, "error": str(e)}
    
    def _extract_phone_from_event(self, event_type: EventType, event_data: Dict) -> Optional[str]:
        """Extract phone number from event data based on event type"""
        
        # Try common field names
        phone_fields = ["phone", "mobile", "customer_phone", "client_phone", 
                       "recipient_phone", "contact_phone"]
        
        for field in phone_fields:
            if field in event_data and event_data[field]:
                return event_data[field]
        
        # Try nested objects
        if "customer" in event_data:
            return event_data["customer"].get("phone") or event_data["customer"].get("mobile")
        
        if "client" in event_data:
            return event_data["client"].get("phone") or event_data["client"].get("mobile")
        
        if "recipient" in event_data:
            return event_data["recipient"].get("phone")
        
        return None
    
    def _render_template(self, template: str, data: Dict) -> str:
        """Render message template with data"""
        message = template
        
        # Flatten nested data
        flat_data = self._flatten_dict(data)
        
        # Replace all {{variable}} patterns
        for key, value in flat_data.items():
            message = message.replace(f"{{{{{key}}}}}", str(value) if value else "")
        
        return message
    
    def _flatten_dict(self, d: Dict, parent_key: str = '', sep: str = '_') -> Dict:
        """Flatten nested dictionary"""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep).items())
            else:
                items.append((new_key, v))
        return dict(items)
    
    async def _send_triggered_sms(self, phone: str, message: str, event_type: EventType,
                                  event_data: Dict, user_id: str, business_id: str,
                                  automation_id: str) -> Dict[str, Any]:
        """Send SMS triggered by an event"""
        try:
            # Create message log
            message_doc = {
                "user_id": user_id,
                "business_id": business_id,
                "type": "sms",
                "recipient": phone,
                "message": message,
                "status": "queued",
                "trigger_type": "automation",
                "trigger_event": event_type.value,
                "automation_id": automation_id,
                "event_data": event_data,
                "created_at": datetime.utcnow()
            }
            
            result = await self.db.unitxt_message_logs.insert_one(message_doc)
            message_id = str(result.inserted_id)
            
            # Queue for sending via Celery
            try:
                from tasks import send_single_sms
                task = send_single_sms.delay(
                    message_id=message_id,
                    phone=phone,
                    message=message,
                    sender_id="UniTxt",
                    user_id=user_id,
                    business_id=business_id
                )
                
                return {
                    "success": True,
                    "message_id": message_id,
                    "task_id": task.id,
                    "status": "queued"
                }
            except Exception as e:
                # Celery not available - update status
                await self.db.unitxt_message_logs.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"status": "pending", "error": "Queue unavailable"}}
                )
                return {
                    "success": True,
                    "message_id": message_id,
                    "status": "pending",
                    "note": "Queued for later processing"
                }
                
        except Exception as e:
            logger.error(f"Send triggered SMS error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_or_create_default_automation(self, event_type: EventType, 
                                                 user_id: str, business_id: str) -> Optional[Dict]:
        """Get or create default automation for event type"""
        
        # Default automations that are enabled by default
        default_enabled = [
            EventType.ORDER_COMPLETED,
            EventType.INVOICE_PAID,
            EventType.PAYMENT_RECEIVED,
        ]
        
        template = self.message_templates.get(event_type, "")
        if not template:
            return None
        
        automation = {
            "user_id": user_id,
            "business_id": business_id,
            "event_type": event_type.value,
            "message_template": template,
            "enabled": event_type in default_enabled,
            "is_default": True,
            "created_at": datetime.utcnow()
        }
        
        # Insert if not exists
        existing = await self.db.unitxt_automations.find_one({
            "$or": [{"user_id": user_id}, {"business_id": business_id}],
            "event_type": event_type.value
        })
        
        if not existing:
            await self.db.unitxt_automations.insert_one(automation)
            return automation
        
        return existing
    
    # =========================================================================
    # AUTOMATION MANAGEMENT
    # =========================================================================
    
    async def get_automations(self, user_id: str, business_id: str = None) -> List[Dict]:
        """Get all automations for a user/business"""
        query = {"$or": [{"user_id": user_id}, {"business_id": business_id}]}
        automations = await self.db.unitxt_automations.find(query).to_list(100)
        
        # Convert ObjectIds to strings for JSON serialization
        for automation in automations:
            if "_id" in automation:
                automation["_id"] = str(automation["_id"])
            if "created_at" in automation:
                automation["created_at"] = automation["created_at"].isoformat() if automation["created_at"] else None
            if "updated_at" in automation:
                automation["updated_at"] = automation["updated_at"].isoformat() if automation["updated_at"] else None
        
        # Add default templates for events that don't have automations
        existing_events = {a["event_type"] for a in automations}
        
        for event_type in EventType:
            if event_type.value not in existing_events:
                template = self.message_templates.get(event_type, "")
                if template:
                    automations.append({
                        "event_type": event_type.value,
                        "message_template": template,
                        "enabled": False,
                        "is_default": True,
                        "is_placeholder": True
                    })
        
        return automations
    
    async def update_automation(self, user_id: str, event_type: str, 
                                enabled: bool = None, message_template: str = None,
                                business_id: str = None) -> Dict[str, Any]:
        """Update or create an automation"""
        
        update_data = {"updated_at": datetime.utcnow()}
        
        if enabled is not None:
            update_data["enabled"] = enabled
        if message_template is not None:
            update_data["message_template"] = message_template
        
        result = await self.db.unitxt_automations.update_one(
            {
                "$or": [{"user_id": user_id}, {"business_id": business_id}],
                "event_type": event_type
            },
            {
                "$set": update_data,
                "$setOnInsert": {
                    "user_id": user_id,
                    "business_id": business_id,
                    "event_type": event_type,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "event_type": event_type,
            "enabled": enabled,
            "modified": result.modified_count > 0,
            "created": result.upserted_id is not None
        }
    
    # =========================================================================
    # INVOICE REMINDER AUTOMATION
    # =========================================================================
    
    async def check_overdue_invoices(self, user_id: str = None, business_id: str = None) -> Dict[str, Any]:
        """
        Check for overdue invoices and send reminders
        Called by scheduled task
        """
        try:
            now = datetime.utcnow()
            
            # Build query
            query = {
                "status": {"$in": ["sent", "overdue"]},
                "due_date": {"$lt": now},
                "paid_at": None
            }
            
            if user_id:
                query["user_id"] = user_id
            if business_id:
                query["business_id"] = business_id
            
            overdue_invoices = await self.db.invoices.find(query).to_list(1000)
            
            reminders_sent = 0
            
            for invoice in overdue_invoices:
                # Check if reminder was sent recently (don't spam)
                last_reminder = invoice.get("last_reminder_at")
                if last_reminder:
                    days_since_reminder = (now - last_reminder).days
                    if days_since_reminder < 3:  # Wait 3 days between reminders
                        continue
                
                # Get client info
                client = await self.db.invoicing_clients.find_one({"_id": invoice.get("client_id")})
                if not client or not client.get("phone"):
                    continue
                
                # Trigger overdue event
                event_data = {
                    "client_name": client.get("name", "Customer"),
                    "client_phone": client.get("phone"),
                    "invoice_number": invoice.get("invoice_number"),
                    "amount": invoice.get("total", 0),
                    "currency": invoice.get("currency", "TZS"),
                    "due_date": invoice.get("due_date").strftime("%Y-%m-%d") if invoice.get("due_date") else "",
                    "days_overdue": (now - invoice.get("due_date")).days if invoice.get("due_date") else 0
                }
                
                result = await self.handle_event(
                    EventType.INVOICE_OVERDUE,
                    event_data,
                    invoice.get("user_id"),
                    invoice.get("business_id")
                )
                
                if result.get("triggered"):
                    reminders_sent += 1
                    # Update invoice with reminder timestamp
                    await self.db.invoices.update_one(
                        {"_id": invoice["_id"]},
                        {"$set": {
                            "last_reminder_at": now,
                            "status": "overdue"
                        },
                        "$inc": {"reminder_count": 1}}
                    )
            
            return {
                "success": True,
                "overdue_count": len(overdue_invoices),
                "reminders_sent": reminders_sent
            }
            
        except Exception as e:
            logger.error(f"Check overdue invoices error: {e}")
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # SYNC STATUS & STATS
    # =========================================================================
    
    async def get_sync_status(self, user_id: str, business_id: str = None) -> Dict[str, Any]:
        """Get sync status for all integrated apps"""
        
        query = {"$or": [{"user_id": user_id}, {"business_id": business_id}]}
        
        # Get latest sync for each app
        pipeline = [
            {"$match": query},
            {"$sort": {"created_at": -1}},
            {"$group": {
                "_id": "$source_app",
                "last_sync": {"$first": "$created_at"},
                "last_synced_count": {"$first": "$synced"},
                "total_synced": {"$sum": "$synced"}
            }}
        ]
        
        sync_logs = await self.db.unitxt_sync_logs.aggregate(pipeline).to_list(10)
        
        # Get contact counts by source
        contact_counts = {}
        for app in [IntegratedApp.RETAILPRO, IntegratedApp.INVOICING]:
            count = await self.db.unitxt_contacts.count_documents({
                **query,
                "source": app.value
            })
            contact_counts[app.value] = count
        
        # Get automation stats
        automation_count = await self.db.unitxt_automations.count_documents({
            **query,
            "enabled": True
        })
        
        triggered_today = await self.db.unitxt_message_logs.count_documents({
            **query,
            "trigger_type": "automation",
            "created_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0)}
        })
        
        return {
            "sync_status": {log["_id"]: {
                "last_sync": log["last_sync"].isoformat() if log.get("last_sync") else None,
                "last_synced_count": log.get("last_synced_count", 0),
                "total_synced": log.get("total_synced", 0)
            } for log in sync_logs},
            "contact_counts": contact_counts,
            "automations": {
                "enabled_count": automation_count,
                "triggered_today": triggered_today
            }
        }


# =============================================================================
# INTEGRATION API ROUTES
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional

integration_router = APIRouter(prefix="/integrations", tags=["Ecosystem Integrations"])


def get_integration(db) -> EcosystemIntegration:
    """Dependency to get integration instance"""
    return EcosystemIntegration(db)


# These routes will be added to server.py
