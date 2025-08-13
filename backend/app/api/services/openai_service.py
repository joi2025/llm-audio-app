import requests

def test_openai_key(api_key: str, base_url: str = 'https://api.openai.com/v1'):
    if not api_key:
        return False, 'API key not configured'
    try:
        r = requests.get(f'{base_url}/models', headers={'Authorization': f'Bearer {api_key}'}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            return True, {'models': len(data.get('data', []))}
        return False, f'HTTP {r.status_code}'
    except requests.exceptions.Timeout:
        return False, 'timeout'
    except Exception as e:
        return False, str(e)
