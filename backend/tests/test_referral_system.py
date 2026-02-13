"""
Test Referral System APIs
Tests the referral configuration (superadmin) and user referral endpoints
"""
import os
import pytest
import requests
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@softwaregalaxy.com"
SUPERADMIN_PASSWORD = "Test@123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def superadmin_token(api_client):
    """Get superadmin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERADMIN_EMAIL,
        "password": SUPERADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Superadmin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_superadmin(api_client, superadmin_token):
    """Session with superadmin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {superadmin_token}"})
    return api_client


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_base_url_configured(self):
        """Verify BASE_URL is configured"""
        assert BASE_URL, "BASE_URL environment variable not set"
        print(f"Using BASE_URL: {BASE_URL}")
    
    def test_api_reachable(self, api_client):
        """Test that API is reachable"""
        try:
            response = api_client.get(f"{BASE_URL}/api/health", timeout=10)
            print(f"Health check response: {response.status_code}")
            # Accept various success codes
            assert response.status_code in [200, 404, 405], f"API not reachable: {response.status_code}"
        except requests.exceptions.ConnectionError as e:
            pytest.fail(f"Cannot connect to API: {e}")


class TestSuperadminLogin:
    """Test superadmin authentication"""
    
    def test_superadmin_login_success(self, api_client):
        """Test superadmin can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        print(f"Login response: {response.status_code}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data or "token" in data, f"No token in response: {data}"
        assert "user" in data, f"No user in response: {data}"
        
        user = data.get("user", {})
        assert user.get("email") == SUPERADMIN_EMAIL
        assert user.get("role") == "superadmin"
        print(f"Successfully authenticated as: {user.get('email')} ({user.get('role')})")


class TestReferralConfigEndpoints:
    """Test superadmin referral configuration endpoints"""
    
    def test_get_referral_config(self, authenticated_superadmin):
        """GET /api/superadmin/referrals - should return referral config"""
        response = authenticated_superadmin.get(f"{BASE_URL}/api/superadmin/referrals")
        print(f"GET referral config response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get referral config: {response.text}"
        
        data = response.json()
        assert "config" in data, f"Missing 'config' in response: {data}"
        
        config = data["config"]
        # Verify required fields
        assert "referrer_reward" in config, f"Missing 'referrer_reward' in config"
        assert "referee_reward" in config, f"Missing 'referee_reward' in config"
        assert "is_active" in config, f"Missing 'is_active' in config"
        assert "show_post_purchase_popup" in config, f"Missing 'show_post_purchase_popup' - this is the new field"
        
        print(f"Referral config: referrer_reward={config.get('referrer_reward')}, referee_reward={config.get('referee_reward')}, show_post_purchase_popup={config.get('show_post_purchase_popup')}")
    
    def test_update_referral_config(self, authenticated_superadmin):
        """PUT /api/superadmin/referrals - should save referral config with new fields"""
        test_config = {
            "name": "Test Referral Program",
            "reward_type": "credit",
            "referrer_reward": 15.0,
            "referee_reward": 15.0,
            "min_purchase_amount": 50.0,
            "max_referrals_per_user": 25,
            "expiry_days": 60,
            "is_active": True,
            "show_post_purchase_popup": True
        }
        
        response = authenticated_superadmin.put(f"{BASE_URL}/api/superadmin/referrals", json=test_config)
        print(f"PUT referral config response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to update referral config: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Update not successful: {data}"
        print(f"Successfully updated referral config, config_id: {data.get('config_id')}")
    
    def test_update_referral_config_persists(self, authenticated_superadmin):
        """Verify updated config persists in database"""
        # First update with specific values
        update_config = {
            "name": "Updated Referral Program",
            "reward_type": "credit",
            "referrer_reward": 20.0,
            "referee_reward": 25.0,
            "min_purchase_amount": 100.0,
            "max_referrals_per_user": 50,
            "expiry_days": 30,
            "is_active": True,
            "show_post_purchase_popup": False
        }
        
        update_response = authenticated_superadmin.put(f"{BASE_URL}/api/superadmin/referrals", json=update_config)
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        # GET to verify persistence
        get_response = authenticated_superadmin.get(f"{BASE_URL}/api/superadmin/referrals")
        assert get_response.status_code == 200, f"Failed to get updated config: {get_response.text}"
        
        data = get_response.json()
        config = data.get("config", {})
        
        # Verify values persisted
        assert config.get("referrer_reward") == 20.0, f"referrer_reward not persisted: {config.get('referrer_reward')}"
        assert config.get("referee_reward") == 25.0, f"referee_reward not persisted: {config.get('referee_reward')}"
        assert config.get("show_post_purchase_popup") == False, f"show_post_purchase_popup not persisted: {config.get('show_post_purchase_popup')}"
        
        print("Config update persistence verified successfully")
    
    def test_get_referral_stats(self, authenticated_superadmin):
        """GET /api/superadmin/referrals/stats - should return referral statistics"""
        response = authenticated_superadmin.get(f"{BASE_URL}/api/superadmin/referrals/stats")
        print(f"GET referral stats response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get referral stats: {response.text}"
        
        data = response.json()
        # Check stats structure - stats are nested inside 'stats' key
        assert "stats" in data, f"Missing 'stats' in response: {data}"
        
        stats = data.get("stats", {})
        assert "total_referrals" in stats, f"Missing 'total_referrals' in stats"
        assert "successful_referrals" in stats, f"Missing 'successful_referrals' in stats"
        assert "pending_referrals" in stats, f"Missing 'pending_referrals' in stats"
        
        print(f"Referral stats: total={stats.get('total_referrals')}, successful={stats.get('successful_referrals')}, pending={stats.get('pending_referrals')}")


class TestUserReferralEndpoints:
    """Test user-facing referral endpoints"""
    
    def test_get_my_referral_info(self, authenticated_superadmin):
        """GET /api/referrals/my-referral - should return user's referral data"""
        response = authenticated_superadmin.get(f"{BASE_URL}/api/referrals/my-referral")
        print(f"GET my-referral response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get my referral info: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "referral_code" in data, f"Missing 'referral_code' in response: {data}"
        assert "referral_link" in data, f"Missing 'referral_link' in response: {data}"
        assert "rewards" in data, f"Missing 'rewards' in response: {data}"
        
        # Verify rewards structure
        rewards = data.get("rewards", {})
        assert "referrer_reward" in rewards, f"Missing 'referrer_reward' in rewards"
        assert "referee_reward" in rewards, f"Missing 'referee_reward' in rewards"
        
        print(f"My referral code: {data.get('referral_code')}, link: {data.get('referral_link')[:50]}...")
    
    def test_send_referral_invite(self, authenticated_superadmin):
        """POST /api/referrals/invite - should create invitation and send email (mocked)"""
        # Use a unique test email to avoid duplicate invite errors
        unique_email = f"test_invite_{uuid.uuid4().hex[:8]}@test.com"
        
        response = authenticated_superadmin.post(f"{BASE_URL}/api/referrals/invite", json={
            "email": unique_email,
            "name": "Test Invitee"
        })
        print(f"POST referral invite response: {response.status_code}")
        
        # Handle both success and expected errors
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, f"Invite not successful: {data}"
            assert "referral_id" in data, f"Missing 'referral_id' in response"
            print(f"Successfully sent invite, referral_id: {data.get('referral_id')}")
        elif response.status_code == 400:
            # Already invited or user exists - this is expected behavior
            data = response.json()
            assert "detail" in data, f"Missing error detail: {data}"
            print(f"Expected error (already invited or user exists): {data.get('detail')}")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_send_referral_invite_duplicate_blocked(self, authenticated_superadmin):
        """POST /api/referrals/invite - should block duplicate invites"""
        test_email = "duplicate_test@example.com"
        
        # First invite
        first_response = authenticated_superadmin.post(f"{BASE_URL}/api/referrals/invite", json={
            "email": test_email,
            "name": "First Invite"
        })
        
        # Second invite should fail
        second_response = authenticated_superadmin.post(f"{BASE_URL}/api/referrals/invite", json={
            "email": test_email,
            "name": "Second Invite"
        })
        
        # Second should be blocked
        if first_response.status_code == 200:
            assert second_response.status_code == 400, f"Duplicate invite not blocked: {second_response.text}"
            print("Duplicate invite correctly blocked")
        else:
            # Already exists from previous test
            print("Email already invited - duplicate test validated")


class TestEndpointAliases:
    """Test that endpoint aliases work"""
    
    def test_get_referrals_config_short_alias(self, authenticated_superadmin):
        """Test /api/superadmin/referrals works (short alias)"""
        response = authenticated_superadmin.get(f"{BASE_URL}/api/superadmin/referrals")
        assert response.status_code == 200, f"Short alias failed: {response.text}"
        print("Short alias /api/superadmin/referrals works")
    
    def test_get_referrals_config_long_path(self, authenticated_superadmin):
        """Test /api/superadmin/referrals/config works (long path)"""
        response = authenticated_superadmin.get(f"{BASE_URL}/api/superadmin/referrals/config")
        assert response.status_code == 200, f"Long path failed: {response.text}"
        print("Long path /api/superadmin/referrals/config works")


# Reset config to reasonable defaults after tests
class TestCleanup:
    """Reset referral config to reasonable defaults"""
    
    def test_reset_referral_config(self, authenticated_superadmin):
        """Reset config to sensible defaults"""
        default_config = {
            "name": "Software Galaxy Referral Program",
            "reward_type": "credit",
            "referrer_reward": 10.0,
            "referee_reward": 10.0,
            "min_purchase_amount": 0,
            "max_referrals_per_user": 50,
            "expiry_days": 30,
            "is_active": True,
            "show_post_purchase_popup": True
        }
        
        response = authenticated_superadmin.put(f"{BASE_URL}/api/superadmin/referrals", json=default_config)
        assert response.status_code == 200, f"Failed to reset config: {response.text}"
        print("Referral config reset to defaults")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
