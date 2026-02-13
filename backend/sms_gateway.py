"""
Multi-Provider SMS Gateway for UniTxt
Supports: Twilio, Africa's Talking, Vonage
Features: Smart routing, failover, cost optimization
"""

import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)


class SMSProvider(str, Enum):
    TWILIO = "twilio"
    AFRICASTALKING = "africastalking"
    VONAGE = "vonage"
    TIGO = "tigo"  # Tigo/Mixx By Yas - Tanzania & other markets
    SIMULATOR = "simulator"  # For testing


class MessageStatus(str, Enum):
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    UNDELIVERED = "undelivered"


@dataclass
class SMSResult:
    """Result of an SMS send operation"""
    success: bool
    provider: str
    message_id: Optional[str] = None
    external_id: Optional[str] = None
    status: MessageStatus = MessageStatus.QUEUED
    error: Optional[str] = None
    cost: Optional[float] = None
    segments: int = 1
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "provider": self.provider,
            "message_id": self.message_id,
            "external_id": self.external_id,
            "status": self.status.value,
            "error": self.error,
            "cost": self.cost,
            "segments": self.segments,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


class BaseSMSProvider(ABC):
    """Abstract base class for SMS providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = "base"
        self.is_sandbox = config.get("sandbox", True)
    
    @abstractmethod
    def send_sms(self, to: str, message: str, sender_id: str = None) -> SMSResult:
        """Send an SMS message"""
        pass
    
    @abstractmethod
    def get_balance(self) -> Optional[float]:
        """Get account balance"""
        pass
    
    @abstractmethod
    def validate_phone(self, phone: str) -> bool:
        """Validate phone number format"""
        pass
    
    def get_supported_countries(self) -> List[str]:
        """Get list of supported country codes"""
        return []
    
    def get_cost_per_sms(self, country_code: str) -> float:
        """Get cost per SMS for a country"""
        return 0.01  # Default cost


class TwilioProvider(BaseSMSProvider):
    """Twilio SMS Provider - Global coverage"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = SMSProvider.TWILIO.value
        self.account_sid = config.get("account_sid", "")
        self.auth_token = config.get("auth_token", "")
        self.from_number = config.get("from_number", "")
        self.messaging_service_sid = config.get("messaging_service_sid", "")
        
        self.client = None
        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
                logger.info(f"Twilio client initialized (sandbox={self.is_sandbox})")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
    
    def send_sms(self, to: str, message: str, sender_id: str = None) -> SMSResult:
        """Send SMS via Twilio"""
        
        # Sandbox mode - simulate sending
        if self.is_sandbox or not self.client:
            logger.info(f"[TWILIO SANDBOX] Sending to {to}: {message[:50]}...")
            return SMSResult(
                success=True,
                provider=self.name,
                message_id=f"SM_sandbox_{datetime.utcnow().timestamp()}",
                external_id=f"twilio_sandbox_{to[-4:]}",
                status=MessageStatus.SENT,
                cost=0.0075,
                segments=self._calculate_segments(message)
            )
        
        try:
            # Determine sender
            from_param = {}
            if self.messaging_service_sid:
                from_param["messaging_service_sid"] = self.messaging_service_sid
            elif sender_id and sender_id.startswith("+"):
                from_param["from_"] = sender_id
            elif self.from_number:
                from_param["from_"] = self.from_number
            else:
                return SMSResult(
                    success=False,
                    provider=self.name,
                    status=MessageStatus.FAILED,
                    error="No sender configured"
                )
            
            # Send message
            twilio_message = self.client.messages.create(
                body=message,
                to=to,
                **from_param
            )
            
            return SMSResult(
                success=True,
                provider=self.name,
                message_id=twilio_message.sid,
                external_id=twilio_message.sid,
                status=self._map_status(twilio_message.status),
                cost=float(twilio_message.price) if twilio_message.price else 0.0075,
                segments=twilio_message.num_segments or 1
            )
            
        except Exception as e:
            logger.error(f"Twilio send error: {e}")
            return SMSResult(
                success=False,
                provider=self.name,
                status=MessageStatus.FAILED,
                error=str(e)
            )
    
    def get_balance(self) -> Optional[float]:
        """Get Twilio account balance"""
        if self.is_sandbox or not self.client:
            return 100.00  # Sandbox balance
        
        try:
            balance = self.client.api.v2010.balance.fetch()
            return float(balance.balance)
        except Exception as e:
            logger.error(f"Failed to get Twilio balance: {e}")
            return None
    
    def validate_phone(self, phone: str) -> bool:
        """Validate phone number (E.164 format)"""
        import re
        pattern = r'^\+[1-9]\d{1,14}$'
        return bool(re.match(pattern, phone))
    
    def get_supported_countries(self) -> List[str]:
        return ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "BE", 
                "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PT", "PL", "CZ",
                "MX", "BR", "AR", "CL", "CO", "PE", "IN", "SG", "HK", "JP",
                "KR", "TW", "PH", "TH", "MY", "ID", "VN", "ZA", "NG", "KE",
                "GH", "EG", "MA", "AE", "SA", "IL", "TR", "RU", "UA"]
    
    def get_cost_per_sms(self, country_code: str) -> float:
        """Twilio pricing by country"""
        pricing = {
            "US": 0.0079, "CA": 0.0079, "GB": 0.0420, "AU": 0.0550,
            "DE": 0.0700, "FR": 0.0650, "IN": 0.0040, "NG": 0.0450,
            "KE": 0.0300, "ZA": 0.0250, "GH": 0.0350, "DEFAULT": 0.0500
        }
        return pricing.get(country_code.upper(), pricing["DEFAULT"])
    
    def _calculate_segments(self, message: str) -> int:
        """Calculate SMS segments"""
        length = len(message)
        if length <= 160:
            return 1
        return (length + 152) // 153  # Multipart messages have 153 chars each
    
    def _map_status(self, twilio_status: str) -> MessageStatus:
        """Map Twilio status to our status"""
        mapping = {
            "queued": MessageStatus.QUEUED,
            "sending": MessageStatus.QUEUED,
            "sent": MessageStatus.SENT,
            "delivered": MessageStatus.DELIVERED,
            "undelivered": MessageStatus.UNDELIVERED,
            "failed": MessageStatus.FAILED,
        }
        return mapping.get(twilio_status, MessageStatus.QUEUED)


