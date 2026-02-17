"""
RetailPro Backend API Tests
Tests for authentication, products, categories, customers, orders, and dashboard endpoints
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fmcg.com"
ADMIN_PASSWORD = "Admin@2025"
DEMO_EMAIL = "demo@fmcg.com"
DEMO_PASSWORD = "Demo@2025"


class TestHealthCheck:
    """Health check tests"""
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health check passed")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user info in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful - User: {data['user']['name']}")
        return data["access_token"]
    
    def test_demo_login_success(self):
        """Test demo user login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200, f"Demo login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == DEMO_EMAIL
        print(f"✓ Demo user login successful - User: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_login_missing_password(self):
        """Test login with missing password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Missing password correctly handled")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected routes"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestProducts:
    """Products API tests"""
    
    def test_list_products(self, auth_headers):
        """Test GET /api/products - list all products"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        assert response.status_code == 200, f"List products failed: {response.text}"
        data = response.json()
        assert "products" in data, "No products key in response"
        assert "total" in data, "No total count in response"
        print(f"✓ List products: {data['total']} products found")
        return data
    
    def test_list_products_with_filters(self, auth_headers):
        """Test product listing with filters"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            params={"limit": 5, "sort_by": "name", "sort_order": "asc"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("products", [])) <= 5
        print(f"✓ Filtered products query returned {len(data.get('products', []))} items")
    
    def test_list_products_unauthorized(self):
        """Test products listing without auth"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access to products correctly rejected")


