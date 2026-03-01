"""
Test KwikPay New Features - Iteration 4:
- Custom Checkout Themes (CRUD + presets)
- ML Fraud Detection (ml-score, ml-stats)
- Load Testing (health, simulate, benchmark)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://retailpro-checkout.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ============== CHECKOUT THEMES TESTS ==============

class TestCheckoutThemesPresets:
    """Test checkout themes preset endpoints"""
    
    def test_get_presets_returns_5_themes(self, auth_headers):
        """GET /api/kwikpay/checkout-themes/presets should return 5 presets"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/checkout-themes/presets", headers=auth_headers)
        
        print(f"Presets response status: {response.status_code}")
        print(f"Presets response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "presets" in data, "presets not in response"
        presets = data["presets"]
        assert len(presets) == 5, f"Expected 5 presets, got {len(presets)}"
        
        # Verify preset IDs
        preset_ids = [p["id"] for p in presets]
        expected_ids = ["default", "dark", "minimal", "vibrant", "corporate"]
        for expected_id in expected_ids:
            assert expected_id in preset_ids, f"Missing preset: {expected_id}"
        
        # Verify preset structure
        for preset in presets:
            assert "name" in preset, f"Missing name in preset {preset.get('id')}"
            assert "primary_color" in preset, f"Missing primary_color in preset {preset.get('id')}"
            assert "button_style" in preset, f"Missing button_style in preset {preset.get('id')}"
            assert "font_family" in preset, f"Missing font_family in preset {preset.get('id')}"
        
        print(f"Presets verified: {preset_ids}")


class TestCheckoutThemesCRUD:
    """Test checkout themes CRUD operations"""
    
    created_theme_id = None
    
    def test_create_theme(self, auth_headers):
        """POST /api/kwikpay/checkout-themes creates a new theme"""
        test_id = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_Theme_{test_id}",
            "primary_color": "#FF5733",
            "secondary_color": "#3498DB",
            "background_color": "#FFFFFF",
            "text_color": "#2C3E50",
            "button_style": "pill",
            "font_family": "Poppins"
        }
        
        response = requests.post(f"{BASE_URL}/api/kwikpay/checkout-themes", json=payload, headers=auth_headers)
        
        print(f"Create theme response status: {response.status_code}")
        print(f"Create theme response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert "theme" in data, "theme not in response"
        
        theme = data["theme"]
        assert "id" in theme, "theme id not in response"
        assert theme["name"] == payload["name"], f"Theme name mismatch: {theme['name']} != {payload['name']}"
        assert theme["primary_color"] == payload["primary_color"], "Primary color mismatch"
        assert theme["button_style"] == payload["button_style"], "Button style mismatch"
        
        TestCheckoutThemesCRUD.created_theme_id = theme["id"]
        print(f"Created theme with ID: {theme['id']}")
    
    def test_list_themes(self, auth_headers):
        """GET /api/kwikpay/checkout-themes lists custom themes"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/checkout-themes", headers=auth_headers)
        
        print(f"List themes response status: {response.status_code}")
        print(f"List themes response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "themes" in data, "themes not in response"
        themes = data["themes"]
        assert isinstance(themes, list), "themes should be a list"
        
        # Should have at least one theme (the one we created)
        if TestCheckoutThemesCRUD.created_theme_id:
            theme_ids = [t["id"] for t in themes]
            assert TestCheckoutThemesCRUD.created_theme_id in theme_ids, "Created theme not found in list"
        
        print(f"Found {len(themes)} themes")
    
    def test_activate_theme(self, auth_headers):
        """POST /api/kwikpay/checkout-themes/{id}/activate activates a theme"""
        if not TestCheckoutThemesCRUD.created_theme_id:
            pytest.skip("No theme ID available from create test")
        
        theme_id = TestCheckoutThemesCRUD.created_theme_id
        response = requests.post(f"{BASE_URL}/api/kwikpay/checkout-themes/{theme_id}/activate", headers=auth_headers)
        
        print(f"Activate theme response status: {response.status_code}")
        print(f"Activate theme response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        print(f"Theme {theme_id} activated successfully")
    
    def test_get_active_theme(self, auth_headers):
        """GET /api/kwikpay/checkout-themes/active returns active theme"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/checkout-themes/active", headers=auth_headers)
        
        print(f"Active theme response status: {response.status_code}")
        print(f"Active theme response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "theme" in data, "theme not in response"
        assert "is_default" in data, "is_default not in response"
        
        if TestCheckoutThemesCRUD.created_theme_id and not data.get("is_default"):
            assert data["theme"].get("id") == TestCheckoutThemesCRUD.created_theme_id, "Active theme should be our created theme"
        
        print(f"Active theme: {data['theme'].get('name', 'default')}, is_default: {data['is_default']}")
    
    def test_delete_theme(self, auth_headers):
        """DELETE /api/kwikpay/checkout-themes/{id} deletes a theme"""
        if not TestCheckoutThemesCRUD.created_theme_id:
            pytest.skip("No theme ID available from create test")
        
        theme_id = TestCheckoutThemesCRUD.created_theme_id
        response = requests.delete(f"{BASE_URL}/api/kwikpay/checkout-themes/{theme_id}", headers=auth_headers)
        
        print(f"Delete theme response status: {response.status_code}")
        print(f"Delete theme response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        
        # Verify deletion by trying to list and not finding it
        list_response = requests.get(f"{BASE_URL}/api/kwikpay/checkout-themes", headers=auth_headers)
        if list_response.status_code == 200:
            themes = list_response.json().get("themes", [])
            theme_ids = [t["id"] for t in themes]
            assert theme_id not in theme_ids, "Theme should not appear in list after deletion"
        
        print(f"Theme {theme_id} deleted successfully")


# ============== ML FRAUD DETECTION TESTS ==============

class TestMLFraudDetection:
    """Test ML fraud detection endpoints"""
    
    def test_ml_score_returns_risk_assessment(self, auth_headers):
        """POST /api/kwikpay/fraud/ml-score returns risk score, level, and recommendation"""
        payload = {
            "amount": 100000,
            "currency": "TZS",
            "customer_email": "testcustomer@example.com",
            "customer_phone": "+255712345678",
            "country": "TZ",
            "payment_method": "mobile_money"
        }
        
        response = requests.post(f"{BASE_URL}/api/kwikpay/fraud/ml-score", json=payload, headers=auth_headers)
        
        print(f"ML Score response status: {response.status_code}")
        print(f"ML Score response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "overall_score" in data, "overall_score not in response"
        assert "risk_level" in data, "risk_level not in response"
        assert "recommendation" in data, "recommendation not in response"
        
        # Verify risk_level is valid
        valid_risk_levels = ["low", "medium", "high", "critical"]
        assert data["risk_level"] in valid_risk_levels, f"Invalid risk_level: {data['risk_level']}"
        
        # Verify recommendation is valid
        valid_recommendations = ["approve", "review", "challenge", "block"]
        assert data["recommendation"] in valid_recommendations, f"Invalid recommendation: {data['recommendation']}"
        
        # Verify score is in valid range
        assert 0 <= data["overall_score"] <= 100, f"Score out of range: {data['overall_score']}"
        
        # Verify individual scores are present
        assert "scores" in data, "scores breakdown not in response"
        scores = data["scores"]
        expected_score_types = ["velocity", "amount", "geo", "time", "device", "pattern"]
        for score_type in expected_score_types:
            assert score_type in scores, f"Missing score type: {score_type}"
        
        print(f"ML Score: {data['overall_score']}, Risk Level: {data['risk_level']}, Recommendation: {data['recommendation']}")
    
    def test_ml_score_high_amount_triggers_higher_score(self, auth_headers):
        """High amount transactions should have higher risk scores"""
        # Low amount
        low_amount_response = requests.post(f"{BASE_URL}/api/kwikpay/fraud/ml-score", json={
            "amount": 10000,
            "currency": "TZS",
            "customer_email": "low_amount_test@example.com",
            "country": "TZ"
        }, headers=auth_headers)
        
        # Very high amount
        high_amount_response = requests.post(f"{BASE_URL}/api/kwikpay/fraud/ml-score", json={
            "amount": 50000000,  # 50M TZS
            "currency": "TZS",
            "customer_email": "high_amount_test@example.com",
            "country": "TZ"
        }, headers=auth_headers)
        
        assert low_amount_response.status_code == 200
        assert high_amount_response.status_code == 200
        
        low_data = low_amount_response.json()
        high_data = high_amount_response.json()
        
        print(f"Low amount score: {low_data['overall_score']}, High amount score: {high_data['overall_score']}")
        
        # High amount should generally have higher risk (unless other factors apply)
        assert high_data["scores"]["amount"] >= low_data["scores"]["amount"], "High amount should have higher amount score"
    
    def test_ml_score_high_risk_country(self, auth_headers):
        """Transactions from high-risk countries should show geo score"""
        # High risk country (NG is in the high_risk_countries list)
        response = requests.post(f"{BASE_URL}/api/kwikpay/fraud/ml-score", json={
            "amount": 100000,
            "currency": "TZS",
            "customer_email": "geo_test@example.com",
            "country": "NG"  # Nigeria - high risk
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have some geo score for high-risk country
        assert data["scores"]["geo"] >= 40, f"Expected geo score >= 40 for high-risk country, got {data['scores']['geo']}"
        print(f"Geo score for high-risk country: {data['scores']['geo']}")
    
    def test_ml_stats_returns_statistics(self, auth_headers):
        """GET /api/kwikpay/fraud/ml-stats returns statistics by risk level"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/fraud/ml-stats", headers=auth_headers)
        
        print(f"ML Stats response status: {response.status_code}")
        print(f"ML Stats response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "period_days" in data, "period_days not in response"
        assert "stats_by_risk_level" in data, "stats_by_risk_level not in response"
        assert "total_checks" in data, "total_checks not in response"
        assert "recent_high_risk" in data, "recent_high_risk not in response"
        
        assert isinstance(data["stats_by_risk_level"], dict), "stats_by_risk_level should be a dict"
        assert isinstance(data["recent_high_risk"], list), "recent_high_risk should be a list"
        
        print(f"Total checks: {data['total_checks']}, Stats: {data['stats_by_risk_level']}")


# ============== LOAD TESTING TESTS ==============

class TestLoadTesting:
    """Test load testing endpoints"""
    
    def test_health_check_returns_system_status(self, auth_headers):
        """GET /api/kwikpay/load-test/health returns system health status"""
        response = requests.get(f"{BASE_URL}/api/kwikpay/load-test/health", headers=auth_headers)
        
        print(f"Health check response status: {response.status_code}")
        print(f"Health check response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "status" in data, "status not in response"
        assert "components" in data, "components not in response"
        
        # Status should be one of: ready, degraded
        valid_statuses = ["ready", "degraded"]
        assert data["status"] in valid_statuses, f"Invalid status: {data['status']}"
        
        # Verify component structure
        components = data["components"]
        assert "database" in components, "database component missing"
        assert "celery" in components, "celery component missing"
        assert "redis" in components, "redis component missing"
        assert "websocket" in components, "websocket component missing"
        
        # Database should be healthy for system to work
        assert components["database"]["status"] == "healthy", "Database should be healthy"
        
        print(f"System status: {data['status']}, DB: {components['database']['status']}")
    
    def test_simulate_load_test_returns_capacity_analysis(self, auth_headers):
        """POST /api/kwikpay/load-test/simulate returns capacity analysis"""
        payload = {
            "test_type": "transactions",
            "duration_seconds": 60,
            "concurrent_users": 10,
            "requests_per_second": 100
        }
        
        response = requests.post(f"{BASE_URL}/api/kwikpay/load-test/simulate", json=payload, headers=auth_headers)
        
        print(f"Simulate response status: {response.status_code}")
        print(f"Simulate response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "test_config" in data, "test_config not in response"
        assert "projected_metrics" in data, "projected_metrics not in response"
        assert "capacity_analysis" in data, "capacity_analysis not in response"
        assert "scaling_recommendations" in data, "scaling_recommendations not in response"
        
        # Verify projected metrics structure
        metrics = data["projected_metrics"]
        assert "transactions_per_second" in metrics, "TPS not in metrics"
        assert "transactions_per_minute" in metrics, "TPM not in metrics"
        assert "avg_response_time_ms" in metrics, "avg_response_time_ms not in metrics"
        assert "p95_response_time_ms" in metrics, "p95_response_time_ms not in metrics"
        assert "p99_response_time_ms" in metrics, "p99_response_time_ms not in metrics"
        
        # Verify capacity analysis
        capacity = data["capacity_analysis"]
        assert "current_capacity_tpm" in capacity, "current_capacity_tpm not in capacity"
        assert "target_capacity_tpm" in capacity, "target_capacity_tpm not in capacity"
        assert "capacity_percentage" in capacity, "capacity_percentage not in capacity"
        
        # Verify scaling recommendations is a list
        assert isinstance(data["scaling_recommendations"], list), "scaling_recommendations should be a list"
        assert len(data["scaling_recommendations"]) > 0, "Should have scaling recommendations"
        
        print(f"Projected TPS: {metrics['transactions_per_second']}, TPM: {metrics['transactions_per_minute']}")
        print(f"Capacity: {capacity['capacity_percentage']}% of target")
    
    def test_run_benchmark_returns_results(self, auth_headers):
        """POST /api/kwikpay/load-test/run-benchmark runs quick benchmark"""
        # Run with small iterations for quick test
        response = requests.post(
            f"{BASE_URL}/api/kwikpay/load-test/run-benchmark",
            json=10,  # Just 10 iterations for quick test
            headers=auth_headers
        )
        
        print(f"Benchmark response status: {response.status_code}")
        print(f"Benchmark response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "benchmark_results" in data, "benchmark_results not in response"
        assert "projected_capacity" in data, "projected_capacity not in response"
        
        # Verify benchmark results structure
        results = data["benchmark_results"]
        assert "iterations" in results, "iterations not in results"
        assert "total_time_seconds" in results, "total_time_seconds not in results"
        assert "operations_per_second" in results, "operations_per_second not in results"
        assert "avg_latency_ms" in results, "avg_latency_ms not in results"
        
        # Verify projected capacity
        capacity = data["projected_capacity"]
        assert "reads_per_minute" in capacity, "reads_per_minute not in capacity"
        assert "estimated_tx_per_minute" in capacity, "estimated_tx_per_minute not in capacity"
        
        print(f"Benchmark: {results['iterations']} iterations in {results['total_time_seconds']}s")
        print(f"OPS: {results['operations_per_second']}, Avg latency: {results['avg_latency_ms']}ms")


# ============== INTEGRATION TESTS ==============

class TestEndToEndFlow:
    """End-to-end integration tests"""
    
    def test_fraud_check_then_stats(self, auth_headers):
        """Create fraud checks then verify they appear in stats"""
        # Run a fraud check
        check_response = requests.post(f"{BASE_URL}/api/kwikpay/fraud/ml-score", json={
            "amount": 500000,
            "currency": "TZS",
            "customer_email": "e2e_test@example.com",
            "country": "TZ"
        }, headers=auth_headers)
        
        assert check_response.status_code == 200
        
        # Get stats - should include our check
        stats_response = requests.get(f"{BASE_URL}/api/kwikpay/fraud/ml-stats", headers=auth_headers)
        
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Total checks should be > 0
        assert stats["total_checks"] > 0, "Should have at least one fraud check"
        print(f"E2E: Fraud check created and visible in stats (total: {stats['total_checks']})")
    
    def test_theme_lifecycle(self, auth_headers):
        """Create -> List -> Activate -> Delete theme lifecycle"""
        test_id = uuid.uuid4().hex[:6]
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/kwikpay/checkout-themes", json={
            "name": f"TEST_Lifecycle_{test_id}",
            "primary_color": "#E74C3C",
            "button_style": "rounded"
        }, headers=auth_headers)
        
        assert create_response.status_code == 200
        theme_id = create_response.json()["theme"]["id"]
        
        # List - should contain our theme
        list_response = requests.get(f"{BASE_URL}/api/kwikpay/checkout-themes", headers=auth_headers)
        assert list_response.status_code == 200
        themes = list_response.json()["themes"]
        assert any(t["id"] == theme_id for t in themes), "Created theme should be in list"
        
        # Activate
        activate_response = requests.post(f"{BASE_URL}/api/kwikpay/checkout-themes/{theme_id}/activate", headers=auth_headers)
        assert activate_response.status_code == 200
        
        # Verify active
        active_response = requests.get(f"{BASE_URL}/api/kwikpay/checkout-themes/active", headers=auth_headers)
        assert active_response.status_code == 200
        active_data = active_response.json()
        if not active_data.get("is_default"):
            assert active_data["theme"]["id"] == theme_id
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/kwikpay/checkout-themes/{theme_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        print(f"E2E: Theme lifecycle test passed for theme {theme_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