class AfricasTalkingProvider(BaseSMSProvider):
    """Africa's Talking SMS Provider - Best for African markets"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = SMSProvider.AFRICASTALKING.value
        self.username = config.get("username", "sandbox")
        self.api_key = config.get("api_key", "")
        
        self.sms = None
        if self.api_key:
            try:
                import africastalking
                africastalking.initialize(self.username, self.api_key)
                self.sms = africastalking.SMS
                logger.info(f"Africa's Talking initialized (username={self.username})")
            except Exception as e:
                logger.error(f"Failed to initialize Africa's Talking: {e}")
    
    def send_sms(self, to: str, message: str, sender_id: str = None) -> SMSResult:
        """Send SMS via Africa's Talking"""
        
        # Sandbox mode
        if self.is_sandbox or not self.sms:
            logger.info(f"[AT SANDBOX] Sending to {to}: {message[:50]}...")
            return SMSResult(
                success=True,
                provider=self.name,
                message_id=f"AT_sandbox_{datetime.utcnow().timestamp()}",
                external_id=f"at_sandbox_{to[-4:]}",
                status=MessageStatus.SENT,
                cost=0.02,
                segments=self._calculate_segments(message)
            )
        
        try:
            # Build options
            options = {
                "message": message,
                "recipients": [to]
            }
            
            if sender_id:
                options["sender_id"] = sender_id
            
            response = self.sms.send(**options)
            
            # Parse response
            recipients = response.get("SMSMessageData", {}).get("Recipients", [])
            if recipients:
                recipient = recipients[0]
                status = recipient.get("status", "")
                
                return SMSResult(
                    success="Success" in status,
                    provider=self.name,
                    message_id=recipient.get("messageId", ""),
                    external_id=recipient.get("messageId", ""),
                    status=MessageStatus.SENT if "Success" in status else MessageStatus.FAILED,
                    cost=float(recipient.get("cost", "0").replace("KES ", "").replace("NGN ", "")) / 100,
                    error=None if "Success" in status else status
                )
            
            return SMSResult(
                success=False,
                provider=self.name,
                status=MessageStatus.FAILED,
                error="No recipients in response"
            )
            
        except Exception as e:
            logger.error(f"Africa's Talking send error: {e}")
            return SMSResult(
                success=False,
                provider=self.name,
                status=MessageStatus.FAILED,
                error=str(e)
            )
    
    def get_balance(self) -> Optional[float]:
        """Get Africa's Talking balance"""
        if self.is_sandbox:
            return 1000.00  # Sandbox balance
        
        try:
            import africastalking
            application = africastalking.Application
            data = application.fetch_application_data()
            balance = data.get("UserData", {}).get("balance", "0")
            # Parse balance string like "KES 1234.56"
            return float(balance.split()[-1])
        except Exception as e:
            logger.error(f"Failed to get AT balance: {e}")
            return None
    
    def validate_phone(self, phone: str) -> bool:
        """Validate African phone numbers"""
        import re
        # African phone patterns
        patterns = [
            r'^\+254\d{9}$',   # Kenya
            r'^\+234\d{10}$',  # Nigeria
            r'^\+256\d{9}$',   # Uganda
            r'^\+255\d{9}$',   # Tanzania
            r'^\+233\d{9}$',   # Ghana
            r'^\+27\d{9}$',    # South Africa
            r'^\+251\d{9}$',   # Ethiopia
            r'^\+237\d{9}$',   # Cameroon
            r'^\+225\d{10}$',  # Ivory Coast
            r'^\+221\d{9}$',   # Senegal
        ]
        return any(re.match(p, phone) for p in patterns)
    
    def get_supported_countries(self) -> List[str]:
        return ["KE", "NG", "UG", "TZ", "GH", "ZA", "RW", "MW", "ET", 
                "CM", "CI", "SN", "BJ", "CD", "ZM", "ZW", "BW"]
    
    def get_cost_per_sms(self, country_code: str) -> float:
        """Africa's Talking pricing"""
        pricing = {
            "KE": 0.008, "NG": 0.025, "UG": 0.020, "TZ": 0.018,
            "GH": 0.022, "ZA": 0.015, "RW": 0.020, "DEFAULT": 0.025
        }
        return pricing.get(country_code.upper(), pricing["DEFAULT"])
    
    def _calculate_segments(self, message: str) -> int:
        length = len(message)
        if length <= 160:
            return 1
        return (length + 152) // 153


