# CHANGELOG

## Version 0.1.0 - 2025-07-16

### Added
- Speech-to-Text (STT) service with Whisper support
- Text-to-Speech (TTS) service with Edge and Coqui support
- LLM client for OpenAI and llama.cpp integration
- Audio utilities for recording and processing
- FastAPI endpoints for audio processing and chat

### Changed
- Dockerfile updated with audio dependencies
- Dependencies updated in pyproject.toml
- Test fixtures improved for audio handling

### Fixed
- Status code in API tests (400 -> 422)
- Audio processing pipeline
- Environment variable handling

### Technical Details
- STT: Whisper model loading and chunking
- TTS: Edge and Coqui providers support
- Audio: Recording, resampling, validation
- API: Health checks, metrics, CORS
