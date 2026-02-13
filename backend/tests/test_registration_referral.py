"""
Backend tests for user registration with referral/promo code system
Tests:
1. POST /api/auth/register - User registration without referral code
2. POST /api/auth/register - User registration WITH valid referral code (should credit both users)
3. GET /api/referrals/validate-code/{code} - Validate user referral code returns correct type and benefits
4. GET /api/referrals/validate-code/{code} - Invalid code returns valid=false
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://unitxt-bulk-sms.preview.emergentagent.com')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@softwaregalaxy.com"
SUPERADMIN_PASSWORD = "Test@123"
VALID_REFERRAL_CODE = "O524BP4O"


class TestRegistrationWithoutReferralCode:
    """Test user registration without referral code"""
    
    def test_register_user_without_referral_code(self):
        """Register a new user without referral code"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_noreferral_{unique_id}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": f"Test User {unique_id}",
                "email": test_email,
                "password": "TestPassword123!",
                "role": "sales_staff"
            }
        )
        
        print(f"Register without referral response status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == test_email
        assert user["role"] == "sales_staff"
        assert user["is_active"] == True
        
        print(f"✓ User registered successfully without referral code: {test_email}")
        
    def test_register_user_duplicate_email_fails(self):
        """Attempt to register with an existing email should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Test User",
                "email": SUPERADMIN_EMAIL,  # This email should exist
                "password": "TestPassword123!",
                "role": "sales_staff"
            }
        )
        
        print(f"Duplicate email registration response: {response.status_code}")
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        
        # Check error message
        data = response.json()
        assert "already registered" in data.get("detail", "").lower(), f"Expected 'already registered' in error: {data}"
        
        print("✓ Duplicate email registration correctly rejected")


class TestRegistrationWithReferralCode:
    """Test user registration with valid referral code"""
    
    def test_register_user_with_valid_referral_code(self):
        """Register a new user with a valid referral code"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_withreferral_{unique_id}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": f"Test Referred User {unique_id}",
                "email": test_email,
                "password": "TestPassword123!",
                "role": "sales_staff",
                "referral_code": VALID_REFERRAL_CODE
            }
        )
        
        print(f"Register with referral code response status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == test_email
        assert user["is_active"] == True
        
        print(f"✓ User registered successfully with referral code: {test_email}")
        
        # Now verify the new user can login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": "TestPassword123!"
            }
        )
        
        assert login_response.status_code == 200, f"Login after registration failed: {login_response.status_code}"
        print(f"✓ Newly registered user can login successfully")
        
        return data["access_token"]


class TestValidateCodeEndpoint:
    """Test the validate-code endpoint for both referral and promo codes"""
    
    def test_validate_valid_referral_code(self):
        """Validate a known valid referral code"""
        response = requests.get(f"{BASE_URL}/api/referrals/validate-code/{VALID_REFERRAL_CODE}")
        
        print(f"Validate valid referral code response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert data["valid"] == True, f"Expected valid=True, got {data.get('valid')}"
        assert data["code_type"] == "referral", f"Expected code_type='referral', got {data.get('code_type')}"
        assert "benefit" in data, "Response should contain benefit object"
        assert data["benefit"]["type"] == "credit", f"Expected benefit type='credit', got {data['benefit'].get('type')}"
        assert "message" in data, "Response should contain message"
        
        print(f"✓ Valid referral code correctly validated")
        print(f"  - Code type: {data['code_type']}")
        print(f"  - Benefit: {data['benefit']}")
        print(f"  - Message: {data['message']}")
        
    def test_validate_invalid_code(self):
        """Validate an invalid code should return valid=false"""
        invalid_code = "INVALIDCODE123"
        
        response = requests.get(f"{BASE_URL}/api/referrals/validate-code/{invalid_code}")
        
        print(f"Validate invalid code response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert data["valid"] == False, f"Expected valid=False for invalid code, got {data.get('valid')}"
        assert "message" in data, "Response should contain message"
        
        print(f"✓ Invalid code correctly returns valid=false")
        print(f"  - Message: {data['message']}")
        
    def test_validate_code_lowercase(self):
        """Test that lowercase referral code is also validated (case-insensitive)"""
        lowercase_code = VALID_REFERRAL_CODE.lower()
        
        response = requests.get(f"{BASE_URL}/api/referrals/validate-code/{lowercase_code}")
        
        print(f"Validate lowercase code response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert data["valid"] == True, f"Expected valid=True for lowercase code, got {data.get('valid')}"
        
        print(f"✓ Lowercase referral code correctly validated (case-insensitive)")


class TestAuthLogin:
    """Test login functionality"""
    
    def test_superadmin_login(self):
        """Login with superadmin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": SUPERADMIN_EMAIL,
                "password": SUPERADMIN_PASSWORD
            }
        )
        
        print(f"Superadmin login response status: {response.status_code}")
        
        # Status assertion
        assert response.status_code == 200, f"Superadmin login failed: {response.status_code} - {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == SUPERADMIN_EMAIL
        assert data["user"]["role"] == "superadmin"
        
        print(f"✓ Superadmin login successful")
        return data["access_token"]
        
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        
        print(f"Invalid login response status: {response.status_code}")
        
        # Should fail with 401
        assert response.status_code == 401, f"Expected 401 for invalid login, got {response.status_code}"
        
        print(f"✓ Invalid login correctly rejected")


class TestReferralMyReferralEndpoint:
    """Test authenticated referral endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for superadmin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": SUPERADMIN_EMAIL,
                "password": SUPERADMIN_PASSWORD
            }
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get auth token")
    
    def test_get_my_referral_info(self, auth_token):
        """Get current user's referral info"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/my-referral",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        print(f"My referral info response status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert "referral_code" in data, "Response should contain referral_code"
        assert "referral_link" in data, "Response should contain referral_link"
        assert "stats" in data, "Response should contain stats"
        assert "rewards" in data, "Response should contain rewards"
        
        print(f"✓ My referral info retrieved successfully")
        print(f"  - Referral code: {data['referral_code']}")
        print(f"  - Stats: {data['stats']}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