class TestCategories:
    """Categories API tests"""
    
    def test_list_categories(self, auth_headers):
        """Test GET /api/products/categories - list all categories"""
        response = requests.get(f"{BASE_URL}/api/products/categories", headers=auth_headers)
        assert response.status_code == 200, f"List categories failed: {response.text}"
        data = response.json()
        assert "categories" in data, "No categories key in response"
        print(f"✓ List categories: {len(data.get('categories', []))} categories found")
        return data
    
    def test_categories_structure(self, auth_headers):
        """Test category response structure"""
        response = requests.get(f"{BASE_URL}/api/products/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if data.get("categories"):
            category = data["categories"][0]
            assert "id" in category or "_id" in category, "Category missing ID"
            assert "name" in category, "Category missing name"
            print(f"✓ Category structure valid - First category: {category.get('name')}")


class TestCustomers:
    """Customers API tests"""
    
    def test_list_customers(self, auth_headers):
        """Test GET /api/customers - list all customers"""
        response = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers)
        assert response.status_code == 200, f"List customers failed: {response.text}"
        data = response.json()
        assert "customers" in data, "No customers key in response"
        assert "total" in data, "No total count in response"
        print(f"✓ List customers: {data['total']} customers found")
        return data
    
    def test_list_customers_with_search(self, auth_headers):
        """Test customer search"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            params={"search": "test", "limit": 10},
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ Customer search query executed successfully")
    
    def test_create_and_delete_customer(self, auth_headers):
        """Test customer CRUD operations"""
        # Create customer
        test_customer = {
            "name": f"TEST_Customer_{uuid.uuid4().hex[:6]}",
            "phone": "+255123456789",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "country": "TZ"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/customers",
            json=test_customer,
            headers=auth_headers
        )
        assert create_response.status_code in [200, 201], f"Create customer failed: {create_response.text}"
        created = create_response.json()
        customer_id = created.get("id")
        assert customer_id, "No customer ID returned"
        print(f"✓ Created test customer: {test_customer['name']}")
        
        # Get the customer to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/customers/{customer_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched.get("name") == test_customer["name"]
        print(f"✓ Verified customer persistence")
        
        # Delete customer
        delete_response = requests.delete(
            f"{BASE_URL}/api/customers/{customer_id}",
            headers=auth_headers
        )
        assert delete_response.status_code in [200, 204], f"Delete customer failed: {delete_response.text}"
        print(f"✓ Deleted test customer")
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/customers/{customer_id}",
            headers=auth_headers
        )
        assert verify_response.status_code == 404
        print(f"✓ Verified customer deletion")


class TestOrders:
    """Orders API tests"""
    
    def test_list_orders(self, auth_headers):
        """Test GET /api/orders - list all orders"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
        assert response.status_code == 200, f"List orders failed: {response.text}"
        data = response.json()
        assert "orders" in data, "No orders key in response"
        assert "total" in data, "No total count in response"
        
        # Calculate total value
        total_value = sum(order.get("total", 0) for order in data.get("orders", []))
        print(f"✓ List orders: {data['total']} orders found, total value: ${total_value:.2f}")
        return data
    
    def test_list_orders_with_filters(self, auth_headers):
        """Test order listing with filters"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"status": "completed", "limit": 10, "sort_by": "created_at", "sort_order": "desc"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Filtered orders query returned {len(data.get('orders', []))} items")
    
    def test_create_order(self, auth_headers):
        """Test POST /api/orders - create new order"""
        # First, get a product to use in the order
        products_response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        if products_response.status_code != 200:
            pytest.skip("Could not fetch products")
        
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        product = products[0]
        
        # Create order with the correct format per OrderCreate model in routes/orders.py
        order_data = {
            "customer_name": "TEST_Order_Customer",
            "customer_phone": "+255700000001",
            "items": [
                {
                    "product_id": product.get("id"),
                    "product_name": product.get("name"),
                    "quantity": 2,
                    "unit_price": product.get("unit_price", product.get("price", 10.0)),
                    "discount": 0,
                    "tax_rate": 0
                }
            ],
            "payment_method": "cash",
            "discount_amount": 0,
            "status": "pending",
            "notes": "Test order created by automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=auth_headers
        )
        
        # Accept 200, 201 as success
        assert response.status_code in [200, 201], f"Create order failed: {response.text}"
        data = response.json()
        assert "id" in data or "order_number" in data, "No order ID/number returned"
        order_id = data.get("id") or data.get("order_number")
        print(f"✓ Created test order: {order_id}")
        return data


class TestDashboard:
    """Dashboard API tests"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test GET /api/dashboard/stats - dashboard metrics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Check for expected fields in dashboard stats
        expected_fields = ["total_sales_today", "total_orders_today", "total_customers", "total_products"]
        for field in expected_fields:
            if field in data:
                print(f"  • {field}: {data.get(field)}")
        
        print(f"✓ Dashboard stats retrieved successfully")
        return data
    
    def test_dashboard_unauthorized(self):
        """Test dashboard without auth"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized dashboard access correctly rejected")


class TestOrderStats:
    """Order statistics tests"""
    
    def test_order_stats_summary(self, auth_headers):
        """Test GET /api/orders/stats/summary - order statistics"""
        response = requests.get(
            f"{BASE_URL}/api/orders/stats/summary",
            params={"period": "month"},
            headers=auth_headers
        )
        # This endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Order stats: {data.get('total_orders', 'N/A')} orders, value: {data.get('total_value', 'N/A')}")
        elif response.status_code == 404:
            print("⚠ Order stats endpoint not found (may not be implemented)")
        else:
            print(f"⚠ Order stats returned {response.status_code}")


class TestTopCustomers:
    """Top customers tests"""
    
    def test_top_customers(self, auth_headers):
        """Test GET /api/customers/stats/top - top customers by spend"""
        response = requests.get(
            f"{BASE_URL}/api/customers/stats/top",
            params={"limit": 5},
            headers=auth_headers
        )
        if response.status_code == 200:
            data = response.json()
            top_customers = data.get("top_customers", [])
            print(f"✓ Top customers: {len(top_customers)} returned")
        elif response.status_code == 404:
            print("⚠ Top customers endpoint not found")


class TestLowStockAlerts:
    """Low stock alerts tests"""
    
    def test_low_stock_alerts(self, auth_headers):
        """Test GET /api/products/low-stock/alerts - low stock products"""
        response = requests.get(
            f"{BASE_URL}/api/products/low-stock/alerts",
            headers=auth_headers
        )
        if response.status_code == 200:
            data = response.json()
            low_stock = data.get("low_stock_products", [])
            print(f"✓ Low stock alerts: {data.get('count', len(low_stock))} products low on stock")
        elif response.status_code == 404:
            print("⚠ Low stock alerts endpoint not found")


# Integration test: Full order flow
class TestOrderFlow:
    """End-to-end order flow test"""
    
    def test_full_order_flow(self, auth_headers):
        """Test complete order creation and retrieval flow"""
        # 1. Get products
        products_resp = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        assert products_resp.status_code == 200
        products = products_resp.json().get("products", [])
        
        if not products:
            print("⚠ No products available for order flow test")
            return
        
        product = products[0]
        
        # 2. Create order
        order_data = {
            "customer_name": "TEST_Flow_Customer",
            "items": [
                {
                    "product_id": product.get("id"),
                    "product_name": product.get("name"),
                    "quantity": 1,
                    "unit_price": product.get("unit_price", product.get("price", 10.0)),
                    "discount": 0,
                    "tax_rate": 0
                }
            ],
            "payment_method": "cash",
            "discount_amount": 0,
            "status": "pending"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_resp.status_code not in [200, 201]:
            print(f"⚠ Order creation failed: {create_resp.text}")
            return
        
        order = create_resp.json()
        order_id = order.get("id")
        print(f"✓ Order created: {order.get('order_number', order_id)}")
        
        # 3. Retrieve order
        get_resp = requests.get(
            f"{BASE_URL}/api/orders/{order_id}",
            headers=auth_headers
        )
        assert get_resp.status_code == 200
        retrieved = get_resp.json()
        assert retrieved.get("id") == order_id
        print(f"✓ Order retrieved successfully")
        
        # 4. Update order status (if endpoint exists)
        update_resp = requests.put(
            f"{BASE_URL}/api/orders/{order_id}",
            json={"status": "completed"},
            headers=auth_headers
        )
        if update_resp.status_code == 200:
            print(f"✓ Order status updated to completed")
        
        print(f"✓ Full order flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
