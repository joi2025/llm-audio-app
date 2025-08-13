# Request model schemas (lightweight doc, validation handled in middleware)
# - SetSettingsRequest: arbitrary dict of settings
# - TestApiKeyRequest: { api_key?: string }

class SetSettingsRequest(dict):
    pass

class TestApiKeyRequest(dict):
    pass
