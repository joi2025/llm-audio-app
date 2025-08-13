from functools import wraps
from flask import request
from ..models.responses import error


def require_json(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not request.is_json:
            return error('Expected application/json body', code='invalid_content_type', status=400)
        if request.get_json(silent=True) is None:
            return error('Invalid JSON body', code='invalid_json', status=400)
        return fn(*args, **kwargs)
    return wrapper


def expect_fields(schema: dict):
    """
    Lightweight field presence/type validator.
    schema example: { 'api_key': str, 'max_tokens': int }
    All fields optional unless type is wrapped in (type, True) marking required.
    """
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = request.get_json(silent=True) or {}
            for key, spec in schema.items():
                required = False
                typ = spec
                if isinstance(spec, tuple):
                    typ, required = spec[0], bool(spec[1])
                if required and key not in payload:
                    return error(f"Missing field: {key}", code='missing_field', status=400)
                if key in payload and typ is not None and not isinstance(payload[key], typ):
                    return error(f"Invalid type for {key}", code='invalid_type', status=400)
            return fn(*args, **kwargs)
        return wrapper
    return deco
