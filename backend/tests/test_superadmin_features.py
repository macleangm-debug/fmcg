"""
Test SuperAdmin APIs - Team Management, Approvals, Users, Activity
Tests for: /api/superadmin/team, /api/superadmin/approvals, /api/superadmin/users, /api/superadmin/activity/recent
Also includes Merchant Onboarding API tests for /api/merchant-onboarding/*
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://retailpro-staging.preview.emergentagent.com')


class TestSuperAdminTeamManagement:
    """Tests for /api/superadmin/team endpoints"""
    
    def test_get_team_members(self):
        """GET /api/superadmin/team - List all team members"""
        response = requests.get(f"{BASE_URL}/api/superadmin/team")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "members" in data, "Response should contain 'members' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["members"], list), "Members should be a list"
        print(f"✓ GET /api/superadmin/team - Found {data['total']} team members")
    
    def test_invite_team_member(self):
        """POST /api/superadmin/team/invite - Invite new team member"""
        unique_email = f"test_team_{int(time.time())}@example.com"
        payload = {
            "name": "TEST_Team Member",
            "email": unique_email,
            "role": "sales",
            "assigned_products": ["retailpro", "kwikpay"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/superadmin/team/invite",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain member ID"
        assert "member" in data, "Response should contain member details"
        assert data["member"]["name"] == payload["name"]
        assert data["member"]["email"] == payload["email"]
        assert data["member"]["role"] == payload["role"]
        assert data["member"]["status"] == "invited"
        
        # Store ID for cleanup
        self.created_member_id = data["id"]
        print(f"✓ POST /api/superadmin/team/invite - Created member with ID: {data['id']}")
        return data["id"]
    
    def test_invite_duplicate_email_fails(self):
        """POST /api/superadmin/team/invite - Duplicate email should fail"""
        # First create a member
        unique_email = f"test_dup_{int(time.time())}@example.com"
        payload = {
            "name": "TEST_Duplicate Test",
            "email": unique_email,
            "role": "support",
            "assigned_products": []
        }
        
        response1 = requests.post(f"{BASE_URL}/api/superadmin/team/invite", json=payload)
        assert response1.status_code == 200
        member_id = response1.json()["id"]
        
        # Try to create again with same email
        response2 = requests.post(f"{BASE_URL}/api/superadmin/team/invite", json=payload)
        assert response2.status_code == 400, "Duplicate email should return 400"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/superadmin/team/{member_id}")
        print("✓ Duplicate email invite correctly rejected")
    
    def test_invite_invalid_role_fails(self):
        """POST /api/superadmin/team/invite - Invalid role should fail"""
        payload = {
            "name": "TEST_Invalid Role",
            "email": f"invalid_role_{int(time.time())}@example.com",
            "role": "invalid_role",
            "assigned_products": []
        }
        
        response = requests.post(f"{BASE_URL}/api/superadmin/team/invite", json=payload)
        assert response.status_code == 400, "Invalid role should return 400"
        print("✓ Invalid role correctly rejected")
    
    def test_update_team_member(self):
        """PUT /api/superadmin/team/{member_id} - Update member"""
        # First create a member
        unique_email = f"test_update_{int(time.time())}@example.com"
        create_payload = {
            "name": "TEST_To Update",
            "email": unique_email,
            "role": "sales",
            "assigned_products": []
        }
        create_resp = requests.post(f"{BASE_URL}/api/superadmin/team/invite", json=create_payload)
        member_id = create_resp.json()["id"]
        
        # Update the member
        update_payload = {
            "name": "TEST_Updated Name",
            "role": "marketing",
            "assigned_products": ["unitxt"]
        }
        response = requests.put(f"{BASE_URL}/api/superadmin/team/{member_id}", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify update by fetching all members
        get_resp = requests.get(f"{BASE_URL}/api/superadmin/team")
        members = get_resp.json()["members"]
        updated_member = next((m for m in members if m["id"] == member_id), None)
        assert updated_member is not None, "Updated member should exist"
        assert updated_member["name"] == update_payload["name"]
        assert updated_member["role"] == update_payload["role"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/superadmin/team/{member_id}")
        print(f"✓ PUT /api/superadmin/team/{member_id} - Member updated successfully")
    
    def test_delete_team_member(self):
        """DELETE /api/superadmin/team/{member_id} - Remove member"""
        # First create a member
        unique_email = f"test_delete_{int(time.time())}@example.com"
        create_payload = {
            "name": "TEST_To Delete",
            "email": unique_email,
            "role": "developer",
            "assigned_products": []
        }
        create_resp = requests.post(f"{BASE_URL}/api/superadmin/team/invite", json=create_payload)
        member_id = create_resp.json()["id"]
        
        # Delete the member
        response = requests.delete(f"{BASE_URL}/api/superadmin/team/{member_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/superadmin/team")
        members = get_resp.json()["members"]
        deleted_member = next((m for m in members if m["id"] == member_id), None)
        assert deleted_member is None, "Deleted member should not exist"
        print(f"✓ DELETE /api/superadmin/team/{member_id} - Member removed successfully")
    
    def test_delete_nonexistent_member(self):
        """DELETE /api/superadmin/team/{invalid_id} - Should return 404"""
        response = requests.delete(f"{BASE_URL}/api/superadmin/team/000000000000000000000000")
        assert response.status_code == 404, "Deleting non-existent member should return 404"
        print("✓ Delete non-existent member correctly returns 404")


class TestSuperAdminApprovals:
    """Tests for /api/superadmin/approvals endpoints"""
    
    def test_get_pending_approvals(self):
        """GET /api/superadmin/approvals - List pending approvals"""
        response = requests.get(f"{BASE_URL}/api/superadmin/approvals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "approvals" in data, "Response should contain 'approvals' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["approvals"], list), "Approvals should be a list"
        
        # Check structure of approvals if any exist
        if data["approvals"]:
            approval = data["approvals"][0]
            assert "id" in approval, "Approval should have 'id'"
            assert "type" in approval, "Approval should have 'type'"
            assert "product" in approval, "Approval should have 'product'"
            assert "title" in approval, "Approval should have 'title'"
            assert "requester" in approval, "Approval should have 'requester'"
        
        print(f"✓ GET /api/superadmin/approvals - Found {data['total']} pending approvals")
    
    def test_get_approvals_filter_by_type(self):
        """GET /api/superadmin/approvals?approval_type=merchant_onboarding"""
        response = requests.get(f"{BASE_URL}/api/superadmin/approvals?approval_type=merchant_onboarding")
        assert response.status_code == 200
        
        data = response.json()
        for approval in data["approvals"]:
            assert approval["type"] == "merchant_onboarding", "Filter should work"
        print("✓ GET /api/superadmin/approvals with type filter works")
    
    def test_get_approvals_filter_by_product(self):
        """GET /api/superadmin/approvals?product=kwikpay"""
        response = requests.get(f"{BASE_URL}/api/superadmin/approvals?product=kwikpay")
        assert response.status_code == 200
        
        data = response.json()
        for approval in data["approvals"]:
            assert approval["product"] == "kwikpay", "Product filter should work"
        print("✓ GET /api/superadmin/approvals with product filter works")
    
    def test_approve_nonexistent_request(self):
        """POST /api/superadmin/approvals/{invalid_id}/approve - Should return 404"""
        response = requests.post(f"{BASE_URL}/api/superadmin/approvals/000000000000000000000000/approve")
        assert response.status_code == 404, "Approving non-existent request should return 404"
        print("✓ Approve non-existent request returns 404")
    
    def test_reject_nonexistent_request(self):
        """POST /api/superadmin/approvals/{invalid_id}/reject - Should return 404"""
        response = requests.post(f"{BASE_URL}/api/superadmin/approvals/000000000000000000000000/reject")
        assert response.status_code == 404, "Rejecting non-existent request should return 404"
        print("✓ Reject non-existent request returns 404")


class TestSuperAdminUsers:
    """Tests for /api/superadmin/users endpoints"""
    
    def test_get_users_with_pagination(self):
        """GET /api/superadmin/users - List users with pagination"""
        response = requests.get(f"{BASE_URL}/api/superadmin/users?page=1&limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "users" in data, "Response should contain 'users' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "page" in data, "Response should contain 'page' key"
        assert "limit" in data, "Response should contain 'limit' key"
        assert "pages" in data, "Response should contain 'pages' key"
        
        assert data["page"] == 1, "Page should be 1"
        assert data["limit"] == 10, "Limit should be 10"
        
        # Check user structure if any exist
        if data["users"]:
            user = data["users"][0]
            assert "id" in user, "User should have 'id'"
            assert "name" in user, "User should have 'name'"
            assert "email" in user, "User should have 'email'"
            assert "role" in user, "User should have 'role'"
            assert "status" in user, "User should have 'status'"
        
        print(f"✓ GET /api/superadmin/users - Found {data['total']} users, page {data['page']}/{data['pages']}")
    
    def test_get_users_with_search(self):
        """GET /api/superadmin/users?search=test"""
        response = requests.get(f"{BASE_URL}/api/superadmin/users?search=test")
        assert response.status_code == 200
        
        data = response.json()
        # All results should contain 'test' in name or email
        for user in data["users"]:
            name_match = "test" in user["name"].lower()
            email_match = "test" in user["email"].lower()
            assert name_match or email_match, "Search should filter by name or email"
        print("✓ GET /api/superadmin/users with search filter works")
    
    def test_get_users_pagination_limits(self):
        """Test pagination limit boundaries"""
        # Test with very small limit
        response = requests.get(f"{BASE_URL}/api/superadmin/users?page=1&limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) <= 1, "Limit should be respected"
        
        # Test with maximum limit
        response = requests.get(f"{BASE_URL}/api/superadmin/users?page=1&limit=100")
        assert response.status_code == 200
        print("✓ Pagination limits work correctly")


class TestSuperAdminActivity:
    """Tests for /api/superadmin/activity/recent endpoint"""
    
    def test_get_recent_activity(self):
        """GET /api/superadmin/activity/recent - Get recent platform activity"""
        response = requests.get(f"{BASE_URL}/api/superadmin/activity/recent")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "activities" in data, "Response should contain 'activities' key"
        assert isinstance(data["activities"], list), "Activities should be a list"
        
        # Check activity structure if any exist
        if data["activities"]:
            activity = data["activities"][0]
            assert "type" in activity, "Activity should have 'type'"
            assert "product" in activity, "Activity should have 'product'"
            assert "message" in activity, "Activity should have 'message'"
            assert "time" in activity, "Activity should have 'time'"
        
        print(f"✓ GET /api/superadmin/activity/recent - Found {len(data['activities'])} activities")
    
    def test_get_recent_activity_with_limit(self):
        """GET /api/superadmin/activity/recent?limit=5"""
        response = requests.get(f"{BASE_URL}/api/superadmin/activity/recent?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["activities"]) <= 5, "Limit should be respected"
        print("✓ GET /api/superadmin/activity/recent with limit works")


class TestMerchantOnboarding:
    """Tests for /api/merchant-onboarding endpoints"""
    
    def test_get_supported_countries(self):
        """GET /api/merchant-onboarding/countries - List supported countries"""
        response = requests.get(f"{BASE_URL}/api/merchant-onboarding/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "countries" in data, "Response should contain 'countries' key"
        assert len(data["countries"]) > 0, "Should have at least one country"
        
        # Check country structure
        country = data["countries"][0]
        assert "code" in country, "Country should have 'code'"
        assert "name" in country, "Country should have 'name'"
        assert "currency" in country, "Country should have 'currency'"
        assert "banks" in country, "Country should have 'banks'"
        assert "mobile_money" in country, "Country should have 'mobile_money'"
        
        # Verify Tanzania is included
        tz = next((c for c in data["countries"] if c["code"] == "TZ"), None)
        assert tz is not None, "Tanzania should be in supported countries"
        assert len(tz["banks"]) > 0, "Tanzania should have banks"
        
        print(f"✓ GET /api/merchant-onboarding/countries - Found {len(data['countries'])} countries")
    
    def test_get_fee_structure(self):
        """GET /api/merchant-onboarding/fee-structure - Get fee information"""
        response = requests.get(f"{BASE_URL}/api/merchant-onboarding/fee-structure")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "transaction_fees" in data, "Response should contain 'transaction_fees'"
        assert "payout_fees" in data, "Response should contain 'payout_fees'"
        assert "settlement_period" in data, "Response should contain 'settlement_period'"
        assert "minimum_payout" in data, "Response should contain 'minimum_payout'"
        
        # Check transaction fees structure
        fees = data["transaction_fees"]
        assert "mobile_money" in fees, "Should have mobile money fees"
        assert "card" in fees, "Should have card fees"
        assert "bank_transfer" in fees, "Should have bank transfer fees"
        
        assert fees["mobile_money"]["percent"] == 2.5, "Mobile money fee should be 2.5%"
        
        print(f"✓ GET /api/merchant-onboarding/fee-structure - Settlement: {data['settlement_period']}")


class TestHealthAndConnectivity:
    """Basic health and connectivity tests"""
    
    def test_api_health(self):
        """GET /api/health - API should be healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "ok", "Health status should be 'ok'"
        print("✓ API health check passed")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup any TEST_ prefixed data after all tests complete"""
    yield
    # Cleanup team members with TEST_ prefix
    try:
        response = requests.get(f"{BASE_URL}/api/superadmin/team")
        if response.status_code == 200:
            members = response.json().get("members", [])
            for member in members:
                if member.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/superadmin/team/{member['id']}")
                    print(f"Cleaned up test member: {member['name']}")
    except Exception as e:
        print(f"Cleanup warning: {e}")
