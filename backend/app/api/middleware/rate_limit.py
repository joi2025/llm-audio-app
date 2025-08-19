import time
from functools import wraps
from flask import request
from ..models.responses import error

# Very simple in-memory rate limiter per IP and route
_BUCKETS = {}


def rate_limit(req_per_min=60):
    window = 60.0
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip = request.remote_addr or 'unknown'
            key = (ip, fn.__name__)
            now = time.time()
            ts, count = _BUCKETS.get(key, (now, 0))
            if now - ts > window:
                ts, count = now, 0
            count += 1
            _BUCKETS[key] = (ts, count)
            if count > req_per_min:
                return error('Too many requests', code='rate_limited', status=429)
            return fn(*args, **kwargs)
        return wrapper
    return deco
