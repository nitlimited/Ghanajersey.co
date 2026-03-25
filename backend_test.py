import requests
import sys
from datetime import datetime

class BlackStarThreadsAPITester:
    def __init__(self, base_url="https://curated-kits-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_email = "easante@nitlimited.com"
        self.admin_password = "admin123"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 5:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    else:
                        print(f"   Response: {type(response_data).__name__}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_categories_endpoint(self):
        """Test categories endpoint"""
        return self.run_test("Product Categories", "GET", "products/categories", 200)

    def test_products_endpoint(self):
        """Test products endpoint"""
        return self.run_test("Products List", "GET", "products", 200)

    def test_featured_products(self):
        """Test featured products endpoint"""
        return self.run_test("Featured Products", "GET", "products/featured", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.admin_email, "password": self.admin_password}
        )
        if success and isinstance(response, dict) and 'token' in response:
            self.token = response['token']
            print(f"   Admin token obtained: {self.token[:20]}...")
            return True
        return False

    def test_admin_dashboard(self):
        """Test admin dashboard (requires auth)"""
        if not self.token:
            print("❌ Skipping admin dashboard test - no auth token")
            return False
        
        return self.run_test("Admin Dashboard", "GET", "admin/dashboard", 200)[0]

    def test_admin_pending_products(self):
        """Test admin pending products (requires auth)"""
        if not self.token:
            print("❌ Skipping admin pending products test - no auth token")
            return False
        
        return self.run_test("Admin Pending Products", "GET", "admin/products/pending", 200)[0]

    def test_admin_vendors(self):
        """Test admin vendors endpoint (requires auth)"""
        if not self.token:
            print("❌ Skipping admin vendors test - no auth token")
            return False
        
        return self.run_test("Admin Vendors", "GET", "admin/vendors", 200)[0]

    def test_admin_orders(self):
        """Test admin orders endpoint (requires auth)"""
        if not self.token:
            print("❌ Skipping admin orders test - no auth token")
            return False
        
        return self.run_test("Admin Orders", "GET", "admin/orders", 200)[0]

    def test_admin_customers(self):
        """Test admin customers endpoint (requires auth)"""
        if not self.token:
            print("❌ Skipping admin customers test - no auth token")
            return False
        
        return self.run_test("Admin Customers", "GET", "admin/customers", 200)[0]

def main():
    print("🚀 Starting Black Star Threads API Testing")
    print("=" * 50)
    
    tester = BlackStarThreadsAPITester()
    
    # Test public endpoints first
    print("\n📋 Testing Public Endpoints")
    print("-" * 30)
    
    tester.test_health_endpoint()
    tester.test_categories_endpoint()
    tester.test_products_endpoint()
    tester.test_featured_products()
    
    # Test admin authentication
    print("\n🔐 Testing Admin Authentication")
    print("-" * 30)
    
    admin_login_success = tester.test_admin_login()
    
    # Test admin endpoints if login successful
    if admin_login_success:
        print("\n👑 Testing Admin Endpoints")
        print("-" * 30)
        
        tester.test_admin_dashboard()
        tester.test_admin_pending_products()
        tester.test_admin_vendors()
        tester.test_admin_orders()
        tester.test_admin_customers()
    else:
        print("\n❌ Admin login failed - skipping admin endpoint tests")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())