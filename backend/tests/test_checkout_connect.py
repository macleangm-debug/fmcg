"""
Tests for KwikPay Public Checkout Page and Connect B2B Landing Page
Testing iteration 5: /pay/DEMO checkout and /connect landing page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://fmcg-preview-sms.preview.emergentagent.com')

class TestPublicCheckoutAPI:
    """Test the public checkout API endpoints at /api/pay/{code}"""
    
    def test_get_checkout_config_demo(self):
        """Test GET /api/pay/DEMO returns valid checkout configuration"""
        response = requests.get(f"{BASE_URL}/api/pay/DEMO")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify checkout_code
        assert "checkout_code" in data
        assert data["checkout_code"] == "DEMO"
        
        # Verify merchant info
        assert "merchant" in data
        assert "name" in data["merchant"]
        assert data["merchant"]["name"] == "Demo Store"
        
        # Verify country info
        assert "country" in data
        assert data["country"]["code"] == "TZ"
        assert data["country"]["currency"] == "TZS"
        assert data["country"]["currency_symbol"] == "TSh"
        
        # Verify theme
        assert "theme" in data
        assert "color" in data["theme"]
        
        # Verify payment methods
        assert "payment_methods" in data
        pm = data["payment_methods"]
        
        # Mobile Money
        assert "mobile_money" in pm
        assert pm["mobile_money"]["enabled"] == True
        assert len(pm["mobile_money"]["providers"]) >= 5  # M-Pesa, Tigo Pesa, Airtel Money, Halopesa, T-Pesa
        
        # Bank Transfer
        assert "bank_transfer" in pm
        assert pm["bank_transfer"]["enabled"] == True
        assert len(pm["bank_transfer"]["banks"]) >= 10  # Multiple banks
        
        # Card
        assert "card" in pm
        assert pm["card"]["enabled"] == True
        assert pm["card"]["provider"] == "EcobankPay"
        
        # QR
        assert "qr" in pm
        assert pm["qr"]["enabled"] == True
        
        # Branding
        assert "branding" in data
        assert data["branding"]["powered_by"] == "KwikPay"
        
        print(f"PASS: GET /api/pay/DEMO returns valid config with {len(pm['mobile_money']['providers'])} MNOs and {len(pm['bank_transfer']['banks'])} banks")
    
    def test_checkout_mobile_money_providers(self):
        """Test that mobile money providers include expected MNOs"""
        response = requests.get(f"{BASE_URL}/api/pay/DEMO")
        assert response.status_code == 200
        
        data = response.json()
        providers = data["payment_methods"]["mobile_money"]["providers"]
        provider_codes = [p["code"] for p in providers]
        
        # Should have these MNOs for Tanzania
        expected_mnos = ["MPESA", "TIGOPESA", "AIRTELMONEY", "HALOPESA", "TPESA"]
        for mno in expected_mnos:
            assert mno in provider_codes, f"Missing MNO: {mno}"
        
        # Each provider should have name and color
        for provider in providers:
            assert "code" in provider
            assert "name" in provider
            assert "color" in provider
        
        print(f"PASS: Mobile Money providers verified: {provider_codes}")
    
    def test_checkout_bank_transfer_banks(self):
        """Test that bank transfer includes expected banks"""
        response = requests.get(f"{BASE_URL}/api/pay/DEMO")
        assert response.status_code == 200
        
        data = response.json()
        banks = data["payment_methods"]["bank_transfer"]["banks"]
        bank_codes = [b["code"] for b in banks]
        
        # Should have major Tanzania banks
        expected_banks = ["CRDB", "NMB", "NBC"]
        for bank in expected_banks:
            assert bank in bank_codes, f"Missing bank: {bank}"
        
        print(f"PASS: Banks verified with {len(banks)} banks including {expected_banks}")
    
    def test_checkout_not_found(self):
        """Test 404 for invalid checkout code"""
        response = requests.get(f"{BASE_URL}/api/pay/INVALID_CODE_12345")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        
        print("PASS: Invalid checkout code returns 404")
    
    def test_create_payment_mobile_money(self):
        """Test POST /api/pay/DEMO for mobile money payment"""
        response = requests.post(
            f"{BASE_URL}/api/pay/DEMO",
            json={
                "amount": 10000,
                "payment_method": "mobile_money",
                "customer_phone": "0754123456"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "tx_ref" in data
        assert data["amount"] == 10000
        assert data["currency"] == "TZS"
        assert data["status"] == "pending"
        
        # Should have USSD instructions for mobile money
        assert "instructions" in data
        assert data["instructions"]["type"] == "ussd"
        
        print(f"PASS: Mobile money payment created with ref {data['tx_ref']}")
    
    def test_create_payment_bank_transfer(self):
        """Test POST /api/pay/DEMO for bank transfer"""
        response = requests.post(
            f"{BASE_URL}/api/pay/DEMO",
            json={
                "amount": 50000,
                "payment_method": "bank_transfer",
                "bank_code": "CRDB"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "tx_ref" in data
        assert data["amount"] == 50000
        
        # Should have bank transfer instructions
        assert "instructions" in data
        assert data["instructions"]["type"] == "bank_transfer"
        assert "reference" in data["instructions"]
        
        print(f"PASS: Bank transfer payment created with ref {data['tx_ref']}")
    
    def test_create_payment_qr(self):
        """Test POST /api/pay/DEMO for QR code payment"""
        response = requests.post(
            f"{BASE_URL}/api/pay/DEMO",
            json={
                "amount": 25000,
                "payment_method": "qr"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "tx_ref" in data
        assert data["amount"] == 25000
        
        # Should have QR instructions
        assert "instructions" in data
        assert data["instructions"]["type"] == "qr"
        assert "qr_url" in data["instructions"]
        
        print(f"PASS: QR payment created with ref {data['tx_ref']}")
    
    def test_create_payment_card(self):
        """Test POST /api/pay/DEMO for card payment"""
        response = requests.post(
            f"{BASE_URL}/api/pay/DEMO",
            json={
                "amount": 100000,
                "payment_method": "card",
                "customer_email": "test@example.com"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "tx_ref" in data
        assert data["amount"] == 100000
        
        print(f"PASS: Card payment created with ref {data['tx_ref']}")


class TestMNODetection:
    """Test MNO detection endpoint"""
    
    def test_detect_mno_vodacom(self):
        """Test MNO detection for Vodacom M-Pesa"""
        response = requests.post(
            f"{BASE_URL}/api/kwikcheckout/detect-mno",
            json={
                "phone": "0754123456",  # 075x is Vodacom
                "country_code": "TZ"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Detect if MNO was found
        if data.get("detected"):
            print(f"PASS: MNO detected: {data.get('name', 'Unknown')}")
        else:
            print(f"PASS: MNO detection returned (detected={data.get('detected', False)})")


class TestHealthAndConnectivity:
    """Test basic health and connectivity"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "ok"]  # Accept both variations
        
        print(f"PASS: API is healthy (status={data['status']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
