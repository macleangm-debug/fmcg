"""
Test suite for Affiliate/PromoCode System and Exchange Rate Margin APIs
Tests affiliate CRUD, promo code validation, and exchange rate margin settings
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://soko-ui-refresh.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@softwaregalaxy.com"
SUPERADMIN_PASSWORD = "Test@123"


class TestAuthSetup:
    """Authentication setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test superadmin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "superadmin"
        print(f"✓ Superadmin login successful - user: {data['user']['email']}")


class TestExchangeRateMarginAPI:
    """Test Exchange Rate Margin Settings APIs"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_margin_settings(self, auth_headers):
        """Test GET /api/exchange-rates/margin-settings"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-settings",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "margin_percent" in data, "Missing margin_percent field"
        assert isinstance(data["margin_percent"], (int, float)), "margin_percent should be numeric"
        print(f"✓ GET margin settings: margin_percent={data['margin_percent']}%")
    
    def test_update_margin_settings(self, auth_headers):
        """Test PUT /api/exchange-rates/margin-settings"""
        new_margin = 7.5
        response = requests.put(
            f"{BASE_URL}/api/exchange-rates/margin-settings",
            headers=auth_headers,
            json={"margin_percent": new_margin}
        )
        assert response.status_code == 200, f"Failed to update margin: {response.text}"
        data = response.json()
        
        # Verify the update was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-settings",
            headers=auth_headers
        )
        verify_data = verify_response.json()
        assert verify_data["margin_percent"] == new_margin, "Margin was not updated in database"
        print(f"✓ PUT margin settings: Updated to {new_margin}%")
        
        # Reset to default
        requests.put(
            f"{BASE_URL}/api/exchange-rates/margin-settings",
            headers=auth_headers,
            json={"margin_percent": 5.0}
        )
    
    def test_get_exchange_rates(self, auth_headers):
        """Test GET /api/exchange-rates"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "rates" in data, "Missing rates field"
        print(f"✓ GET exchange rates: {len(data.get('rates', []))} rates returned")


class TestAffiliateAPIAdmin:
    """Test Affiliate Admin API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_list_affiliates(self, auth_headers):
        """Test GET /api/affiliates/admin/list - List all affiliates"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "affiliates" in data, "Missing affiliates array"
        assert "counts" in data, "Missing counts object"
        assert "total" in data["counts"], "Missing total count"
        assert "pending" in data["counts"], "Missing pending count"
        assert "active" in data["counts"], "Missing active count"
        
        print(f"✓ GET affiliates list: {data['counts']['total']} total, {data['counts']['active']} active, {data['counts']['pending']} pending")
    
    def test_list_affiliates_with_status_filter(self, auth_headers):
        """Test GET /api/affiliates/admin/list with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/list?status=active",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all returned affiliates have 'active' status
        for affiliate in data.get("affiliates", []):
            assert affiliate["status"] == "active", f"Affiliate {affiliate['id']} has non-active status"
        
        print(f"✓ GET affiliates with status=active filter: {len(data.get('affiliates', []))} affiliates")
    
    def test_get_pending_payouts(self, auth_headers):
        """Test GET /api/affiliates/admin/payouts/pending"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/payouts/pending",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "payouts" in data, "Missing payouts array"
        assert "total_pending_amount" in data, "Missing total_pending_amount"
        assert "pending_count" in data, "Missing pending_count"
        
        print(f"✓ GET pending payouts: {data['pending_count']} pending, total ${data['total_pending_amount']}")


class TestPromoCodeValidation:
    """Test promo code validation endpoint (public)"""
    
    def test_validate_invalid_code(self):
        """Test GET /api/affiliates/validate-code/{code} with invalid code"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/validate-code/INVALID123"
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "valid" in data, "Missing valid field"
        assert data["valid"] == False, "Invalid code should return valid=false"
        assert "message" in data, "Missing message field"
        
        print(f"✓ Validate invalid code: valid={data['valid']}, message='{data['message']}'")
    
    def test_validate_random_code(self):
        """Test validation with random code"""
        random_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
        response = requests.get(
            f"{BASE_URL}/api/affiliates/validate-code/{random_code}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print(f"✓ Random code {random_code}: valid=False (expected)")


class TestAffiliateApplication:
    """Test affiliate application endpoint (requires authenticated user)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers - need a regular user, not superadmin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_apply_affiliate_endpoint_exists(self, auth_headers):
        """Test POST /api/affiliates/apply endpoint exists and responds"""
        # Note: This will likely fail because superadmin may already be an affiliate
        # or we need valid application data, but we're testing the endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/affiliates/apply",
            headers=auth_headers,
            json={
                "company_name": f"TEST_Company_{uuid.uuid4().hex[:6]}",
                "contact_name": "Test Contact",
                "contact_email": f"test_{uuid.uuid4().hex[:6]}@example.com",
                "payout_method": "bank_transfer"
            }
        )
        # Accept 200 (success) or 400 (already registered) - both indicate endpoint works
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data or "affiliate_id" in data
            print(f"✓ Apply affiliate: Application submitted successfully")
        else:
            print(f"✓ Apply affiliate endpoint exists: {response.json().get('detail', 'Error')}")


class TestAffiliateProfileEndpoints:
    """Test affiliate profile endpoints (requires authenticated user)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_my_profile(self, auth_headers):
        """Test GET /api/affiliates/my-profile"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/my-profile",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Response should indicate if user is affiliate or not
        assert "is_affiliate" in data, "Missing is_affiliate field"
        print(f"✓ GET my-profile: is_affiliate={data['is_affiliate']}")
    
    def test_get_my_codes_unauthorized(self):
        """Test GET /api/affiliates/my-codes without auth"""
        response = requests.get(f"{BASE_URL}/api/affiliates/my-codes")
        assert response.status_code == 403, f"Expected 403 for unauthenticated request, got {response.status_code}"
        print("✓ GET my-codes requires authentication")


class TestEndToEndAffiliateFlow:
    """End-to-end test for affiliate workflow"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_affiliate_admin_flow(self, auth_headers):
        """Test complete admin flow: list affiliates -> check stats"""
        # Step 1: Get list of affiliates
        list_response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/list",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        list_data = list_response.json()
        
        initial_counts = list_data["counts"]
        print(f"Initial counts: total={initial_counts['total']}, active={initial_counts['active']}, pending={initial_counts['pending']}")
        
        # Step 2: Check pending payouts
        payouts_response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/payouts/pending",
            headers=auth_headers
        )
        assert payouts_response.status_code == 200
        payouts_data = payouts_response.json()
        
        print(f"Pending payouts: count={payouts_data['pending_count']}, total=${payouts_data['total_pending_amount']}")
        
        # Step 3: Verify promo code validation
        validation_response = requests.get(
            f"{BASE_URL}/api/affiliates/validate-code/TESTCODE"
        )
        assert validation_response.status_code == 200
        
        print("✓ Complete affiliate admin flow successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
