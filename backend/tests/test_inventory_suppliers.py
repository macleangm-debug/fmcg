"""
Inventory Suppliers CRUD API Tests
Tests for Sprint 1: Suppliers management endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fmcg.com"
TEST_PASSWORD = "Admin@2025"


class TestSuppliersAPI:
    """Tests for Inventory Suppliers CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login and get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store created supplier IDs for cleanup
        self.created_supplier_ids = []
        
        yield
        
        # Cleanup: Delete created test suppliers
        for supplier_id in self.created_supplier_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/inventory/suppliers/{supplier_id}")
            except:
                pass
    
    # ===== GET /api/inventory/suppliers =====
    
    def test_get_suppliers_list(self):
        """GET /api/inventory/suppliers - should return list of suppliers"""
        response = self.session.get(f"{BASE_URL}/api/inventory/suppliers")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertion - should be a list
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET suppliers returned {len(data)} suppliers")
        
        # If suppliers exist, verify structure
        if len(data) > 0:
            supplier = data[0]
            assert "id" in supplier, "Supplier should have id"
            assert "name" in supplier, "Supplier should have name"
            assert "status" in supplier, "Supplier should have status"
            print(f"✓ First supplier: {supplier.get('name')}")
    
    def test_get_suppliers_with_search(self):
        """GET /api/inventory/suppliers?search=abc - should filter by search term"""
        response = self.session.get(
            f"{BASE_URL}/api/inventory/suppliers",
            params={"search": "ABC"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search 'ABC' returned {len(data)} suppliers")
    
    def test_get_suppliers_with_status_filter(self):
        """GET /api/inventory/suppliers?status=active - should filter by status"""
        response = self.session.get(
            f"{BASE_URL}/api/inventory/suppliers",
            params={"status": "active"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned suppliers should be active
        for supplier in data:
            assert supplier.get("status") == "active", f"Expected active, got {supplier.get('status')}"
        
        print(f"✓ Status filter returned {len(data)} active suppliers")
    
    # ===== POST /api/inventory/suppliers =====
    
    def test_create_supplier_success(self):
        """POST /api/inventory/suppliers - should create new supplier"""
        unique_name = f"TEST_Supplier_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "name": unique_name,
            "phone": "+255712345678",
            "email": "test@supplier.com",
            "contact_person": "John Doe",
            "address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "payment_terms": "Net 30",
            "tax_id": "TIN-123456",
            "notes": "Test supplier"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json=payload
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Response should have id"
        assert data["name"] == unique_name, f"Name mismatch: {data['name']} != {unique_name}"
        assert data["phone"] == payload["phone"]
        assert data["email"] == payload["email"]
        assert data["contact_person"] == payload["contact_person"]
        assert data["status"] == "active", "New supplier should be active"
        
        self.created_supplier_ids.append(data["id"])
        print(f"✓ Created supplier: {data['name']} (ID: {data['id']})")
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == unique_name
        print(f"✓ Verified supplier persisted in database")
    
    def test_create_supplier_minimal(self):
        """POST /api/inventory/suppliers - create with only required field (name)"""
        unique_name = f"TEST_MinimalSupplier_{uuid.uuid4().hex[:8]}"
        
        payload = {"name": unique_name}
        
        response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == unique_name
        assert data["status"] == "active"
        
        self.created_supplier_ids.append(data["id"])
        print(f"✓ Created minimal supplier: {data['name']}")
    
    def test_create_supplier_duplicate_name_fails(self):
        """POST /api/inventory/suppliers - duplicate name should fail"""
        unique_name = f"TEST_DuplicateTest_{uuid.uuid4().hex[:8]}"
        
        # Create first supplier
        payload = {"name": unique_name}
        response1 = self.session.post(f"{BASE_URL}/api/inventory/suppliers", json=payload)
        assert response1.status_code == 200
        self.created_supplier_ids.append(response1.json()["id"])
        
        # Try to create duplicate
        response2 = self.session.post(f"{BASE_URL}/api/inventory/suppliers", json=payload)
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        
        error_detail = response2.json().get("detail", "")
        assert "already exists" in error_detail.lower(), f"Error should mention duplicate: {error_detail}"
        print(f"✓ Duplicate supplier name correctly rejected")
    
    def test_create_supplier_missing_name_fails(self):
        """POST /api/inventory/suppliers - missing name should fail"""
        payload = {"phone": "+255712345678"}  # Missing required 'name'
        
        response = self.session.post(f"{BASE_URL}/api/inventory/suppliers", json=payload)
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        print(f"✓ Missing name correctly rejected with 422")
    
    # ===== GET /api/inventory/suppliers/{id} =====
    
    def test_get_supplier_by_id(self):
        """GET /api/inventory/suppliers/{id} - should return single supplier"""
        # First create a supplier
        unique_name = f"TEST_GetById_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json={"name": unique_name, "phone": "+255711111111"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_supplier_ids.append(created["id"])
        
        # Get by ID
        response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{created['id']}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created["id"]
        assert data["name"] == unique_name
        assert "items_count" in data
        print(f"✓ GET supplier by ID returned: {data['name']}")
    
    def test_get_supplier_invalid_id_fails(self):
        """GET /api/inventory/suppliers/{id} - invalid ID should return 404 or 400"""
        response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/invalid-id-123")
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print(f"✓ Invalid supplier ID correctly rejected")
    
    def test_get_supplier_nonexistent_id_fails(self):
        """GET /api/inventory/suppliers/{id} - non-existent ID should return 404"""
        fake_id = "000000000000000000000000"  # Valid ObjectId format but doesn't exist
        response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent supplier ID correctly returned 404")
    
    # ===== PUT /api/inventory/suppliers/{id} =====
    
    def test_update_supplier_success(self):
        """PUT /api/inventory/suppliers/{id} - should update supplier"""
        # Create supplier first
        unique_name = f"TEST_UpdateSupplier_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json={"name": unique_name, "phone": "+255700000000"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_supplier_ids.append(created["id"])
        
        # Update supplier
        update_payload = {
            "name": f"UPDATED_{unique_name}",
            "phone": "+255799999999",
            "email": "updated@test.com",
            "contact_person": "Jane Smith"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/inventory/suppliers/{created['id']}",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == update_payload["name"]
        assert data["phone"] == update_payload["phone"]
        assert data["email"] == update_payload["email"]
        print(f"✓ Updated supplier: {data['name']}")
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{created['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == update_payload["name"]
        assert fetched["phone"] == update_payload["phone"]
        print(f"✓ Verified update persisted in database")
    
    def test_update_supplier_status(self):
        """PUT /api/inventory/suppliers/{id} - should update status to inactive"""
        # Create supplier
        unique_name = f"TEST_StatusUpdate_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json={"name": unique_name}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_supplier_ids.append(created["id"])
        
        # Update status to inactive
        response = self.session.put(
            f"{BASE_URL}/api/inventory/suppliers/{created['id']}",
            json={"status": "inactive"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "inactive"
        print(f"✓ Updated supplier status to inactive")
    
    def test_update_supplier_invalid_id_fails(self):
        """PUT /api/inventory/suppliers/{id} - invalid ID should fail"""
        response = self.session.put(
            f"{BASE_URL}/api/inventory/suppliers/invalid-id",
            json={"name": "Test"}
        )
        assert response.status_code in [400, 404]
        print(f"✓ Update with invalid ID correctly rejected")
    
    # ===== DELETE /api/inventory/suppliers/{id} =====
    
    def test_delete_supplier_success(self):
        """DELETE /api/inventory/suppliers/{id} - should delete supplier"""
        # Create supplier
        unique_name = f"TEST_DeleteSupplier_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json={"name": unique_name}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        supplier_id = created["id"]
        
        # Delete supplier
        response = self.session.delete(f"{BASE_URL}/api/inventory/suppliers/{supplier_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Deleted supplier: {data.get('message')}")
        
        # Verify deletion - GET should return 404
        get_response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{supplier_id}")
        assert get_response.status_code == 404, f"Expected 404 after delete, got {get_response.status_code}"
        print(f"✓ Verified supplier no longer exists")
    
    def test_delete_supplier_invalid_id_fails(self):
        """DELETE /api/inventory/suppliers/{id} - invalid ID should fail"""
        response = self.session.delete(f"{BASE_URL}/api/inventory/suppliers/invalid-id")
        assert response.status_code in [400, 404]
        print(f"✓ Delete with invalid ID correctly rejected")
    
    # ===== GET /api/inventory/suppliers/{id}/items =====
    
    def test_get_supplier_items(self):
        """GET /api/inventory/suppliers/{id}/items - should return supplier's items"""
        # First create a supplier
        unique_name = f"TEST_SupplierItems_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json={"name": unique_name}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_supplier_ids.append(created["id"])
        
        # Get items for this supplier
        response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{created['id']}/items")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET supplier items returned {len(data)} items")


class TestSuppliersIntegration:
    """Integration tests for suppliers with inventory items"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        self.created_supplier_ids = []
        self.created_item_ids = []
        
        yield
        
        # Cleanup
        for item_id in self.created_item_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/inventory/items/{item_id}")
            except:
                pass
        
        for supplier_id in self.created_supplier_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/inventory/suppliers/{supplier_id}")
            except:
                pass
    
    def test_full_supplier_crud_flow(self):
        """End-to-end test: Create -> Read -> Update -> Delete supplier"""
        unique_name = f"TEST_FullCRUD_{uuid.uuid4().hex[:8]}"
        
        # CREATE
        create_payload = {
            "name": unique_name,
            "phone": "+255712000000",
            "email": "fullcrud@test.com"
        }
        create_response = self.session.post(
            f"{BASE_URL}/api/inventory/suppliers",
            json=create_payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        supplier_id = created["id"]
        print(f"✓ CREATE: {created['name']}")
        
        # READ
        read_response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{supplier_id}")
        assert read_response.status_code == 200
        read_data = read_response.json()
        assert read_data["name"] == unique_name
        print(f"✓ READ: {read_data['name']}")
        
        # UPDATE
        update_response = self.session.put(
            f"{BASE_URL}/api/inventory/suppliers/{supplier_id}",
            json={"name": f"UPDATED_{unique_name}", "status": "inactive"}
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"].startswith("UPDATED_")
        assert updated["status"] == "inactive"
        print(f"✓ UPDATE: {updated['name']}")
        
        # DELETE
        delete_response = self.session.delete(f"{BASE_URL}/api/inventory/suppliers/{supplier_id}")
        assert delete_response.status_code == 200
        print(f"✓ DELETE: Supplier removed")
        
        # VERIFY DELETION
        verify_response = self.session.get(f"{BASE_URL}/api/inventory/suppliers/{supplier_id}")
        assert verify_response.status_code == 404
        print(f"✓ VERIFY: Supplier no longer exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
