"""
KwikPay Advanced Features Module
Comprehensive payment platform enhancements including:
1. Mobile Money Integration (M-Pesa, Tigo Pesa, Airtel Money)
2. Payment Links
3. Subscription/Recurring Payments
4. Multi-Currency Support
5. Split Payments
6. Virtual Cards
7. Refund Management
8. Fraud Detection

Author: Software Galaxy Platform
"""

import os
import logging
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum
from decimal import Decimal
import json
import re

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS AND CONSTANTS
# =============================================================================

class MobileMoneyProvider(str, Enum):
    MPESA = "mpesa"
    TIGO_PESA = "tigo_pesa"
    AIRTEL_MONEY = "airtel_money"
    HALOPESA = "halopesa"
    VODACOM_MPESA = "vodacom_mpesa"


class PaymentLinkStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"
    TRIAL = "trial"


class SubscriptionInterval(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class RefundStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class VirtualCardStatus(str, Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


# Currency configurations
SUPPORTED_CURRENCIES = {
    "TZS": {"name": "Tanzanian Shilling", "symbol": "TSh", "decimals": 0, "country": "TZ"},
    "KES": {"name": "Kenyan Shilling", "symbol": "KSh", "decimals": 0, "country": "KE"},
    "UGX": {"name": "Ugandan Shilling", "symbol": "USh", "decimals": 0, "country": "UG"},
    "USD": {"name": "US Dollar", "symbol": "$", "decimals": 2, "country": "US"},
    "EUR": {"name": "Euro", "symbol": "€", "decimals": 2, "country": "EU"},
    "GBP": {"name": "British Pound", "symbol": "£", "decimals": 2, "country": "GB"},
    "NGN": {"name": "Nigerian Naira", "symbol": "₦", "decimals": 0, "country": "NG"},
    "GHS": {"name": "Ghanaian Cedi", "symbol": "GH₵", "decimals": 2, "country": "GH"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "decimals": 2, "country": "ZA"},
    "RWF": {"name": "Rwandan Franc", "symbol": "FRw", "decimals": 0, "country": "RW"},
}

# Exchange rates (base: USD) - In production, fetch from API
EXCHANGE_RATES = {
    "USD": 1.0,
    "TZS": 2500.0,
    "KES": 155.0,
    "UGX": 3750.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "NGN": 1550.0,
    "GHS": 15.5,
    "ZAR": 18.5,
    "RWF": 1280.0,
}


# =============================================================================
# 1. MOBILE MONEY INTEGRATION
# =============================================================================

class MobileMoneyGateway:
    """
    Unified Mobile Money gateway for East African providers
    Supports: M-Pesa, Tigo Pesa, Airtel Money, Halopesa
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.sandbox = config.get("sandbox", True) if config else True
        
        # Provider configurations
        self.providers = {
            MobileMoneyProvider.MPESA: {
                "name": "M-Pesa (Vodacom Tanzania)",
                "api_url": os.environ.get("MPESA_API_URL", "https://api.vodacom.co.tz"),
                "consumer_key": os.environ.get("MPESA_CONSUMER_KEY", ""),
                "consumer_secret": os.environ.get("MPESA_CONSUMER_SECRET", ""),
                "shortcode": os.environ.get("MPESA_SHORTCODE", ""),
                "passkey": os.environ.get("MPESA_PASSKEY", ""),
                "prefix": ["+255", "255", "0"],
                "pattern": r"^(\+?255|0)?[67]\d{8}$",
            },
            MobileMoneyProvider.TIGO_PESA: {
                "name": "Tigo Pesa",
                "api_url": os.environ.get("TIGO_PESA_API_URL", "https://api.tigo.co.tz"),
                "api_key": os.environ.get("TIGO_PESA_API_KEY", ""),
                "api_secret": os.environ.get("TIGO_PESA_API_SECRET", ""),
                "merchant_id": os.environ.get("TIGO_PESA_MERCHANT_ID", ""),
                "prefix": ["+255", "255", "0"],
                "pattern": r"^(\+?255|0)?7[1-8]\d{7}$",
            },
            MobileMoneyProvider.AIRTEL_MONEY: {
                "name": "Airtel Money",
                "api_url": os.environ.get("AIRTEL_API_URL", "https://api.airtel.co.tz"),
                "client_id": os.environ.get("AIRTEL_CLIENT_ID", ""),
                "client_secret": os.environ.get("AIRTEL_CLIENT_SECRET", ""),
                "prefix": ["+255", "255", "0"],
                "pattern": r"^(\+?255|0)?78\d{7}$",
            },
        }
    
    def detect_provider(self, phone: str) -> Optional[MobileMoneyProvider]:
        """Detect mobile money provider from phone number"""
        # Normalize phone
        phone = phone.replace(" ", "").replace("-", "")
        if phone.startswith("0"):
            phone = "+255" + phone[1:]
        elif phone.startswith("255"):
            phone = "+" + phone
        
        # Tanzania carrier detection by prefix
        if re.match(r'^\+255(74|75|76)\d{7}$', phone):
            return MobileMoneyProvider.VODACOM_MPESA
        elif re.match(r'^\+255(71|65|67)\d{7}$', phone):
            return MobileMoneyProvider.TIGO_PESA
        elif re.match(r'^\+255(78|68|69)\d{7}$', phone):
            return MobileMoneyProvider.AIRTEL_MONEY
        elif re.match(r'^\+255(62)\d{7}$', phone):
            return MobileMoneyProvider.HALOPESA
        
        return MobileMoneyProvider.MPESA  # Default
    
    async def initiate_payment(
        self,
        phone: str,
        amount: float,
        currency: str,
        reference: str,
        description: str = "",
        provider: MobileMoneyProvider = None,
        callback_url: str = None
    ) -> Dict[str, Any]:
        """
        Initiate a mobile money payment (Push USSD to customer)
        """
        # Auto-detect provider if not specified
        if not provider:
            provider = self.detect_provider(phone)
        
        # Sandbox mode - simulate
        if self.sandbox:
            return await self._simulate_payment(phone, amount, currency, reference, provider)
        
        # Real provider integration
        if provider == MobileMoneyProvider.MPESA:
            return await self._mpesa_stk_push(phone, amount, reference, description, callback_url)
        elif provider == MobileMoneyProvider.TIGO_PESA:
            return await self._tigo_pesa_push(phone, amount, reference, description, callback_url)
        elif provider == MobileMoneyProvider.AIRTEL_MONEY:
            return await self._airtel_money_push(phone, amount, reference, description, callback_url)
        else:
            return {"success": False, "error": f"Provider {provider} not supported"}
    
    async def _simulate_payment(
        self, phone: str, amount: float, currency: str, 
        reference: str, provider: MobileMoneyProvider
    ) -> Dict[str, Any]:
        """Simulate mobile money payment for sandbox"""
        import random
        
        tx_id = f"MM_{provider.value.upper()}_{secrets.token_hex(8)}"
        
        return {
            "success": True,
            "provider": provider.value,
            "transaction_id": tx_id,
            "reference": reference,
            "phone": phone,
            "amount": amount,
            "currency": currency,
            "status": "pending",
            "message": f"Payment request sent to {phone}. Awaiting confirmation.",
            "sandbox": True,
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        }
    
    async def _mpesa_stk_push(
        self, phone: str, amount: float, reference: str,
        description: str, callback_url: str
    ) -> Dict[str, Any]:
        """M-Pesa STK Push (Lipa Na M-Pesa)"""
        # Implementation for real M-Pesa integration
        # This would call the actual M-Pesa API
        pass
    
    async def _tigo_pesa_push(
        self, phone: str, amount: float, reference: str,
        description: str, callback_url: str
    ) -> Dict[str, Any]:
        """Tigo Pesa USSD Push"""
        pass
    
    async def _airtel_money_push(
        self, phone: str, amount: float, reference: str,
        description: str, callback_url: str
    ) -> Dict[str, Any]:
        """Airtel Money Push"""
        pass
    
    async def check_status(self, transaction_id: str, provider: MobileMoneyProvider) -> Dict[str, Any]:
        """Check payment status"""
        if self.sandbox:
            import random
            status = random.choice(["completed", "completed", "completed", "pending", "failed"])
            return {
                "transaction_id": transaction_id,
                "status": status,
                "provider": provider.value,
                "sandbox": True
            }
        # Real implementation would query provider API
        pass
    
    def get_supported_providers(self) -> List[Dict[str, Any]]:
        """Get list of supported mobile money providers"""
        return [
            {
                "id": "mpesa",
                "name": "M-Pesa (Vodacom)",
                "country": "TZ",
                "currency": "TZS",
                "min_amount": 1000,
                "max_amount": 3000000,
                "prefixes": ["074", "075", "076"]
            },
            {
                "id": "tigo_pesa",
                "name": "Tigo Pesa",
                "country": "TZ",
                "currency": "TZS",
                "min_amount": 500,
                "max_amount": 5000000,
                "prefixes": ["071", "065", "067"]
            },
            {
                "id": "airtel_money",
                "name": "Airtel Money",
                "country": "TZ",
                "currency": "TZS",
                "min_amount": 500,
                "max_amount": 5000000,
                "prefixes": ["078", "068", "069"]
            },
            {
                "id": "halopesa",
                "name": "Halopesa",
                "country": "TZ",
                "currency": "TZS",
                "min_amount": 1000,
                "max_amount": 1000000,
                "prefixes": ["062"]
            }
        ]


# =============================================================================
# 2. PAYMENT LINKS
# =============================================================================

class PaymentLinkManager:
    """
    Create and manage shareable payment links
    """
    
    def __init__(self, db, base_url: str = None):
        self.db = db
        self.base_url = base_url or os.environ.get("PAYMENT_LINK_BASE_URL", "https://pay.kwikpay.co.tz")
    
    async def create_link(
        self,
        business_id: str,
        amount: float,
        currency: str = "TZS",
        description: str = "",
        customer_email: str = None,
        customer_name: str = None,
        expires_in_hours: int = 24,
        one_time: bool = True,
        custom_fields: Dict[str, Any] = None,
        success_url: str = None,
        cancel_url: str = None,
    ) -> Dict[str, Any]:
        """Create a new payment link"""
        
        link_id = secrets.token_urlsafe(12)
        short_code = secrets.token_urlsafe(6).upper()
        
        link_doc = {
            "link_id": link_id,
            "short_code": short_code,
            "business_id": business_id,
            "amount": amount,
            "currency": currency,
            "description": description,
            "customer_email": customer_email,
            "customer_name": customer_name,
            "status": PaymentLinkStatus.ACTIVE.value,
            "one_time": one_time,
            "custom_fields": custom_fields or {},
            "success_url": success_url,
            "cancel_url": cancel_url,
            "view_count": 0,
            "payment_count": 0,
            "total_collected": 0,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=expires_in_hours),
        }
        
        await self.db.kwikpay_payment_links.insert_one(link_doc)
        
        return {
            "success": True,
            "link_id": link_id,
            "short_code": short_code,
            "payment_url": f"{self.base_url}/pay/{short_code}",
            "qr_url": f"{self.base_url}/qr/{short_code}",
            "amount": amount,
            "currency": currency,
            "expires_at": link_doc["expires_at"].isoformat()
        }
    
    async def get_link(self, short_code: str) -> Optional[Dict[str, Any]]:
        """Get payment link by short code"""
        link = await self.db.kwikpay_payment_links.find_one({"short_code": short_code})
        if link:
            # Increment view count
            await self.db.kwikpay_payment_links.update_one(
                {"_id": link["_id"]},
                {"$inc": {"view_count": 1}}
            )
            link["_id"] = str(link["_id"])
        return link
    
    async def get_business_links(self, business_id: str, status: str = None) -> List[Dict[str, Any]]:
        """Get all payment links for a business"""
        query = {"business_id": business_id}
        if status:
            query["status"] = status
        
        links = await self.db.kwikpay_payment_links.find(query).sort("created_at", -1).to_list(100)
        for link in links:
            link["_id"] = str(link["_id"])
            link["payment_url"] = f"{self.base_url}/pay/{link['short_code']}"
        return links
    
    async def deactivate_link(self, link_id: str, business_id: str) -> bool:
        """Deactivate a payment link"""
        result = await self.db.kwikpay_payment_links.update_one(
            {"link_id": link_id, "business_id": business_id},
            {"$set": {"status": PaymentLinkStatus.CANCELLED.value}}
        )
        return result.modified_count > 0
    
    async def record_payment(self, short_code: str, amount: float, transaction_id: str):
        """Record a payment made via link"""
        await self.db.kwikpay_payment_links.update_one(
            {"short_code": short_code},
            {
                "$inc": {"payment_count": 1, "total_collected": amount},
                "$push": {"payments": {
                    "transaction_id": transaction_id,
                    "amount": amount,
                    "paid_at": datetime.utcnow()
                }},
                "$set": {"last_payment_at": datetime.utcnow()}
            }
        )
        
        # If one-time link, mark as completed
        link = await self.db.kwikpay_payment_links.find_one({"short_code": short_code})
        if link and link.get("one_time"):
            await self.db.kwikpay_payment_links.update_one(
                {"short_code": short_code},
                {"$set": {"status": PaymentLinkStatus.COMPLETED.value}}
            )


# =============================================================================
# 3. SUBSCRIPTION/RECURRING PAYMENTS
# =============================================================================

class SubscriptionManager:
    """
    Manage subscription and recurring payments
    """
    
    def __init__(self, db):
        self.db = db
    
    async def create_plan(
        self,
        business_id: str,
        name: str,
        amount: float,
        currency: str,
        interval: SubscriptionInterval,
        description: str = "",
        trial_days: int = 0,
        features: List[str] = None
    ) -> Dict[str, Any]:
        """Create a subscription plan"""
        
        plan_id = f"plan_{secrets.token_hex(8)}"
        
        plan_doc = {
            "plan_id": plan_id,
            "business_id": business_id,
            "name": name,
            "amount": amount,
            "currency": currency,
            "interval": interval.value,
            "description": description,
            "trial_days": trial_days,
            "features": features or [],
            "active": True,
            "subscriber_count": 0,
            "created_at": datetime.utcnow()
        }
        
        await self.db.kwikpay_subscription_plans.insert_one(plan_doc)
        
        return {
            "success": True,
            "plan_id": plan_id,
            "name": name,
            "amount": amount,
            "interval": interval.value
        }
    
    async def subscribe(
        self,
        plan_id: str,
        customer_id: str,
        customer_email: str,
        customer_phone: str,
        payment_method: str = "mobile_money",
        payment_details: Dict[str, Any] = None,
        start_date: datetime = None
    ) -> Dict[str, Any]:
        """Subscribe a customer to a plan"""
        
        plan = await self.db.kwikpay_subscription_plans.find_one({"plan_id": plan_id})
        if not plan:
            return {"success": False, "error": "Plan not found"}
        
        subscription_id = f"sub_{secrets.token_hex(8)}"
        start_date = start_date or datetime.utcnow()
        
        # Calculate first billing date (after trial)
        if plan.get("trial_days", 0) > 0:
            first_billing_date = start_date + timedelta(days=plan["trial_days"])
            status = SubscriptionStatus.TRIAL.value
        else:
            first_billing_date = start_date
            status = SubscriptionStatus.ACTIVE.value
        
        # Calculate next billing date based on interval
        next_billing_date = self._calculate_next_billing(first_billing_date, plan["interval"])
        
        subscription_doc = {
            "subscription_id": subscription_id,
            "plan_id": plan_id,
            "business_id": plan["business_id"],
            "customer_id": customer_id,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "payment_method": payment_method,
            "payment_details": payment_details or {},
            "status": status,
            "amount": plan["amount"],
            "currency": plan["currency"],
            "interval": plan["interval"],
            "trial_ends_at": first_billing_date if plan.get("trial_days", 0) > 0 else None,
            "current_period_start": start_date,
            "current_period_end": next_billing_date,
            "next_billing_date": first_billing_date,
            "billing_cycle_count": 0,
            "total_paid": 0,
            "created_at": datetime.utcnow()
        }
        
        await self.db.kwikpay_subscriptions.insert_one(subscription_doc)
        
        # Update plan subscriber count
        await self.db.kwikpay_subscription_plans.update_one(
            {"plan_id": plan_id},
            {"$inc": {"subscriber_count": 1}}
        )
        
        return {
            "success": True,
            "subscription_id": subscription_id,
            "status": status,
            "next_billing_date": first_billing_date.isoformat(),
            "amount": plan["amount"],
            "currency": plan["currency"]
        }
    
    def _calculate_next_billing(self, from_date: datetime, interval: str) -> datetime:
        """Calculate next billing date based on interval"""
        if interval == SubscriptionInterval.DAILY.value:
            return from_date + timedelta(days=1)
        elif interval == SubscriptionInterval.WEEKLY.value:
            return from_date + timedelta(weeks=1)
        elif interval == SubscriptionInterval.MONTHLY.value:
            # Add one month
            month = from_date.month + 1
            year = from_date.year
            if month > 12:
                month = 1
                year += 1
            day = min(from_date.day, 28)  # Handle month end
            return from_date.replace(year=year, month=month, day=day)
        elif interval == SubscriptionInterval.QUARTERLY.value:
            month = from_date.month + 3
            year = from_date.year
            while month > 12:
                month -= 12
                year += 1
            day = min(from_date.day, 28)
            return from_date.replace(year=year, month=month, day=day)
        elif interval == SubscriptionInterval.YEARLY.value:
            return from_date.replace(year=from_date.year + 1)
        
        return from_date + timedelta(days=30)  # Default monthly
    
    async def cancel_subscription(self, subscription_id: str, reason: str = None) -> Dict[str, Any]:
        """Cancel a subscription"""
        result = await self.db.kwikpay_subscriptions.update_one(
            {"subscription_id": subscription_id},
            {"$set": {
                "status": SubscriptionStatus.CANCELLED.value,
                "cancelled_at": datetime.utcnow(),
                "cancellation_reason": reason
            }}
        )
        
        return {"success": result.modified_count > 0}
    
    async def pause_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Pause a subscription"""
        result = await self.db.kwikpay_subscriptions.update_one(
            {"subscription_id": subscription_id},
            {"$set": {
                "status": SubscriptionStatus.PAUSED.value,
                "paused_at": datetime.utcnow()
            }}
        )
        return {"success": result.modified_count > 0}
    
    async def resume_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Resume a paused subscription"""
        result = await self.db.kwikpay_subscriptions.update_one(
            {"subscription_id": subscription_id, "status": SubscriptionStatus.PAUSED.value},
            {"$set": {
                "status": SubscriptionStatus.ACTIVE.value,
                "resumed_at": datetime.utcnow()
            },
            "$unset": {"paused_at": ""}}
        )
        return {"success": result.modified_count > 0}
    
    async def process_billing_cycle(self, subscription_id: str) -> Dict[str, Any]:
        """Process a billing cycle for a subscription"""
        subscription = await self.db.kwikpay_subscriptions.find_one({"subscription_id": subscription_id})
        
        if not subscription:
            return {"success": False, "error": "Subscription not found"}
        
        if subscription["status"] != SubscriptionStatus.ACTIVE.value:
            return {"success": False, "error": f"Subscription is {subscription['status']}"}
        
        # In production: Charge the customer via their payment method
        # For now, record the billing attempt
        
        billing_record = {
            "subscription_id": subscription_id,
            "amount": subscription["amount"],
            "currency": subscription["currency"],
            "billing_date": datetime.utcnow(),
            "status": "completed",  # In production: result of actual charge
            "cycle_number": subscription.get("billing_cycle_count", 0) + 1
        }
        
        await self.db.kwikpay_subscription_billings.insert_one(billing_record)
        
        # Update subscription
        next_billing = self._calculate_next_billing(datetime.utcnow(), subscription["interval"])
        
        await self.db.kwikpay_subscriptions.update_one(
            {"subscription_id": subscription_id},
            {
                "$set": {
                    "current_period_start": datetime.utcnow(),
                    "current_period_end": next_billing,
                    "next_billing_date": next_billing,
                    "last_billing_date": datetime.utcnow()
                },
                "$inc": {
                    "billing_cycle_count": 1,
                    "total_paid": subscription["amount"]
                }
            }
        )
        
        return {
            "success": True,
            "amount_charged": subscription["amount"],
            "next_billing_date": next_billing.isoformat()
        }


# =============================================================================
# 4. MULTI-CURRENCY SUPPORT
# =============================================================================

class CurrencyConverter:
    """
    Multi-currency support with conversion
    """
    
    def __init__(self):
        self.rates = EXCHANGE_RATES.copy()
        self.currencies = SUPPORTED_CURRENCIES.copy()
        self.last_updated = datetime.utcnow()
    
    async def update_rates(self):
        """Update exchange rates from external API"""
        # In production, fetch from forex API
        # For now, using static rates
        self.last_updated = datetime.utcnow()
    
    def convert(self, amount: float, from_currency: str, to_currency: str) -> Dict[str, Any]:
        """Convert amount between currencies"""
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        if from_currency not in self.rates or to_currency not in self.rates:
            return {"success": False, "error": "Unsupported currency"}
        
        # Convert to USD first, then to target
        amount_usd = amount / self.rates[from_currency]
        converted = amount_usd * self.rates[to_currency]
        
        # Get decimal places for target currency
        decimals = self.currencies.get(to_currency, {}).get("decimals", 2)
        converted = round(converted, decimals)
        
        return {
            "success": True,
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": converted,
            "converted_currency": to_currency,
            "rate": self.rates[to_currency] / self.rates[from_currency],
            "rate_updated_at": self.last_updated.isoformat()
        }
    
    def get_supported_currencies(self) -> List[Dict[str, Any]]:
        """Get list of supported currencies with rates"""
        result = []
        for code, info in self.currencies.items():
            result.append({
                "code": code,
                "name": info["name"],
                "symbol": info["symbol"],
                "decimals": info["decimals"],
                "country": info["country"],
                "rate_to_usd": 1 / self.rates.get(code, 1)
            })
        return result
    
    def format_amount(self, amount: float, currency: str) -> str:
        """Format amount with currency symbol"""
        currency = currency.upper()
        info = self.currencies.get(currency, {"symbol": currency, "decimals": 2})
        
        decimals = info["decimals"]
        if decimals == 0:
            formatted = f"{int(amount):,}"
        else:
            formatted = f"{amount:,.{decimals}f}"
        
        return f"{info['symbol']} {formatted}"


# =============================================================================
# 5. SPLIT PAYMENTS
# =============================================================================

class SplitPaymentManager:
    """
    Distribute payments to multiple recipients
    """
    
    def __init__(self, db):
        self.db = db
    
    async def create_split_config(
        self,
        business_id: str,
        name: str,
        recipients: List[Dict[str, Any]],
        description: str = ""
    ) -> Dict[str, Any]:
        """
        Create a split payment configuration
        
        recipients format:
        [
            {"account_id": "acc_123", "type": "percentage", "value": 70},
            {"account_id": "acc_456", "type": "percentage", "value": 20},
            {"account_id": "platform", "type": "percentage", "value": 10},  # Platform fee
        ]
        or
        [
            {"account_id": "acc_123", "type": "fixed", "value": 5000},
            {"account_id": "acc_456", "type": "remainder"},  # Gets the rest
        ]
        """
        
        # Validate recipients
        total_percentage = 0
        has_remainder = False
        
        for r in recipients:
            if r.get("type") == "percentage":
                total_percentage += r.get("value", 0)
            elif r.get("type") == "remainder":
                has_remainder = True
        
        if total_percentage > 100:
            return {"success": False, "error": "Total percentage exceeds 100%"}
        
        if total_percentage < 100 and not has_remainder:
            return {"success": False, "error": "Total percentage must equal 100% or include a remainder recipient"}
        
        split_id = f"split_{secrets.token_hex(8)}"
        
        split_doc = {
            "split_id": split_id,
            "business_id": business_id,
            "name": name,
            "description": description,
            "recipients": recipients,
            "active": True,
            "transaction_count": 0,
            "total_distributed": 0,
            "created_at": datetime.utcnow()
        }
        
        await self.db.kwikpay_split_configs.insert_one(split_doc)
        
        return {
            "success": True,
            "split_id": split_id,
            "name": name,
            "recipients": recipients
        }
    
    async def process_split(
        self,
        split_id: str,
        total_amount: float,
        currency: str,
        transaction_id: str
    ) -> Dict[str, Any]:
        """Process a split payment"""
        
        config = await self.db.kwikpay_split_configs.find_one({"split_id": split_id})
        if not config:
            return {"success": False, "error": "Split config not found"}
        
        distributions = []
        remaining = total_amount
        
        # Process fixed amounts first
        for recipient in config["recipients"]:
            if recipient.get("type") == "fixed":
                amount = min(recipient["value"], remaining)
                distributions.append({
                    "account_id": recipient["account_id"],
                    "amount": amount,
                    "type": "fixed"
                })
                remaining -= amount
        
        # Process percentages
        for recipient in config["recipients"]:
            if recipient.get("type") == "percentage":
                amount = (total_amount * recipient["value"]) / 100
                distributions.append({
                    "account_id": recipient["account_id"],
                    "amount": round(amount, 2),
                    "type": "percentage",
                    "percentage": recipient["value"]
                })
                remaining -= amount
        
        # Process remainder
        for recipient in config["recipients"]:
            if recipient.get("type") == "remainder":
                distributions.append({
                    "account_id": recipient["account_id"],
                    "amount": round(max(0, remaining), 2),
                    "type": "remainder"
                })
        
        # Record split transaction
        split_tx = {
            "split_id": split_id,
            "transaction_id": transaction_id,
            "total_amount": total_amount,
            "currency": currency,
            "distributions": distributions,
            "processed_at": datetime.utcnow()
        }
        
        await self.db.kwikpay_split_transactions.insert_one(split_tx)
        
        # Update config stats
        await self.db.kwikpay_split_configs.update_one(
            {"split_id": split_id},
            {"$inc": {"transaction_count": 1, "total_distributed": total_amount}}
        )
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "total_amount": total_amount,
            "distributions": distributions
        }


# =============================================================================
# 6. VIRTUAL CARDS
# =============================================================================

class VirtualCardManager:
    """
    Issue and manage virtual cards
    """
    
    def __init__(self, db):
        self.db = db
    
    async def issue_card(
        self,
        business_id: str,
        customer_id: str,
        customer_name: str,
        currency: str = "USD",
        spending_limit: float = 1000,
        valid_months: int = 12
    ) -> Dict[str, Any]:
        """Issue a new virtual card"""
        
        card_id = f"card_{secrets.token_hex(8)}"
        
        # Generate card details (in production, use card issuing API)
        card_number = self._generate_card_number()
        cvv = f"{secrets.randbelow(900) + 100}"  # 3 digits
        expiry = datetime.utcnow() + timedelta(days=valid_months * 30)
        
        card_doc = {
            "card_id": card_id,
            "business_id": business_id,
            "customer_id": customer_id,
            "customer_name": customer_name,
            "card_number_masked": f"**** **** **** {card_number[-4:]}",
            "card_number_encrypted": self._encrypt_card_number(card_number),  # Encrypt in production
            "cvv_encrypted": cvv,  # Encrypt in production
            "expiry_month": expiry.month,
            "expiry_year": expiry.year,
            "currency": currency,
            "spending_limit": spending_limit,
            "current_balance": 0,
            "total_spent": 0,
            "status": VirtualCardStatus.ACTIVE.value,
            "created_at": datetime.utcnow(),
            "expires_at": expiry
        }
        
        await self.db.kwikpay_virtual_cards.insert_one(card_doc)
        
        return {
            "success": True,
            "card_id": card_id,
            "card_number_masked": card_doc["card_number_masked"],
            "expiry": f"{expiry.month:02d}/{expiry.year % 100}",
            "currency": currency,
            "spending_limit": spending_limit,
            "status": "active"
        }
    
    def _generate_card_number(self) -> str:
        """Generate a valid card number (Luhn algorithm)"""
        # Generate 15 random digits
        prefix = "4"  # Visa-like prefix
        number = prefix + "".join([str(secrets.randbelow(10)) for _ in range(14)])
        
        # Calculate Luhn check digit
        digits = [int(d) for d in number]
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        
        total = sum(odd_digits)
        for d in even_digits:
            total += sum(divmod(d * 2, 10))
        
        check_digit = (10 - (total % 10)) % 10
        
        return number + str(check_digit)
    
    def _encrypt_card_number(self, card_number: str) -> str:
        """Encrypt card number (placeholder - use proper encryption in production)"""
        # In production, use proper encryption (e.g., AES-256)
        return hashlib.sha256(card_number.encode()).hexdigest()
    
    async def fund_card(self, card_id: str, amount: float) -> Dict[str, Any]:
        """Add funds to a virtual card"""
        result = await self.db.kwikpay_virtual_cards.update_one(
            {"card_id": card_id, "status": VirtualCardStatus.ACTIVE.value},
            {"$inc": {"current_balance": amount}}
        )
        
        if result.modified_count == 0:
            return {"success": False, "error": "Card not found or inactive"}
        
        # Record funding transaction
        await self.db.kwikpay_card_transactions.insert_one({
            "card_id": card_id,
            "type": "funding",
            "amount": amount,
            "created_at": datetime.utcnow()
        })
        
        return {"success": True, "amount_added": amount}
    
    async def freeze_card(self, card_id: str) -> Dict[str, Any]:
        """Freeze a virtual card"""
        result = await self.db.kwikpay_virtual_cards.update_one(
            {"card_id": card_id},
            {"$set": {"status": VirtualCardStatus.FROZEN.value}}
        )
        return {"success": result.modified_count > 0}
    
    async def unfreeze_card(self, card_id: str) -> Dict[str, Any]:
        """Unfreeze a virtual card"""
        result = await self.db.kwikpay_virtual_cards.update_one(
            {"card_id": card_id, "status": VirtualCardStatus.FROZEN.value},
            {"$set": {"status": VirtualCardStatus.ACTIVE.value}}
        )
        return {"success": result.modified_count > 0}
    
    async def get_card_transactions(self, card_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get card transaction history"""
        transactions = await self.db.kwikpay_card_transactions.find(
            {"card_id": card_id}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        for tx in transactions:
            tx["_id"] = str(tx["_id"])
        
        return transactions


# =============================================================================
# 7. REFUND MANAGEMENT
# =============================================================================

class RefundManager:
    """
    Manage payment refunds with workflow
    """
    
    def __init__(self, db):
        self.db = db
    
    async def initiate_refund(
        self,
        transaction_id: str,
        amount: float = None,  # None = full refund
        reason: str = "",
        initiated_by: str = None,
        business_id: str = None
    ) -> Dict[str, Any]:
        """Initiate a refund"""
        
        # Get original transaction
        transaction = await self.db.kwikpay_transactions.find_one({"transaction_id": transaction_id})
        if not transaction:
            return {"success": False, "error": "Transaction not found"}
        
        if transaction["status"] != "succeeded":
            return {"success": False, "error": "Can only refund successful transactions"}
        
        # Check if already refunded
        existing_refunds = await self.db.kwikpay_refunds.find({
            "transaction_id": transaction_id,
            "status": {"$in": ["pending", "processing", "completed"]}
        }).to_list(100)
        
        total_refunded = sum(r.get("amount", 0) for r in existing_refunds)
        refundable = transaction["amount"] - total_refunded
        
        refund_amount = amount if amount else refundable
        
        if refund_amount > refundable:
            return {"success": False, "error": f"Maximum refundable amount is {refundable}"}
        
        refund_id = f"refund_{secrets.token_hex(8)}"
        
        refund_doc = {
            "refund_id": refund_id,
            "transaction_id": transaction_id,
            "business_id": business_id or transaction.get("business_id"),
            "original_amount": transaction["amount"],
            "refund_amount": refund_amount,
            "currency": transaction["currency"],
            "reason": reason,
            "status": RefundStatus.PENDING.value,
            "initiated_by": initiated_by,
            "customer_email": transaction.get("customer_email"),
            "customer_phone": transaction.get("customer_phone"),
            "payment_method": transaction.get("payment_method"),
            "created_at": datetime.utcnow()
        }
        
        await self.db.kwikpay_refunds.insert_one(refund_doc)
        
        return {
            "success": True,
            "refund_id": refund_id,
            "amount": refund_amount,
            "status": "pending",
            "message": "Refund initiated and pending processing"
        }
    
    async def process_refund(self, refund_id: str) -> Dict[str, Any]:
        """Process a pending refund"""
        
        refund = await self.db.kwikpay_refunds.find_one({"refund_id": refund_id})
        if not refund:
            return {"success": False, "error": "Refund not found"}
        
        if refund["status"] != RefundStatus.PENDING.value:
            return {"success": False, "error": f"Refund is already {refund['status']}"}
        
        # Update to processing
        await self.db.kwikpay_refunds.update_one(
            {"refund_id": refund_id},
            {"$set": {"status": RefundStatus.PROCESSING.value, "processing_started_at": datetime.utcnow()}}
        )
        
        # In production: Call payment provider's refund API
        # For now, simulate success
        
        await self.db.kwikpay_refunds.update_one(
            {"refund_id": refund_id},
            {"$set": {
                "status": RefundStatus.COMPLETED.value,
                "completed_at": datetime.utcnow()
            }}
        )
        
        # Update original transaction
        await self.db.kwikpay_transactions.update_one(
            {"transaction_id": refund["transaction_id"]},
            {
                "$set": {"refund_status": "refunded" if refund["refund_amount"] == refund["original_amount"] else "partially_refunded"},
                "$inc": {"refunded_amount": refund["refund_amount"]}
            }
        )
        
        return {
            "success": True,
            "refund_id": refund_id,
            "status": "completed",
            "amount": refund["refund_amount"]
        }
    
    async def get_refunds(self, business_id: str, status: str = None) -> List[Dict[str, Any]]:
        """Get refunds for a business"""
        query = {"business_id": business_id}
        if status:
            query["status"] = status
        
        refunds = await self.db.kwikpay_refunds.find(query).sort("created_at", -1).to_list(100)
        for r in refunds:
            r["_id"] = str(r["_id"])
        return refunds


# =============================================================================
# 8. FRAUD DETECTION
# =============================================================================

class FraudDetector:
    """
    Risk scoring and fraud detection for transactions
    """
    
    def __init__(self, db):
        self.db = db
        
        # Risk rules and weights
        self.rules = {
            "high_amount": {"threshold": 1000000, "weight": 20},  # > 1M TZS
            "new_customer": {"weight": 15},
            "unusual_time": {"hours": [0, 1, 2, 3, 4, 5], "weight": 10},
            "velocity_check": {"max_per_hour": 5, "weight": 25},
            "country_mismatch": {"weight": 15},
            "device_mismatch": {"weight": 10},
            "failed_attempts": {"threshold": 3, "weight": 30},
        }
    
    async def analyze_transaction(
        self,
        amount: float,
        currency: str,
        customer_id: str,
        customer_email: str,
        customer_phone: str,
        ip_address: str = None,
        device_fingerprint: str = None,
        business_id: str = None
    ) -> Dict[str, Any]:
        """Analyze a transaction for fraud risk"""
        
        risk_score = 0
        risk_factors = []
        
        # Rule 1: High amount
        if amount > self.rules["high_amount"]["threshold"]:
            risk_score += self.rules["high_amount"]["weight"]
            risk_factors.append("High transaction amount")
        
        # Rule 2: New customer (no previous transactions)
        prev_txs = await self.db.kwikpay_transactions.count_documents({
            "customer_email": customer_email,
            "status": "succeeded"
        })
        if prev_txs == 0:
            risk_score += self.rules["new_customer"]["weight"]
            risk_factors.append("First-time customer")
        
        # Rule 3: Unusual time
        current_hour = datetime.utcnow().hour
        if current_hour in self.rules["unusual_time"]["hours"]:
            risk_score += self.rules["unusual_time"]["weight"]
            risk_factors.append("Transaction at unusual hour")
        
        # Rule 4: Velocity check (too many transactions in short time)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_txs = await self.db.kwikpay_transactions.count_documents({
            "customer_email": customer_email,
            "created_at": {"$gte": one_hour_ago}
        })
        if recent_txs >= self.rules["velocity_check"]["max_per_hour"]:
            risk_score += self.rules["velocity_check"]["weight"]
            risk_factors.append(f"High velocity: {recent_txs} transactions in last hour")
        
        # Rule 5: Failed attempts
        failed_count = await self.db.kwikpay_transactions.count_documents({
            "customer_email": customer_email,
            "status": "failed",
            "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        })
        if failed_count >= self.rules["failed_attempts"]["threshold"]:
            risk_score += self.rules["failed_attempts"]["weight"]
            risk_factors.append(f"Multiple failed attempts: {failed_count} in 24h")
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = RiskLevel.CRITICAL
            recommendation = "block"
        elif risk_score >= 50:
            risk_level = RiskLevel.HIGH
            recommendation = "review"
        elif risk_score >= 30:
            risk_level = RiskLevel.MEDIUM
            recommendation = "monitor"
        else:
            risk_level = RiskLevel.LOW
            recommendation = "allow"
        
        analysis = {
            "risk_score": risk_score,
            "risk_level": risk_level.value,
            "risk_factors": risk_factors,
            "recommendation": recommendation,
            "analyzed_at": datetime.utcnow().isoformat()
        }
        
        # Store analysis
        await self.db.kwikpay_fraud_analyses.insert_one({
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "amount": amount,
            "currency": currency,
            "ip_address": ip_address,
            "business_id": business_id,
            **analysis
        })
        
        return analysis
    
    async def get_blocked_entities(self, business_id: str = None) -> Dict[str, List[str]]:
        """Get blocked emails, phones, IPs"""
        query = {}
        if business_id:
            query["business_id"] = business_id
        
        blocked = await self.db.kwikpay_blocked_entities.find(query).to_list(1000)
        
        result = {"emails": [], "phones": [], "ips": []}
        for entity in blocked:
            if entity.get("type") == "email":
                result["emails"].append(entity["value"])
            elif entity.get("type") == "phone":
                result["phones"].append(entity["value"])
            elif entity.get("type") == "ip":
                result["ips"].append(entity["value"])
        
        return result
    
    async def block_entity(
        self, entity_type: str, value: str, reason: str, business_id: str = None
    ) -> Dict[str, Any]:
        """Block an email, phone, or IP"""
        
        await self.db.kwikpay_blocked_entities.update_one(
            {"type": entity_type, "value": value},
            {"$set": {
                "type": entity_type,
                "value": value,
                "reason": reason,
                "business_id": business_id,
                "blocked_at": datetime.utcnow()
            }},
            upsert=True
        )
        
        return {"success": True, "blocked": f"{entity_type}: {value}"}
    
    async def unblock_entity(self, entity_type: str, value: str) -> Dict[str, Any]:
        """Unblock an entity"""
        result = await self.db.kwikpay_blocked_entities.delete_one({
            "type": entity_type,
            "value": value
        })
        return {"success": result.deleted_count > 0}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_mobile_money_gateway(config: Dict = None) -> MobileMoneyGateway:
    """Get mobile money gateway instance"""
    return MobileMoneyGateway(config)

def get_currency_converter() -> CurrencyConverter:
    """Get currency converter instance"""
    return CurrencyConverter()
