"""
Backend API tests for auth/me endpoint and business settings
Tests: Session persistence fix, SKU settings for Bulk Import
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://inventory-alignment.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fmcg.com"
ADMIN_PASSWORD = "Admin@2025"


class TestAuthEndpoints:
    """Test authentication endpoints including /api/auth/me"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_login_success(self):
        """Test successful login returns correct role"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin", f"Expected role 'admin', got '{data['user']['role']}'"
        assert data["user"]["is_active"] == True
    
    def test_auth_me_returns_correct_role(self, admin_token):
        """Test /api/auth/me returns correct user role from database (not cached)"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin", f"Session persistence issue: Expected role 'admin', got '{data['role']}'"
        assert "business_id" in data
        assert data["is_active"] == True
        print(f"✓ /api/auth/me correctly returns role: {data['role']}")
    
    def test_auth_me_unauthorized_without_token(self):
        """Test /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
    
    def test_auth_me_invalid_token(self):
        """Test /api/auth/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_123"}
        )
        assert response.status_code == 401


class TestBusinessSettings:
    """Test business settings API - SKU settings for Bulk Import"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_business_settings(self, admin_token):
        """Test GET /api/business/settings returns SKU settings"""
        response = requests.get(
            f"{BASE_URL}/api/business/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify SKU settings are present (needed for Bulk Import)
        assert "sku_format" in data
        assert "sku_prefix" in data
        assert "sku_digits" in data
        assert "sku_separator" in data
        assert "auto_generate_sku" in data
        
        print(f"✓ SKU Settings: format={data['sku_format']}, prefix={data['sku_prefix']}, digits={data['sku_digits']}")
    
    def test_update_sku_settings(self, admin_token):
        """Test updating SKU settings persists correctly"""
        # Update settings
        update_data = {
            "sku_format": "prefix_number",
            "sku_prefix": "TEST",
            "sku_start_number": 100,
            "sku_digits": 5,
            "sku_separator": "-",
            "auto_generate_sku": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/business/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_data
        )
        assert response.status_code == 200
        
        # Verify by fetching again
        get_response = requests.get(
            f"{BASE_URL}/api/business/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["sku_prefix"] == "TEST"
        assert fetched["sku_start_number"] == 100
        assert fetched["sku_digits"] == 5
        
        # Restore original settings
        restore_data = {
            "sku_format": "prefix_number",
            "sku_prefix": "SKU",
            "sku_start_number": 1,
            "sku_digits": 4,
            "sku_separator": "-",
            "auto_generate_sku": True
        }
        requests.put(
            f"{BASE_URL}/api/business/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=restore_data
        )
        
        print("✓ SKU settings update and retrieval working correctly")


class TestCategoriesForBulkImport:
    """Test categories API - needed for Bulk Product Import"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_categories(self, admin_token):
        """Test GET /api/categories returns list of categories"""
        response = requests.get(
            f"{BASE_URL}/api/categories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            cat = data[0]
            assert "id" in cat
            assert "name" in cat
            print(f"✓ Found {len(data)} categories")
        else:
            print("✓ Categories endpoint works (empty list)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
