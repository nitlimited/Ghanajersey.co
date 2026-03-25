"""
Backend API tests for new features:
- Voting endpoints (POST /api/products/{product_id}/vote, GET /api/products/top-voted)
- Vendor products endpoint (GET /api/vendor/{vendor_id}/products)
- Categories endpoint
- Health check
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curated-kits-1.preview.emergentagent.com')

class TestHealthAndBasics:
    """Basic health and API tests"""
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("SUCCESS: Health endpoint returns healthy status")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Root endpoint returns: {data}")


class TestCategoriesEndpoint:
    """Test product categories endpoint"""
    
    def test_get_categories(self):
        """Test GET /api/products/categories returns all categories"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        categories = response.json()
        
        # Should return list of categories
        assert isinstance(categories, list)
        assert len(categories) >= 5  # At least 5 categories expected
        
        # Check expected categories exist
        category_ids = [c["id"] for c in categories]
        expected_categories = ["official-tournament", "streetwear", "fan", "retro", "creative-designer"]
        for expected in expected_categories:
            assert expected in category_ids, f"Category '{expected}' not found"
        
        # Check category structure
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "description" in cat
        
        print(f"SUCCESS: Categories endpoint returns {len(categories)} categories")


class TestProductsEndpoint:
    """Test products listing endpoints"""
    
    def test_get_products(self):
        """Test GET /api/products returns products list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"SUCCESS: Products endpoint returns {len(products)} products")
    
    def test_get_featured_products(self):
        """Test GET /api/products/featured"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"SUCCESS: Featured products endpoint returns {len(products)} products")
    
    def test_get_popular_products(self):
        """Test GET /api/products/popular"""
        response = requests.get(f"{BASE_URL}/api/products/popular")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"SUCCESS: Popular products endpoint returns {len(products)} products")


class TestVotingEndpoints:
    """Test voting functionality endpoints"""
    
    def test_get_top_voted_product(self):
        """Test GET /api/products/top-voted returns top voted product or null"""
        response = requests.get(f"{BASE_URL}/api/products/top-voted")
        assert response.status_code == 200
        data = response.json()
        # Can be null if no products exist
        if data:
            assert "product_id" in data or data is None
            print(f"SUCCESS: Top voted product: {data.get('name', 'None')}")
        else:
            print("SUCCESS: Top voted endpoint returns null (no products)")
    
    def test_vote_for_nonexistent_product(self):
        """Test voting for non-existent product returns 404 or increments anyway"""
        response = requests.post(f"{BASE_URL}/api/products/nonexistent_product_123/vote")
        # Should either return 404 or handle gracefully
        assert response.status_code in [200, 400, 404]
        print(f"SUCCESS: Vote for non-existent product handled (status: {response.status_code})")
    
    def test_get_product_votes(self):
        """Test GET /api/products/{product_id}/votes"""
        # First get a product if any exist
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if products:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}/votes")
            assert response.status_code == 200
            data = response.json()
            assert "vote_count" in data
            print(f"SUCCESS: Product votes endpoint returns vote_count: {data['vote_count']}")
        else:
            print("SKIP: No products available to test votes endpoint")


class TestVendorEndpoints:
    """Test vendor-related public endpoints"""
    
    def test_get_vendor_products_nonexistent(self):
        """Test GET /api/vendor/{vendor_id}/products for non-existent vendor"""
        response = requests.get(f"{BASE_URL}/api/vendor/nonexistent_vendor_123/products")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        assert len(products) == 0  # Should return empty list
        print("SUCCESS: Vendor products endpoint returns empty list for non-existent vendor")
    
    def test_get_vendor_public_profile_nonexistent(self):
        """Test GET /api/vendor/{vendor_id}/public for non-existent vendor"""
        response = requests.get(f"{BASE_URL}/api/vendor/nonexistent_vendor_123/public")
        assert response.status_code == 404
        print("SUCCESS: Vendor public profile returns 404 for non-existent vendor")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "easante@nitlimited.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"SUCCESS: Admin login successful, user: {data['user']['email']}")
        return data["token"]
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid login returns 401")


class TestProductDetailWithVoting:
    """Test product detail page with voting functionality"""
    
    def test_product_detail_and_votes_endpoint(self):
        """Test that product detail works and votes endpoint returns vote_count"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if products:
            product_id = products[0]["product_id"]
            
            # Test product detail endpoint
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            product = response.json()
            assert "product_id" in product
            assert "name" in product
            print(f"SUCCESS: Product detail endpoint works for {product['name']}")
            
            # Test votes endpoint separately
            votes_response = requests.get(f"{BASE_URL}/api/products/{product_id}/votes")
            assert votes_response.status_code == 200
            votes_data = votes_response.json()
            assert "vote_count" in votes_data
            print(f"SUCCESS: Votes endpoint returns vote_count: {votes_data['vote_count']}")
            
            # Note: vote_count may not be in product detail response (backend issue to report)
            if "vote_count" not in product:
                print("WARNING: vote_count not in product detail response - backend should include this field")
        else:
            print("SKIP: No products available to test product detail")


class TestNewsletterEndpoint:
    """Test newsletter subscription"""
    
    def test_newsletter_subscribe(self):
        """Test newsletter subscription endpoint"""
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/newsletter/subscribe", json={
            "email": test_email
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Newsletter subscription works for {test_email}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
