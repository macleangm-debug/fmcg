"""
Tigo/Mixx By Yas (Tanzania) SMS Provider
Supports both SMPP and HTTP API protocols
Designed for VPN-based MNO direct connections

Author: UniTxt Platform
"""

import os
import logging
import time
import threading
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import queue
import json

logger = logging.getLogger(__name__)


class TigoProtocol(str, Enum):
    SMPP = "smpp"
    HTTP = "http"


class TigoMessageStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    DELIVERED = "delivered"
    FAILED = "failed"
    EXPIRED = "expired"
    REJECTED = "rejected"


@dataclass
class TigoSMSResult:
    """Result of a Tigo SMS send operation"""
    success: bool
    message_id: Optional[str] = None
    status: TigoMessageStatus = TigoMessageStatus.PENDING
    error: Optional[str] = None
    timestamp: datetime = None
    protocol: str = "smpp"
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message_id": self.message_id,
            "status": self.status.value,
            "error": self.error,
            "timestamp": self.timestamp.isoformat(),
            "protocol": self.protocol
        }


class TigoSMPPProvider:
    """
    SMPP-based SMS provider for Tigo/Mixx By Yas Tanzania
    
    SMPP (Short Message Peer-to-Peer) is the industry standard protocol
    used by most MNOs for bulk SMS delivery.
    
    Typical SMPP flow:
    1. Establish TCP connection to SMPP server (via VPN)
    2. Bind as transmitter/transceiver
    3. Submit messages
    4. Receive delivery reports
    5. Unbind and disconnect
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = "tigo_smpp"
        
        # SMPP Connection settings
        self.host = config.get("smpp_host", "")  # e.g., "10.0.0.1" (VPN internal IP)
        self.port = config.get("smpp_port", 2775)  # Standard SMPP port
        self.system_id = config.get("system_id", "")  # Username
        self.password = config.get("password", "")
        self.system_type = config.get("system_type", "")  # Optional
        self.source_addr = config.get("source_addr", "")  # Sender ID
        self.source_addr_ton = config.get("source_addr_ton", 5)  # Type of Number (5 = alphanumeric)
        self.source_addr_npi = config.get("source_addr_npi", 0)  # Numbering Plan
        self.dest_addr_ton = config.get("dest_addr_ton", 1)  # International
        self.dest_addr_npi = config.get("dest_addr_npi", 1)  # E.164
        
        # Connection settings
        self.enquire_link_interval = config.get("enquire_link_interval", 30)
        self.reconnect_delay = config.get("reconnect_delay", 5)
        self.max_retries = config.get("max_retries", 3)
        
        # Sandbox mode
        self.is_sandbox = config.get("sandbox", True)
        
        # SMPP client
        self.client = None
        self._connected = False
        self._lock = threading.Lock()
        
        logger.info(f"Tigo SMPP provider initialized (sandbox={self.is_sandbox})")
    
    def connect(self) -> bool:
        """Establish SMPP connection to Tigo"""
        
        if self.is_sandbox:
            logger.info("[TIGO SMPP SANDBOX] Simulating connection...")
            self._connected = True
            return True
        
        if not all([self.host, self.system_id, self.password]):
            logger.error("Missing SMPP credentials")
            return False
        
        try:
            import smpplib.client
            import smpplib.consts
            
            with self._lock:
                # Create client
                self.client = smpplib.client.Client(self.host, self.port)
                
                # Set handlers
                self.client.set_message_received_handler(self._handle_delivery_report)
                
                # Connect
                self.client.connect()
                
                # Bind as transceiver (can send and receive)
                self.client.bind_transceiver(
                    system_id=self.system_id,
                    password=self.password,
                    system_type=self.system_type
                )
                
                self._connected = True
                logger.info(f"Connected to Tigo SMPP at {self.host}:{self.port}")
                
                # Start enquire_link thread to keep connection alive
                self._start_keepalive()
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to connect to Tigo SMPP: {e}")
            self._connected = False
            return False
    
    def disconnect(self):
        """Disconnect from SMPP server"""
        if self.client and self._connected:
            try:
                self.client.unbind()
                self.client.disconnect()
            except:
                pass
            self._connected = False
            logger.info("Disconnected from Tigo SMPP")
    
    def send_sms(self, to: str, message: str, sender_id: str = None) -> TigoSMSResult:
        """
        Send SMS via SMPP
        
        Args:
            to: Destination phone number (E.164 format, e.g., +255712345678)
            message: Message content
            sender_id: Sender ID (alphanumeric or short code)
        
        Returns:
            TigoSMSResult with status and message ID
        """
        
        # Sandbox mode - simulate sending
        if self.is_sandbox:
            logger.info(f"[TIGO SMPP SANDBOX] Sending to {to}: {message[:50]}...")
            time.sleep(0.05)  # Simulate network latency
            
            import random
            success = random.random() < 0.96  # 96% success rate
            
            return TigoSMSResult(
                success=success,
                message_id=f"TIGO_SMPP_{int(time.time())}_{to[-4:]}",
                status=TigoMessageStatus.SUBMITTED if success else TigoMessageStatus.FAILED,
                error=None if success else "Simulated failure",
                protocol="smpp"
            )
        
        # Ensure connected
        if not self._connected:
            if not self.connect():
                return TigoSMSResult(
                    success=False,
                    status=TigoMessageStatus.FAILED,
                    error="Failed to connect to SMPP server",
                    protocol="smpp"
                )
        
        try:
            import smpplib.consts
            import smpplib.gsm
            
            # Normalize phone number (remove + prefix for SMPP)
            dest_addr = to.lstrip('+')
            
            # Use provided sender_id or default
            source = sender_id or self.source_addr
            
            # Encode message
            # Check if message needs UCS2 encoding (for non-ASCII chars)
            try:
                message.encode('ascii')
                coding = smpplib.consts.SMPP_ENCODING_DEFAULT
                encoded_message = message.encode('ascii')
            except UnicodeEncodeError:
                coding = smpplib.consts.SMPP_ENCODING_ISO10646
                encoded_message = message.encode('utf-16-be')
            
            # Handle long messages (multipart)
            parts, encoding_flag, msg_type_flag = smpplib.gsm.make_parts(message)
            
            message_ids = []
            for part in parts:
                pdu = self.client.send_message(
                    source_addr_ton=self.source_addr_ton,
                    source_addr_npi=self.source_addr_npi,
                    source_addr=source,
                    dest_addr_ton=self.dest_addr_ton,
                    dest_addr_npi=self.dest_addr_npi,
                    destination_addr=dest_addr,
                    short_message=part,
                    data_coding=encoding_flag,
                    esm_class=msg_type_flag,
                    registered_delivery=True  # Request delivery report
                )
                message_ids.append(pdu.message_id)
            
            return TigoSMSResult(
                success=True,
                message_id=message_ids[0] if message_ids else None,
                status=TigoMessageStatus.SUBMITTED,
                protocol="smpp"
            )
            
        except Exception as e:
            logger.error(f"SMPP send error: {e}")
            self._connected = False  # Mark for reconnection
            
            return TigoSMSResult(
                success=False,
                status=TigoMessageStatus.FAILED,
                error=str(e),
                protocol="smpp"
            )
    
    def _handle_delivery_report(self, pdu):
        """Handle incoming delivery reports"""
        try:
            logger.info(f"Delivery report received: {pdu.message_id} - {pdu.message_state}")
            # In production, update message status in database
        except Exception as e:
            logger.error(f"Error handling delivery report: {e}")
    
    def _start_keepalive(self):
        """Start enquire_link keepalive thread"""
        def keepalive():
            while self._connected:
                try:
                    time.sleep(self.enquire_link_interval)
                    if self._connected and self.client:
                        self.client.enquire_link()
                except:
                    pass
        
        thread = threading.Thread(target=keepalive, daemon=True)
        thread.start()
    
    def get_status(self) -> Dict[str, Any]:
        """Get connection status"""
        return {
            "provider": self.name,
            "protocol": "smpp",
            "connected": self._connected,
            "host": self.host,
            "port": self.port,
            "sandbox": self.is_sandbox
        }


class TigoHTTPProvider:
    """
    HTTP/REST API based SMS provider for Tigo/Mixx By Yas Tanzania
    
    Some MNOs provide REST APIs as an alternative to SMPP.
    This is simpler to implement but may have different rate limits.
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = "tigo_http"
        
        # HTTP API settings
        self.base_url = config.get("api_url", "")  # e.g., "https://api.tigo.co.tz/sms/v1"
        self.api_key = config.get("api_key", "")
        self.api_secret = config.get("api_secret", "")
        self.sender_id = config.get("sender_id", "")
        
        # Authentication type
        self.auth_type = config.get("auth_type", "bearer")  # "bearer", "basic", "api_key"
        
        # Sandbox mode
        self.is_sandbox = config.get("sandbox", True)
        
        # Request settings
        self.timeout = config.get("timeout", 30)
        self.verify_ssl = config.get("verify_ssl", True)
        
        logger.info(f"Tigo HTTP provider initialized (sandbox={self.is_sandbox})")
    
    def _get_headers(self) -> Dict[str, str]:
        """Build authentication headers"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        if self.auth_type == "bearer":
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.auth_type == "api_key":
            headers["X-API-Key"] = self.api_key
        
        return headers
    
    def send_sms(self, to: str, message: str, sender_id: str = None) -> TigoSMSResult:
        """
        Send SMS via HTTP API
        
        Args:
            to: Destination phone number
            message: Message content
            sender_id: Sender ID
        
        Returns:
            TigoSMSResult with status
        """
        
        # Sandbox mode
        if self.is_sandbox:
            logger.info(f"[TIGO HTTP SANDBOX] Sending to {to}: {message[:50]}...")
            time.sleep(0.03)
            
            import random
            success = random.random() < 0.95
            
            return TigoSMSResult(
                success=success,
                message_id=f"TIGO_HTTP_{int(time.time())}_{to[-4:]}",
                status=TigoMessageStatus.SUBMITTED if success else TigoMessageStatus.FAILED,
                error=None if success else "Simulated failure",
                protocol="http"
            )
        
        if not self.base_url or not self.api_key:
            return TigoSMSResult(
                success=False,
                status=TigoMessageStatus.FAILED,
                error="Missing API credentials",
                protocol="http"
            )
        
        try:
            import requests
            
            # Build request payload
            # Note: Actual payload structure depends on Tigo's API spec
            payload = {
                "to": to.lstrip('+'),
                "from": sender_id or self.sender_id,
                "message": message,
                "reference": f"unitxt_{int(time.time())}"
            }
            
            response = requests.post(
                f"{self.base_url}/send",
                json=payload,
                headers=self._get_headers(),
                timeout=self.timeout,
                verify=self.verify_ssl
            )
            
            if response.status_code == 200:
                data = response.json()
                return TigoSMSResult(
                    success=True,
                    message_id=data.get("message_id") or data.get("id"),
                    status=TigoMessageStatus.SUBMITTED,
                    protocol="http"
                )
            else:
                return TigoSMSResult(
                    success=False,
                    status=TigoMessageStatus.FAILED,
                    error=f"HTTP {response.status_code}: {response.text}",
                    protocol="http"
                )
                
        except Exception as e:
            logger.error(f"Tigo HTTP send error: {e}")
            return TigoSMSResult(
                success=False,
                status=TigoMessageStatus.FAILED,
                error=str(e),
                protocol="http"
            )
    
    def get_status(self) -> Dict[str, Any]:
        """Get provider status"""
        return {
            "provider": self.name,
            "protocol": "http",
            "base_url": self.base_url,
            "sandbox": self.is_sandbox
        }


class TigoProvider:
    """
    Unified Tigo/Mixx By Yas provider supporting both SMPP and HTTP
    
    This class provides a single interface that can use either protocol
    based on configuration and availability.
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = "tigo"
        self.is_sandbox = config.get("sandbox", True)
        
        # Preferred protocol
        self.preferred_protocol = config.get("preferred_protocol", TigoProtocol.SMPP.value)
        
        # Initialize providers
        self.smpp_provider = None
        self.http_provider = None
        
        smpp_config = config.get("smpp", {})
        smpp_config["sandbox"] = self.is_sandbox
        if smpp_config.get("smpp_host") or self.is_sandbox:
            self.smpp_provider = TigoSMPPProvider(smpp_config)
        
        http_config = config.get("http", {})
        http_config["sandbox"] = self.is_sandbox
        if http_config.get("api_url") or self.is_sandbox:
            self.http_provider = TigoHTTPProvider(http_config)
        
        logger.info(f"Tigo unified provider initialized (protocol={self.preferred_protocol})")
    
    def send_sms(self, to: str, message: str, sender_id: str = None, 
                 protocol: str = None) -> TigoSMSResult:
        """
        Send SMS via preferred or specified protocol
        
        Args:
            to: Destination phone
            message: Message content
            sender_id: Sender ID
            protocol: Force specific protocol ("smpp" or "http")
        
        Returns:
            TigoSMSResult
        """
        
        use_protocol = protocol or self.preferred_protocol
        
        # Try preferred protocol first
        if use_protocol == TigoProtocol.SMPP.value and self.smpp_provider:
            result = self.smpp_provider.send_sms(to, message, sender_id)
            if result.success:
                return result
            # Fallback to HTTP if SMPP fails
            if self.http_provider:
                logger.warning("SMPP failed, falling back to HTTP")
                return self.http_provider.send_sms(to, message, sender_id)
            return result
        
        elif use_protocol == TigoProtocol.HTTP.value and self.http_provider:
            result = self.http_provider.send_sms(to, message, sender_id)
            if result.success:
                return result
            # Fallback to SMPP if HTTP fails
            if self.smpp_provider:
                logger.warning("HTTP failed, falling back to SMPP")
                return self.smpp_provider.send_sms(to, message, sender_id)
            return result
        
        return TigoSMSResult(
            success=False,
            status=TigoMessageStatus.FAILED,
            error="No protocol provider available"
        )
    
    def validate_phone(self, phone: str) -> bool:
        """Validate Tanzanian phone number"""
        import re
        # Tanzania phone patterns
        patterns = [
            r'^\+255[67]\d{8}$',  # +255 followed by 6 or 7 then 8 digits
            r'^0[67]\d{8}$',      # Local format
            r'^255[67]\d{8}$',    # Without + prefix
        ]
        return any(re.match(p, phone) for p in patterns)
    
    def normalize_phone(self, phone: str) -> str:
        """Normalize phone to E.164 format"""
        phone = phone.strip().replace(" ", "").replace("-", "")
        
        if phone.startswith("0"):
            # Local format: 0712345678 -> +255712345678
            return "+255" + phone[1:]
        elif phone.startswith("255"):
            # Missing +: 255712345678 -> +255712345678
            return "+" + phone
        elif phone.startswith("+255"):
            return phone
        
        return phone
    
    def get_balance(self) -> Optional[float]:
        """Get account balance (if supported by API)"""
        if self.is_sandbox:
            return 50000.00  # Sandbox balance in TZS
        return None
    
    def get_supported_countries(self) -> List[str]:
        """Tigo operates in multiple African countries"""
        return ["TZ", "GH", "SN", "CD", "RW", "BO", "PY", "GT", "SV", "HN"]
    
    def get_cost_per_sms(self, country_code: str = "TZ") -> float:
        """Cost per SMS in USD"""
        pricing = {
            "TZ": 0.015,  # ~35 TZS
            "GH": 0.018,
            "SN": 0.020,
            "DEFAULT": 0.020
        }
        return pricing.get(country_code.upper(), pricing["DEFAULT"])
    
    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive provider status"""
        return {
            "name": self.name,
            "sandbox": self.is_sandbox,
            "preferred_protocol": self.preferred_protocol,
            "smpp": self.smpp_provider.get_status() if self.smpp_provider else None,
            "http": self.http_provider.get_status() if self.http_provider else None,
            "supported_countries": self.get_supported_countries()
        }


# =============================================================================
# VPN SETUP GUIDE FOR TIGO INTEGRATION
# =============================================================================
"""
VPN CONFIGURATION GUIDE FOR TIGO/MIXX BY YAS