class VonageProvider(BaseSMSProvider):
    """Vonage (Nexmo) SMS Provider - Global enterprise"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = SMSProvider.VONAGE.value
        self.api_key = config.get("api_key", "")
        self.api_secret = config.get("api_secret", "")
        self.from_number = config.get("from_number", "UniTxt")
        
        self.client = None
        if self.api_key and self.api_secret:
            try:
                from vonage import Vonage, Auth
                auth = Auth(api_key=self.api_key, api_secret=self.api_secret)
                self.client = Vonage(auth)
                logger.info("Vonage client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Vonage: {e}")
    
    def send_sms(self, to: str, message: str, sender_id: str = None) -> SMSResult:
        """Send SMS via Vonage"""
        
        # Sandbox mode
        if self.is_sandbox or not self.client:
            logger.info(f"[VONAGE SANDBOX] Sending to {to}: {message[:50]}...")
            return SMSResult(
                success=True,
                provider=self.name,
                message_id=f"VN_sandbox_{datetime.utcnow().timestamp()}",
                external_id=f"vonage_sandbox_{to[-4:]}",
                status=MessageStatus.SENT,
                cost=0.0065,
                segments=self._calculate_segments(message)
            )
        
        try:
            from vonage_sms import SmsMessage
            
            response = self.client.sms.send(
                SmsMessage(
                    to=to,
                    from_=sender_id or self.from_number,
                    text=message
                )
            )
            
            # Check response
            message_data = response.messages[0] if response.messages else None
            
            if message_data:
                success = message_data.status == "0"
                return SMSResult(
                    success=success,
                    provider=self.name,
                    message_id=message_data.message_id,
                    external_id=message_data.message_id,
                    status=MessageStatus.SENT if success else MessageStatus.FAILED,
                    cost=float(message_data.message_price) if hasattr(message_data, 'message_price') else 0.0065,
                    error=None if success else message_data.error_text
                )
            
            return SMSResult(
                success=False,
                provider=self.name,
                status=MessageStatus.FAILED,
                error="No message data in response"
            )
            
        except Exception as e:
            logger.error(f"Vonage send error: {e}")
            return SMSResult(
                success=False,
                provider=self.name,
                status=MessageStatus.FAILED,
                error=str(e)
            )
    
    def get_balance(self) -> Optional[float]:
        """Get Vonage account balance"""
        if self.is_sandbox or not self.client:
            return 50.00  # Sandbox balance
        
        try:
            response = self.client.account.get_balance()
            return float(response.value)
        except Exception as e:
            logger.error(f"Failed to get Vonage balance: {e}")
            return None
    
    def validate_phone(self, phone: str) -> bool:
        import re
        pattern = r'^\+[1-9]\d{1,14}$'
        return bool(re.match(pattern, phone))
    
    def get_supported_countries(self) -> List[str]:
        return ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "BE",
                "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PT", "IN", "SG",
                "HK", "JP", "KR", "BR", "MX", "ZA", "NG", "KE"]
    
    def get_cost_per_sms(self, country_code: str) -> float:
        pricing = {
            "US": 0.0065, "CA": 0.0065, "GB": 0.0380, "AU": 0.0480,
            "DE": 0.0650, "FR": 0.0600, "IN": 0.0035, "DEFAULT": 0.0450
        }
        return pricing.get(country_code.upper(), pricing["DEFAULT"])
    
    def _calculate_segments(self, message: str) -> int:
        length = len(message)
        if length <= 160:
            return 1
        return (length + 152) // 153


class SimulatorProvider(BaseSMSProvider):
    """Simulator for testing without real providers"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = SMSProvider.SIMULATOR.value
        self.success_rate = config.get("success_rate", 0.95)
        self.delay_ms = config.get("delay_ms", 50)
    
    def send_sms(self, to: str, message: str, sender_id: str = None) -> SMSResult:
        import random
        import time
        
        # Simulate network delay
        time.sleep(self.delay_ms / 1000)
        
        # Simulate success/failure
        success = random.random() < self.success_rate
        
        return SMSResult(
            success=success,
            provider=self.name,
            message_id=f"SIM_{datetime.utcnow().timestamp()}_{to[-4:]}",
            external_id=f"simulator_{random.randint(100000, 999999)}",
            status=MessageStatus.DELIVERED if success else MessageStatus.FAILED,
            cost=0.01,
            segments=self._calculate_segments(message),
            error=None if success else "Simulated delivery failure"
        )
    
    def get_balance(self) -> Optional[float]:
        return 999999.99  # Very high balance for simulator
    
    def validate_phone(self, phone: str) -> bool:
        return phone.startswith("+") and len(phone) >= 10
    
    def _calculate_segments(self, message: str) -> int:
        return 1 if len(message) <= 160 else (len(message) + 152) // 153


