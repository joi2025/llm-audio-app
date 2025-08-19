import base64
import io
import threading
import time
from collections import deque
from typing import Callable, Deque, Optional

import requests


class AudioPipeline:
    """
    Minimal streaming STT pipeline with ring buffer and rate-limited incremental transcriptions.
    - Accepts 250ms WebM/Opus chunks (32kbps recommended)
    - Keeps a 5-chunk pre-roll ring buffer
    - Emits incremental partials at most every `min_interval_s`
    - Uses REST STT (Whisper) by re-sending the latest rolling window (1.5s)
    """

    def __init__(
        self,
        emit_fn: Callable[[str, dict], None],
        stt_base_url: str,
        api_key: str,
        min_interval_s: float = 0.5,
        window_chunks: int = 6,  # ~ 6 * 250ms = 1.5s
        preroll_chunks: int = 5,
    ):
        self.emit_fn = emit_fn
        self.base_url = stt_base_url
        self.api_key = api_key
        self.min_interval_s = min_interval_s
        self.window_chunks = window_chunks
        self.preroll = deque(maxlen=preroll_chunks)
        self.buffer: Deque[bytes] = deque()
        self._lock = threading.Lock()
        self._last_emit = 0.0
        self._alive = True
        self._worker: Optional[threading.Thread] = None

    def start(self):
        if self._worker and self._worker.is_alive():
            return
        self._alive = True
        self._worker = threading.Thread(target=self._loop, daemon=True)
        self._worker.start()

    def stop(self):
        self._alive = False

    def reset(self):
        with self._lock:
            self.preroll.clear()
            self.buffer.clear()
            self._last_emit = 0.0

    def push_chunk(self, chunk: bytes, speaking: bool):
        """Append incoming audio. If not speaking, only fill preroll. If speaking, flush preroll to buffer once then keep buffering."""
        with self._lock:
            if speaking:
                # On first speaking frame, flush preroll into buffer
                if self.preroll:
                    while self.preroll:
                        self.buffer.append(self.preroll.popleft())
                self.buffer.append(chunk)
            else:
                # Fill preroll only
                self.preroll.append(chunk)

    def _http_stt(self, audio_bytes: bytes) -> str:
        headers = {'Authorization': f'Bearer {self.api_key}'}
        files = {'file': ('audio.webm', io.BytesIO(audio_bytes), 'audio/webm')}
        data = {'model': 'whisper-1'}
        url = f'{self.base_url}/audio/transcriptions'
        r = requests.post(url, headers=headers, files=files, data=data, timeout=15)
        if r.status_code == 200:
            js = r.json()
            return js.get('text') or ''
        return ''

    def _loop(self):
        while self._alive:
            time.sleep(0.05)
            now = time.time()
            if now - self._last_emit < self.min_interval_s:
                continue
            with self._lock:
                if not self.buffer:
                    continue
                # Build rolling window of last N chunks
                recent = list(self.buffer)[-self.window_chunks:]
            audio_bytes = b''.join(recent)
            if not audio_bytes:
                continue
            try:
                text = self._http_stt(audio_bytes).strip()
                if text:
                    self.emit_fn('result_stt', {'transcription': text, 'from': 'user', 'partial': True})
                    self._last_emit = now
            except Exception:
                # best-effort; ignore errors
                pass
