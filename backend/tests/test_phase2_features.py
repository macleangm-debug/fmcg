"""
Test Phase 2 Features: Affiliate Dashboard, Interactive Demo, Multi-Currency
Tests API endpoints for affiliate partner dashboard functionality
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://sso-soko-redesign.preview.emergentagent.com')

class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ Health check passed: {data}")
    
    def test_login_superadmin(self):
        """Test superadmin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@softwaregalaxy.com",
            "password": "Test@123"
        }, timeout=15)
        assert response.status_code == 200
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "superadmin"
        print(f"✓ Superadmin login successful: {data.get('user', {}).get('email')}")
        return data.get("access_token")


class TestAffiliateAPIs:
    """Test Affiliate Dashboard APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@softwaregalaxy.com",
            "password": "Test@123"
        }, timeout=15)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate")
    
    def test_get_my_affiliate_profile(self):
        """Test GET /api/affiliates/my-profile - returns affiliate status"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/my-profile",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        # Should return is_affiliate boolean
        assert "is_affiliate" in data
        print(f"✓ My profile endpoint works: is_affiliate={data.get('is_affiliate')}")
        return data
    
    def test_validate_promo_code_invalid(self):
        """Test GET /api/affiliates/validate-code/{code} - validates promo codes (public)"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/validate-code/INVALID-CODE",
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert data.get("valid") == False
        print(f"✓ Promo code validation works: {data}")
    
    def test_admin_list_affiliates(self):
        """Test GET /api/affiliates/admin/list - admin lists all affiliates"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/list",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        assert "affiliates" in data
        assert "counts" in data
        counts = data.get("counts", {})
        print(f"✓ Admin list affiliates: total={counts.get('total')}, active={counts.get('active')}, pending={counts.get('pending')}")
        return data
    
    def test_admin_list_affiliates_by_status(self):
        """Test GET /api/affiliates/admin/list?status=active - filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/list?status=active",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        assert "affiliates" in data
        # All returned should be active status
        for aff in data.get("affiliates", []):
            assert aff.get("status") == "active"
        print(f"✓ Filter by status works: {len(data.get('affiliates', []))} active affiliates")
    
    def test_admin_pending_payouts(self):
        """Test GET /api/affiliates/admin/payouts/pending - get pending payouts"""
        response = requests.get(
            f"{BASE_URL}/api/affiliates/admin/payouts/pending",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        assert "payouts" in data
        assert "pending_count" in data
        print(f"✓ Pending payouts endpoint works: count={data.get('pending_count')}, total=${data.get('total_pending_amount')}")


class TestExchangeRateAPIs:
    """Test Multi-Currency Exchange Rate APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@softwaregalaxy.com",
            "password": "Test@123"
        }, timeout=15)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate")
    
    def test_get_exchange_rates(self):
        """Test GET /api/exchange-rates - get all exchange rates"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        # Should return exchange rate data
        print(f"✓ Exchange rates endpoint works: {type(data)}")
        return data
    
    def test_get_margin_settings(self):
        """Test GET /api/exchange-rates/margin-settings - get profit margin settings"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-settings",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        # Should have margin settings
        print(f"✓ Margin settings endpoint works: {data}")
        return data
    
    def test_get_customer_pricing(self):
        """Test GET /api/exchange-rates/customer-pricing/KES - get customer pricing for currency"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/customer-pricing/KES",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Customer pricing for KES: {data}")
        return data


class TestGalaxyUserAccess:
    """Test Galaxy/Ecosystem User Access APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@softwaregalaxy.com",
            "password": "Test@123"
        }, timeout=15)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate")
    
    def test_get_user_access(self):
        """Test GET /api/galaxy/user/access - get user's app access"""
        response = requests.get(
            f"{BASE_URL}/api/galaxy/user/access",
            headers=self.headers,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        assert "app_access" in data or "user" in data
        print(f"✓ Galaxy user access works")
        return data


class TestReferralAPIs:
    """Test Referral System APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@softwaregalaxy.com",
            "password": "Test@123"
        }, timeout=15)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate")
    
    def test_get_referral_stats(self):
        """Test GET /api/referral/stats - get referral statistics"""
        response = requests.get(
            f"{BASE_URL}/api/referral/stats",
            headers=self.headers,
            timeout=15
        )
        # Could be 200 or 404 depending on if user has referral code
        assert response.status_code in [200, 404]
        print(f"✓ Referral stats endpoint: status={response.status_code}")
        return response.json() if response.status_code == 200 else None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