class TigoProviderWrapper(BaseSMSProvider):
    """
    Wrapper for Tigo/Mixx By Yas provider to implement BaseSMSProvider interface
    Supports both SMPP and HTTP protocols via VPN connection
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = SMSProvider.TIGO.value
        
        # Import and initialize the Tigo provider
        try:
            from tigo_provider import TigoProvider
            self.tigo = TigoProvider(config)
        except ImportError:
            self.tigo = None
            logger.warning("Tigo provider module not found, using simulator fallback")
    
    def send_sms(self, to: str, message: str, sender_id: str = None) -> SMSResult:
        """Send SMS via Tigo (SMPP or HTTP)"""
        
        if not self.tigo:
            # Fallback to simulation if Tigo module not available
            import random
            import time
            time.sleep(0.03)
            success = random.random() < 0.96
            return SMSResult(
                success=success,
                provider=self.name,
                message_id=f"TIGO_SIM_{datetime.utcnow().timestamp()}_{to[-4:]}",
                external_id=f"tigo_sim_{int(time.time())}",
                status=MessageStatus.DELIVERED if success else MessageStatus.FAILED,
                cost=0.015,
                segments=1 if len(message) <= 160 else (len(message) + 152) // 153,
                error=None if success else "Simulated failure"
            )
        
        # Use actual Tigo provider
        result = self.tigo.send_sms(to, message, sender_id)
        
        # Map Tigo result to SMSResult
        return SMSResult(
            success=result.success,
            provider=self.name,
            message_id=result.message_id,
            external_id=result.message_id,
            status=MessageStatus.DELIVERED if result.success else MessageStatus.FAILED,
            cost=0.015,  # ~35 TZS
            segments=1,
            error=result.error
        )
    
    def get_balance(self) -> Optional[float]:
        """Get Tigo account balance"""
        if self.tigo:
            return self.tigo.get_balance()
        return 50000.00  # Sandbox balance in TZS
    
    def validate_phone(self, phone: str) -> bool:
        """Validate Tanzanian phone number"""
        import re
        patterns = [
            r'^\+255[67]\d{8}$',
            r'^255[67]\d{8}$',
            r'^0[67]\d{8}$',
        ]
        return any(re.match(p, phone) for p in patterns)
    
    def get_supported_countries(self) -> List[str]:
        """Tigo/Millicom operates in multiple countries"""
        return ["TZ", "GH", "SN", "CD", "RW", "BO", "PY", "GT", "SV", "HN"]
    
    def get_cost_per_sms(self, country_code: str) -> float:
        """Cost per SMS in USD"""
        pricing = {
            "TZ": 0.015,  # ~35 TZS
            "GH": 0.018,
            "SN": 0.020,
            "DEFAULT": 0.018
        }
        return pricing.get(country_code.upper(), pricing["DEFAULT"])


class SMSGateway:
    """
    Multi-provider SMS Gateway with smart routing and failover
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.providers: Dict[str, BaseSMSProvider] = {}
        self.default_provider = SMSProvider.SIMULATOR.value
        
        # Initialize providers
        self._init_providers()
        
        # Country to provider mapping for smart routing
        self.country_routing = {
            # Tanzania -> Tigo (direct MNO connection)
            "TZ": SMSProvider.TIGO.value,
            # Other African countries -> Africa's Talking
            "KE": SMSProvider.AFRICASTALKING.value,
            "NG": SMSProvider.AFRICASTALKING.value,
            "UG": SMSProvider.AFRICASTALKING.value,
            "GH": SMSProvider.AFRICASTALKING.value,
            "ZA": SMSProvider.AFRICASTALKING.value,
            "RW": SMSProvider.AFRICASTALKING.value,
            # US/Canada -> Twilio
            "US": SMSProvider.TWILIO.value,
            "CA": SMSProvider.TWILIO.value,
            # Europe -> Vonage
            "GB": SMSProvider.VONAGE.value,
            "DE": SMSProvider.VONAGE.value,
            "FR": SMSProvider.VONAGE.value,
            # Default fallback -> Twilio
            "DEFAULT": SMSProvider.TWILIO.value
        }
        
        # Failover order
        self.failover_order = [
            SMSProvider.TIGO.value,  # Tigo first for Tanzania
            SMSProvider.AFRICASTALKING.value,
            SMSProvider.TWILIO.value,
            SMSProvider.VONAGE.value,
            SMSProvider.SIMULATOR.value
        ]
    
    def _init_providers(self):
        """Initialize all configured providers"""
        
        # Twilio
        twilio_config = self.config.get("twilio", {})
        twilio_config["sandbox"] = twilio_config.get("sandbox", True)
        self.providers[SMSProvider.TWILIO.value] = TwilioProvider(twilio_config)
        
        # Africa's Talking
        at_config = self.config.get("africastalking", {})
        at_config["sandbox"] = at_config.get("sandbox", True)
        self.providers[SMSProvider.AFRICASTALKING.value] = AfricasTalkingProvider(at_config)
        
        # Vonage
        vonage_config = self.config.get("vonage", {})
        vonage_config["sandbox"] = vonage_config.get("sandbox", True)
        self.providers[SMSProvider.VONAGE.value] = VonageProvider(vonage_config)
        
        # Tigo/Mixx By Yas (Tanzania direct MNO)
        tigo_config = self.config.get("tigo", {})
        tigo_config["sandbox"] = tigo_config.get("sandbox", True)
        self.providers[SMSProvider.TIGO.value] = TigoProviderWrapper(tigo_config)
        
        # Simulator (always available)
        self.providers[SMSProvider.SIMULATOR.value] = SimulatorProvider({
            "success_rate": 0.95,
            "delay_ms": 10
        })
        
        logger.info(f"SMS Gateway initialized with {len(self.providers)} providers")
    
    def get_country_from_phone(self, phone: str) -> str:
        """Extract country code from phone number"""
        country_prefixes = {
            "+1": "US",  # US/Canada
            "+44": "GB",
            "+49": "DE",
            "+33": "FR",
            "+34": "ES",
            "+39": "IT",
            "+31": "NL",
            "+61": "AU",
            "+81": "JP",
            "+82": "KR",
            "+86": "CN",
            "+91": "IN",
            "+65": "SG",
            "+852": "HK",
            "+55": "BR",
            "+52": "MX",
            "+254": "KE",
            "+234": "NG",
            "+256": "UG",
            "+255": "TZ",
            "+233": "GH",
            "+27": "ZA",
            "+250": "RW",
            "+251": "ET",
        }
        
        for prefix, country in sorted(country_prefixes.items(), key=lambda x: -len(x[0])):
            if phone.startswith(prefix):
                return country
        
        return "DEFAULT"
    
    def select_provider(self, phone: str, preferred_provider: str = None) -> str:
        """Select best provider for a phone number"""
        
        # Use preferred provider if specified and available
        if preferred_provider and preferred_provider in self.providers:
            return preferred_provider
        
        # Smart routing based on country
        country = self.get_country_from_phone(phone)
        provider = self.country_routing.get(country, self.country_routing["DEFAULT"])
        
        # Check if provider is available
        if provider in self.providers:
            return provider
        
        # Fallback to default
        return self.default_provider
    
    def send_sms(
        self, 
        to: str, 
        message: str, 
        sender_id: str = None,
        preferred_provider: str = None,
        enable_failover: bool = True
    ) -> SMSResult:
        """
        Send SMS with smart routing and failover
        
        Args:
            to: Recipient phone number (E.164 format)
            message: Message content
            sender_id: Sender ID/number (optional)
            preferred_provider: Force specific provider (optional)
            enable_failover: Enable failover to other providers on failure
        
        Returns:
            SMSResult with status and details
        """
        
        # Select provider
        provider_name = self.select_provider(to, preferred_provider)
        
        # Get failover list
        if enable_failover:
            providers_to_try = [provider_name] + [
                p for p in self.failover_order 
                if p != provider_name and p in self.providers
            ]
        else:
            providers_to_try = [provider_name]
        
        # Try each provider
        last_error = None
        for provider_name in providers_to_try:
            provider = self.providers.get(provider_name)
            if not provider:
                continue
            
            logger.info(f"Attempting SMS via {provider_name} to {to}")
            
            result = provider.send_sms(to, message, sender_id)
            
            if result.success:
                logger.info(f"SMS sent successfully via {provider_name}: {result.external_id}")
                return result
            
            last_error = result.error
            logger.warning(f"SMS failed via {provider_name}: {last_error}")
        
        # All providers failed
        return SMSResult(
            success=False,
            provider="none",
            status=MessageStatus.FAILED,
            error=f"All providers failed. Last error: {last_error}"
        )
    
    def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message: str,
        sender_id: str = None
    ) -> List[SMSResult]:
        """
        Send SMS to multiple recipients
        
        Args:
            recipients: List of dicts with 'phone' and optionally 'name'
            message: Message template (can use {{name}} placeholder)
            sender_id: Sender ID
        
        Returns:
            List of SMSResult for each recipient
        """
        results = []
        
        for recipient in recipients:
            phone = recipient.get("phone")
            name = recipient.get("name", "Customer")
            
            # Personalize message
            personalized = message.replace("{{name}}", name)
            personalized = personalized.replace("{{first_name}}", name.split()[0])
            
            result = self.send_sms(phone, personalized, sender_id)
            results.append(result)
        
        return results
    
    def get_all_balances(self) -> Dict[str, Optional[float]]:
        """Get balances from all providers"""
        balances = {}
        for name, provider in self.providers.items():
            balances[name] = provider.get_balance()
        return balances
    
    def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all providers"""
        status = {}
        for name, provider in self.providers.items():
            status[name] = {
                "name": name,
                "is_sandbox": provider.is_sandbox,
                "balance": provider.get_balance(),
                "supported_countries": provider.get_supported_countries()[:10],  # First 10
            }
        return status
    
    def estimate_cost(self, phone: str, message: str) -> Dict[str, float]:
        """Estimate cost across all providers"""
        country = self.get_country_from_phone(phone)
        segments = 1 if len(message) <= 160 else (len(message) + 152) // 153
        
        costs = {}
        for name, provider in self.providers.items():
            cost_per_sms = provider.get_cost_per_sms(country)
            costs[name] = round(cost_per_sms * segments, 4)
        
        return costs


# Global gateway instance
_gateway_instance = None

def get_sms_gateway(config: Dict[str, Any] = None) -> SMSGateway:
    """Get or create SMS gateway singleton"""
    global _gateway_instance
    
    if _gateway_instance is None or config:
        # Load config from environment if not provided
        if config is None:
            config = {
                "twilio": {
                    "account_sid": os.environ.get("TWILIO_ACCOUNT_SID", ""),
                    "auth_token": os.environ.get("TWILIO_AUTH_TOKEN", ""),
                    "from_number": os.environ.get("TWILIO_FROM_NUMBER", ""),
                    "messaging_service_sid": os.environ.get("TWILIO_MESSAGING_SERVICE_SID", ""),
                    "sandbox": os.environ.get("TWILIO_SANDBOX", "true").lower() == "true"
                },
                "africastalking": {
                    "username": os.environ.get("AT_USERNAME", "sandbox"),
                    "api_key": os.environ.get("AT_API_KEY", ""),
                    "sandbox": os.environ.get("AT_SANDBOX", "true").lower() == "true"
                },
                "vonage": {
                    "api_key": os.environ.get("VONAGE_API_KEY", ""),
                    "api_secret": os.environ.get("VONAGE_API_SECRET", ""),
                    "from_number": os.environ.get("VONAGE_FROM_NUMBER", "UniTxt"),
                    "sandbox": os.environ.get("VONAGE_SANDBOX", "true").lower() == "true"
                }
            }
        
        _gateway_instance = SMSGateway(config)
    
    return _gateway_instance
