"""
Test suite for Vendor Onboarding Flow
Tests the 9-step vendor onboarding questionnaire and admin approval process

Features tested:
1. Vendor registration sets vendor_status to 'pending_onboarding'
2. Vendor onboarding status endpoint
3. Vendor onboarding submission
4. File upload for vendor verification
5. Admin pending vendors list
6. Admin vendor approval/rejection
7. Approved vendor can access dashboard
8. Rejected vendor sees rejection status
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "easante@nitlimited.com"
ADMIN_PASSWORD = "admin123"

# Generate unique test vendor email
TEST_VENDOR_EMAIL = f"test_vendor_{uuid.uuid4().hex[:8]}@test.com"
TEST_VENDOR_PASSWORD = "testvendor123"
TEST_VENDOR_NAME = "Test Vendor Onboarding"


class TestVendorOnboardingFlow:
    """Test the complete vendor onboarding flow"""
    
    vendor_token = None
    admin_token = None
    vendor_user_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Get admin token"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        cls.admin_token = response.json()["token"]
        print(f"✓ Admin login successful")
    
    def test_01_vendor_registration_sets_pending_onboarding_status(self):
        """Test that vendor registration sets vendor_status to 'pending_onboarding'"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_VENDOR_EMAIL,
            "password": TEST_VENDOR_PASSWORD,
            "name": TEST_VENDOR_NAME,
            "role": "vendor"
        })
        
        assert response.status_code == 200, f"Vendor registration failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        assert data["user"]["role"] == "vendor", "Role should be vendor"
        
        TestVendorOnboardingFlow.vendor_token = data["token"]
        TestVendorOnboardingFlow.vendor_user_id = data["user"]["user_id"]
        
        print(f"✓ Vendor registered: {TEST_VENDOR_EMAIL}")
        print(f"✓ Vendor user_id: {TestVendorOnboardingFlow.vendor_user_id}")
    
    def test_02_vendor_onboarding_status_is_pending_onboarding(self):
        """Test that new vendor has status 'pending_onboarding'"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/onboarding-status",
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.vendor_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get onboarding status: {response.text}"
        data = response.json()
        
        assert data["vendor_status"] == "pending_onboarding", f"Expected 'pending_onboarding', got '{data['vendor_status']}'"
        assert data["has_completed_onboarding"] == False, "Should not have completed onboarding"
        
        print(f"✓ Vendor status is 'pending_onboarding'")
    
    def test_03_unapproved_vendor_cannot_access_dashboard(self):
        """Test that unapproved vendor gets 403 when accessing vendor dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.vendor_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        assert "not approved" in response.json().get("detail", "").lower() or "pending" in response.json().get("detail", "").lower(), \
            f"Expected approval-related error message, got: {response.json()}"
        
        print(f"✓ Unapproved vendor correctly blocked from dashboard (403)")
    
    def test_04_submit_vendor_onboarding(self):
        """Test submitting the 9-step vendor onboarding form"""
        onboarding_data = {
            "identity": {
                "full_name": "Test Vendor Person",
                "business_name": "Test Jersey Shop",
                "phone_number": "+233 50 123 4567",
                "email": TEST_VENDOR_EMAIL,
                "city_location": "Accra, Ghana",
                "social_handles": [
                    {"platform": "instagram", "handle": "@testjerseyshop"}
                ],
                "years_in_business": "1_to_3_years"
            },
            "business": {
                "sells_online_offline": "both",
                "selling_platforms": ["instagram", "whatsapp"],
                "jerseys_per_month": "10_30"
            },
            "inventory": {
                "keeps_stock": "yes_ready_to_ship",
                "stock_quantity": "20_50",
                "stock_sizes": ["S", "M", "L", "XL"]
            },
            "production": {
                "weekly_capacity": "10_30",
                "production_time": "1_2_days"
            },
            "delivery": {
                "delivery_methods": ["bolt", "courier"],
                "city_delivery_time": "same_day",
                "delivers_outside_city": True,
                "delivers_outside_ghana": False,
                "accra_delivery_time": "same_day",
                "central_western_delivery_time": "1_2_days",
                "eastern_volta_delivery_time": "2_4_days",
                "ashanti_bono_delivery_time": "2_4_days",
                "northern_upper_delivery_time": "5_plus_days"
            },
            "quality": {
                "jersey_source": "design_produce",
                "materials": ["polyester", "mesh_fabric"]
            },
            "commitment": {
                "fulfill_on_time": True,
                "fulfill_through_platform": True,
                "agree_terms": True
            },
            "verification": {
                "jersey_photos": ["https://example.com/jersey1.jpg", "https://example.com/jersey2.jpg"],
                "packaging_photo": "https://example.com/packaging.jpg"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/onboarding",
            json=onboarding_data,
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.vendor_token}"}
        )
        
        assert response.status_code == 200, f"Onboarding submission failed: {response.text}"
        data = response.json()
        
        assert "pending admin approval" in data.get("message", "").lower() or "submitted" in data.get("message", "").lower(), \
            f"Expected success message, got: {data}"
        
        print(f"✓ Vendor onboarding submitted successfully")
    
    def test_05_vendor_status_is_pending_approval_after_submission(self):
        """Test that vendor status changes to 'pending_approval' after submission"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/onboarding-status",
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.vendor_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get onboarding status: {response.text}"
        data = response.json()
        
        assert data["vendor_status"] == "pending_approval", f"Expected 'pending_approval', got '{data['vendor_status']}'"
        assert data["has_completed_onboarding"] == True, "Should have completed onboarding"
        
        print(f"✓ Vendor status changed to 'pending_approval'")
    
    def test_06_admin_can_see_pending_vendor_applications(self):
        """Test that admin can see pending vendor applications"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendors/pending",
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get pending vendors: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of pending vendors"
        
        # Find our test vendor
        test_vendor = None
        for vendor in data:
            if vendor.get("email") == TEST_VENDOR_EMAIL:
                test_vendor = vendor
                break
        
        assert test_vendor is not None, f"Test vendor not found in pending list. Vendors: {[v.get('email') for v in data]}"
        assert test_vendor.get("vendor_status") == "pending_approval", "Vendor should have pending_approval status"
        assert "onboarding_data" in test_vendor, "Onboarding data should be present"
        
        print(f"✓ Admin can see pending vendor applications")
        print(f"✓ Test vendor found in pending list with onboarding data")
    
    def test_07_admin_can_approve_vendor(self):
        """Test that admin can approve a vendor"""
        response = requests.put(
            f"{BASE_URL}/api/admin/vendors/{TestVendorOnboardingFlow.vendor_user_id}/approve?approved=true",
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.admin_token}"}
        )
        
        assert response.status_code == 200, f"Vendor approval failed: {response.text}"
        data = response.json()
        
        assert "approved" in data.get("message", "").lower(), f"Expected approval message, got: {data}"
        
        print(f"✓ Admin approved vendor successfully")
    
    def test_08_approved_vendor_status_is_approved(self):
        """Test that approved vendor has status 'approved'"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/onboarding-status",
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.vendor_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get onboarding status: {response.text}"
        data = response.json()
        
        assert data["vendor_status"] == "approved", f"Expected 'approved', got '{data['vendor_status']}'"
        
        print(f"✓ Vendor status is 'approved'")
    
    def test_09_approved_vendor_can_access_dashboard(self):
        """Test that approved vendor can access vendor dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.vendor_token}"}
        )
        
        assert response.status_code == 200, f"Approved vendor should access dashboard: {response.text}"
        data = response.json()
        
        # Verify dashboard data structure
        assert "total_products" in data, "Dashboard should have total_products"
        assert "total_revenue" in data, "Dashboard should have total_revenue"
        assert "net_earnings" in data, "Dashboard should have net_earnings"
        
        print(f"✓ Approved vendor can access dashboard")
    
    def test_10_approved_vendor_can_create_products(self):
        """Test that approved vendor can create products"""
        product_data = {
            "name": "Test Ghana Jersey 2024",
            "description": "A test jersey for onboarding verification",
            "price": 79.99,
            "currency": "USD",
            "category": "official-tournament",
            "sizes": ["S", "M", "L", "XL"],
            "stock": 50,
            "images": ["https://example.com/jersey.jpg"],
            "tags": ["ghana", "test"],
            "allows_customization": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json=product_data,
            headers={"Authorization": f"Bearer {TestVendorOnboardingFlow.vendor_token}"}
        )
        
        assert response.status_code == 200, f"Product creation failed: {response.text}"
        data = response.json()
        
        assert "product_id" in data, "Product ID should be returned"
        
        print(f"✓ Approved vendor can create products")


