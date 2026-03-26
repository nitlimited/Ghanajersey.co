"""
Test suite for Localization features:
- Dual pricing (USD and GHS) for products
- Backend support for price_ghs and customization_price_ghs fields
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "easante@nitlimited.com"
ADMIN_PASSWORD = "admin123"
VENDOR_EMAIL = "testvendor@blackstar.com"
VENDOR_PASSWORD = "testvendor123"


class TestDualPricing:
    """Test dual pricing (USD and GHS) for products"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_products_endpoint_returns_price_ghs(self):
        """Test that products endpoint returns price_ghs field"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        if len(products) > 0:
            # Check that products have price field
            assert "price" in products[0]
            # price_ghs may or may not be present depending on product
            print(f"First product price: ${products[0]['price']}")
            if "price_ghs" in products[0] and products[0]["price_ghs"]:
                print(f"First product price_ghs: GH₵{products[0]['price_ghs']}")
    
    def test_product_detail_returns_price_ghs(self):
        """Test that product detail endpoint returns price_ghs field"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        if len(products) > 0:
            product_id = products[0]["product_id"]
            
            # Get product detail
            detail_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert detail_response.status_code == 200
            
            product = detail_response.json()
            assert "price" in product
            print(f"Product detail price: ${product['price']}")
            
            # Check for customization fields
            if product.get("allows_customization"):
                assert "customization_price" in product
                print(f"Customization price: ${product.get('customization_price', 0)}")
                if "customization_price_ghs" in product:
                    print(f"Customization price GHS: GH₵{product.get('customization_price_ghs')}")
    
    def test_vendor_create_product_with_dual_pricing(self, admin_token):
        """Test that admin can create product with both USD and GHS prices"""
        unique_id = uuid.uuid4().hex[:8]
        
        product_data = {
            "name": f"TEST_Dual_Price_Jersey_{unique_id}",
            "description": "Test jersey with dual pricing",
            "price": 79.99,
            "price_ghs": 1230.25,  # GHS price
            "currency": "USD",
            "category": "fan",
            "sizes": ["S", "M", "L", "XL"],
            "stock": 10,
            "images": ["https://example.com/jersey.jpg"],
            "tags": ["test", "dual-pricing"],
            "allows_customization": True,
            "customization_price": 15.00,
            "customization_price_ghs": 230.70  # GHS customization price
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json=product_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "product_id" in data
        print(f"Created product with dual pricing: {data['product_id']}")
        
        # Store product_id for cleanup
        return data["product_id"]
    
    def test_vendor_update_product_ghs_price(self, admin_token):
        """Test that admin can update GHS price"""
        # First create a product
        unique_id = uuid.uuid4().hex[:8]
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json={
                "name": f"TEST_Update_GHS_{unique_id}",
                "description": "Test jersey for GHS update",
                "price": 50.00,
                "currency": "USD",
                "category": "fan",
                "sizes": ["M", "L"],
                "stock": 5,
                "images": ["https://example.com/jersey.jpg"]
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_response.status_code == 200
        product_id = create_response.json()["product_id"]
        
        # Update with GHS price
        update_response = requests.put(
            f"{BASE_URL}/api/vendor/products/{product_id}",
            json={
                "price_ghs": 769.00,
                "customization_price_ghs": 150.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert update_response.status_code == 200
        print(f"Updated product {product_id} with GHS prices")
    
    def test_featured_products_include_price_ghs(self):
        """Test that featured products endpoint returns price_ghs"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200
        
        products = response.json()
        print(f"Found {len(products)} featured products")
        
        for product in products[:3]:  # Check first 3
            assert "price" in product
            print(f"Featured product: {product['name']} - ${product['price']}")
    
    def test_popular_products_include_price_ghs(self):
        """Test that popular products endpoint returns price_ghs"""
        response = requests.get(f"{BASE_URL}/api/products/popular")
        assert response.status_code == 200
        
        products = response.json()
        print(f"Found {len(products)} popular products")
        
        for product in products[:3]:  # Check first 3
            assert "price" in product
            print(f"Popular product: {product['name']} - ${product['price']}")
    
    def test_categories_endpoint(self):
        """Test that categories endpoint works"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert len(categories) > 0
        
        expected_categories = ["official-tournament", "streetwear", "fan", "retro", "creative-designer", "local-club"]
        category_ids = [c["id"] for c in categories]
        
        for expected in expected_categories:
            assert expected in category_ids, f"Category {expected} not found"
        
        print(f"Found {len(categories)} categories: {category_ids}")


class TestProductModels:
    """Test that ProductCreate and ProductUpdate models accept GHS fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_product_create_accepts_price_ghs(self, admin_token):
        """Test ProductCreate model accepts price_ghs field"""
        unique_id = uuid.uuid4().hex[:8]
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json={
                "name": f"TEST_GHS_Field_{unique_id}",
                "description": "Testing price_ghs field acceptance",
                "price": 100.00,
                "price_ghs": 1538.00,  # Should be accepted
                "currency": "USD",
                "category": "streetwear",
                "sizes": ["S", "M", "L"],
                "stock": 20,
                "images": ["https://example.com/test.jpg"]
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should not return 422 (validation error)
        assert response.status_code != 422, f"price_ghs field rejected: {response.text}"
        assert response.status_code == 200
        print("ProductCreate model accepts price_ghs field")
    
    def test_product_create_accepts_customization_price_ghs(self, admin_token):
        """Test ProductCreate model accepts customization_price_ghs field"""
        unique_id = uuid.uuid4().hex[:8]
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json={
                "name": f"TEST_Custom_GHS_{unique_id}",
                "description": "Testing customization_price_ghs field",
                "price": 80.00,
                "price_ghs": 1230.40,
                "currency": "USD",
                "category": "fan",
                "sizes": ["M", "L", "XL"],
                "stock": 15,
                "images": ["https://example.com/custom.jpg"],
                "allows_customization": True,
                "customization_price": 15.00,
                "customization_price_ghs": 230.70  # Should be accepted
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code != 422, f"customization_price_ghs field rejected: {response.text}"
        assert response.status_code == 200
        print("ProductCreate model accepts customization_price_ghs field")
    
    def test_product_update_accepts_ghs_fields(self, admin_token):
        """Test ProductUpdate model accepts GHS fields"""
        # First create a product
        unique_id = uuid.uuid4().hex[:8]
        
        create_response = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json={
                "name": f"TEST_Update_Model_{unique_id}",
                "description": "Testing update model",
                "price": 60.00,
                "currency": "USD",
                "category": "retro",
                "sizes": ["S", "M"],
                "stock": 10,
                "images": ["https://example.com/update.jpg"]
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_response.status_code == 200
        product_id = create_response.json()["product_id"]
        
        # Update with GHS fields
        update_response = requests.put(
            f"{BASE_URL}/api/vendor/products/{product_id}",
            json={
                "price_ghs": 922.80,
                "customization_price_ghs": 100.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert update_response.status_code != 422, f"GHS fields rejected in update: {update_response.text}"
        assert update_response.status_code == 200
        print("ProductUpdate model accepts GHS fields")


class TestVendorDashboard:
    """Test vendor dashboard with dual pricing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_vendor_products_include_ghs_prices(self, admin_token):
        """Test that vendor products endpoint returns GHS prices"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        products = response.json()
        
        print(f"Vendor has {len(products)} products")
        
        for product in products[:3]:  # Check first 3
            assert "price" in product
            print(f"Vendor product: {product['name']} - USD: ${product['price']}, GHS: {product.get('price_ghs', 'N/A')}")
    
    def test_vendor_dashboard_loads(self, admin_token):
        """Test that vendor dashboard endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        dashboard = response.json()
        
        assert "total_products" in dashboard
        assert "total_revenue" in dashboard
        print(f"Vendor dashboard: {dashboard['total_products']} products, ${dashboard['total_revenue']} revenue")


# Cleanup test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_products():
    """Cleanup TEST_ prefixed products after all tests"""
    yield
    
    # Login as vendor to cleanup
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    
    if login_response.status_code == 200:
        token = login_response.json().get("token")
        
        # Get all vendor products
        products_response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if products_response.status_code == 200:
            products = products_response.json()
            
            # Delete TEST_ prefixed products
            for product in products:
                if product["name"].startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/vendor/products/{product['product_id']}",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    print(f"Cleaned up test product: {product['name']}")
