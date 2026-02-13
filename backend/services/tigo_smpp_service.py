"""
Tigo SMPP Service for UniTxt Bulk SMS
Direct SMPP connection to Tigo Tanzania via VPN

Connection Details (from VPN Form 2026-A2P):
- Host: smpp01.tigo.co.tz
- Port: 10501
- VPN Gateway: 41.222.182.6
- Source IP: 41.222.182.102

This service should be deployed on a server with VPN connectivity to Tigo.
"""

import os
import logging
import time
import threading
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
import queue

logger = logging.getLogger(__name__)


class SMPPMessageStatus(str, Enum):
    """SMPP Message delivery statuses"""
    PENDING = "pending"
    SUBMITTED = "submitted"
    DELIVERED = "delivered"
    FAILED = "failed"
    EXPIRED = "expired"
    REJECTED = "rejected"
    UNKNOWN = "unknown"


@dataclass
class SMPPConfig:
    """Configuration for SMPP connection"""
    host: str = ""
    port: int = 10501
    system_id: str = ""  # Username
    password: str = ""
    system_type: str = ""
    source_addr: str = "UNITXT"  # Default sender ID
    source_addr_ton: int = 5  # Alphanumeric
    source_addr_npi: int = 0
    dest_addr_ton: int = 1  # International
    dest_addr_npi: int = 1  # E.164
    enquire_link_interval: int = 30
    reconnect_delay: int = 5
    max_retries: int = 3
    sandbox: bool = True  # Set to False for production


@dataclass
class SMSSendResult:
    """Result of an SMS send operation"""
    success: bool
    message_id: Optional[str] = None
    status: SMPPMessageStatus = SMPPMessageStatus.PENDING
    error: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    segments: int = 1
    cost: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message_id": self.message_id,
            "status": self.status.value,
            "error": self.error,
            "timestamp": self.timestamp.isoformat(),
            "segments": self.segments,
            "cost": self.cost
        }