class TestVendorRejectionFlow:
    """Test vendor rejection flow"""
    
    vendor_token = None
    admin_token = None
    vendor_user_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Get admin token and create a new vendor"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        cls.admin_token = response.json()["token"]
        
        # Register a new vendor for rejection test
        reject_vendor_email = f"reject_vendor_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": reject_vendor_email,
            "password": "rejecttest123",
            "name": "Reject Test Vendor",
            "role": "vendor"
        })
        assert response.status_code == 200, f"Vendor registration failed: {response.text}"
        cls.vendor_token = response.json()["token"]
        cls.vendor_user_id = response.json()["user"]["user_id"]
        
        # Submit onboarding
        onboarding_data = {
            "identity": {
                "full_name": "Reject Test Person",
                "business_name": "Reject Test Shop",
                "phone_number": "+233 50 999 9999",
                "email": reject_vendor_email,
                "city_location": "Kumasi, Ghana",
                "social_handles": [],
                "years_in_business": "less_than_6_months"
            },
            "business": {
                "sells_online_offline": "online",
                "selling_platforms": ["instagram"],
                "jerseys_per_month": "1_10"
            },
            "inventory": {
                "keeps_stock": "no_made_after_order",
                "stock_quantity": "1_20",
                "stock_sizes": ["M", "L"]
            },
            "production": {
                "weekly_capacity": "5_10",
                "production_time": "3_5_days"
            },
            "delivery": {
                "delivery_methods": ["pickup"],
                "city_delivery_time": "2_4_days",
                "delivers_outside_city": False,
                "delivers_outside_ghana": False
            },
            "quality": {
                "jersey_source": "source_suppliers",
                "materials": ["polyester"]
            },
            "commitment": {
                "fulfill_on_time": True,
                "fulfill_through_platform": True,
                "agree_terms": True
            },
            "verification": {
                "jersey_photos": ["https://example.com/jersey1.jpg", "https://example.com/jersey2.jpg"],
                "packaging_photo": ""
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/onboarding",
            json=onboarding_data,
            headers={"Authorization": f"Bearer {cls.vendor_token}"}
        )
        assert response.status_code == 200, f"Onboarding submission failed: {response.text}"
        print(f"✓ Rejection test vendor setup complete")
    
    def test_01_admin_can_reject_vendor(self):
        """Test that admin can reject a vendor with reason"""
        response = requests.put(
            f"{BASE_URL}/api/admin/vendors/{TestVendorRejectionFlow.vendor_user_id}/approve?approved=false&rejection_reason=Insufficient%20documentation",
            headers={"Authorization": f"Bearer {TestVendorRejectionFlow.admin_token}"}
        )
        
        assert response.status_code == 200, f"Vendor rejection failed: {response.text}"
        data = response.json()
        
        assert "rejected" in data.get("message", "").lower(), f"Expected rejection message, got: {data}"
        
        print(f"✓ Admin rejected vendor successfully")
    
    def test_02_rejected_vendor_status_is_rejected(self):
        """Test that rejected vendor has status 'rejected'"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/onboarding-status",
            headers={"Authorization": f"Bearer {TestVendorRejectionFlow.vendor_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get onboarding status: {response.text}"
        data = response.json()
        
        assert data["vendor_status"] == "rejected", f"Expected 'rejected', got '{data['vendor_status']}'"
        
        print(f"✓ Vendor status is 'rejected'")
    
    def test_03_rejected_vendor_cannot_access_dashboard(self):
        """Test that rejected vendor cannot access vendor dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {TestVendorRejectionFlow.vendor_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print(f"✓ Rejected vendor correctly blocked from dashboard (403)")


class TestFileUploadEndpoint:
    """Test vendor image upload endpoint"""
    
    vendor_token = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Create a vendor for file upload test"""
        upload_vendor_email = f"upload_vendor_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": upload_vendor_email,
            "password": "uploadtest123",
            "name": "Upload Test Vendor",
            "role": "vendor"
        })
        assert response.status_code == 200, f"Vendor registration failed: {response.text}"
        cls.vendor_token = response.json()["token"]
        print(f"✓ Upload test vendor created")
    
    def test_01_upload_endpoint_exists(self):
        """Test that the upload endpoint exists and requires auth"""
        # Test without auth
        response = requests.post(f"{BASE_URL}/api/upload/vendor-image")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        print(f"✓ Upload endpoint requires authentication")
    
    def test_02_upload_requires_file(self):
        """Test that upload requires a file"""
        response = requests.post(
            f"{BASE_URL}/api/upload/vendor-image",
            headers={"Authorization": f"Bearer {TestFileUploadEndpoint.vendor_token}"}
        )
        
        # Should fail with 422 (validation error) because no file provided
        assert response.status_code == 422, f"Expected 422 without file, got {response.status_code}"
        
        print(f"✓ Upload endpoint requires file")


class TestAdminOnboardingTab:
    """Test admin dashboard onboarding tab functionality"""
    
    admin_token = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        cls.admin_token = response.json()["token"]
    
    def test_01_admin_dashboard_loads(self):
        """Test that admin dashboard loads"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {TestAdminOnboardingTab.admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin dashboard failed: {response.text}"
        data = response.json()
        
        assert "total_vendors" in data, "Dashboard should have total_vendors"
        
        print(f"✓ Admin dashboard loads successfully")
    
    def test_02_pending_vendors_endpoint_works(self):
        """Test that pending vendors endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendors/pending",
            headers={"Authorization": f"Bearer {TestAdminOnboardingTab.admin_token}"}
        )
        
        assert response.status_code == 200, f"Pending vendors failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list"
        
        print(f"✓ Pending vendors endpoint works, found {len(data)} pending vendors")
    
    def test_03_all_vendors_endpoint_works(self):
        """Test that all vendors endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendors",
            headers={"Authorization": f"Bearer {TestAdminOnboardingTab.admin_token}"}
        )
        
        assert response.status_code == 200, f"All vendors failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list"
        
        print(f"✓ All vendors endpoint works, found {len(data)} vendors")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
