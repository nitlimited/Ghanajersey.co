"""
Test suite for Admin and Vendor Dashboard features - Phase 1
Tests:
- Admin Dashboard: Revenue stats with 15% commission, vendor analytics, voting panel, orders
- Vendor Dashboard: Financial overview, order management, product management (duplicate/pause), promos, support
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "easante@nitlimited.com"
ADMIN_PASSWORD = "admin123"
VENDOR_EMAIL = "vendor@blackstar.com"
VENDOR_PASSWORD = "vendor123"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestAdminAuthentication:
    """Admin login and authentication tests"""
    
    def test_admin_login_success(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - user: {data['user']['email']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Admin login with invalid credentials correctly rejected")


class TestVendorAuthentication:
    """Vendor login and authentication tests"""
    
    def test_vendor_login_success(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "vendor"
        print(f"✓ Vendor login successful - user: {data['user']['email']}")
        return data["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Vendor authentication failed")


class TestAdminDashboard:
    """Admin Dashboard API tests"""
    
    def test_admin_dashboard_stats(self, admin_token):
        """Test GET /api/admin/dashboard returns revenue stats with 15% commission"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "total_revenue" in data
        assert "platform_commission" in data
        assert "vendor_earnings_total" in data
        assert "total_orders" in data
        assert "total_vendors" in data
        assert "total_customers" in data
        assert "confirmed_deliveries" in data
        assert "pending_confirmations" in data
        
        # Verify 15% commission calculation
        if data["total_revenue"] > 0:
            expected_commission = data["total_revenue"] * 0.15
            assert abs(data["platform_commission"] - expected_commission) < 0.01, \
                f"Commission calculation incorrect: expected {expected_commission}, got {data['platform_commission']}"
            
            expected_vendor_earnings = data["total_revenue"] * 0.85
            assert abs(data["vendor_earnings_total"] - expected_vendor_earnings) < 0.01, \
                f"Vendor earnings calculation incorrect"
        
        print(f"✓ Admin dashboard stats: Revenue=${data['total_revenue']}, Commission=${data['platform_commission']}")
    
    def test_admin_vendor_analytics(self, admin_token):
        """Test GET /api/admin/analytics/vendors returns vendor earnings data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/vendors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            vendor = data[0]
            # Verify vendor analytics fields
            assert "vendor_id" in vendor
            assert "name" in vendor
            assert "email" in vendor
            assert "total_products" in vendor
            assert "total_revenue" in vendor
            assert "platform_commission" in vendor
            assert "net_earnings" in vendor
            assert "pending_payout" in vendor
            assert "paid_payout" in vendor
            assert "total_votes" in vendor
            
            # Verify 15% commission calculation for vendor
            if vendor["total_revenue"] > 0:
                expected_commission = vendor["total_revenue"] * 0.15
                assert abs(vendor["platform_commission"] - expected_commission) < 0.01
                
                expected_net = vendor["total_revenue"] * 0.85
                assert abs(vendor["net_earnings"] - expected_net) < 0.01
            
            print(f"✓ Vendor analytics: {len(data)} vendors found")
            print(f"  First vendor: {vendor['name']} - Revenue=${vendor['total_revenue']}, Net=${vendor['net_earnings']}")
        else:
            print("✓ Vendor analytics endpoint works (no vendors found)")
    
    def test_admin_view_vendor_products(self, admin_token):
        """Test GET /api/admin/vendors/{vendor_id}/products - View Products button"""
        # First get vendors
        vendors_response = requests.get(
            f"{BASE_URL}/api/admin/analytics/vendors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert vendors_response.status_code == 200
        vendors = vendors_response.json()
        
        if len(vendors) > 0:
            vendor_id = vendors[0]["vendor_id"]
            response = requests.get(
                f"{BASE_URL}/api/admin/vendors/{vendor_id}/products",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            products = response.json()
            assert isinstance(products, list)
            print(f"✓ View vendor products: {len(products)} products for vendor {vendor_id}")
        else:
            print("✓ View vendor products endpoint works (no vendors to test)")
    
    def test_admin_voting_stats(self, admin_token):
        """Test GET /api/admin/voting-stats returns voting statistics (view-only)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/voting-stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "total_votes" in data
        assert "products" in data
        assert isinstance(data["products"], list)
        
        # top_voted can be None if no products
        if data["products"]:
            assert "top_voted" in data
            if data["top_voted"]:
                assert "product_id" in data["top_voted"]
                assert "name" in data["top_voted"]
                assert "vote_count" in data["top_voted"]
        
        print(f"✓ Voting stats: Total votes={data['total_votes']}, Products with votes={len(data['products'])}")
    
    def test_admin_orders_list(self, admin_token):
        """Test GET /api/admin/orders returns orders with delivery confirmation tracking"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        orders = response.json()
        
        assert isinstance(orders, list)
        
        if len(orders) > 0:
            order = orders[0]
            assert "order_id" in order
            assert "order_status" in order
            assert "payment_status" in order
            # delivery_confirmed may or may not be present
            print(f"✓ Admin orders: {len(orders)} orders found")
        else:
            print("✓ Admin orders endpoint works (no orders found)")
    
    def test_admin_update_order_status(self, admin_token):
        """Test PUT /api/admin/orders/{order_id}/status"""
        # First get orders
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = orders_response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["order_id"]
            current_status = orders[0].get("order_status", "pending")
            
            # Try to update status
            response = requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/status?order_status=processing",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            print(f"✓ Admin order status update works")
        else:
            print("✓ Admin order status update endpoint exists (no orders to test)")


class TestVendorDashboard:
    """Vendor Dashboard API tests"""
    
    def test_vendor_dashboard_financial_overview(self, vendor_token):
        """Test GET /api/vendor/dashboard returns comprehensive financial stats"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify financial overview fields
        assert "total_revenue" in data
        assert "platform_commission" in data
        assert "net_earnings" in data
        assert "pending_payout" in data
        assert "paid_payout" in data
        
        # Verify other dashboard fields
        assert "total_products" in data
        assert "approved_products" in data
        assert "pending_products" in data
        assert "total_orders" in data
        assert "monthly_revenue" in data
        
        # Verify 15% commission calculation
        if data["total_revenue"] > 0:
            expected_commission = data["total_revenue"] * 0.15
            assert abs(data["platform_commission"] - expected_commission) < 0.01
            
            expected_net = data["total_revenue"] * 0.85
            assert abs(data["net_earnings"] - expected_net) < 0.01
        
        print(f"✓ Vendor dashboard: Revenue=${data['total_revenue']}, Net=${data['net_earnings']}, Pending=${data['pending_payout']}")
    
    def test_vendor_orders_list(self, vendor_token):
        """Test GET /api/vendor/orders returns vendor's orders"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        orders = response.json()
        
        assert isinstance(orders, list)
        print(f"✓ Vendor orders: {len(orders)} orders found")
    
    def test_vendor_update_order_status(self, vendor_token):
        """Test PUT /api/vendor/orders/{order_id}/status - update order status"""
        # First get vendor orders
        orders_response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        orders = orders_response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["order_id"]
            
            # Test valid status updates
            for status in ["processing", "shipped", "delivered"]:
                response = requests.put(
                    f"{BASE_URL}/api/vendor/orders/{order_id}/status?status={status}",
                    headers={"Authorization": f"Bearer {vendor_token}"}
                )
                assert response.status_code == 200, f"Failed to update to {status}: {response.text}"
            
            print(f"✓ Vendor order status update works (processing, shipped, delivered)")
        else:
            print("✓ Vendor order status update endpoint exists (no orders to test)")
    
    def test_vendor_order_status_invalid(self, vendor_token):
        """Test PUT /api/vendor/orders/{order_id}/status with invalid status"""
        # First get vendor orders
        orders_response = requests.get(
            f"{BASE_URL}/api/vendor/orders",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        orders = orders_response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["order_id"]
            
            response = requests.put(
                f"{BASE_URL}/api/vendor/orders/{order_id}/status?status=invalid_status",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert response.status_code == 400, f"Should reject invalid status"
            print(f"✓ Invalid order status correctly rejected")
        else:
            print("✓ Invalid status test skipped (no orders)")
    
    def test_vendor_products_list(self, vendor_token):
        """Test GET /api/vendor/products returns vendor's products"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        products = response.json()
        
        assert isinstance(products, list)
        print(f"✓ Vendor products: {len(products)} products found")
        return products
    
    def test_vendor_create_product(self, vendor_token):
        """Test POST /api/vendor/products - Add New Jersey"""
        unique_id = uuid.uuid4().hex[:8]
        product_data = {
            "name": f"TEST_Jersey_{unique_id}",
            "description": "Test jersey for automated testing",
            "price": 79.99,
            "currency": "USD",
            "category": "fan",
            "jersey_type": "fan",
            "sizes": ["S", "M", "L", "XL"],
            "stock": 50,
            "images": ["https://example.com/jersey1.jpg", "https://example.com/jersey2.jpg"],
            "tags": ["test", "automated"],
            "is_limited_edition": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json=product_data,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "product_id" in data
        assert "message" in data
        print(f"✓ Product created: {data['product_id']}")
        return data["product_id"]
    
    def test_vendor_duplicate_product(self, vendor_token):
        """Test POST /api/vendor/products/{product_id}/duplicate"""
        # First get vendor products
        products_response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            
            response = requests.post(
                f"{BASE_URL}/api/vendor/products/{product_id}/duplicate",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            assert "product_id" in data
            assert data["product_id"] != product_id  # Should be a new ID
            print(f"✓ Product duplicated: {product_id} -> {data['product_id']}")
            
            # Verify the duplicated product exists
            verify_response = requests.get(
                f"{BASE_URL}/api/vendor/products",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            new_products = verify_response.json()
            new_product = next((p for p in new_products if p["product_id"] == data["product_id"]), None)
            assert new_product is not None, "Duplicated product not found"
            assert "(Copy)" in new_product["name"], "Duplicated product should have (Copy) in name"
            assert new_product["status"] == "pending", "Duplicated product should be pending"
            print(f"✓ Duplicated product verified: {new_product['name']}")
        else:
            print("✓ Product duplicate endpoint exists (no products to test)")
    
    def test_vendor_pause_product(self, vendor_token):
        """Test PUT /api/vendor/products/{product_id}/pause - toggle pause"""
        # First get vendor products
        products_response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            
            # Pause the product
            response = requests.put(
                f"{BASE_URL}/api/vendor/products/{product_id}/pause?is_paused=true",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert response.status_code == 200, f"Failed to pause: {response.text}"
            print(f"✓ Product paused: {product_id}")
            
            # Verify it's paused
            verify_response = requests.get(
                f"{BASE_URL}/api/vendor/products",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            updated_products = verify_response.json()
            paused_product = next((p for p in updated_products if p["product_id"] == product_id), None)
            assert paused_product is not None
            assert paused_product.get("is_paused") == True, "Product should be paused"
            
            # Unpause the product
            response = requests.put(
                f"{BASE_URL}/api/vendor/products/{product_id}/pause?is_paused=false",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert response.status_code == 200, f"Failed to unpause: {response.text}"
            print(f"✓ Product unpaused: {product_id}")
        else:
            print("✓ Product pause endpoint exists (no products to test)")
    
    def test_vendor_edit_product(self, vendor_token):
        """Test PUT /api/vendor/products/{product_id} - Edit product"""
        # First get vendor products
        products_response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            original_name = products[0]["name"]
            
            # Update the product
            update_data = {
                "description": "Updated description for testing",
                "stock": 100
            }
            
            response = requests.put(
                f"{BASE_URL}/api/vendor/products/{product_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            
            # Verify update
            verify_response = requests.get(
                f"{BASE_URL}/api/vendor/products",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            updated_products = verify_response.json()
            updated_product = next((p for p in updated_products if p["product_id"] == product_id), None)
            assert updated_product is not None
            assert updated_product["description"] == "Updated description for testing"
            assert updated_product["stock"] == 100
            print(f"✓ Product edited: {product_id}")
        else:
            print("✓ Product edit endpoint exists (no products to test)")
    
    def test_vendor_delete_product(self, vendor_token):
        """Test DELETE /api/vendor/products/{product_id}"""
        # Create a test product first
        unique_id = uuid.uuid4().hex[:8]
        product_data = {
            "name": f"TEST_ToDelete_{unique_id}",
            "description": "Product to be deleted",
            "price": 29.99,
            "currency": "USD",
            "category": "fan",
            "sizes": ["M"],
            "stock": 10,
            "images": ["https://example.com/delete.jpg"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json=product_data,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["product_id"]
        
        # Delete the product
        response = requests.delete(
            f"{BASE_URL}/api/vendor/products/{product_id}",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        products = verify_response.json()
        deleted_product = next((p for p in products if p["product_id"] == product_id), None)
        assert deleted_product is None, "Product should be deleted"
        print(f"✓ Product deleted: {product_id}")


class TestVendorPromos:
    """Vendor Promo/Discount Code tests"""
    
    def test_vendor_create_promo(self, vendor_token):
        """Test POST /api/vendor/promos - Create discount code"""
        unique_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        promo_data = {
            "code": unique_code,
            "discount_type": "percentage",
            "discount_value": 15.0,
            "min_purchase": 50.0,
            "max_uses": 100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/promos",
            json=promo_data,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "promo_id" in data
        print(f"✓ Promo created: {unique_code} - {data['promo_id']}")
        return data["promo_id"]
    
    def test_vendor_list_promos(self, vendor_token):
        """Test GET /api/vendor/promos - List vendor's promos"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/promos",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        promos = response.json()
        
        assert isinstance(promos, list)
        
        if len(promos) > 0:
            promo = promos[0]
            assert "promo_id" in promo
            assert "code" in promo
            assert "discount_type" in promo
            assert "discount_value" in promo
        
        print(f"✓ Vendor promos: {len(promos)} promos found")
    
    def test_vendor_delete_promo(self, vendor_token):
        """Test DELETE /api/vendor/promos/{promo_id}"""
        # Create a promo first
        unique_code = f"DEL{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/promos",
            json={
                "code": unique_code,
                "discount_type": "fixed",
                "discount_value": 10.0
            },
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert create_response.status_code == 200
        promo_id = create_response.json()["promo_id"]
        
        # Delete the promo
        response = requests.delete(
            f"{BASE_URL}/api/vendor/promos/{promo_id}",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/vendor/promos",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        promos = verify_response.json()
        deleted_promo = next((p for p in promos if p["promo_id"] == promo_id), None)
        assert deleted_promo is None, "Promo should be deleted"
        print(f"✓ Promo deleted: {promo_id}")


class TestVendorProfile:
    """Vendor Profile tests"""
    
    def test_vendor_get_profile(self, vendor_token):
        """Test GET /api/vendor/profile"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/profile",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        print(f"✓ Vendor profile: {data['name']} ({data['email']})")
    
    def test_vendor_update_profile(self, vendor_token):
        """Test PUT /api/vendor/profile"""
        profile_data = {
            "brand_name": "Test Brand Updated",
            "description": "Updated description for testing",
            "location": "Accra, Ghana"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/vendor/profile",
            json=profile_data,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✓ Vendor profile updated")


class TestAccessControl:
    """Test access control - vendors can't access admin endpoints and vice versa"""
    
    def test_vendor_cannot_access_admin_dashboard(self, vendor_token):
        """Vendor should not be able to access admin dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 403, f"Vendor should not access admin dashboard"
        print("✓ Vendor correctly denied access to admin dashboard")
    
    def test_vendor_cannot_access_admin_analytics(self, vendor_token):
        """Vendor should not be able to access admin analytics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/vendors",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 403, f"Vendor should not access admin analytics"
        print("✓ Vendor correctly denied access to admin analytics")
    
    def test_unauthenticated_cannot_access_vendor_dashboard(self):
        """Unauthenticated user should not access vendor dashboard"""
        response = requests.get(f"{BASE_URL}/api/vendor/dashboard")
        assert response.status_code == 401, f"Should require authentication"
        print("✓ Unauthenticated user correctly denied access to vendor dashboard")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_products(self, vendor_token):
        """Clean up TEST_ prefixed products"""
        products_response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        products = products_response.json()
        
        deleted_count = 0
        for product in products:
            if product["name"].startswith("TEST_"):
                requests.delete(
                    f"{BASE_URL}/api/vendor/products/{product['product_id']}",
                    headers={"Authorization": f"Bearer {vendor_token}"}
                )
                deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test products")
    
    def test_cleanup_test_promos(self, vendor_token):
        """Clean up TEST prefixed promos"""
        promos_response = requests.get(
            f"{BASE_URL}/api/vendor/promos",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        promos = promos_response.json()
        
        deleted_count = 0
        for promo in promos:
            if promo["code"].startswith("TEST") or promo["code"].startswith("DEL"):
                requests.delete(
                    f"{BASE_URL}/api/vendor/promos/{promo['promo_id']}",
                    headers={"Authorization": f"Bearer {vendor_token}"}
                )
                deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test promos")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