class TigoSMPPService:
    """
    Production SMPP Service for Tigo Tanzania
    
    IMPORTANT: This service requires VPN connectivity to Tigo's network.
    The VPN must be configured at the OS/network level before this service can connect.
    
    VPN Details:
    - Gateway IP: 41.222.182.6
    - Your IP (source): 41.222.182.102
    - SMPP Server: smpp01.tigo.co.tz:10501
    """
    
    # Tigo Tanzania production credentials
    TIGO_CONFIG = SMPPConfig(
        host="smpp01.tigo.co.tz",
        port=10501,
        system_id="datavision",
        password="dat@vis",
        source_addr="UNITXT",
        sandbox=True  # Change to False when deploying to VPN-connected server
    )
    
    def __init__(self, config: SMPPConfig = None):
        """Initialize the Tigo SMPP service"""
        self.config = config or self.TIGO_CONFIG
        self.client = None
        self._connected = False
        self._lock = threading.Lock()
        self._message_queue = queue.Queue()
        self._delivery_reports: Dict[str, SMPPMessageStatus] = {}
        self._pending_reports: List[Dict[str, Any]] = []  # Queue for async DB sync
        
        # Cost per SMS (approximate, in USD)
        self.cost_per_sms = 0.015  # ~35 TZS
        
        logger.info(f"TigoSMPPService initialized (sandbox={self.config.sandbox})")
    
    def connect(self) -> bool:
        """
        Establish SMPP connection to Tigo
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        if self.config.sandbox:
            logger.info("[TIGO SMPP SANDBOX] Simulating connection...")
            self._connected = True
            return True
        
        # Validate credentials
        if not all([self.config.host, self.config.system_id, self.config.password]):
            logger.error("Missing SMPP credentials")
            return False
        
        try:
            import smpplib.client
            import smpplib.consts
            
            with self._lock:
                # Create SMPP client
                self.client = smpplib.client.Client(
                    self.config.host, 
                    self.config.port,
                    allow_unknown_opt_params=True
                )
                
                # Set message handler for delivery reports
                self.client.set_message_received_handler(self._handle_delivery_report)
                
                # Connect to SMPP server
                self.client.connect()
                
                # Bind as transceiver (send and receive)
                self.client.bind_transceiver(
                    system_id=self.config.system_id,
                    password=self.config.password,
                    system_type=self.config.system_type
                )
                
                self._connected = True
                logger.info(f"Connected to Tigo SMPP at {self.config.host}:{self.config.port}")
                
                # Start keepalive thread
                self._start_keepalive()
                
                return True
                
        except ImportError:
            logger.error("smpplib not installed. Install with: pip install smpplib")
            return False
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
            except Exception as e:
                logger.warning(f"Error during disconnect: {e}")
            finally:
                self._connected = False
                logger.info("Disconnected from Tigo SMPP")
    
    def send_sms(
        self, 
        to: str, 
        message: str, 
        sender_id: str = None
    ) -> SMSSendResult:
        """
        Send a single SMS via SMPP
        
        Args:
            to: Destination phone number (E.164 format, e.g., +255712345678)
            message: Message content (max 160 chars for single SMS, auto-split for longer)
            sender_id: Sender ID/alphanumeric (optional, uses default if not provided)
        
        Returns:
            SMSSendResult with status and message ID
        """
        # Normalize phone number
        to = self._normalize_phone(to)
        
        # Validate phone number
        if not self._validate_phone(to):
            return SMSSendResult(
                success=False,
                status=SMPPMessageStatus.REJECTED,
                error=f"Invalid phone number format: {to}"
            )
        
        # Calculate segments
        segments = self._calculate_segments(message)
        
        # Sandbox mode - simulate sending
        if self.config.sandbox:
            return self._sandbox_send(to, message, sender_id, segments)
        
        # Ensure connected
        if not self._connected:
            if not self.connect():
                return SMSSendResult(
                    success=False,
                    status=SMPPMessageStatus.FAILED,
                    error="Failed to connect to SMPP server"
                )
        
        try:
            import smpplib.consts
            import smpplib.gsm
            
            # Remove + prefix for SMPP
            dest_addr = to.lstrip('+')
            
            # Use provided sender_id or default
            source = sender_id or self.config.source_addr
            
            # Determine encoding
            try:
                message.encode('ascii')
                coding = smpplib.consts.SMPP_ENCODING_DEFAULT
            except UnicodeEncodeError:
                coding = smpplib.consts.SMPP_ENCODING_ISO10646
            
            # Split long messages
            parts, encoding_flag, msg_type_flag = smpplib.gsm.make_parts(message)
            
            message_ids = []
            for part in parts:
                pdu = self.client.send_message(
                    source_addr_ton=self.config.source_addr_ton,
                    source_addr_npi=self.config.source_addr_npi,
                    source_addr=source,
                    dest_addr_ton=self.config.dest_addr_ton,
                    dest_addr_npi=self.config.dest_addr_npi,
                    destination_addr=dest_addr,
                    short_message=part,
                    data_coding=encoding_flag,
                    esm_class=msg_type_flag,
                    registered_delivery=True
                )
                message_ids.append(pdu.message_id)
            
            # Return result with first message ID
            return SMSSendResult(
                success=True,
                message_id=message_ids[0] if message_ids else None,
                status=SMPPMessageStatus.SUBMITTED,
                segments=len(parts),
                cost=self.cost_per_sms * len(parts)
            )
            
        except Exception as e:
            logger.error(f"SMPP send error: {e}")
            self._connected = False  # Mark for reconnection
            
            return SMSSendResult(
                success=False,
                status=SMPPMessageStatus.FAILED,
                error=str(e)
            )
    
    def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message: str,
        sender_id: str = None
    ) -> List[SMSSendResult]:
        """
        Send SMS to multiple recipients
        
        Args:
            recipients: List of dicts with 'phone' and optionally 'name'
            message: Message template (supports {{name}} placeholder)
            sender_id: Sender ID
        
        Returns:
            List of SMSSendResult for each recipient
        """
        results = []
        
        for recipient in recipients:
            phone = recipient.get("phone", "")
            name = recipient.get("name", "Customer")
            
            # Personalize message
            personalized_msg = message.replace("{{name}}", name)
            personalized_msg = personalized_msg.replace("{{first_name}}", name.split()[0] if name else "")
            
            result = self.send_sms(phone, personalized_msg, sender_id)
            results.append(result)
            
            # Small delay to avoid overwhelming the server
            if not self.config.sandbox:
                time.sleep(0.05)
        
        return results
    
    def get_delivery_status(self, message_id: str) -> SMPPMessageStatus:
        """Get delivery status for a message"""
        return self._delivery_reports.get(message_id, SMPPMessageStatus.UNKNOWN)
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get current connection status"""
        return {
            "connected": self._connected,
            "host": self.config.host,
            "port": self.config.port,
            "sandbox": self.config.sandbox,
            "system_id": self.config.system_id,
            "cost_per_sms": self.cost_per_sms
        }
    
    def _sandbox_send(
        self, 
        to: str, 
        message: str, 
        sender_id: str, 
        segments: int
    ) -> SMSSendResult:
        """Simulate sending in sandbox mode"""
        import random
        
        logger.info(f"[TIGO SANDBOX] Sending to {to}: {message[:50]}...")
        time.sleep(0.03)  # Simulate network latency
        
        # 96% success rate in sandbox
        success = random.random() < 0.96
        
        msg_id = f"TIGO_{int(time.time())}_{to[-4:]}"
        
        return SMSSendResult(
            success=success,
            message_id=msg_id,
            status=SMPPMessageStatus.SUBMITTED if success else SMPPMessageStatus.FAILED,
            error=None if success else "Simulated failure",
            segments=segments,
            cost=self.cost_per_sms * segments
        )
    
    def _handle_delivery_report(self, pdu):
        """Handle incoming delivery reports from SMPP"""
        try:
            message_id = pdu.message_id
            state = pdu.message_state
            
            # Map SMPP states to our statuses
            # SMPP message_state values:
            # 1=ENROUTE, 2=DELIVERED, 3=EXPIRED, 4=DELETED, 5=UNDELIVERABLE
            # 6=ACCEPTED, 7=UNKNOWN, 8=REJECTED
            status_map = {
                1: SMPPMessageStatus.PENDING,      # ENROUTE
                2: SMPPMessageStatus.DELIVERED,    # DELIVERED
                3: SMPPMessageStatus.EXPIRED,      # EXPIRED
                4: SMPPMessageStatus.FAILED,       # DELETED
                5: SMPPMessageStatus.FAILED,       # UNDELIVERABLE
                6: SMPPMessageStatus.SUBMITTED,    # ACCEPTED
                7: SMPPMessageStatus.UNKNOWN,      # UNKNOWN
                8: SMPPMessageStatus.REJECTED,     # REJECTED
            }
            
            status = status_map.get(state, SMPPMessageStatus.UNKNOWN)
            self._delivery_reports[message_id] = status
            
            # Store detailed report for database sync
            report_data = {
                "message_id": message_id,
                "status": status.value,
                "smpp_state": state,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "smpp"
            }
            
            # Try to extract additional info from PDU
            try:
                if hasattr(pdu, 'short_message') and pdu.short_message:
                    # Parse delivery receipt text
                    # Format: "id:XXXXX sub:001 dlvrd:001 submit date:... done date:... stat:DELIVRD err:000"
                    receipt_text = pdu.short_message.decode('utf-8', errors='ignore')
                    report_data["receipt_text"] = receipt_text
                    
                    # Parse fields from receipt
                    import re
                    stat_match = re.search(r'stat:(\w+)', receipt_text)
                    err_match = re.search(r'err:(\d+)', receipt_text)
                    
                    if stat_match:
                        report_data["receipt_status"] = stat_match.group(1)
                    if err_match:
                        report_data["error_code"] = err_match.group(1)
                        
            except Exception as parse_err:
                logger.debug(f"Could not parse receipt text: {parse_err}")
            
            # Store in pending reports queue for async database sync
            self._pending_reports.append(report_data)
            
            logger.info(f"SMPP Delivery report: {message_id} -> {status.value}")
            
        except Exception as e:
            logger.error(f"Error handling delivery report: {e}")
    
    def _start_keepalive(self):
        """Start enquire_link keepalive thread"""
        def keepalive():
            while self._connected:
                try:
                    time.sleep(self.config.enquire_link_interval)
                    if self._connected and self.client:
                        self.client.enquire_link()
                except Exception as e:
                    logger.warning(f"Keepalive error: {e}")
        
        thread = threading.Thread(target=keepalive, daemon=True)
        thread.start()
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to E.164 format"""
        phone = phone.strip().replace(" ", "").replace("-", "")
        
        if phone.startswith("0"):
            # Local format: 0712345678 -> +255712345678
            return "+255" + phone[1:]
        elif phone.startswith("255"):
            # Missing +: 255712345678 -> +255712345678
            return "+" + phone
        elif phone.startswith("+255"):
            return phone
        elif phone.startswith("7") or phone.startswith("6"):
            # Short format: 712345678 -> +255712345678
            return "+255" + phone
        
        return phone
    
    def _validate_phone(self, phone: str) -> bool:
        """Validate Tanzanian phone number"""
        import re
        patterns = [
            r'^\+255[67]\d{8}$',  # +255 followed by 6 or 7 then 8 digits
            r'^255[67]\d{8}$',    # Without + prefix
        ]
        return any(re.match(p, phone) for p in patterns)
    
    def _calculate_segments(self, message: str) -> int:
        """Calculate number of SMS segments"""
        length = len(message)
        if length <= 160:
            return 1
        return (length + 152) // 153  # Multipart messages have 153 chars each


# Global service instance
_tigo_service: Optional[TigoSMPPService] = None


def get_tigo_service() -> TigoSMPPService:
    """Get or create the Tigo SMPP service singleton"""
    global _tigo_service
    
    if _tigo_service is None:
        # Load config from environment
        config = SMPPConfig(
            host=os.environ.get("TIGO_SMPP_HOST", "smpp01.tigo.co.tz"),
            port=int(os.environ.get("TIGO_SMPP_PORT", "10501")),
            system_id=os.environ.get("TIGO_SYSTEM_ID", "datavision"),
            password=os.environ.get("TIGO_PASSWORD", "dat@vis"),
            source_addr=os.environ.get("TIGO_SENDER_ID", "UNITXT"),
            sandbox=os.environ.get("TIGO_SANDBOX", "true").lower() == "true"
        )
        _tigo_service = TigoSMPPService(config)
    
    return _tigo_service


def reset_tigo_service():
    """Reset the service (for testing or reconnection)"""
    global _tigo_service
    if _tigo_service:
        _tigo_service.disconnect()
        _tigo_service = None
