"""
Test iteration 20 - New Features Testing
- Share & Earn functionality (my-referral endpoint)
- Margin Earnings Tracking endpoint
- Affiliate dashboard endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-product-hub-3.preview.emergentagent.com')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@softwaregalaxy.com"
SUPERADMIN_PASSWORD = "Test@123"
VALID_REFERRAL_CODE = "O524BP4O"


class TestMarginEarningsEndpoint:
    """Tests for GET /api/exchange-rates/margin-earnings endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self, superadmin_token):
        self.token = superadmin_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_margin_earnings_month_period(self, superadmin_token):
        """Test margin earnings endpoint with month period"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-earnings?period=month",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "period" in data
        assert data["period"] == "month"
        assert "summary" in data
        assert "earnings_by_currency" in data
        assert "recent_transactions" in data
        
        # Validate summary structure
        summary = data["summary"]
        assert "total_margin_earned" in summary
        assert "total_transactions" in summary
        assert "total_order_value_usd" in summary
        assert "current_margin_percent" in summary
        assert "average_margin_per_order" in summary
        
        # Validate data types
        assert isinstance(summary["total_margin_earned"], (int, float))
        assert isinstance(summary["total_transactions"], int)
        assert isinstance(summary["current_margin_percent"], (int, float))
    
    def test_margin_earnings_today_period(self, superadmin_token):
        """Test margin earnings endpoint with today period"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-earnings?period=today",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "today"
    
    def test_margin_earnings_week_period(self, superadmin_token):
        """Test margin earnings endpoint with week period"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-earnings?period=week",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "week"
    
    def test_margin_earnings_all_period(self, superadmin_token):
        """Test margin earnings endpoint with all period"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-earnings?period=all",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "all"
    
    def test_margin_earnings_requires_auth(self):
        """Test that margin earnings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/exchange-rates/margin-earnings")
        # Returns 403 (Forbidden) when no auth token provided
        assert response.status_code in [401, 403]
    
    def test_margin_earnings_requires_admin_role(self, regular_user_token):
        """Test that margin earnings endpoint requires admin role"""
        headers = {"Authorization": f"Bearer {regular_user_token}"}
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/margin-earnings",
            headers=headers
        )
        assert response.status_code == 403


class TestShareAndEarnEndpoint:
    """Tests for Share & Earn functionality (my-referral endpoint)"""
    
    def test_get_my_referral_code(self, superadmin_token):
        """Test GET /api/referrals/my-referral returns referral code"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/referrals/my-referral",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "referral_code" in data
        assert "referral_link" in data
        assert "stats" in data
        assert "rewards" in data
        
        # Validate referral code
        assert data["referral_code"] == VALID_REFERRAL_CODE
        assert VALID_REFERRAL_CODE in data["referral_link"]
        
        # Validate stats structure
        stats = data["stats"]
        assert "successful_referrals" in stats
        assert "pending_referrals" in stats
        assert "total_earned" in stats
        assert "credit_balance" in stats
        
        # Validate rewards structure
        rewards = data["rewards"]
        assert "referrer_reward" in rewards
        assert "referee_reward" in rewards
        assert "reward_type" in rewards
    
    def test_my_referral_requires_auth(self):
        """Test that my-referral endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-referral")
        # Returns 403 (Forbidden) when no auth token provided
        assert response.status_code in [401, 403]
    
    def test_referral_code_validation_valid(self):
        """Test referral code validation with valid code"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/validate-code/{VALID_REFERRAL_CODE}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["code_type"] == "referral"
    
    def test_referral_code_validation_invalid(self):
        """Test referral code validation with invalid code"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/validate-code/INVALIDCODE123"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False


class TestAffiliateDashboardEndpoints:
    """Tests for affiliate dashboard endpoints"""
    
    def test_affiliate_profile_endpoint(self, superadmin_token):
        """Test GET /api/affiliates/my-profile returns affiliate profile"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/affiliates/my-profile",
            headers=headers
        )
        # May return 200 with profile or 200 with is_affiliate: false
        assert response.status_code == 200
        data = response.json()
        assert "is_affiliate" in data
    
    def test_affiliate_earnings_endpoint(self, superadmin_token):
        """Test affiliate earnings endpoint"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/affiliates/earnings",
            headers=headers
        )
        # Returns 200 if user is affiliate, 403/404 otherwise
        assert response.status_code in [200, 403, 404]


# Fixtures
@pytest.fixture(scope="module")
def superadmin_token():
    """Get superadmin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Could not authenticate superadmin: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def regular_user_token():
    """Get or create a regular user token for permission testing"""
    # Try to login with a test user
    test_email = "test_regular_user_iter20@example.com"
    test_password = "Test@123"
    
    # Try login first
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": test_email, "password": test_password}
    )
    
    if response.status_code == 200:
        return response.json().get("access_token")
    
    # Create user if doesn't exist
    register_response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "name": "Test Regular User",
            "email": test_email,
            "password": test_password,
            "confirm_password": test_password
        }
    )
    
    if register_response.status_code in [200, 201]:
        return register_response.json().get("access_token")
    
    pytest.skip("Could not create or login regular user for permission testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