1. IPSec VPN Setup (Most Common)
================================

Request from Tigo:
- VPN Gateway IP address
- Pre-shared Key (PSK) or certificates
- Phase 1 settings (encryption, hash, DH group, lifetime)
- Phase 2 settings (encryption, hash, PFS, lifetime)
- Internal network ranges

Linux (strongSwan) example config (/etc/ipsec.conf):

    conn tigo-vpn
        type=tunnel
        auto=start
        keyexchange=ikev2
        authby=secret
        left=%defaultroute
        leftid=YOUR_PUBLIC_IP
        right=TIGO_VPN_GATEWAY_IP
        rightsubnet=TIGO_INTERNAL_NETWORK/24
        ike=aes256-sha256-modp2048
        esp=aes256-sha256
        
Secrets (/etc/ipsec.secrets):
    YOUR_PUBLIC_IP TIGO_VPN_GATEWAY_IP : PSK "your-pre-shared-key"


2. OpenVPN Setup
================

Request from Tigo:
- .ovpn configuration file
- CA certificate
- Client certificate and key
- Authentication credentials

Place in /etc/openvpn/client/ and enable:
    sudo systemctl enable openvpn-client@tigo
    sudo systemctl start openvpn-client@tigo


3. After VPN is Connected
=========================

Verify connectivity:
    ping SMPP_SERVER_IP  (e.g., ping 10.0.0.1)

