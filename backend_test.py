import requests
import sys
from datetime import datetime

class FMCGAPITester:
    def __init__(self, base_url="https://soko-ui-refresh.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        print(f"   Expected Status: {expected_status}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            print(f"   Actual Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - {name}")
                try:
                    response_data = response.json() if response.content else {}
                    self.test_results.append({
                        "name": name,
                        "status": "PASSED", 
                        "response_code": response.status_code,
                        "response_data": response_data
                    })
                    return True, response_data
                except:
                    return True, {"message": "Success"}
            else:
                print(f"❌ FAILED - {name}")
                print(f"   Response: {response.text[:200]}...")
                try:
                    error_data = response.json() if response.content else {"error": response.text}
                except:
                    error_data = {"error": response.text}
                self.test_results.append({
                    "name": name,
                    "status": "FAILED",
                    "response_code": response.status_code, 
                    "error": error_data
                })
                return False, error_data

        except requests.exceptions.Timeout:
            print(f"❌ FAILED - {name} (TIMEOUT)")
            self.test_results.append({
                "name": name,
                "status": "FAILED",
                "error": "Request timeout"
            })
            return False, {"error": "Request timeout"}
        except Exception as e:
            print(f"❌ FAILED - {name} (ERROR: {str(e)})")
            self.test_results.append({
                "name": name,
                "status": "FAILED", 
                "error": str(e)
            })
            return False, {"error": str(e)}

    def test_business_registration(self):
        """Test business registration endpoint"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_business = {
            "name": f"Test Business {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123",
            "phone": "+1234567890",
            "country": "United States",
            "city": "New York",
            "address": "123 Test Street",
            "industry": "retail"
        }
        
        success, response = self.run_test(
            "Business Registration",
            "POST",
            "register",
            200,
            data=test_business
        )
        
        if success and response.get('access_token'):
            self.token = response['access_token']
            print(f"   ✓ Got access token: {self.token[:20]}...")
            print(f"   ✓ User created: {response.get('user', {}).get('name')}")
            return True
        return False

    def test_login_with_test_credentials(self):
        """Test login with provided test credentials"""
        credentials = {
            "email": "test@example.com", 
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Login with Test Credentials",
            "POST",
            "auth/login",
            200,
            data=credentials
        )
        
        if success and response.get('access_token'):
            self.token = response['access_token']
            print(f"   ✓ Login successful with test credentials")
            return True
        return False

    def test_superadmin_login(self):
        """Test superadmin login"""
        credentials = {
            "email": "superadmin@retail.com",
            "password": "SuperAdmin123!"
        }
        
        success, response = self.run_test(
            "Superadmin Login",
            "POST", 
            "auth/login",
            200,
            data=credentials
        )
        
        if success and response.get('access_token'):
            print(f"   ✓ Superadmin login successful")
            return True
        return False

    def test_protected_endpoint(self):
        """Test accessing a protected endpoint with token"""
        if not self.token:
            print("⚠️  No token available for protected endpoint test")
            return False
            
        success, response = self.run_test(
            "Protected Endpoint - Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            print(f"   ✓ Protected endpoint accessible with token")
            return True
        return False

    def test_business_details(self):
        """Test business details endpoint"""
        if not self.token:
            print("⚠️  No token available for business details test")
            return False
            
        success, response = self.run_test(
            "Get Business Details",
            "GET",
            "business",
            200
        )
        
        if success:
            print(f"   ✓ Business details retrieved")
            return True
        return False

def main():
    print("🚀 Starting FMCG Backend API Tests...")
    print("=" * 50)
    
    # Setup
    tester = FMCGAPITester()
    
    # Test 1: Try existing test user login first
    print("\n📋 Phase 1: Testing existing credentials")
    login_success = tester.test_login_with_test_credentials()
    
    if not login_success:
        # Test 2: Try business registration if login fails
        print("\n📋 Phase 2: Testing business registration")
        registration_success = tester.test_business_registration()
        
        if not registration_success:
            print("\n❌ Both login and registration failed. Cannot proceed with protected endpoint tests.")
    
    # Test 3: Test superadmin login (separate test)
    print("\n📋 Phase 3: Testing superadmin access")
    tester.test_superadmin_login()
    
    # Test 4: Test protected endpoints if we have a token
    if tester.token:
        print("\n📋 Phase 4: Testing protected endpoints")
        tester.test_protected_endpoint()
        tester.test_business_details()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests PASSED!")
        return 0
    else:
        print("⚠️  Some tests FAILED. Check output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())