from flask import Blueprint

def register_api(app):
    """Register new modular API (v2) without breaking existing routes.

    Mounts under /api/v2/... so older endpoints continue working.
    """
    from .routes.admin import admin_v2_bp

    # Wrap in a parent blueprint with url_prefix for v2
    v2 = Blueprint('api_v2', __name__)
    # Register child blueprint under same prefix for clarity
    app.register_blueprint(admin_v2_bp, url_prefix='/api/v2')

    return v2