Test SMPP connection:
    telnet SMPP_SERVER_IP 2775

Then configure UniTxt with the internal SMPP server address.


4. Firewall Rules
=================

Ensure these ports are open:
- UDP 500, 4500 (IPSec)
- TCP 2775 (SMPP)
- TCP 443 (HTTPS API if used)
"""


def get_tigo_setup_guide() -> Dict[str, Any]:
    """Get setup guide for Tigo integration"""
    return {
        "provider": "Tigo / Mixx By Yas (Tanzania)",
        "documentation": "https://www.tigo.co.tz/business/sms-api",
        
        "credentials_needed": {
            "smpp": {
                "required": [
                    "SMPP Host/IP (internal VPN address)",
                    "SMPP Port (usually 2775)",
                    "System ID (username)",
                    "Password",
                    "Sender ID (registered short code or alphanumeric)"
                ],
                "optional": [
                    "System Type",
                    "Service Type",
                    "TLS certificates (if required)"
                ]
            },
            "http_api": {
                "required": [
                    "API Base URL",
                    "API Key",
                    "API Secret",
                    "Sender ID"
                ]
            },
            "vpn": {
                "ipsec": [
                    "VPN Gateway IP",
                    "Pre-shared Key (PSK)",
                    "Phase 1 & 2 settings",
                    "Internal network range"
                ],
                "openvpn": [
                    ".ovpn configuration file",
                    "CA certificate",
                    "Client certificate",
                    "Client key"
                ]
            }
        },
        
        "contact": {
            "business_support": "business@tigo.co.tz",
            "technical_support": "Request from your account manager",
            "portal": "https://business.tigo.co.tz"
        },
        
        "registration_steps": [
            "1. Contact Tigo Business team to open a bulk SMS account",
            "2. Register your Sender ID (short code or alphanumeric)",
            "3. Request VPN access credentials",
            "4. Request SMPP or API credentials",
            "5. Configure VPN on your server",
            "6. Test connectivity with provided credentials",
            "7. Configure UniTxt with your credentials"
        ],
        
        "sample_config": {
            "smpp": {
                "smpp_host": "10.0.0.1",  # Internal VPN IP
                "smpp_port": 2775,
                "system_id": "your_username",
                "password": "your_password",
                "source_addr": "UNITXT",  # Your sender ID
                "sandbox": False
            },
            "http": {
                "api_url": "https://api.tigo.co.tz/sms/v1",
                "api_key": "your_api_key",
                "api_secret": "your_api_secret",
                "sender_id": "UNITXT",
                "sandbox": False
            }
        },
        
        "environment_variables": """
# Tigo SMPP Configuration
TIGO_SMPP_HOST=10.0.0.1
TIGO_SMPP_PORT=2775
TIGO_SYSTEM_ID=your_username
TIGO_PASSWORD=your_password
TIGO_SENDER_ID=UNITXT
TIGO_SANDBOX=false

# Tigo HTTP API Configuration  
TIGO_API_URL=https://api.tigo.co.tz/sms/v1
TIGO_API_KEY=your_api_key
TIGO_API_SECRET=your_api_secret

# VPN must be configured at OS level before these will work
"""
    }
