from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Dict, List

from src.events import EventStore
from src.events.stt_events import (
    TranscriptionStarted,
    TranscriptionChunkProcessed,
    TranscriptionCompleted,
    TranscriptionFailed
)

class STTAggregate:
    def __init__(self, event_store: EventStore):
        self.event_store = event_store
        self._current_transcription: Dict[str, Any] = {}

    async def start_transcription(self, file_path: str, model: str, device: str) -> None:
        self._current_transcription = {
            "file_path": file_path,
            "model": model,
            "device": device,
            "chunks": [],
            "start_time": datetime.utcnow()
        }

        await self.event_store.append(
            TranscriptionStarted.create(
                aggregate_id=file_path,
                type="TranscriptionStarted",
                data={
                    "file_path": file_path,
                    "model": model,
                    "device": device
                }
            )
        )

    async def process_chunk(self, chunk_id: str, duration_ms: int, processing_time_ms: int, text: str) -> None:
        if not self._current_transcription:
            raise ValueError("No transcription in progress")

        self._current_transcription["chunks"].append({
            "id": chunk_id,
            "duration_ms": duration_ms,
            "processing_time_ms": processing_time_ms,
            "text": text
        })

        await self.event_store.append(
            TranscriptionChunkProcessed.create(
                aggregate_id=self._current_transcription["file_path"],
                type="TranscriptionChunkProcessed",
                data={
                    "chunk_id": chunk_id,
                    "duration_ms": duration_ms,
                    "processing_time_ms": processing_time_ms,
                    "text": text
                }
            )
        )

    async def complete_transcription(self, text: str, language: str) -> None:
        if not self._current_transcription:
            raise ValueError("No transcription in progress")

        total_duration_ms = sum(chunk["duration_ms"] for chunk in self._current_transcription["chunks"])
        total_processing_time_ms = sum(chunk["processing_time_ms"] for chunk in self._current_transcription["chunks"])

        await self.event_store.append(
            TranscriptionCompleted.create(
                aggregate_id=self._current_transcription["file_path"],
                type="TranscriptionCompleted",
                data={
                    "file_path": self._current_transcription["file_path"],
                    "total_duration_ms": total_duration_ms,
                    "total_processing_time_ms": total_processing_time_ms,
                    "text": text,
                    "language": language
                }
            )
        )

        self._current_transcription = {}

    async def fail_transcription(self, error: str) -> None:
        if not self._current_transcription:
            raise ValueError("No transcription in progress")

        await self.event_store.append(
            TranscriptionFailed.create(
                aggregate_id=self._current_transcription["file_path"],
                type="TranscriptionFailed",
                data={
                    "file_path": self._current_transcription["file_path"],
                    "error": error
                }
            )
        )

        self._current_transcription = {}
