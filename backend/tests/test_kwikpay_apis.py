"""
Test KwikPay API endpoints:
- QR Codes CRUD
- Webhooks CRUD
- Payment Links (verification)
- Recurring Billing (verification)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://retailpro-ux.preview.emergentagent.com'))
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "Test123!"


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert "user" in data, "user not in response"
        return data["access_token"]


class TestQRCodes:
    """QR Codes CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_qr_code_fixed_amount(self):
        """Test creating QR code with fixed amount"""
        payload = {
            "amount": 50000,
            "currency": "TZS",
            "description": f"TEST_QR_Fixed_{uuid.uuid4().hex[:6]}",
            "is_fixed_amount": True
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/qr-codes", json=payload, headers=self.headers)
        print(f"Create QR response status: {response.status_code}")
        print(f"Create QR response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data and data["success"] == True, "Expected success=True"
        assert "qr_code" in data, "qr_code not in response"
        qr = data["qr_code"]
        assert "short_code" in qr, "short_code not in qr_code"
        assert qr["amount"] == 50000, f"Expected amount 50000, got {qr['amount']}"
        assert qr["currency"] == "TZS"
        return qr["short_code"]
    
    def test_create_qr_code_variable_amount(self):
        """Test creating QR code with variable amount"""
        payload = {
            "amount": 0,
            "currency": "TZS",
            "description": f"TEST_QR_Variable_{uuid.uuid4().hex[:6]}",
            "is_fixed_amount": False
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/qr-codes", json=payload, headers=self.headers)
        print(f"Create Variable QR response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["qr_code"]["amount"] == 0, "Variable QR should have 0 amount"
    
    def test_list_qr_codes(self):
        """Test listing QR codes"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/qr-codes", headers=self.headers)
        print(f"List QR codes response status: {response.status_code}")
        print(f"List QR codes response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "qr_codes" in data, "qr_codes not in response"
        assert isinstance(data["qr_codes"], list), "qr_codes should be a list"
        print(f"Found {len(data['qr_codes'])} QR codes")
    
    def test_get_qr_code_by_short_code(self):
        """Test getting a specific QR code"""
        # First create a QR code
        payload = {
            "amount": 10000,
            "currency": "TZS",
            "description": f"TEST_GetQR_{uuid.uuid4().hex[:6]}",
            "is_fixed_amount": True
        }
        create_response = requests.post(f"{BASE_URL}/api/kwikpay/qr-codes", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        short_code = create_response.json()["qr_code"]["short_code"]
        
        # Get the QR code
        response = requests.get(f"{BASE_URL}/api/kwikpay/qr-codes/{short_code}", headers=self.headers)
        print(f"Get QR code response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["short_code"] == short_code
    
    def test_deactivate_qr_code(self):
        """Test deactivating a QR code"""
        # First create a QR code
        payload = {
            "amount": 5000,
            "currency": "TZS",
            "description": f"TEST_DeactivateQR_{uuid.uuid4().hex[:6]}",
            "is_fixed_amount": True
        }
        create_response = requests.post(f"{BASE_URL}/api/kwikpay/qr-codes", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        short_code = create_response.json()["qr_code"]["short_code"]
        
        # Deactivate
        response = requests.delete(f"{BASE_URL}/api/kwikpay/qr-codes/{short_code}", headers=self.headers)
        print(f"Deactivate QR code response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True


class TestWebhooks:
    """Webhooks CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_webhook(self):
        """Test creating a webhook"""
        test_id = uuid.uuid4().hex[:8]
        payload = {
            "url": f"https://example.com/webhooks/TEST_{test_id}",
            "events": ["payment.succeeded", "payment.failed"],
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/webhooks", json=payload, headers=self.headers)
        print(f"Create webhook response status: {response.status_code}")
        print(f"Create webhook response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True, "Expected success=True"
        assert "webhook" in data, "webhook not in response"
        webhook = data["webhook"]
        assert "id" in webhook, "id not in webhook"
        assert "secret" in webhook, "secret not in webhook"
        return webhook["id"]
    
    def test_list_webhooks(self):
        """Test listing webhooks"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/webhooks", headers=self.headers)
        print(f"List webhooks response status: {response.status_code}")
        print(f"List webhooks response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "webhooks" in data, "webhooks not in response"
        assert "available_events" in data, "available_events not in response"
        assert isinstance(data["webhooks"], list)
        assert isinstance(data["available_events"], list)
        assert len(data["available_events"]) > 0, "Expected at least one available event"
        print(f"Found {len(data['webhooks'])} webhooks, {len(data['available_events'])} available events")
    
    def test_update_webhook(self):
        """Test updating a webhook"""
        # First create a webhook
        test_id = uuid.uuid4().hex[:8]
        create_payload = {
            "url": f"https://example.com/webhooks/TEST_Update_{test_id}",
            "events": ["payment.succeeded"],
            "is_active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/kwikpay/webhooks", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        webhook_id = create_response.json()["webhook"]["id"]
        
        # Update the webhook
        update_payload = {
            "is_active": False,
            "events": ["payment.succeeded", "refund.created"]
        }
        response = requests.put(f"{BASE_URL}/api/kwikpay/webhooks/{webhook_id}", json=update_payload, headers=self.headers)
        print(f"Update webhook response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
    
    def test_test_webhook(self):
        """Test sending test webhook"""
        # First create a webhook
        test_id = uuid.uuid4().hex[:8]
        create_payload = {
            "url": f"https://example.com/webhooks/TEST_Send_{test_id}",
            "events": ["payment.succeeded"],
            "is_active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/kwikpay/webhooks", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        webhook_id = create_response.json()["webhook"]["id"]
        
        # Test the webhook
        response = requests.post(f"{BASE_URL}/api/kwikpay/webhooks/{webhook_id}/test", headers=self.headers)
        print(f"Test webhook response status: {response.status_code}")
        print(f"Test webhook response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "payload" in data, "payload not in response"
    
    def test_delete_webhook(self):
        """Test deleting a webhook"""
        # First create a webhook
        test_id = uuid.uuid4().hex[:8]
        create_payload = {
            "url": f"https://example.com/webhooks/TEST_Delete_{test_id}",
            "events": ["payment.succeeded"],
            "is_active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/kwikpay/webhooks", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        webhook_id = create_response.json()["webhook"]["id"]
        
        # Delete the webhook
        response = requests.delete(f"{BASE_URL}/api/kwikpay/webhooks/{webhook_id}", headers=self.headers)
        print(f"Delete webhook response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True


class TestPaymentLinks:
    """Payment Links endpoint tests - verify existing functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_list_payment_links(self):
        """Test listing payment links"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/payment-links", headers=self.headers)
        print(f"List payment links response status: {response.status_code}")
        print(f"List payment links response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "links" in data, "links not in response"
        print(f"Found {len(data['links'])} payment links")
    
    def test_create_payment_link(self):
        """Test creating a payment link"""
        test_id = uuid.uuid4().hex[:6]
        payload = {
            "amount": 75000,
            "currency": "TZS",
            "description": f"TEST_PaymentLink_{test_id}",
            "customer_email": f"test{test_id}@example.com",
            "expires_in_hours": 24,
            "one_time": True
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/payment-links", json=payload, headers=self.headers)
        print(f"Create payment link response status: {response.status_code}")
        print(f"Create payment link response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "link_id" in data or "short_code" in data or "payment_url" in data, "Expected link details in response"


class TestRecurringBilling:
    """Recurring Billing endpoint tests - verify existing functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_list_subscription_plans(self):
        """Test listing subscription plans"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/subscription-plans", headers=self.headers)
        print(f"List subscription plans response status: {response.status_code}")
        print(f"List subscription plans response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "plans" in data, "plans not in response"
        print(f"Found {len(data['plans'])} subscription plans")
    
    def test_create_subscription_plan(self):
        """Test creating a subscription plan"""
        test_id = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_Plan_{test_id}",
            "amount": 50000,
            "currency": "TZS",
            "interval": "monthly",
            "description": f"Test subscription plan {test_id}",
            "trial_days": 7
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/subscription-plans", json=payload, headers=self.headers)
        print(f"Create subscription plan response status: {response.status_code}")
        print(f"Create subscription plan response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "plan_id" in data or "success" in data, "Expected plan details in response"
        return data.get("plan_id")
    
    def test_list_subscriptions(self):
        """Test listing subscriptions"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/subscriptions", headers=self.headers)
        print(f"List subscriptions response status: {response.status_code}")
        print(f"List subscriptions response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "subscriptions" in data, "subscriptions not in response"
        print(f"Found {len(data['subscriptions'])} subscriptions")
    
    def test_create_subscription(self):
        """Test creating a subscription"""
        # First create a plan
        test_id = uuid.uuid4().hex[:6]
        plan_payload = {
            "name": f"TEST_SubPlan_{test_id}",
            "amount": 30000,
            "currency": "TZS",
            "interval": "monthly",
            "description": "Test plan for subscription",
            "trial_days": 0
        }
        plan_response = requests.post(f"{BASE_URL}/api/kwikpay/subscription-plans", json=plan_payload, headers=self.headers)
        if plan_response.status_code != 200:
            pytest.skip("Could not create plan for subscription test")
        
        plan_id = plan_response.json().get("plan_id")
        if not plan_id:
            pytest.skip("Plan ID not returned")
        
        # Create subscription
        sub_payload = {
            "plan_id": plan_id,
            "customer_email": f"test_sub_{test_id}@example.com",
            "customer_phone": "+255712345678",
            "payment_method": "mobile_money"
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/subscriptions", json=sub_payload, headers=self.headers)
        print(f"Create subscription response status: {response.status_code}")
        print(f"Create subscription response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
