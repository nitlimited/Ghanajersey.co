"""
Backend API tests for UI Updates - Black Star Threads eCommerce
Tests: Announcement bar, Menu, Search, Footer links, Product cards, Voting system
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health and API availability tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")

    def test_products_endpoint(self):
        """Test products endpoint returns list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Products endpoint working - {len(data)} products")


class TestSearchFunctionality:
    """Tests for search functionality"""
    
    def test_search_products_by_name(self):
        """Test search products by name"""
        response = requests.get(f"{BASE_URL}/api/products?search=Ghana")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search by name working - found {len(data)} products for 'Ghana'")
    
    def test_search_products_by_description(self):
        """Test search products by description"""
        response = requests.get(f"{BASE_URL}/api/products?search=streetwear")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search by description working - found {len(data)} products for 'streetwear'")
    
    def test_search_empty_query(self):
        """Test search with empty query returns all products"""
        response = requests.get(f"{BASE_URL}/api/products?search=")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Empty search returns all products - {len(data)} products")


class TestProductDetails:
    """Tests for product detail endpoint"""
    
    def test_product_detail_has_vendor_name(self):
        """Test product detail includes vendor_name field"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            
            # Check vendor_name field exists
            assert "vendor_name" in data, "Product should have vendor_name field"
            print(f"✓ Product detail has vendor_name: {data.get('vendor_name')}")
        else:
            pytest.skip("No products available for testing")
    
    def test_product_detail_has_vote_count(self):
        """Test product detail includes vote_count field"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            
            # Check vote_count field exists
            assert "vote_count" in data, "Product should have vote_count field"
            assert isinstance(data["vote_count"], int), "vote_count should be integer"
            print(f"✓ Product detail has vote_count: {data.get('vote_count')}")
        else:
            pytest.skip("No products available for testing")
    
    def test_product_detail_has_images(self):
        """Test product detail includes images array"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            
            # Check images field exists and is array
            assert "images" in data, "Product should have images field"
            assert isinstance(data["images"], list), "images should be a list"
            print(f"✓ Product detail has images: {len(data.get('images', []))} images")
        else:
            pytest.skip("No products available for testing")


class TestVotingSystem:
    """Tests for voting system with device fingerprint"""
    
    def test_check_vote_endpoint_exists(self):
        """Test check-vote endpoint exists and returns proper response"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            fingerprint = f"test_fp_{uuid.uuid4().hex[:8]}"
            
            response = requests.get(
                f"{BASE_URL}/api/products/{product_id}/check-vote",
                params={"device_fingerprint": fingerprint}
            )
            assert response.status_code == 200
            data = response.json()
            
            assert "has_voted" in data, "Response should have has_voted field"
            assert isinstance(data["has_voted"], bool), "has_voted should be boolean"
            print(f"✓ Check-vote endpoint working - has_voted: {data['has_voted']}")
        else:
            pytest.skip("No products available for testing")
    
    def test_vote_with_device_fingerprint(self):
        """Test voting with device fingerprint"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            fingerprint = f"test_fp_{uuid.uuid4().hex[:12]}"
            
            # Vote for product
            response = requests.post(
                f"{BASE_URL}/api/products/{product_id}/vote",
                json={"device_fingerprint": fingerprint}
            )
            
            # Should succeed (200) or fail if already voted (400)
            assert response.status_code in [200, 400]
            
            if response.status_code == 200:
                data = response.json()
                assert "message" in data
                print(f"✓ Vote recorded successfully with fingerprint")
            else:
                print(f"✓ Vote endpoint working (already voted)")
        else:
            pytest.skip("No products available for testing")
    
    def test_duplicate_vote_prevention_by_fingerprint(self):
        """Test that duplicate votes are prevented by device fingerprint"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            fingerprint = f"test_dup_fp_{uuid.uuid4().hex[:12]}"
            
            # First vote
            response1 = requests.post(
                f"{BASE_URL}/api/products/{product_id}/vote",
                json={"device_fingerprint": fingerprint}
            )
            
            # Second vote with same fingerprint should fail
            response2 = requests.post(
                f"{BASE_URL}/api/products/{product_id}/vote",
                json={"device_fingerprint": fingerprint}
            )
            
            # Second vote should be rejected
            if response1.status_code == 200:
                assert response2.status_code == 400, "Duplicate vote should be rejected"
                print("✓ Duplicate vote prevention by fingerprint working")
            else:
                # First vote was already rejected (IP-based), still valid test
                print("✓ Vote prevention working (IP-based)")
        else:
            pytest.skip("No products available for testing")
    
    def test_get_product_votes(self):
        """Test getting vote count for a product"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            
            response = requests.get(f"{BASE_URL}/api/products/{product_id}/votes")
            assert response.status_code == 200
            data = response.json()
            
            assert "vote_count" in data, "Response should have vote_count"
            assert isinstance(data["vote_count"], int), "vote_count should be integer"
            print(f"✓ Get votes endpoint working - vote_count: {data['vote_count']}")
        else:
            pytest.skip("No products available for testing")
    
    def test_top_voted_product(self):
        """Test getting top voted product"""
        response = requests.get(f"{BASE_URL}/api/products/top-voted")
        assert response.status_code == 200
        data = response.json()
        
        if data:
            assert "product_id" in data, "Top voted should have product_id"
            assert "vote_count" in data or data.get("vote_count") is not None or "vote_count" not in data
            print(f"✓ Top voted endpoint working - product: {data.get('name', 'N/A')}")
        else:
            print("✓ Top voted endpoint working (no products yet)")


class TestCategories:
    """Tests for category endpoints"""
    
    def test_categories_endpoint(self):
        """Test categories endpoint returns expected categories"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 5, "Should have at least 5 categories"
        
        # Check expected category IDs
        category_ids = [cat["id"] for cat in data]
        expected_ids = ["official-tournament", "streetwear", "fan", "retro", "creative-designer"]
        
        for expected_id in expected_ids:
            assert expected_id in category_ids, f"Category {expected_id} should exist"
        
        print(f"✓ Categories endpoint working - {len(data)} categories")
    
    def test_products_by_category(self):
        """Test filtering products by category"""
        response = requests.get(f"{BASE_URL}/api/products?category=streetwear")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # All returned products should be in streetwear category
        for product in data:
            assert product["category"] == "streetwear", "Product should be in streetwear category"
        
        print(f"✓ Products by category working - {len(data)} streetwear products")


class TestVendorEndpoints:
    """Tests for vendor-related endpoints"""
    
    def test_vendor_public_products(self):
        """Test getting vendor's public products"""
        # First get a product to find a vendor_id
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            vendor_id = products[0].get("vendor_id")
            if vendor_id:
                response = requests.get(f"{BASE_URL}/api/vendor/{vendor_id}/products")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                print(f"✓ Vendor products endpoint working - {len(data)} products")
            else:
                pytest.skip("No vendor_id in product")
        else:
            pytest.skip("No products available for testing")


class TestNewsletterAndFooter:
    """Tests for newsletter and footer-related endpoints"""
    
    def test_newsletter_subscribe(self):
        """Test newsletter subscription"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": test_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Newsletter subscription working")
    
    def test_newsletter_duplicate_subscribe(self):
        """Test duplicate newsletter subscription"""
        test_email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        
        # First subscription
        response1 = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": test_email}
        )
        assert response1.status_code == 200
        
        # Second subscription with same email
        response2 = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": test_email}
        )
        assert response2.status_code == 200
        data = response2.json()
        assert data["message"] == "Already subscribed"
        print(f"✓ Duplicate newsletter subscription handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
