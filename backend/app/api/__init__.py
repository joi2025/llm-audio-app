from flask import Blueprint

def register_api(app):
    """Register new modular API (v2) without breaking existing routes.

    Mounts under /api/v2/... so older endpoints continue working.
    """
    # Placeholder v2 blueprint. Admin routes are registered via `admin_bp` in app factory.
    # Keep this for future modular APIs under /api/v2 without double-registering admin.
    v2 = Blueprint('api_v2', __name__)
    return v2
