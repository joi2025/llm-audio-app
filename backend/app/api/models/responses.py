# Unified response helpers
# Avoid external dependencies; keep a small consistent envelope

def ok(data=None, message=None, status=200):
    payload = { 'ok': True }
    if data is not None:
        payload['data'] = data
    if message:
        payload['message'] = message
    return payload, status


def error(message, code='bad_request', details=None, status=400):
    return {
        'ok': False,
        'error': {
            'code': code,
            'message': message,
            'details': details or {}
        }
    }, status
