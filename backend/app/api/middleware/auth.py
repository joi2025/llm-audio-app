from functools import wraps
from flask import current_app

# Placeholder for future auth; for now just passes the API key context

def optional_api_key(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # could check headers for override token, etc.
        _ = current_app.config.get('OPENAI_API_KEY', '')
        return fn(*args, **kwargs)
    return wrapper
