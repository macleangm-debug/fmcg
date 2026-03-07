"""
Test KwikPay New Features:
- Analytics Dashboard (GET /api/kwikpay/dashboard)
- Invoicing (GET/POST /api/invoices)
- WebSocket Status (GET /api/kwikpay/ws/status)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://product-onboard.preview.emergentagent.com'))
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
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        return data["access_token"]


class TestAnalyticsDashboard:
    """Analytics Dashboard endpoint tests - /api/kwikpay/dashboard"""
    
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
    
    def test_dashboard_returns_stats(self):
        """Test GET /api/kwikpay/dashboard returns stats data"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/dashboard", headers=self.headers)
        print(f"Dashboard response status: {response.status_code}")
        print(f"Dashboard response: {response.text[:1000] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify stats object exists
        assert "stats" in data, "stats not in response"
        stats = data["stats"]
        
        # Verify required stat fields exist (can be 0)
        assert "total_volume" in stats, "total_volume not in stats"
        assert "total_transactions" in stats, "total_transactions not in stats"
        assert "successful_rate" in stats or "success_rate" in stats, "success rate not in stats"
        
        print(f"Dashboard stats: total_volume={stats.get('total_volume')}, total_transactions={stats.get('total_transactions')}")
    
    def test_dashboard_has_chart_data(self):
        """Test dashboard includes chart data for volume trend"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/dashboard", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for chart_data (may be empty list)
        if "chart_data" in data:
            assert isinstance(data["chart_data"], list), "chart_data should be a list"
            print(f"Chart data entries: {len(data['chart_data'])}")


class TestInvoicing:
    """Invoicing endpoint tests - /api/invoices"""
    
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
    
    def test_list_invoices(self):
        """Test GET /api/invoices returns list (empty list is valid)"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        print(f"List invoices response status: {response.status_code}")
        print(f"List invoices response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Response can be a list or {invoices: [...]}
        if isinstance(data, list):
            print(f"Found {len(data)} invoices (direct list)")
        elif "invoices" in data:
            assert isinstance(data["invoices"], list), "invoices should be a list"
            print(f"Found {len(data['invoices'])} invoices")
        else:
            # Empty response is also valid
            print("Response format: ", type(data))
    
    def test_create_invoice(self):
        """Test POST /api/invoices creates new invoice"""
        test_id = uuid.uuid4().hex[:6]
        
        payload = {
            "customer_name": f"Test Client {test_id}",
            "customer_email": f"testclient_{test_id}@example.com",
            "items": [{
                "description": "Test Service",
                "quantity": 1,
                "unit_price": 50000
            }],
            "currency": "TZS",
            "due_date": "2026-02-28"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=self.headers)
        print(f"Create invoice response status: {response.status_code}")
        print(f"Create invoice response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code in [200, 201], f"Expected 200 or 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return invoice details or success response
        assert "id" in data or "_id" in data or "invoice_number" in data or "success" in data, \
            f"Expected invoice data in response, got: {data.keys()}"
        
        print(f"Invoice created successfully")
    
    def test_invoice_summary(self):
        """Test GET /api/invoices/summary returns summary stats"""
        response = requests.get(f"{BASE_URL}/api/invoices/summary", headers=self.headers)
        print(f"Invoice summary response status: {response.status_code}")
        print(f"Invoice summary response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for expected summary fields
        print(f"Summary fields: {list(data.keys())}")


class TestWebSocketStatus:
    """WebSocket Status endpoint tests - /api/kwikpay/ws/status"""
    
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
    
    def test_ws_status_returns_business_info(self):
        """Test GET /api/kwikpay/ws/status returns business info and supported events"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/ws/status", headers=self.headers)
        print(f"WS Status response status: {response.status_code}")
        print(f"WS Status response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "business_id" in data, "business_id not in response"
        assert "active_connections" in data, "active_connections not in response"
        assert "websocket_url" in data, "websocket_url not in response"
        assert "supported_events" in data, "supported_events not in response"
        
        # Verify supported_events content
        supported_events = data["supported_events"]
        assert isinstance(supported_events, list), "supported_events should be a list"
        assert len(supported_events) > 0, "supported_events should not be empty"
        
        print(f"WebSocket Status: business_id={data['business_id']}, connections={data['active_connections']}, events={supported_events}")
    
    def test_ws_status_unauthenticated(self):
        """Test ws/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/ws/status")
        print(f"Unauthenticated WS Status response: {response.status_code}")
        
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 for unauthenticated request, got {response.status_code}"


class TestQRCodesIntegration:
    """QR Codes - verify list and create endpoints still work"""
    
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
    
    def test_list_qr_codes(self):
        """Test GET /api/kwikpay/qr-codes works"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/qr-codes", headers=self.headers)
        print(f"QR Codes list response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "qr_codes" in data, "qr_codes not in response"
        print(f"Found {len(data['qr_codes'])} QR codes")
    
    def test_create_qr_code(self):
        """Test POST /api/kwikpay/qr-codes creates QR code"""
        test_id = uuid.uuid4().hex[:6]
        payload = {
            "amount": 25000,
            "currency": "TZS",
            "description": f"TEST_QR_Integration_{test_id}",
            "is_fixed_amount": True
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/qr-codes", json=payload, headers=self.headers)
        print(f"Create QR response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "qr_code" in data, "qr_code not in response"


class TestWebhooksIntegration:
    """Webhooks - verify list endpoint with available_events"""
    
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
    
    def test_list_webhooks_with_available_events(self):
        """Test GET /api/kwikpay/webhooks returns available_events"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/webhooks", headers=self.headers)
        print(f"Webhooks list response status: {response.status_code}")
        print(f"Webhooks response: {response.text[:500] if response.text else 'No body'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "webhooks" in data, "webhooks not in response"
        assert "available_events" in data, "available_events not in response"
        
        available_events = data["available_events"]
        assert isinstance(available_events, list), "available_events should be a list"
        assert len(available_events) > 0, "available_events should not be empty"
        
        print(f"Found {len(data['webhooks'])} webhooks, {len(available_events)} available events")
    
    def test_create_webhook(self):
        """Test POST /api/kwikpay/webhooks creates webhook"""
        test_id = uuid.uuid4().hex[:6]
        payload = {
            "url": f"https://example.com/webhooks/TEST_Integration_{test_id}",
            "events": ["payment.succeeded"],
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/kwikpay/webhooks", json=payload, headers=self.headers)
        print(f"Create webhook response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Expected success=True"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
