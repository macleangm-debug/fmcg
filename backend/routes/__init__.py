"""
API Routes Package
Modular APIRouter organization for KwikPay backend

Usage in server.py:
    from routes import initialize_all_routes
    
    # After db initialization
    initialize_all_routes(db, get_current_user)
    
    # Mount all routers
    for router in get_all_routers():
        api_router.include_router(router)
"""

# Import routers
from .auth import router as auth_router, set_database as set_auth_db, get_current_user, get_superadmin_user
from .kwikpay import router as kwikpay_router, set_dependencies as set_kwikpay_deps
from .checkout import router as checkout_router, set_database as set_checkout_db
from .load_test import router as load_test_router, set_dependencies as set_loadtest_deps
from .products import router as products_router, set_dependencies as set_products_deps
from .orders import router as orders_router, set_dependencies as set_orders_deps
from .customers import router as customers_router, set_dependencies as set_customers_deps
from .invoices import router as invoices_router, set_dependencies as set_invoices_deps
from .superadmin import router as superadmin_router, set_dependencies as set_superadmin_deps
from .unitxt import router as unitxt_router, set_dependencies as set_unitxt_deps
from .subscription import router as subscription_router, set_dependencies as set_subscription_deps
from .gateway import router as gateway_router, set_dependencies as set_gateway_deps
from .inventory import router as inventory_router, set_dependencies as set_inventory_deps
from .galaxy import router as galaxy_router, set_dependencies as set_galaxy_deps
from .business import router as business_router, set_dependencies as set_business_deps
from .dashboard import router as dashboard_router, set_dependencies as set_dashboard_deps

__all__ = [
    # Routers
    'auth_router',
    'kwikpay_router', 
    'checkout_router',
    'load_test_router',
    'products_router',
    'orders_router',
    'customers_router',
    'invoices_router',
    'superadmin_router',
    'unitxt_router',
    'subscription_router',
    'gateway_router',
    'inventory_router',
    'galaxy_router',
    'business_router',
    'dashboard_router',
    # Auth dependencies
    'get_current_user',
    'get_superadmin_user',
    # Initialization functions
    'initialize_all_routes',
    'get_all_routers'
]


def initialize_all_routes(database, auth_dependency=None):
    """
    Initialize all routes with database connection and auth dependency
    Call this function from server.py after creating the database connection
    
    Args:
        database: Motor AsyncIOMotorDatabase instance
        auth_dependency: Function to get current user (optional, uses auth router's if not provided)
    """
    # Use provided auth or default from auth router
    auth_func = auth_dependency or get_current_user
    
    # Initialize each router with database
    set_auth_db(database)
    set_kwikpay_deps(database, auth_func)
    set_checkout_db(database)
    set_loadtest_deps(database, auth_func)
    set_products_deps(database, auth_func)
    set_orders_deps(database, auth_func)
    set_customers_deps(database, auth_func)
    set_invoices_deps(database, auth_func)
    set_superadmin_deps(database, auth_func, get_superadmin_user)
    set_unitxt_deps(database, auth_func)
    set_subscription_deps(database, auth_func)
    set_gateway_deps(database, auth_func)
    set_inventory_deps(database)
    set_galaxy_deps(database)
    set_business_deps(database)
    set_dashboard_deps(database)


def get_all_routers():
    """
    Get list of all routers to mount in the main app
    
    Returns:
        List of APIRouter instances
    """
    return [
        auth_router,
        kwikpay_router,
        checkout_router,
        load_test_router,
        products_router,
        orders_router,
        customers_router,
        invoices_router,
        superadmin_router,
        unitxt_router,
        subscription_router,
        gateway_router,
        inventory_router,
        galaxy_router,
        business_router,
        dashboard_router
    ]


# Router metadata for documentation
ROUTER_INFO = {
    "auth": {"prefix": "/auth", "tags": ["Authentication"], "size_kb": 9.5},
    "kwikpay": {"prefix": "/kwikpay", "tags": ["KwikPay Payments"], "size_kb": 18},
    "checkout": {"prefix": "/pay", "tags": ["Public Checkout"], "size_kb": 13.5},
    "load_test": {"prefix": "/kwikpay/load-test", "tags": ["Load Testing"], "size_kb": 11},
    "products": {"prefix": "/products", "tags": ["Products"], "size_kb": 14},
    "orders": {"prefix": "/orders", "tags": ["Orders"], "size_kb": 12},
    "customers": {"prefix": "/customers", "tags": ["Customers"], "size_kb": 10},
    "invoices": {"prefix": "/invoices", "tags": ["Invoices"], "size_kb": 14},
    "unitxt": {"prefix": "/unitxt", "tags": ["UniTxt SMS"], "size_kb": 22},
    "subscription": {"prefix": "/subscription", "tags": ["Subscriptions"], "size_kb": 12},
    "gateway": {"prefix": "/gateway", "tags": ["Payment Gateway"], "size_kb": 15},
    "inventory": {"prefix": "/inventory", "tags": ["Inventory"], "size_kb": 18},
    "galaxy": {"prefix": "/galaxy", "tags": ["Galaxy Ecosystem"], "size_kb": 12},
    "business": {"prefix": "/business", "tags": ["Business"], "size_kb": 8},
    "dashboard": {"prefix": "/dashboard", "tags": ["Dashboard"], "size_kb": 10}
}
