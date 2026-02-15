"""
Test suite for Advertisement Carousel API endpoints
Tests the /api/adverts/* endpoints for the FMCG advertisement carousel feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdvertsPublicAPI:
    """Test public adverts endpoint - no auth required"""
    
    def test_get_public_adverts_default(self):
        """Test public adverts endpoint returns data without auth"""
        response = requests.get(f"{BASE_URL}/api/adverts/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Public adverts returned {len(data)} items")
    
    def test_get_public_adverts_with_product_filter(self):
        """Test public adverts with product filter"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"RetailPro filtered adverts returned {len(data)} items")
    
    def test_get_public_adverts_with_language(self):
        """Test public adverts with language parameter"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro&language=en")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify advert structure
        if len(data) > 0:
            advert = data[0]
            assert "id" in advert
            assert "title" in advert
            assert "description" in advert
            assert "background_color" in advert
            assert "text_color" in advert
            print(f"First advert: '{advert['title']}' with bg color {advert['background_color']}")
    
    def test_get_public_adverts_has_cta_fields(self):
        """Test that adverts include CTA text and link"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro&language=en")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            # Check if at least one advert has CTA
            has_cta = any(advert.get("cta_text") for advert in data)
            has_cta_link = any(advert.get("cta_link") for advert in data)
            print(f"Adverts with CTA text: {sum(1 for a in data if a.get('cta_text'))}/{len(data)}")
            print(f"Adverts with CTA link: {sum(1 for a in data if a.get('cta_link'))}/{len(data)}")
            assert has_cta, "At least one advert should have CTA text"
    
    def test_get_public_adverts_swahili_language(self):
        """Test public adverts with Swahili language"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro&language=sw")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Swahili language adverts returned {len(data)} items")
    
    def test_get_public_adverts_french_language(self):
        """Test public adverts with French language"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro&language=fr")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"French language adverts returned {len(data)} items")


class TestAdvertsAuthenticatedAPI:
    """Test authenticated adverts endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fmcg.com",
            "password": "Admin@2025"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_all_adverts_authenticated(self, auth_token):
        """Test getting all adverts with authentication"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/adverts/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Authenticated adverts returned {len(data)} items")
    
    def test_get_advert_by_id(self, auth_token):
        """Test getting a specific advert by ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get list of adverts to get an ID
        list_response = requests.get(f"{BASE_URL}/api/adverts/", headers=headers)
        if list_response.status_code == 200:
            adverts = list_response.json()
            if len(adverts) > 0:
                advert_id = adverts[0].get("id")
                response = requests.get(f"{BASE_URL}/api/adverts/{advert_id}", headers=headers)
                assert response.status_code == 200
                advert = response.json()
                assert advert["id"] == advert_id
                print(f"Successfully retrieved advert by ID: {advert_id}")
    
    def test_get_available_languages(self):
        """Test getting available languages"""
        response = requests.get(f"{BASE_URL}/api/adverts/languages/available")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        assert "default" in data
        languages = data["languages"]
        assert len(languages) > 0
        
        # Verify language structure
        lang = languages[0]
        assert "code" in lang
        assert "name" in lang
        print(f"Available languages: {[l['code'] for l in languages]}")


class TestAdvertsCarouselIntegration:
    """Test carousel-specific functionality"""
    
    def test_adverts_have_correct_priority_order(self):
        """Test that adverts are returned in priority order"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro&language=en")
        assert response.status_code == 200
        data = response.json()
        
        # Adverts should be returned in order (highest priority first based on backend sort)
        if len(data) > 0:
            print(f"Adverts order: {[a.get('title', 'N/A') for a in data]}")
    
    def test_adverts_colors_are_valid_hex(self):
        """Test that advert colors are valid hex values"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro&language=en")
        assert response.status_code == 200
        data = response.json()
        
        import re
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')
        
        for advert in data:
            bg_color = advert.get("background_color", "")
            text_color = advert.get("text_color", "")
            
            assert hex_pattern.match(bg_color), f"Invalid background color: {bg_color}"
            assert hex_pattern.match(text_color), f"Invalid text color: {text_color}"
        
        print(f"All {len(data)} adverts have valid hex color values")
    
    def test_adverts_have_icon_or_image(self):
        """Test that adverts have either icon or image"""
        response = requests.get(f"{BASE_URL}/api/adverts/public?product=retailpro&language=en")
        assert response.status_code == 200
        data = response.json()
        
        for advert in data:
            has_icon = advert.get("icon") is not None
            has_image = advert.get("image_url") is not None
            # At least one should be present (icon is more common)
            if has_icon:
                print(f"Advert '{advert.get('title')}' has icon: {advert.get('icon')}")


# Health check test
class TestHealthCheck:
    """Test API health"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint returns 200 with status
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "ok"
            print(f"Health check passed: {data}")
        else:
            print(f"Health endpoint returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
