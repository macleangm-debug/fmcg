"""
Product CRUD API Tests for RetailPro Products Page
Testing: Add/Edit/Delete products with enhanced fields (cost_price, SKU, min_stock, unit, item_type)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fmcg.com"
TEST_PASSWORD = "Admin@2025"


class TestProductCRUD:
    """Test Product CRUD operations - Add, Edit, Delete"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
    
    def test_01_get_categories(self):
        """Get categories to use for product creation"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        if len(categories) > 0:
            self.category_id = categories[0]["id"]
            print(f"Found category: {categories[0]['name']} (ID: {self.category_id})")
        else:
            # Create a default category if none exist
            create_resp = requests.post(f"{BASE_URL}/api/categories", 
                headers=self.headers,
                json={"name": "TEST_Default_Category", "description": "Test category"}
            )
            assert create_resp.status_code in [200, 201]
            self.category_id = create_resp.json()["id"]
            print(f"Created test category: {self.category_id}")
    
    def test_02_get_products_list(self):
        """GET /api/products - Get list of products"""
        response = requests.get(f"{BASE_URL}/api/products", headers=self.headers)
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"Found {len(products)} products")
    
    def test_03_create_product_basic(self):
        """POST /api/products - Create product with basic fields"""
        # First get a category
        cat_resp = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        categories = cat_resp.json()
        category_id = categories[0]["id"] if categories else None
        
        # Create category if needed
        if not category_id:
            create_cat = requests.post(f"{BASE_URL}/api/categories",
                headers=self.headers,
                json={"name": "TEST_Products_Category"}
            )
            category_id = create_cat.json()["id"]
        
        product_data = {
            "name": f"TEST_Product_Basic_{datetime.now().strftime('%H%M%S')}",
            "price": 1500,
            "stock_quantity": 50,
            "category_id": category_id,
            "tax_rate": 0,
            "sku": f"TEST-SKU-{datetime.now().strftime('%H%M%S')}"
        }
        
        response = requests.post(f"{BASE_URL}/api/products", 
            headers=self.headers,
            json=product_data
        )
        assert response.status_code in [200, 201], f"Create product failed: {response.text}"
        
        created = response.json()
        assert created["name"] == product_data["name"]
        assert created["price"] == product_data["price"]
        assert created["stock_quantity"] == product_data["stock_quantity"]
        print(f"Created product: {created['name']} (ID: {created['id']})")
        
        # Store for later tests
        self.__class__.created_product_id = created["id"]
        self.__class__.created_product_name = created["name"]
    
    def test_04_create_product_all_fields(self):
        """POST /api/products - Create product with all enhanced fields"""
        cat_resp = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        categories = cat_resp.json()
        category_id = categories[0]["id"] if categories else "default"
        
        product_data = {
            "name": f"TEST_Product_Full_{datetime.now().strftime('%H%M%S')}",
            "description": "Test product with all fields",
            "price": 2500,
            "cost_price": 1800,  # Enhanced field
            "stock_quantity": 100,
            "low_stock_threshold": 20,  # min_stock equivalent
            "category_id": category_id,
            "tax_rate": 0,
            "sku": f"TEST-FULL-{datetime.now().strftime('%H%M%S')}",  # Enhanced field
            "unit_of_measure": "pcs",  # Enhanced field - unit
            "track_stock": True,
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/products",
            headers=self.headers,
            json=product_data
        )
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        
        created = response.json()
        assert created["name"] == product_data["name"]
        assert created["price"] == product_data["price"]
        assert created.get("cost_price") == product_data["cost_price"]
        assert created.get("sku") == product_data["sku"]
        print(f"Created full product: {created['name']} with cost_price={created.get('cost_price')}, sku={created.get('sku')}")
        
        self.__class__.full_product_id = created["id"]
    
    def test_05_update_product_price(self):
        """PUT /api/products/{id} - Update product price"""
        # Ensure we have a product to update
        if not hasattr(self.__class__, 'created_product_id'):
            pytest.skip("No product created to update")
        
        product_id = self.__class__.created_product_id
        
        update_data = {
            "price": 1750,
            "cost_price": 1200
        }
        
        response = requests.put(f"{BASE_URL}/api/products/{product_id}",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated = response.json()
        assert updated["price"] == 1750
        assert updated.get("cost_price") == 1200
        print(f"Updated product price to {updated['price']}, cost_price to {updated.get('cost_price')}")
        
        # Verify persistence with GET
        get_resp = requests.get(f"{BASE_URL}/api/products", headers=self.headers)
        products = get_resp.json()
        found = next((p for p in products if p["id"] == product_id), None)
        assert found is not None, "Updated product not found in list"
        assert found["price"] == 1750
        print("Verified price update persisted in database")
    
    def test_06_update_product_stock(self):
        """PUT /api/products/{id} - Update stock quantity"""
        if not hasattr(self.__class__, 'created_product_id'):
            pytest.skip("No product created to update")
        
        product_id = self.__class__.created_product_id
        
        update_data = {
            "stock_quantity": 75,
            "low_stock_threshold": 15
        }
        
        response = requests.put(f"{BASE_URL}/api/products/{product_id}",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated = response.json()
        assert updated["stock_quantity"] == 75
        assert updated.get("low_stock_threshold") == 15
        print(f"Updated stock to {updated['stock_quantity']}, min_stock to {updated.get('low_stock_threshold')}")
    
    def test_07_update_product_all_fields(self):
        """PUT /api/products/{id} - Update all enhanced fields"""
        if not hasattr(self.__class__, 'full_product_id'):
            pytest.skip("No full product created to update")
        
        product_id = self.__class__.full_product_id
        
        update_data = {
            "name": "TEST_Updated_Product_Full",
            "price": 3000,
            "cost_price": 2100,
            "stock_quantity": 150,
            "low_stock_threshold": 25,
            "sku": "TEST-UPDATED-SKU",
            "unit_of_measure": "box"
        }
        
        response = requests.put(f"{BASE_URL}/api/products/{product_id}",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated = response.json()
        assert updated["name"] == update_data["name"]
        assert updated["price"] == update_data["price"]
        assert updated.get("cost_price") == update_data["cost_price"]
        assert updated.get("sku") == update_data["sku"]
        print(f"Updated all fields successfully: name={updated['name']}, price={updated['price']}")
    
    def test_08_update_nonexistent_product(self):
        """PUT /api/products/{id} - Update non-existent product returns 404"""
        fake_id = "000000000000000000000000"
        
        response = requests.put(f"{BASE_URL}/api/products/{fake_id}",
            headers=self.headers,
            json={"price": 1000}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent product")
    
    def test_09_delete_product(self):
        """DELETE /api/products/{id} - Delete product"""
        if not hasattr(self.__class__, 'created_product_id'):
            pytest.skip("No product created to delete")
        
        product_id = self.__class__.created_product_id
        
        response = requests.delete(f"{BASE_URL}/api/products/{product_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        result = response.json()
        assert result.get("message") == "Product deleted successfully"
        print(f"Deleted product {product_id}")
        
        # Verify product is gone
        get_resp = requests.get(f"{BASE_URL}/api/products", headers=self.headers)
        products = get_resp.json()
        found = next((p for p in products if p["id"] == product_id), None)
        assert found is None, "Deleted product should not be in list"
        print("Verified product is removed from database")
    
    def test_10_delete_full_product(self):
        """DELETE /api/products/{id} - Delete full product"""
        if not hasattr(self.__class__, 'full_product_id'):
            pytest.skip("No full product to delete")
        
        product_id = self.__class__.full_product_id
        
        response = requests.delete(f"{BASE_URL}/api/products/{product_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"Deleted full product {product_id}")
    
    def test_11_delete_nonexistent_product(self):
        """DELETE /api/products/{id} - Delete non-existent product returns 404"""
        fake_id = "000000000000000000000000"
        
        response = requests.delete(f"{BASE_URL}/api/products/{fake_id}",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent product")


class TestProductCRUDIntegration:
    """Full CRUD integration test - Create -> Read -> Update -> Delete -> Verify"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
    
    def test_full_crud_flow(self):
        """Complete CRUD flow test"""
        # 1. Get category
        cat_resp = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        categories = cat_resp.json()
        category_id = categories[0]["id"] if categories else None
        
        if not category_id:
            create_cat = requests.post(f"{BASE_URL}/api/categories",
                headers=self.headers,
                json={"name": f"TEST_CRUD_Category_{datetime.now().strftime('%H%M%S')}"}
            )
            category_id = create_cat.json()["id"]
        
        # 2. CREATE
        product_data = {
            "name": f"TEST_CRUD_Product_{datetime.now().strftime('%H%M%S')}",
            "price": 5000,
            "cost_price": 3500,
            "stock_quantity": 100,
            "low_stock_threshold": 10,
            "category_id": category_id,
            "tax_rate": 0,
            "sku": f"CRUD-{datetime.now().strftime('%H%M%S')}",
            "unit_of_measure": "pcs"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/products",
            headers=self.headers,
            json=product_data
        )
        assert create_resp.status_code in [200, 201], f"Create failed: {create_resp.text}"
        created = create_resp.json()
        product_id = created["id"]
        print(f"✓ CREATE: Product {created['name']} (ID: {product_id})")
        
        # 3. READ - Verify creation
        list_resp = requests.get(f"{BASE_URL}/api/products", headers=self.headers)
        assert list_resp.status_code == 200
        products = list_resp.json()
        found = next((p for p in products if p["id"] == product_id), None)
        assert found is not None, "Created product not in list"
        assert found["name"] == product_data["name"]
        assert found["price"] == product_data["price"]
        print(f"✓ READ: Product found in list with correct data")
        
        # 4. UPDATE
        update_data = {
            "name": "TEST_CRUD_Product_UPDATED",
            "price": 6000,
            "cost_price": 4200,
            "stock_quantity": 80
        }
        update_resp = requests.put(f"{BASE_URL}/api/products/{product_id}",
            headers=self.headers,
            json=update_data
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["name"] == update_data["name"]
        assert updated["price"] == update_data["price"]
        print(f"✓ UPDATE: Price changed to {updated['price']}, name to {updated['name']}")
        
        # 5. READ - Verify update persistence
        list_resp2 = requests.get(f"{BASE_URL}/api/products", headers=self.headers)
        products2 = list_resp2.json()
        found2 = next((p for p in products2 if p["id"] == product_id), None)
        assert found2 is not None
        assert found2["price"] == 6000
        assert found2["name"] == "TEST_CRUD_Product_UPDATED"
        print(f"✓ READ: Update persisted in database")
        
        # 6. DELETE
        delete_resp = requests.delete(f"{BASE_URL}/api/products/{product_id}",
            headers=self.headers
        )
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print(f"✓ DELETE: Product deleted")
        
        # 7. VERIFY DELETION
        list_resp3 = requests.get(f"{BASE_URL}/api/products", headers=self.headers)
        products3 = list_resp3.json()
        found3 = next((p for p in products3 if p["id"] == product_id), None)
        assert found3 is None, "Deleted product should not be in list"
        print(f"✓ VERIFY: Product no longer in database")
        
        print("\n✓✓✓ Full CRUD flow completed successfully! ✓✓✓")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
