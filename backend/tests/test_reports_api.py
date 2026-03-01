"""
Test suite for Reports API - Testing date filter parameters
and Offline Mode related features

Tests:
- Reports summary API with various date filters
- Auth endpoints
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fmcg.com"
ADMIN_PASSWORD = "Admin@2025"
DEMO_EMAIL = "demo@fmcg.com" 
DEMO_PASSWORD = "Demo@2025"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
    
    def test_demo_login_success(self):
        """Test demo login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == DEMO_EMAIL
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


class TestReportsAPI:
    """Reports API tests - Testing date filter parameters"""
    
    def test_reports_summary_default(self, admin_token):
        """Test reports summary with default parameters (today)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/reports/summary", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "period" in data
        assert "date_range" in data
        assert "total_revenue" in data
        assert "total_orders" in data
        assert "total_items_sold" in data
        assert "avg_order_value" in data
        assert "new_customers" in data
        assert "top_selling_products" in data
        assert "sales_by_category" in data
        assert "sales_by_staff" in data
        assert "payment_method_breakdown" in data
        
        # Default should be "today"
        assert data["period"] == "today"
    
    def test_reports_summary_with_start_end_dates(self, admin_token):
        """Test reports summary with explicit start_date and end_date"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Use date range from Jan 1 to Jan 31
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/summary?start_date=2026-01-01&end_date=2026-01-31",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify date range was applied
        assert "date_range" in data
        assert "2026-01-01" in data["date_range"]["start"]
        assert "2026-01-31" in data["date_range"]["end"]
    
    def test_reports_summary_single_day(self, admin_token):
        """Test reports summary for a single day"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get today's date
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/summary?start_date={today}&end_date={today}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify single day range
        assert "date_range" in data
        assert today in data["date_range"]["start"]
    
    def test_reports_summary_week_period(self, admin_token):
        """Test reports summary for week period using date range"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        today = datetime.now()
        week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
        today_str = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/summary?start_date={week_start}&end_date={today_str}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response has required fields
        assert "total_revenue" in data
        assert isinstance(data["total_revenue"], (int, float))
    
    def test_reports_summary_month_period(self, admin_token):
        """Test reports summary for month period using date range"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        today = datetime.now()
        month_start = today.replace(day=1).strftime("%Y-%m-%d")
        today_str = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/summary?start_date={month_start}&end_date={today_str}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response has payment breakdown
        assert "payment_method_breakdown" in data
        assert "cash" in data["payment_method_breakdown"]
    
    def test_reports_summary_quarter_period(self, admin_token):
        """Test reports summary for quarter period using date range"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        today = datetime.now()
        quarter_start_month = (today.month - 1) // 3 * 3 + 1
        quarter_start = today.replace(month=quarter_start_month, day=1).strftime("%Y-%m-%d")
        today_str = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/summary?start_date={quarter_start}&end_date={today_str}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response has top products
        assert "top_selling_products" in data
        assert isinstance(data["top_selling_products"], list)
    
    def test_reports_summary_year_period(self, admin_token):
        """Test reports summary for year period using date range"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        today = datetime.now()
        year_start = today.replace(month=1, day=1).strftime("%Y-%m-%d")
        today_str = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/summary?start_date={year_start}&end_date={today_str}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "sales_by_category" in data
        assert "sales_by_staff" in data
    
    def test_reports_summary_unauthorized(self):
        """Test reports summary without authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/summary")
        
        # Should return 403 (Forbidden) or 401 (Unauthorized)
        assert response.status_code in [401, 403]


class TestProductsAPI:
    """Products API tests for offline caching support"""
    
    def test_get_products(self, admin_token):
        """Test getting products list (used for offline caching)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/products?limit=100", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # API should return items array or direct array
        if isinstance(data, dict):
            assert "items" in data or "products" in data or isinstance(data.get("data"), list)


class TestCustomersAPI:
    """Customers API tests for offline caching support"""
    
    def test_get_customers(self, admin_token):
        """Test getting customers list (used for offline caching)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/customers?limit=100", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


class TestCategoriesAPI:
    """Categories API tests for offline caching support"""
    
    def test_get_categories(self, admin_token):
        """Test getting categories list (used for offline caching)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/categories", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
